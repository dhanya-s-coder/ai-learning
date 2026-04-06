let pdfjsPromise;

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }

  return pdfjsPromise;
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").replace(/\s([,.!?;:])/g, "$1").trim();
}

export async function extractPdfText(buffer) {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true
  }).promise;

  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(normalizeText(text));
  }

  return {
    pageCount: pdf.numPages,
    text: pages.filter(Boolean).join("\n\n"),
    pages: pages.map((text, index) => ({
      pageNumber: index + 1,
      text
    }))
  };
}
