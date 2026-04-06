import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true },
    type: { type: String, required: true },
    time: { type: String, default: "Just now" }
  },
  { timestamps: true }
);

export const Activity = mongoose.model("Activity", activitySchema);
