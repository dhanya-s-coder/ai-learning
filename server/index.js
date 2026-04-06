import "dotenv/config";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, writeDb } from "./lib/db.js";
import { comparePassword, hashPassword, signToken, verifyToken } from "./lib/auth.js";
import { extractPdfText } from "./lib/pdf.js";
import {
  answerQuestion,
  explainConcept,
  generateFlashcards,
  generateQuiz,
  generateSummary
} from "./lib/ai.js";
import { createId, nowLabel, toPublicDocument } from "./lib/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "uploads");
const app = express();
const PORT = Number(process.env.PORT || 4000);

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "application/pdf");
  }
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadsDir));

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    req.user = verifyToken(header.slice(7));
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function getUserById(userId) {
  return db.data.users.find((user) => user.id === userId);
}

function userOwns(resource, userId) {
  return resource && resource.userId === userId;
}

function getDocumentBundle(userId) {
  const documents = db.data.documents
    .filter((document) => document.userId === userId)
    .map((document) =>
      toPublicDocument(
        document,
        db.data.flashcardSets.filter((set) => set.documentId === document.id),
        db.data.quizzes.filter((quiz) => quiz.documentId === document.id)
      )
    );

  const activity = db.data.activities
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);

  return { documents, activity };
}

async function addActivity(userId, text, type) {
  db.data.activities.unshift({
    id: createId("activity"),
    userId,
    text,
    type,
    time: "Just now",
    createdAt: new Date().toISOString()
  });
  db.data.activities = db.data.activities.slice(0, 40);
  await writeDb();
}

function cleanQuizForClient(quiz) {
  return {
    ...quiz,
    questions: quiz.questions.map((question) => ({
      ...question,
      answer: question.answer
    }))
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (db.data.users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ error: "Email already exists." });
  }

  const user = {
    id: createId("user"),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString()
  };

  db.data.users.push(user);
  await writeDb();

  return res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email }
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.data.users.find((item) => item.email === email?.toLowerCase().trim());

  if (!user || !(await comparePassword(password || "", user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  return res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email }
  });
});

app.get("/api/bootstrap", authRequired, (req, res) => {
  const user = getUserById(req.user.sub);
  if (!user) {
    return res.status(401).json({ error: "User not found." });
  }

  const bundle = getDocumentBundle(user.id);
  return res.json({
    user: { id: user.id, name: user.name, email: user.email },
    documents: bundle.documents.map((document) => ({
      ...document,
      quizzes: document.quizzes.map(cleanQuizForClient)
    })),
    activity: bundle.activity
  });
});

app.post("/api/documents", authRequired, upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.body.title?.trim()) {
      return res.status(400).json({ error: "Document title and PDF file are required." });
    }

    const fileBuffer = await import("node:fs/promises").then((fs) => fs.readFile(req.file.path));
    const pdfData = await extractPdfText(fileBuffer);
    const document = {
      id: createId("doc"),
      userId: req.user.sub,
      title: req.body.title.trim(),
      filename: req.file.originalname,
      storedFilename: req.file.filename,
      sizeLabel: `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`,
      topic: "Uploaded PDF",
      uploadedAt: nowLabel(),
      previewUrl: `/uploads/${req.file.filename}`,
      pageCount: pdfData.pageCount,
      content: pdfData.text || "Readable text could not be extracted from this PDF.",
      summary: "",
      conceptExplanation: "",
      chat: [
        {
          id: createId("chat"),
          role: "assistant",
          text: `Your PDF "${req.body.title.trim()}" is uploaded. Ask a question or run AI actions to generate study material.`
        }
      ],
      keywords: [],
      createdAt: new Date().toISOString()
    };

    db.data.documents.unshift(document);
    await writeDb();
    await addActivity(req.user.sub, `Uploaded ${document.title}`, "upload");

    return res.json({
      ...document,
      flashcardSets: [],
      quizzes: []
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not process this PDF." });
  }
});

app.post("/api/documents/:id/summary", authRequired, async (req, res) => {
  const document = db.data.documents.find((item) => item.id === req.params.id);
  if (!userOwns(document, req.user.sub)) {
    return res.status(404).json({ error: "Document not found." });
  }

  try {
    document.summary = await generateSummary(document);
    await writeDb();
    await addActivity(req.user.sub, `Generated summary for ${document.title}`, "summary");
    return res.json({ summary: document.summary });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Summary generation failed." });
  }
});

app.post("/api/documents/:id/explain", authRequired, async (req, res) => {
  const document = db.data.documents.find((item) => item.id === req.params.id);
  if (!userOwns(document, req.user.sub)) {
    return res.status(404).json({ error: "Document not found." });
  }

  try {
    document.conceptExplanation = await explainConcept(document, req.body.concept || "");
    await writeDb();
    await addActivity(req.user.sub, `Explained concept from ${document.title}`, "explain");
    return res.json({ conceptExplanation: document.conceptExplanation });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Concept explanation failed." });
  }
});

app.post("/api/documents/:id/chat", authRequired, async (req, res) => {
  const document = db.data.documents.find((item) => item.id === req.params.id);
  if (!userOwns(document, req.user.sub)) {
    return res.status(404).json({ error: "Document not found." });
  }

  try {
    const message = String(req.body.message || "").trim();
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const answer = await answerQuestion(document, message, document.chat);
    const messages = [
      { id: createId("chat"), role: "user", text: message },
      { id: createId("chat"), role: "assistant", text: answer }
    ];
    document.chat.push(...messages);
    await writeDb();
    await addActivity(req.user.sub, `Asked AI about ${document.title}`, "chat");
    return res.json({ chat: document.chat });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Chat response failed." });
  }
});

app.post("/api/documents/:id/flashcards", authRequired, async (req, res) => {
  const document = db.data.documents.find((item) => item.id === req.params.id);
  if (!userOwns(document, req.user.sub)) {
    return res.status(404).json({ error: "Document not found." });
  }

  try {
    const cards = await generateFlashcards(document, Number(req.body.count) || 8);
    const flashcardSet = {
      id: createId("set"),
      userId: req.user.sub,
      documentId: document.id,
      name: `${document.title} Set ${db.data.flashcardSets.filter((set) => set.documentId === document.id).length + 1}`,
      progress: 0,
      createdAt: nowLabel(),
      cards: cards.map((card) => ({
        id: createId("card"),
        question: card.question,
        answer: card.answer,
        starred: false,
        reviewed: false
      }))
    };

    db.data.flashcardSets.unshift(flashcardSet);
    await writeDb();
    await addActivity(req.user.sub, `Generated flashcards for ${document.title}`, "flashcards");
    return res.json(flashcardSet);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Flashcard generation failed." });
  }
});

app.patch("/api/flashcard-sets/:id/progress", authRequired, async (req, res) => {
  const flashcardSet = db.data.flashcardSets.find((item) => item.id === req.params.id);
  if (!userOwns(flashcardSet, req.user.sub)) {
    return res.status(404).json({ error: "Flashcard set not found." });
  }

  flashcardSet.progress = Math.max(0, Math.min(100, Number(req.body.progress) || 0));
  if (req.body.cardId) {
    flashcardSet.cards = flashcardSet.cards.map((card) =>
      card.id === req.body.cardId ? { ...card, reviewed: true } : card
    );
  }
  await writeDb();
  return res.json(flashcardSet);
});

app.patch("/api/flashcards/:id/star", authRequired, async (req, res) => {
  const flashcardSet = db.data.flashcardSets.find((set) =>
    set.userId === req.user.sub && set.cards.some((card) => card.id === req.params.id)
  );
  if (!flashcardSet) {
    return res.status(404).json({ error: "Flashcard not found." });
  }

  flashcardSet.cards = flashcardSet.cards.map((card) =>
    card.id === req.params.id ? { ...card, starred: !card.starred } : card
  );
  await writeDb();
  return res.json(flashcardSet);
});

app.delete("/api/flashcard-sets/:id", authRequired, async (req, res) => {
  const flashcardSet = db.data.flashcardSets.find((item) => item.id === req.params.id);
  if (!userOwns(flashcardSet, req.user.sub)) {
    return res.status(404).json({ error: "Flashcard set not found." });
  }

  db.data.flashcardSets = db.data.flashcardSets.filter((item) => item.id !== req.params.id);
  await writeDb();
  await addActivity(req.user.sub, "Deleted a flashcard set", "flashcards");
  return res.json({ ok: true });
});

app.post("/api/documents/:id/quizzes", authRequired, async (req, res) => {
  const document = db.data.documents.find((item) => item.id === req.params.id);
  if (!userOwns(document, req.user.sub)) {
    return res.status(404).json({ error: "Document not found." });
  }

  try {
    const difficulty = req.body.difficulty || "Medium";
    const questions = await generateQuiz(document, difficulty, Number(req.body.totalQuestions) || 5);
    const quiz = {
      id: createId("quiz"),
      userId: req.user.sub,
      documentId: document.id,
      name: `${document.title} Quiz ${db.data.quizzes.filter((item) => item.documentId === document.id).length + 1}`,
      difficulty,
      score: 0,
      totalQuestions: questions.length,
      createdAt: nowLabel(),
      questions: questions.map((question) => ({
        id: createId("question"),
        question: question.question,
        options: question.options,
        answer: question.answer,
        explanation: question.explanation,
        selected: ""
      }))
    };

    db.data.quizzes.unshift(quiz);
    await writeDb();
    await addActivity(req.user.sub, `Generated ${difficulty} quiz for ${document.title}`, "quiz");
    return res.json(cleanQuizForClient(quiz));
  } catch (error) {
    return res.status(500).json({ error: error.message || "Quiz generation failed." });
  }
});

app.patch("/api/quizzes/:id/answer", authRequired, async (req, res) => {
  const quiz = db.data.quizzes.find((item) => item.id === req.params.id);
  if (!userOwns(quiz, req.user.sub)) {
    return res.status(404).json({ error: "Quiz not found." });
  }

  quiz.questions = quiz.questions.map((question) =>
    question.id === req.body.questionId ? { ...question, selected: req.body.option } : question
  );
  const correct = quiz.questions.filter((question) => question.selected === question.answer).length;
  quiz.score = Math.round((correct / quiz.questions.length) * 100);
  await writeDb();
  return res.json(cleanQuizForClient(quiz));
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
