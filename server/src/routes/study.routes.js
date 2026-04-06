import { Router } from "express";
import { Document } from "../../models/Document.js";
import { FlashcardSet } from "../../models/FlashcardSet.js";
import { Quiz } from "../../models/Quiz.js";
import { generateFlashcards, generateQuiz } from "../../lib/ai.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { safeAsync } from "../middleware/error.middleware.js";
import { addActivity } from "../services/activity.service.js";
import {
  answerQuizSchema,
  flashcardReviewSchema,
  generateFlashcardsSchema,
  generateQuizSchema
} from "../validators/study.validators.js";

const router = Router();

function scoreCard(confidence, currentDueAt) {
  const now = new Date();
  if (confidence === "easy") return { dueAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), mastered: false };
  if (confidence === "medium") return { dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), mastered: false };
  if (confidence === "hard") return { dueAt: new Date(now.getTime() + 12 * 60 * 60 * 1000), mastered: false };
  if (confidence === "mastered") return { dueAt: currentDueAt || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), mastered: true };
  return { dueAt: currentDueAt || now, mastered: false };
}

router.post("/documents/:id/flashcards", authRequired, safeAsync(async (req, res) => {
  const { count = 8 } = generateFlashcardsSchema.parse(req.body);
  const document = await Document.findOne({ _id: req.params.id, userId: req.user.sub });
  if (!document) return res.status(404).json({ error: "Document not found." });
  const cards = await generateFlashcards(document, count);
  const setCount = await FlashcardSet.countDocuments({ documentId: document._id, userId: req.user.sub });
  const flashcardSet = await FlashcardSet.create({
    userId: req.user.sub,
    documentId: document._id,
    name: `${document.title} Set ${setCount + 1}`,
    cards: cards.map((card) => ({ question: card.question, answer: card.answer, dueAt: new Date() }))
  });
  await addActivity(req.user.sub, `Generated flashcards for ${document.title}`, "flashcards");
  res.json({ ...flashcardSet.toObject(), id: flashcardSet._id.toString(), documentId: document._id.toString() });
}));

router.patch("/flashcard-sets/:id/review", authRequired, safeAsync(async (req, res) => {
  const { cardId, confidence } = flashcardReviewSchema.parse(req.body);
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
    reviewedCount,
    masteredCount: flashcardSet.cards.filter((item) => item.mastered).length
  });
  await flashcardSet.save();
  res.json({ ...flashcardSet.toObject(), id: flashcardSet._id.toString(), documentId: flashcardSet.documentId.toString() });
}));

router.patch("/flashcards/:id/star", authRequired, safeAsync(async (req, res) => {
  const flashcardSet = await FlashcardSet.findOne({ userId: req.user.sub, "cards._id": req.params.id });
  if (!flashcardSet) return res.status(404).json({ error: "Flashcard not found." });
  const card = flashcardSet.cards.id(req.params.id);
  card.starred = !card.starred;
  await flashcardSet.save();
  res.json({ ...flashcardSet.toObject(), id: flashcardSet._id.toString(), documentId: flashcardSet.documentId.toString() });
}));

router.delete("/flashcard-sets/:id", authRequired, safeAsync(async (req, res) => {
  await FlashcardSet.deleteOne({ _id: req.params.id, userId: req.user.sub });
  await addActivity(req.user.sub, "Deleted a flashcard set", "flashcards");
  res.json({ ok: true });
}));

router.post("/documents/:id/quizzes", authRequired, safeAsync(async (req, res) => {
  const { difficulty, totalQuestions } = generateQuizSchema.parse(req.body);
  const document = await Document.findOne({ _id: req.params.id, userId: req.user.sub });
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

router.post("/quizzes/:id/start", authRequired, safeAsync(async (req, res) => {
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

router.patch("/quizzes/:id/answer", authRequired, safeAsync(async (req, res) => {
  const { questionId, option } = answerQuizSchema.parse(req.body);
  const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user.sub });
  if (!quiz) return res.status(404).json({ error: "Quiz not found." });
  const question = quiz.questions.id(questionId);
  if (!question) return res.status(404).json({ error: "Question not found." });
  question.selected = option;
  const correct = quiz.questions.filter((item) => item.selected === item.answer).length;
  const multiplier = quiz.difficulty === "Hard" ? 1.25 : quiz.difficulty === "Easy" ? 0.9 : 1;
  quiz.score = Math.min(100, Math.round((correct / quiz.questions.length) * 100 * multiplier));
  quiz.currentQuestionIndex = Math.min(quiz.currentQuestionIndex + 1, Math.max(quiz.questions.length - 1, 0));
  await quiz.save();
  res.json({ ...quiz.toObject(), id: quiz._id.toString(), documentId: quiz.documentId.toString() });
}));

router.post("/quizzes/:id/complete", authRequired, safeAsync(async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user.sub });
  if (!quiz) return res.status(404).json({ error: "Quiz not found." });
  quiz.status = "completed";
  const wrongQuestionIds = quiz.questions.filter((item) => item.selected !== item.answer).map((item) => item._id);
  quiz.attempts.push({ score: quiz.score, wrongQuestionIds });
  await quiz.save();
  await addActivity(req.user.sub, `Completed ${quiz.name}`, "quiz");
  res.json({ ...quiz.toObject(), id: quiz._id.toString(), documentId: quiz.documentId.toString() });
}));

router.post("/quizzes/:id/retry-wrong", authRequired, safeAsync(async (req, res) => {
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

export default router;
