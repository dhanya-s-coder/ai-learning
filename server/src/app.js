import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectMongo } from "../lib/mongo.js";
import routes from "./routes/index.js";
import { apiLimiter } from "./middleware/rate-limit.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await connectMongo();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);
app.use(express.json({ limit: "2mb" }));
app.use("/api", apiLimiter);
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasGeminiKey: Boolean(process.env.GEMINI_API_KEY), mongoReady: true });
});
app.use("/api", routes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
