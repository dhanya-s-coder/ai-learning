function normalizeWhitespace(text) {
  return text
    .replace(/\bDr\.\s*Pranay Kumar Saha\s*\|\s*OOP-Java\b/gi, "")
    .replace(/\bPranay Kumar Saha\s*\|\s*OOP-Java\b/gi, "")
    .replace(/\s+\d{1,3}\s*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s([,.!?;:])/g, "$1")
    .trim();
}

function splitSentences(text) {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);
}

function tokenize(text) {
  return normalizeWhitespace(text).toLowerCase().match(/[a-z][a-z0-9+-]{2,}/g) || [];
}

const STOP_WORDS = new Set(["the","and","for","with","that","this","from","into","your","their","about","have","will","when","where","which","what","while","there","these","those","then","them","they","also","been","being","were","because","through","using","used","only","most","more","very","much","many","does","just","like","make","made","over","after","before","under","between","across","document","page","pages"]);

export function getTopKeywords(text, limit = 8) {
  const counts = new Map();
  tokenize(text).forEach((word) => {
    if (STOP_WORDS.has(word)) return;
    counts.set(word, (counts.get(word) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
}

function selectBestSentences(text, limit = 3) {
  const sentences = splitSentences(text);
  const keywords = new Set(getTopKeywords(text, 12));
  return sentences
    .map((sentence) => ({
      sentence,
      score: tokenize(sentence).reduce((total, word) => total + (keywords.has(word) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score || b.sentence.length - a.sentence.length)
    .slice(0, limit)
    .map((item) => item.sentence);
}

export function fallbackSummary(document) {
  const keywords = getTopKeywords(document.content, 8);
  const sentences = selectBestSentences(document.content, 8);
  if (!sentences.length) {
    return `# ${document.title}\n\n## **Summary**\n- The document was uploaded successfully, but readable text was too limited for a detailed summary.`;
  }

  const midpoint = Math.ceil(sentences.length / 2);
  const firstGroup = sentences.slice(0, midpoint);
  const secondGroup = sentences.slice(midpoint);
  const keywordLine = keywords.length ? `\n\n## **Important Terms**\n${keywords.map((word) => `- ${word}`).join("\n")}` : "";

  return `# ${document.title}

## **Main Ideas**
${firstGroup.map((sentence) => `- ${sentence}`).join("\n")}

## **Revision Notes**
${(secondGroup.length ? secondGroup : firstGroup.slice(0, 3)).map((sentence) => `- ${sentence}`).join("\n")}${keywordLine}`;
}

export function fallbackFlashcards(document, count = 8) {
  return selectBestSentences(document.content, count).map((sentence, index) => ({
    question: `Flashcard ${index + 1}: What is the key idea here?`,
    answer: sentence
  }));
}

export function fallbackQuiz(document, totalQuestions = 5) {
  const keywords = getTopKeywords(document.content, 12);
  return Array.from({ length: totalQuestions }, (_, index) => {
    const answer = keywords[index % Math.max(keywords.length, 1)] || "Concept";
    const options = [answer, "Architecture", "Workflow", "Revision"].map((option, optionIndex) =>
      optionIndex === 0 ? option[0].toUpperCase() + option.slice(1) : option
    );
    return {
      question: `Which topic is central to ${document.title}?`,
      options,
      answer: options[0],
      explanation: "This fallback quiz was derived from extracted keywords."
    };
  });
}
