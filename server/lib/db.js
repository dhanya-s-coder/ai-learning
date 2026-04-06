import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSONFilePreset } from "lowdb/node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "../data/db.json");

export const db = await JSONFilePreset(dbPath, {
  users: [],
  documents: [],
  flashcardSets: [],
  quizzes: [],
  activities: []
});

export async function writeDb() {
  await db.write();
}
