import { Activity } from "../../models/Activity.js";
import { Document } from "../../models/Document.js";
import { FlashcardSet } from "../../models/FlashcardSet.js";
import { Quiz } from "../../models/Quiz.js";

export async function buildBootstrap(userId) {
  const [documents, flashcardSets, quizzes, activity] = await Promise.all([
    Document.find({ userId }).sort({ updatedAt: -1 }).lean(),
    FlashcardSet.find({ userId }).sort({ updatedAt: -1 }).lean(),
    Quiz.find({ userId }).sort({ updatedAt: -1 }).lean(),
    Activity.find({ userId }).sort({ createdAt: -1 }).limit(15).lean()
  ]);

  return {
    documents: documents.map((document) => ({
      ...document,
      id: document._id.toString(),
      flashcardSets: flashcardSets
        .filter((set) => set.documentId.toString() === document._id.toString())
        .map((set) => ({ ...set, id: set._id.toString(), documentId: set.documentId.toString() })),
      quizzes: quizzes
        .filter((quiz) => quiz.documentId.toString() === document._id.toString())
        .map((quiz) => ({ ...quiz, id: quiz._id.toString(), documentId: quiz.documentId.toString() }))
    })),
    activity: activity.map((item) => ({ ...item, id: item._id.toString() }))
  };
}
