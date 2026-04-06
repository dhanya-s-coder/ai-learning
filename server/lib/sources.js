function normalize(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function sentenceSplit(text) {
  return normalize(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30);
}

function queryTerms(text) {
  return (normalize(text).toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || []).slice(0, 24);
}

export function buildSourceMatches(document, query, limit = 3) {
  const terms = queryTerms(query);
  const pageEntries = document.pages?.length
    ? document.pages
    : [{ pageNumber: 1, text: document.content || "" }];

  const matches = [];
  for (const page of pageEntries) {
    for (const sentence of sentenceSplit(page.text)) {
      const score = terms.reduce(
        (total, term) => total + (sentence.toLowerCase().includes(term) ? 1 : 0),
        0
      );
      if (score > 0) {
        matches.push({
          pageNumber: page.pageNumber,
          excerpt: sentence,
          score
        });
      }
    }
  }

  return matches
    .sort((a, b) => b.score - a.score || a.pageNumber - b.pageNumber)
    .slice(0, limit)
    .map(({ pageNumber, excerpt }) => ({ pageNumber, excerpt }));
}
