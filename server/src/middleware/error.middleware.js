import { ZodError } from "zod";

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.issues[0]?.message || "Invalid request." });
  }
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "PDF exceeds the 15MB upload limit." });
  }
  console.error(error);
  return res.status(500).json({ error: error.message || "Internal server error." });
}

export function safeAsync(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
