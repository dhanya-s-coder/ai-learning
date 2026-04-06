import { z } from "zod";

export const renameDocumentSchema = z.object({
  title: z.string().trim().min(2)
});

export const explainConceptSchema = z.object({
  concept: z.string().trim().min(2)
});

export const chatSchema = z.object({
  message: z.string().trim().min(2)
});
