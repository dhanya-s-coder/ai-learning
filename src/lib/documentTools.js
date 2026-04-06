let pdfjsPromise;

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.mjs?url"),
    ]).then(([pdfjsLib, workerModule]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
      return pdfjsLib;
    });
  }

  return pdfjsPromise;
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "their",
  "about",
  "have",
  "will",
  "when",
  "where",
  "which",
  "what",
  "while",
  "there",
  "these",
  "those",
  "then",
  "than",
  "them",
  "they",
  "also",
  "been",
  "being",
  "were",
  "because",
  "through",
  "using",
  "used",
  "into",
  "each",
  "such",
  "only",
  "most",
  "more",
  "very",
  "much",
  "many",
  "does",
  "just",
  "like",
  "make",
  "made",
  "over",
  "than",
  "after",
  "before",
  "under",
  "between",
  "across",
  "document",
  "page",
  "pages"
]);

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").replace(/\s([,.!?;:])/g, "$1").trim();
}

function splitSentences(text) {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);
}

function tokenize(text) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .match(/[a-z][a-z0-9+-]{2,}/g) || [];
}

export function getTopKeywords(text, limit = 8) {
  const counts = new Map();
  tokenize(text).forEach((word) => {
    if (STOP_WORDS.has(word)) return;
    counts.set(word, (counts.get(word) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

export function inferTopic(text, fallbackTitle = "Uploaded Document") {
  const keywords = getTopKeywords(text, 3);
  if (!keywords.length) {
    return fallbackTitle;
  }
  return keywords.map((word) => word[0].toUpperCase() + word.slice(1)).join(", ");
}

function selectBestSentences(text, limit = 3) {
  const sentences = splitSentences(text);
  const keywords = new Set(getTopKeywords(text, 10));

  return sentences
    .map((sentence) => {
      const score = tokenize(sentence).reduce(
        (total, word) => total + (keywords.has(word) ? 1 : 0),
        0
      );
      return { sentence, score };
    })
    .sort((a, b) => b.score - a.score || b.sentence.length - a.sentence.length)
    .slice(0, limit)
    .map((item) => item.sentence);
}

export function createSummary(text, title) {
  const best = selectBestSentences(text, 3);
  if (!best.length) {
    return `${title} is uploaded successfully. Generate more AI actions once the document has enough readable text.`;
  }
  return `${title} summary: ${best.join(" ")}`;
}

export function explainConceptFromText(text, concept, title) {
  const normalizedConcept = concept.trim().toLowerCase();
  const sentences = splitSentences(text).filter((sentence) =>
    sentence.toLowerCase().includes(normalizedConcept)
  );
  const source = sentences.slice(0, 3);

  if (!source.length) {
    const keywords = getTopKeywords(text, 5).join(", ");
    return `${concept} is not mentioned directly in ${title}. The closest important topics in this document are ${keywords || "the main ideas extracted from the PDF"}.`;
  }

  return `${concept}: ${source.join(" ")}`;
}

export function answerQuestionFromText(text, question, title) {
  const words = tokenize(question).filter((word) => !STOP_WORDS.has(word));
  const sentences = splitSentences(text)
    .map((sentence) => {
      const score = words.reduce(
        (total, word) => total + (sentence.toLowerCase().includes(word) ? 1 : 0),
        0
      );
      return { sentence, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.sentence.length - a.sentence.length)
    .slice(0, 3)
    .map((item) => item.sentence);

  if (!sentences.length) {
    const keywords = getTopKeywords(text, 4);
    return `I could not find an exact line for that in ${title}, but the document mostly focuses on ${keywords.join(", ") || "its main extracted concepts"}.`;
  }

  return `${sentences.join(" ")}\n\nThis answer is based on the extracted PDF text.`;
}

export function createFlashcardsFromText(text, title, count = 6) {
  const sentences = selectBestSentences(text, count + 2);
  if (!sentences.length) return [];

  return sentences.slice(0, count).map((sentence, index) => {
    const cleaned = sentence.replace(/\s+/g, " ").trim();
    const fragments = cleaned.split(/[,:-]/).map((item) => item.trim()).filter(Boolean);
    const lead = fragments[0] || cleaned;
    const answer = fragments.slice(1).join(". ") || cleaned;

    return {
      id: crypto.randomUUID(),
      question:
        lead.length < 18
          ? `What does ${lead} refer to in ${title}?`
          : `Flashcard ${index + 1}: What is the key idea in "${lead}"?`,
      answer,
      starred: false
    };
  });
}

function buildDistractors(correct, keywords) {
  const distractors = keywords
    .filter((word) => word.toLowerCase() !== correct.toLowerCase())
    .slice(0, 3)
    .map((word) => word[0].toUpperCase() + word.slice(1));

  while (distractors.length < 3) {
    distractors.push(`Alternative ${distractors.length + 1}`);
  }

  return distractors;
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

export function createQuizFromText(text, title, difficulty, totalQuestions) {
  const keywords = getTopKeywords(text, 12);
  const sentences = selectBestSentences(text, totalQuestions + 3);
  const safeTotal = Math.max(3, Math.min(Number(totalQuestions) || 5, 15));

  return Array.from({ length: safeTotal }, (_, index) => {
    const keyword = keywords[index % Math.max(keywords.length, 1)] || "topic";
    const sentence = sentences[index % Math.max(sentences.length, 1)] || text.slice(0, 120);
    const correct = keyword[0].toUpperCase() + keyword.slice(1);
    const options = shuffle([correct, ...buildDistractors(correct, keywords)]);

    return {
      id: crypto.randomUUID(),
      question:
        difficulty === "Hard"
          ? `Which concept best connects with this document detail: "${sentence.slice(0, 110)}..."?`
          : `Which topic is most central to ${title}?`,
      options,
      answer: correct,
      selected: "",
      explanation: `This question was generated from the document's extracted keywords and summary sentences.`
    };
  });
}

export async function extractPdfData(file) {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageTexts = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(normalizeWhitespace(text));
  }

  const text = pageTexts.filter(Boolean).join("\n\n");

  return {
    pageCount: pdf.numPages,
    text,
    keywords: getTopKeywords(text, 8)
  };
}
