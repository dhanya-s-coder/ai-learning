import { Activity } from "../../models/Activity.js";

export async function addActivity(userId, text, type) {
  await Activity.create({
    userId,
    text,
    type,
    time: "Just now"
  });
}
