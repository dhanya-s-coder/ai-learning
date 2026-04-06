import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Document } from "../../models/Document.js";
import { FlashcardSet } from "../../models/FlashcardSet.js";
import { Quiz } from "../../models/Quiz.js";
import { User } from "../../models/User.js";
import { answerQuestion, explainConcept, generateSummary } from "../../lib/ai.js";
import { getTopKeywords } from "../../lib/heuristics.js";
import { extractPdfText } from "../../lib/pdf.js";
import { buildSourceMatches } from "../../lib/sources.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { safeAsync } from "../middleware/error.middleware.js";
import { buildBootstrap } from "../services/bootstrap.service.js";
import { addActivity } from "../services/activity.service.js";
import { chatSchema, explainConceptSchema, renameDocumentSchema } from "../validators/document.validators.js";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../uploads");

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === "application/pdf")
});

const router = Router();

async function getOwnedDocument(documentId, userId) {
  return Document.findOne({ _id: documentId, userId });
}

router.get("/bootstrap", authRequired, safeAsync(async (req, res) => {
  const user = await User.findById(req.user.sub).lean();
  if (!user) return res.status(401).json({ error: "User not found." });
  const bundle = await buildBootstrap(user._id);
  res.json({
    user: { id: user._id.toString(), name: user.name, email: user.email },
    documents: bundle.documents,
    activity: bundle.activity
  });
}));

router.post("/documents", authRequired, upload.single("file"), safeAsync(async (req, res) => {
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
    document.pages = pdfData.pages;
    document.keywords = getTopKeywords(document.content, 8);
    document.topic = document.keywords.slice(0, 3).join(", ") || "Uploaded PDF";
    document.summary = await generateSummary(document);
    document.summarySources = buildSourceMatches(document, document.summary);
    document.status = "ready";
    document.chat = [{ role: "assistant", text: `Your PDF "${document.title}" is ready. Ask anything or generate study material.` }];
    document.uploadHistory.push({ event: "processed", detail: "Document text extracted successfully." });
  } catch {
    document.status = "failed";
    document.uploadHistory.push({ event: "failed", detail: "Document processing failed." });
  }

  await document.save();
  await addActivity(req.user.sub, `Uploaded ${document.title}`, "upload");
  res.json({ ...document.toObject(), id: document._id.toString(), flashcardSets: [], quizzes: [] });
}));

router.patch("/documents/:id/ocr", authRequired, safeAsync(async (req, res) => {
  const schema = z.object({
    pages: z.array(
      z.object({
        pageNumber: z.number().int().min(1),
        text: z.string().min(1)
      })
    ).min(1)
  });
  const { pages } = schema.parse(req.body);
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  document.pages = pages;
  document.content = pages.map((page) => page.text).join("\n\n");
  document.pageCount = Math.max(document.pageCount || 0, pages.length);
  document.keywords = getTopKeywords(document.content, 8);
  document.topic = document.keywords.slice(0, 3).join(", ") || document.topic;
  document.ocrStatus = "completed";
  document.status = "ready";
  document.uploadHistory.push({ event: "ocr", detail: "OCR fallback completed for scanned pages." });
  await document.save();
  await addActivity(req.user.sub, `Ran OCR for ${document.title}`, "ocr");
  res.json({ ...document.toObject(), id: document._id.toString() });
}));

router.patch("/documents/:id", authRequired, safeAsync(async (req, res) => {
  const { title } = renameDocumentSchema.parse(req.body);
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  document.title = title;
  document.uploadHistory.push({ event: "rename", detail: `Document renamed to ${title}.` });
  await document.save();
  await addActivity(req.user.sub, `Renamed ${title}`, "document");
  res.json({ ...document.toObject(), id: document._id.toString() });
}));

router.delete("/documents/:id", authRequired, safeAsync(async (req, res) => {
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

router.post("/documents/:id/reprocess", authRequired, safeAsync(async (req, res) => {
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  const fileBuffer = await fs.readFile(path.resolve(uploadsDir, document.storedFilename));
  document.status = "processing";
  await document.save();
  try {
    const pdfData = await extractPdfText(fileBuffer);
    document.pageCount = pdfData.pageCount;
    document.content = pdfData.text || document.content;
    document.pages = pdfData.pages;
    document.keywords = getTopKeywords(document.content, 8);
    document.summary = await generateSummary(document);
    document.summarySources = buildSourceMatches(document, document.summary);
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

router.post("/documents/:id/summary", authRequired, safeAsync(async (req, res) => {
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  document.summary = await generateSummary(document);
  document.summarySources = buildSourceMatches(document, document.summary);
  await document.save();
  await addActivity(req.user.sub, `Generated summary for ${document.title}`, "summary");
  res.json({ summary: document.summary, sources: document.summarySources });
}));

router.post("/documents/:id/explain", authRequired, safeAsync(async (req, res) => {
  const { concept } = explainConceptSchema.parse(req.body);
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  document.conceptExplanation = await explainConcept(document, concept);
  document.conceptSources = buildSourceMatches(document, concept);
  await document.save();
  await addActivity(req.user.sub, `Explained concept from ${document.title}`, "explain");
  res.json({ conceptExplanation: document.conceptExplanation, sources: document.conceptSources });
}));

router.post("/documents/:id/chat", authRequired, safeAsync(async (req, res) => {
  const { message } = chatSchema.parse(req.body);
  const document = await getOwnedDocument(req.params.id, req.user.sub);
  if (!document) return res.status(404).json({ error: "Document not found." });
  const answer = await answerQuestion(document, message, document.chat);
  const sources = buildSourceMatches(document, `${message}\n${answer}`);
  document.chat.push({ role: "user", text: message }, { role: "assistant", text: answer, sources });
  await document.save();
  await addActivity(req.user.sub, `Asked AI about ${document.title}`, "chat");
  res.json({ chat: document.chat });
}));

export default router;
