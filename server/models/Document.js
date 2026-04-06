import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["assistant", "user"], required: true },
    text: { type: String, required: true },
    sources: {
      type: [
        new mongoose.Schema(
          {
            pageNumber: Number,
            excerpt: String
          },
          { _id: false }
        )
      ],
      default: []
    }
  },
  { _id: true, timestamps: true }
);

const uploadHistorySchema = new mongoose.Schema(
  {
    event: { type: String, required: true },
    detail: { type: String, required: true }
  },
  { _id: true, timestamps: true }
);

const sourceSchema = new mongoose.Schema(
  {
    pageNumber: { type: Number, required: true },
    excerpt: { type: String, default: "" }
  },
  { _id: false }
);

const pageSchema = new mongoose.Schema(
  {
    pageNumber: { type: Number, required: true },
    text: { type: String, default: "" }
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    filename: { type: String, required: true },
    storedFilename: { type: String, required: true },
    sizeLabel: { type: String, required: true },
    topic: { type: String, default: "" },
    previewUrl: { type: String, default: "" },
    pageCount: { type: Number, default: 0 },
    content: { type: String, default: "" },
    pages: { type: [pageSchema], default: [] },
    summary: { type: String, default: "" },
    summarySources: { type: [sourceSchema], default: [] },
    conceptExplanation: { type: String, default: "" },
    conceptSources: { type: [sourceSchema], default: [] },
    keywords: { type: [String], default: [] },
    ocrStatus: {
      type: String,
      enum: ["not_needed", "pending", "completed", "failed"],
      default: "not_needed"
    },
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing"
    },
    chat: { type: [chatSchema], default: [] },
    uploadHistory: { type: [uploadHistorySchema], default: [] }
  },
  { timestamps: true }
);

export const Document = mongoose.model("Document", documentSchema);
