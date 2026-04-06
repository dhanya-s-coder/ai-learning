import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { fallbackFlashcards, fallbackQuiz, fallbackSummary } from "./heuristics.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const chunkSize = 12000;

const flashcardResponseSchema = z.object({
  cards: z
    .array(
      z.object({
        question: z.string().min(5),
        answer: z.string().min(5)
      })
    )
    .min(1)
});

const quizResponseSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(5),
        options: z.array(z.string().min(1)).length(4),
        answer: z.string().min(1),
        explanation: z.string().min(1)
      })
    )
    .min(1)
});

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function safeExcerpt(text, maxChars = 18000) {
  return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
}

function chunkText(text) {
  const normalized = text || "";
  const chunks = [];
  for (let index = 0; index < normalized.length; index += chunkSize) {
    chunks.push(normalized.slice(index, index + chunkSize));
  }
  return chunks.slice(0, 4);
}

function extractJson(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
}

async function generateText(prompt) {
  const client = getClient();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt
  });
  return response.text || "";
}

async function generateJson(prompt) {
  const raw = await generateText(`${prompt}\n\nReturn valid JSON only. No markdown.`);
  return extractJson(raw);
}

export async function generateSummary(document) {
  const prompt = `Tum ek expert document analyst ho. Tumhare paas ek PDF document hai, tumhein iska poora content analyze karna hai aur ek Topic-wise Summary taiyar karni hai.

Summary likhte waqt niche diye gaye rules ka dhyan rakho:

1. Topic Headings: Har bade topic ko ek clear aur bold heading do.
2. Bullet Points: Har topic ke andar jo important points hain, unhein bullet points mein likho.
3. Concise & Clear: Faltu ki baatein mat likhna, sirf kaam ki information aur core concepts summarize karna.
4. Formatting: Markdown ka use karo (Bold, Italics, Lists) taaki summary dekhne mein organized lage.
5. Flow: Summary ka flow logical hona chahiye, shuruat se lekar ant tak.
6. Agar document mein multiple sections ya units hain, unhein properly group karo.

Output format:

# ${document.title}

## **Topic Name 1**
- Point A
- Point B

## **Topic Name 2**
- Point A
- Point B

Summary ko student-friendly rakho aur structured markdown mein do.
Koi introductory line, disclaimer, ya extra explanation mat do.
Sirf clean markdown output do.
Har heading meaningful ho, generic headings jaise "Overview" ya "Conclusion" tabhi use karo jab document mein waise clear section ho.
Bullet points short, factual, aur exam-revision friendly hone chahiye.

Title: ${document.title}
Document text:
${safeExcerpt(document.content)}`;

  try {
    return await generateText(prompt);
  } catch {
    return fallbackSummary(document);
  }
}

export async function explainConcept(document, concept) {
  const prompt = `You are helping a student understand a PDF.
Explain the concept "${concept}" using the document below.
If the concept is not explicitly covered, say that briefly and connect it to the closest relevant ideas from the document.
Use a clear student-friendly explanation in 1-2 short paragraphs.

Title: ${document.title}
Document text:
${safeExcerpt(document.content)}`;

  const chunks = chunkText(document.content);
  return generateText(`${prompt}\n\nDocument chunks:\n${chunks.map((chunk, index) => `Chunk ${index + 1}:\n${chunk}`).join("\n\n")}`);
}

export async function answerQuestion(document, question, history = []) {
  const historyText = history
    .slice(-6)
    .map((item) => `${item.role.toUpperCase()}: ${item.text}`)
    .join("\n");

  const prompt = `You answer questions strictly from the uploaded PDF.
Use the document as the main source.
If the answer is not clearly supported, say that honestly.
Keep the answer useful, direct, and study-friendly.

Title: ${document.title}
Conversation:
${historyText || "No prior conversation."}

Question:
${question}

Document text:
${safeExcerpt(document.content)}`;

  const chunks = chunkText(document.content);
  return generateText(`${prompt}\n\nDocument chunks:\n${chunks.map((chunk, index) => `Chunk ${index + 1}:\n${chunk}`).join("\n\n")}`);
}

export async function generateFlashcards(document, count = 8) {
  const prompt = `Create ${count} high-quality study flashcards from this document.
Each flashcard must test a meaningful concept, not trivia.
Prefer definition, comparison, cause/effect, process, and application style prompts.
Return JSON in this exact shape:
{"cards":[{"question":"...","answer":"..."}]}

Title: ${document.title}
Document text:
${safeExcerpt(document.content)}`;

  try {
    const data = flashcardResponseSchema.parse(await generateJson(prompt));
    return data.cards;
  } catch {
    return fallbackFlashcards(document, count);
  }
}

export async function generateQuiz(document, difficulty, totalQuestions = 5) {
  const prompt = `Create a ${difficulty} multiple-choice quiz with ${totalQuestions} questions from this document.
Each question should have exactly 4 options and one correct answer.
Make the wrong options plausible.
Higher difficulty should require more reasoning and conceptual understanding.
Return JSON in this exact shape:
{"questions":[{"question":"...","options":["...","...","...","..."],"answer":"...","explanation":"..."}]}

Title: ${document.title}
Document text:
${safeExcerpt(document.content)}`;

  try {
    const data = quizResponseSchema.parse(await generateJson(prompt));
    return data.questions;
  } catch {
    return fallbackQuiz(document, totalQuestions);
  }
}
