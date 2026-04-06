export function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function nowLabel() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function toPublicDocument(document, flashcardSets, quizzes) {
  return {
    ...document,
    flashcardSets,
    quizzes
  };
}
