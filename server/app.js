import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { connectMongo } from "./lib/mongo.js";
import {
  comparePassword,
  generateResetToken,
  hashPassword,
  signRefreshToken,
  signToken,
  validatePasswordRules,
  verifyRefreshToken,
  verifyToken
} from "./lib/auth.js";
import { extractPdfText } from "./lib/pdf.js";
import {
  answerQuestion,
  explainConcept,
  generateFlashcards,
  generateQuiz,
  generateSummary
} from "./lib/ai.js";
import { getTopKeywords } from "./lib/heuristics.js";
import { Activity } from "./models/Activity.js";
import { Document } from "./models/Document.js";
import { FlashcardSet } from "./models/FlashcardSet.js";
import { Quiz } from "./models/Quiz.js";
import { User } from "./models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "uploads");
const PORT = Number(process.env.PORT || 4000);

await connectMongo();

const app = express();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "application/pdf");
  }
});

app.use(cors());
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);
app.use(express.json({ limit: "2mb" }));
app.use("/api", apiLimiter);
app.use("/uploads", express.static(uploadsDir));

function timeLabel(date = new Date()) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function safeAsync(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function parseBody(schema, source) {
  return schema.parse(source);
}

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

async function getOwnedDocument(documentId, userId) {
  return Document.findOne({ _id: documentId, userId });
}

async function addActivity(userId, text, type) {
  await Activity.create({
    userId,
    text,
    type,
    time: "Just now"
  });
}

async function buildBootstrap(userId) {
  const [documents, flashcardSets, quizzes, activity] = await Promise.all([
    Document.find({ userId }).sort({ updatedAt: -1 }).lean(),
    FlashcardSet.find({ userId }).sort({ updatedAt: -1 }).lean(),
    Quiz.find({ userId }).sort({ updatedAt: -1 }).lean(),
    Activity.find({ userId }).sort({ createdAt: -1 }).limit(15).lean()
  ]);

  const documentsWithChildren = documents.map((document) => ({
    ...document,
    id: document._id.toString(),
    previewUrl: document.previewUrl,
    flashcardSets: flashcardSets
      .filter((set) => set.documentId.toString() === document._id.toString())
      .map((set) => ({ ...set, id: set._id.toString(), documentId: set.documentId.toString() })),
    quizzes: quizzes
      .filter((quiz) => quiz.documentId.toString() === document._id.toString())
      .map((quiz) => ({ ...quiz, id: quiz._id.toString(), documentId: quiz.documentId.toString() }))
  }));

  return {
    documents: documentsWithChildren,
    activity: activity.map((item) => ({ ...item, id: item._id.toString() }))
  };
}

function scoreCard(confidence, currentDueAt) {
  const now = new Date();
  if (confidence === "easy") {
    return { dueAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), mastered: false };
  }
  if (confidence === "hard") {
    return { dueAt: new Date(now.getTime() + 12 * 60 * 60 * 1000), mastered: false };
  }
  if (confidence === "mastered") {
    return {
      dueAt: currentDueAt || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      mastered: true
    };
  }
  return { dueAt: currentDueAt || now, mastered: false };
}

const signupSchema = z
  .object({
    name: z.string().trim().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    resetToken: z.string().min(10),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"]
  });

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasGeminiKey: Boolean(process.env.GEMINI_API_KEY), mongoReady: true });
});

app.post("/api/auth/signup", authLimiter, safeAsync(async (req, res) => {
  const { name, email, password } = parseBody(signupSchema, req.body);
  if (!validatePasswordRules(password)) {
    return res.status(400).json({ error: "Password must be at least 8 chars and include uppercase, lowercase, and a number." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (await User.exists({ email: normalizedEmail })) {
    return res.status(409).json({ error: "Email already exists." });
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: await hashPassword(password)
  });

  const accessToken = signToken({ id: user._id.toString(), name: user.name, email: user.email });
  const refreshToken = signRefreshToken({ id: user._id.toString() });
  user.refreshTokens.push({ token: refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
  await user.save();

  res.json({
    token: accessToken,
    refreshToken,
    user: { id: user._id.toString(), name: user.name, email: user.email }
  });
}));

app.post("/api/auth/login", authLimiter, safeAsync(async (req, res) => {
  const { email, password } = parseBody(loginSchema, req.body);
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const accessToken = signToken({ id: user._id.toString(), name: user.name, email: user.email });
  const refreshToken = signRefreshToken({ id: user._id.toString() });
  user.refreshTokens.push({ token: refreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
  await user.save();

  res.json({
    token: accessToken,
    refreshToken,
    user: { id: user._id.toString(), name: user.name, email: user.email }
  });
}));

app.post("/api/auth/refresh", safeAsync(async (req, res) => {
  const { refreshToken } = parseBody(refreshSchema, req.body);
  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.sub);
  if (!user || !user.refreshTokens.some((item) => item.token === refreshToken)) {
    return res.status(401).json({ error: "Invalid refresh token." });
  }
  const token = signToken({ id: user._id.toString(), name: user.name, email: user.email });
  res.json({ token });
}));

app.post("/api/auth/forgot-password", authLimiter, safeAsync(async (req, res) => {
  const { email } = parseBody(forgotPasswordSchema, req.body);
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (user) {
    user.resetToken = {
      token: generateResetToken(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    };
    await user.save();
  }
  res.json({
    ok: true,
    debugResetToken: process.env.NODE_ENV === "production" ? undefined : user?.resetToken?.token
  });
}));

app.post("/api/auth/reset-password", authLimiter, safeAsync(async (req, res) => {
  const { email, resetToken, password } = parseBody(resetPasswordSchema, req.body);
  if (!validatePasswordRules(password)) {
    return res.status(400).json({ error: "Password must be at least 8 chars and include uppercase, lowercase, and a number." });
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.resetToken || user.resetToken.token !== resetToken || user.resetToken.expiresAt < new Date()) {
    return res.status(400).json({ error: "Invalid or expired reset token." });
  }
  user.passwordHash = await hashPassword(password);
  user.resetToken = null;
  user.refreshTokens = [];
  await user.save();
  res.json({ ok: true });
}));

app.get("/api/bootstrap", authRequired, safeAsync(async (req, res) => {
  const user = await User.findById(req.user.sub).lean();
  if (!user) {
    return res.status(401).json({ error: "User not found." });
  }
  const bundle = await buildBootstrap(user._id);
  res.json({
    user: { id: user._id.toString(), name: user.name, email: user.email },
    documents: bundle.documents,
    activity: bundle.activity
  });
}));

app.post("/api/documents", authRequired, upload.single("file"), safeAsync(async (req, res) => {
  if (!req.file || !req.body.title?.trim()) {
    return res.status(400).json({ error: "Document title and PDF file are required." });
  }

  const fileBuffer = await fs.readFile(req.file.path);
  const document = await Document.create({
    userId: req.user.sub,
    title: req.body.title.trim(),
    filename: req.file.originalname,
    storedFilename: req.file.filename,
    sizeLabel: `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`,
    previewUrl: `/uploads/${req.file.filename}`,
    status: "processing",
    uploadHistory: [{ event: "upload", detail: "Document uploaded." }],
    chat: [{ role: "assistant", text: `Your PDF "${req.body.title.trim()}" is being processed.` }]
  });

  try {
    const pdfData = await extractPdfText(fileBuffer);
    document.pageCount = pdfData.pageCount;
    document.content = pdfData.text || "Readable text could not be extracted from this PDF.";
    document.keywords = getTopKeywords(document.content, 8);
    document.topic = document.keywords.slice(0, 3).join(", ") || "Uploaded PDF";
    document.summary = await generateSummary(document);
    document.status = "ready";
    document.chat = [{ role: "assistant", text: `Your PDF "${document.title}" is ready. Ask anything or generate study material.` }];
    document.uploadHistory.push({ event: "processed", detail: "Document text extracted successfully." });
  } catch (error) {
    document.status = "failed";
    document.uploadHistory.push({ event: "failed", detail: "Document processing failed." });
  }

  await document.save();
  await addActivity(req.user.sub, `Uploaded ${document.title}`, "upload");

  res.json({
    ...document.toObject(),
    id: document._id.toString(),
    flashcardSets: [],
    quizzes: []
  });
}));

app.patch("/api/documents/:id", authRequired, safeAsync(async (req, res) => {
  const schema = z.object({ title: z.string().trim().min(2) });
  const { title } = parseBody(schema, req.body);
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  document.title = title;
  document.uploadHistory.push({ event: "rename", detail: `Document renamed to ${title}.` });
  await document.save();
  await addActivity(req.user.sub, `Renamed ${title}`, "document");
  res.json({ ...document.toObject(), id: document._id.toString() });
}));

app.delete("/api/documents/:id", authRequired, safeAsync(async (req, res) => {
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  await Promise.all([
    FlashcardSet.deleteMany({ documentId: document._id, userId: req.user.sub }),
    Quiz.deleteMany({ documentId: document._id, userId: req.user.sub }),
    Document.deleteOne({ _id: document._id })
  ]);
  await addActivity(req.user.sub, `Deleted ${document.title}`, "document");
  res.json({ ok: true });
}));

app.post("/api/documents/:id/reprocess", authRequired, safeAsync(async (req, res) => {
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  const fileBuffer = await fs.readFile(path.resolve(uploadsDir, document.storedFilename));
  document.status = "processing";
  await document.save();
  try {
    const pdfData = await extractPdfText(fileBuffer);
    document.pageCount = pdfData.pageCount;
    document.content = pdfData.text || document.content;
    document.keywords = getTopKeywords(document.content, 8);
    document.summary = await generateSummary(document);
    document.status = "ready";
    document.uploadHistory.push({ event: "reprocess", detail: "Document reprocessed successfully." });
  } catch {
    document.status = "failed";
    document.uploadHistory.push({ event: "failed", detail: "Reprocess failed." });
  }
  await document.save();
  await addActivity(req.user.sub, `Reprocessed ${document.title}`, "document");
  res.json({ ...document.toObject(), id: document._id.toString() });
}));

app.post("/api/documents/:id/summary", authRequired, safeAsync(async (req, res) => {
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  document.summary = await generateSummary(document);
  await document.save();
  await addActivity(req.user.sub, `Generated summary for ${document.title}`, "summary");
  res.json({ summary: document.summary });
}));

app.post("/api/documents/:id/explain", authRequired, safeAsync(async (req, res) => {
  const schema = z.object({ concept: z.string().trim().min(2) });
  const { concept } = parseBody(schema, req.body);
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  document.conceptExplanation = await explainConcept(document, concept);
  await document.save();
  await addActivity(req.user.sub, `Explained concept from ${document.title}`, "explain");
  res.json({ conceptExplanation: document.conceptExplanation });
}));

app.post("/api/documents/:id/chat", authRequired, safeAsync(async (req, res) => {
  const schema = z.object({ message: z.string().trim().min(2) });
  const { message } = parseBody(schema, req.body);
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  const answer = await answerQuestion(document, message, document.chat);
  document.chat.push({ role: "user", text: message }, { role: "assistant", text: answer });
  await document.save();
  await addActivity(req.user.sub, `Asked AI about ${document.title}`, "chat");
  res.json({ chat: document.chat });
}));

app.post("/api/documents/:id/flashcards", authRequired, safeAsync(async (req, res) => {
  const schema = z.object({ count: z.number().int().min(3).max(15).optional() });
  const { count = 8 } = parseBody(schema, req.body);
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  const cards = await generateFlashcards(document, count);
  const setCount = await FlashcardSet.countDocuments({ documentId: document._id, userId: req.user.sub });
  const flashcardSet = await FlashcardSet.create({
    userId: req.user.sub,
    documentId: document._id,
    name: `${document.title} Set ${setCount + 1}`,
    cards: cards.map((card) => ({
      question: card.question,
      answer: card.answer,
      dueAt: new Date()
    }))
  });
  await addActivity(req.user.sub, `Generated flashcards for ${document.title}`, "flashcards");
  res.json({ ...flashcardSet.toObject(), id: flashcardSet._id.toString(), documentId: document._id.toString() });
}));

app.patch("/api/flashcard-sets/:id/review", authRequired, safeAsync(async (req, res) => {
  const schema = z.object({
    cardId: z.string(),
    confidence: z.enum(["easy", "hard", "mastered"])
  });
  const { cardId, confidence } = parseBody(schema, req.body);
  const flashcardSet = await FlashcardSet.findOne({ _id: req.params.id, userId: req.user.sub });
  if (!flashcardSet) return res.status(404).json({ error: "Flashcard set not found." });
  const card = flashcardSet.cards.id(cardId);
  if (!card) return res.status(404).json({ error: "Flashcard not found." });
  const score = scoreCard(confidence, card.dueAt);
  card.reviewed = true;
  card.confidence = confidence;
  card.dueAt = score.dueAt;
  card.mastered = score.mastered;
  card.reviewCount += 1;
  const reviewedCount = flashcardSet.cards.filter((item) => item.reviewed).length;
  flashcardSet.progress = Math.round((reviewedCount / flashcardSet.cards.length) * 100);
  flashcardSet.sessions.push({
    reviewedCount: reviewedCount,
    masteredCount: flashcardSet.cards.filter((item) => item.mastered).length
  });
  await flashcardSet.save();
  res.json({ ...flashcardSet.toObject(), id: flashcardSet._id.toString(), documentId: flashcardSet.documentId.toString() });
}));

app.patch("/api/flashcards/:id/star", authRequired, safeAsync(async (req, res) => {
  const flashcardSet = await FlashcardSet.findOne({ userId: req.user.sub, "cards._id": req.params.id });
  if (!flashcardSet) return res.status(404).json({ error: "Flashcard not found." });
  const card = flashcardSet.cards.id(req.params.id);
  card.starred = !card.starred;
  await flashcardSet.save();
  res.json({ ...flashcardSet.toObject(), id: flashcardSet._id.toString(), documentId: flashcardSet.documentId.toString() });
}));

app.delete("/api/flashcard-sets/:id", authRequired, safeAsync(async (req, res) => {
  await FlashcardSet.deleteOne({ _id: req.params.id, userId: req.user.sub });
  await addActivity(req.user.sub, "Deleted a flashcard set", "flashcards");
  res.json({ ok: true });
}));

app.post("/api/documents/:id/quizzes", authRequired, safeAsync(async (req, res) => {
  const schema = z.object({
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    totalQuestions: z.number().int().min(3).max(15)
  });
  const { difficulty, totalQuestions } = parseBody(schema, req.body);
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  const questions = await generateQuiz(document, difficulty, totalQuestions);
  const quizCount = await Quiz.countDocuments({ documentId: document._id, userId: req.user.sub });
  const quiz = await Quiz.create({
    userId: req.user.sub,
    documentId: document._id,
    name: `${document.title} Quiz ${quizCount + 1}`,
    difficulty,
    totalQuestions: questions.length,
    questions
  });
  await addActivity(req.user.sub, `Generated ${difficulty} quiz for ${document.title}`, "quiz");
  res.json({ ...quiz.toObject(), id: quiz._id.toString(), documentId: document._id.toString() });
}));

app.post("/api/quizzes/:id/start", authRequired, safeAsync(async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user.sub });
  if (!quiz) return res.status(404).json({ error: "Quiz not found." });
  quiz.status = "in_progress";
  quiz.currentQuestionIndex = 0;
  quiz.questions.forEach((question) => {
    question.selected = "";
  });
  await quiz.save();
  res.json({ ...quiz.toObject(), id: quiz._id.toString(), documentId: quiz.documentId.toString() });
}));

app.patch("/api/quizzes/:id/answer", authRequired, safeAsync(async (req, res) => {
  const schema = z.object({
    questionId: z.string(),
    option: z.string().min(1)
  });
  const { questionId, option } = parseBody(schema, req.body);
  const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user.sub });
  if (!quiz) return res.status(404).json({ error: "Quiz not found." });
  const question = quiz.questions.id(questionId);
  if (!question) return res.status(404).json({ error: "Question not found." });
  question.selected = option;
  const correct = quiz.questions.filter((item) => item.selected === item.answer).length;
  const multiplier = quiz.difficulty === "Hard" ? 1.25 : quiz.difficulty === "Easy" ? 0.9 : 1;
  quiz.score = Math.min(100, Math.round((correct / quiz.questions.length) * 100 * multiplier));
  quiz.currentQuestionIndex = Math.min(
    quiz.currentQuestionIndex + 1,
    Math.max(quiz.questions.length - 1, 0)
  );
  await quiz.save();
  res.json({ ...quiz.toObject(), id: quiz._id.toString(), documentId: quiz.documentId.toString() });
}));

app.post("/api/quizzes/:id/complete", authRequired, safeAsync(async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user.sub });
  if (!quiz) return res.status(404).json({ error: "Quiz not found." });
  quiz.status = "completed";
  const wrongQuestionIds = quiz.questions.filter((item) => item.selected !== item.answer).map((item) => item._id);
  quiz.attempts.push({
    score: quiz.score,
    wrongQuestionIds
  });
  await quiz.save();
  await addActivity(req.user.sub, `Completed ${quiz.name}`, "quiz");
  res.json({ ...quiz.toObject(), id: quiz._id.toString(), documentId: quiz.documentId.toString() });
}));

app.post("/api/quizzes/:id/retry-wrong", authRequired, safeAsync(async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user.sub });
  if (!quiz) return res.status(404).json({ error: "Quiz not found." });
  const wrongIds = quiz.questions.filter((item) => item.selected !== item.answer).map((item) => item._id.toString());
  const retriedQuestions = quiz.questions
    .filter((item) => wrongIds.includes(item._id.toString()))
    .map((item) => ({
      question: item.question,
      options: item.options,
      answer: item.answer,
      explanation: item.explanation,
      selected: ""
    }));
  const retryQuiz = await Quiz.create({
    userId: req.user.sub,
    documentId: quiz.documentId,
    name: `${quiz.name} Retry`,
    difficulty: quiz.difficulty,
    totalQuestions: retriedQuestions.length,
    questions: retriedQuestions,
    status: "draft"
  });
  res.json({ ...retryQuiz.toObject(), id: retryQuiz._id.toString(), documentId: retryQuiz.documentId.toString() });
}));

app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.issues[0]?.message || "Invalid request." });
  }
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "PDF exceeds the 15MB upload limit." });
  }
  console.error(error);
  return res.status(500).json({ error: error.message || "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
