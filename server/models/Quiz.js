import mongoose from "mongoose";

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    answer: { type: String, required: true },
    explanation: { type: String, default: "" },
    selected: { type: String, default: "" }
  },
  { _id: true }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    score: { type: Number, default: 0 },
    wrongQuestionIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    completedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    name: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "in_progress", "completed"], default: "draft" },
    currentQuestionIndex: { type: Number, default: 0 },
    questions: { type: [quizQuestionSchema], default: [] },
    attempts: { type: [quizAttemptSchema], default: [] }
  },
  { timestamps: true }
);

export const Quiz = mongoose.model("Quiz", quizSchema);
