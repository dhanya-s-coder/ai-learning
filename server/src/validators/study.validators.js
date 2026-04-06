import { z } from "zod";

export const generateFlashcardsSchema = z.object({
  count: z.number().int().min(3).max(15).optional()
});

export const flashcardReviewSchema = z.object({
  cardId: z.string(),
  confidence: z.enum(["easy", "medium", "hard", "mastered"])
});

export const generateQuizSchema = z.object({
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  totalQuestions: z.number().int().min(3).max(15)
});

export const answerQuizSchema = z.object({
  questionId: z.string(),
  option: z.string().min(1)
});
