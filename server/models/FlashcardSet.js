import mongoose from "mongoose";

const flashcardSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    starred: { type: Boolean, default: false },
    reviewed: { type: Boolean, default: false },
    confidence: { type: String, enum: ["new", "easy", "medium", "hard", "mastered"], default: "new" },
    dueAt: { type: Date, default: null },
    reviewCount: { type: Number, default: 0 },
    mastered: { type: Boolean, default: false }
  },
  { _id: true, timestamps: true }
);

const flashcardSessionSchema = new mongoose.Schema(
  {
    reviewedCount: { type: Number, default: 0 },
    masteredCount: { type: Number, default: 0 },
    completedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const flashcardSetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    name: { type: String, required: true },
    progress: { type: Number, default: 0 },
    cards: { type: [flashcardSchema], default: [] },
    sessions: { type: [flashcardSessionSchema], default: [] }
  },
  { timestamps: true }
);

export const FlashcardSet = mongoose.model("FlashcardSet", flashcardSetSchema);
