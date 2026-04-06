import { useEffect, useRef, useState } from "react";

let pdfLibPromise;
let tesseractPromise;

async function loadPdfJs() {
  if (!pdfLibPromise) {
    pdfLibPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.mjs?url")
    ]).then(([pdfjsLib, workerModule]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
      return pdfjsLib;
    });
  }
  return pdfLibPromise;
}

async function loadTesseract() {
  if (!tesseractPromise) {
    tesseractPromise = import("tesseract.js");
  }
  return tesseractPromise;
}

function canvasToData(canvas) {
  return canvas.toDataURL("image/png");
}

function stripText(text) {
  return text.replace(/\s+/g, " ").trim();
}

export function SourceHighlights({ sources = [], onJump }) {
  if (!sources.length) return null;
  return (
    <div className="source-list">
      {sources.map((source, index) => (
        <button
          key={`${source.pageNumber}-${index}`}
          className="source-item"
          onClick={() => onJump?.(source)}
        >
          <strong>Page {source.pageNumber}</strong>
          <span>{source.excerpt}</span>
        </button>
      ))}
    </div>
  );
}

function PdfEnhancements({ previewUrl, pages = [], onOcrComplete, sourceJump }) {
  const [thumbnails, setThumbnails] = useState([]);
  const [ocring, setOcring] = useState(false);
  const pageRefs = useRef({});

  useEffect(() => {
    if (!previewUrl) return;
    let ignore = false;

    async function renderThumbs() {
      const pdfjsLib = await loadPdfJs();
      const pdf = await pdfjsLib.getDocument(previewUrl).promise;
      const thumbData = [];
      for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 6); pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.28 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        thumbData.push({
          pageNumber,
          src: canvasToData(canvas)
        });
      }
      if (!ignore) setThumbnails(thumbData);
    }

    void renderThumbs();
    return () => {
      ignore = true;
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!sourceJump?.pageNumber) return;
    const node = pageRefs.current[sourceJump.pageNumber];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [sourceJump]);

  async function runOcr() {
    if (!previewUrl) return;
    setOcring(true);
    try {
      const pdfjsLib = await loadPdfJs();
      const { createWorker } = await loadTesseract();
      const worker = await createWorker("eng");
      const pdf = await pdfjsLib.getDocument(previewUrl).promise;
      const extractedPages = [];

      for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 8); pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const result = await worker.recognize(canvas);
        extractedPages.push({
          pageNumber,
          text: stripText(result.data.text)
        });
      }

      await worker.terminate();
      onOcrComplete?.(extractedPages.filter((page) => page.text));
    } finally {
      setOcring(false);
    }
  }

  return (
    <div className="pdf-enhancements">
      {!!thumbnails.length && (
        <div className="thumb-strip">
          {thumbnails.map((thumb) => (
            <button
              key={thumb.pageNumber}
              className={sourceJump?.pageNumber === thumb.pageNumber ? "thumb-card active-thumb" : "thumb-card"}
              onClick={() => pageRefs.current[thumb.pageNumber]?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <img src={thumb.src} alt={`Page ${thumb.pageNumber}`} />
              <span>Page {thumb.pageNumber}</span>
            </button>
          ))}
        </div>
      )}

      <div className="inline-actions">
        <button className="chip" onClick={runOcr} disabled={ocring}>
          {ocring ? "Running OCR..." : "Run OCR For Scanned PDF"}
        </button>
      </div>

      <div className="page-source-list">
        {pages.map((page) => (
          <section
            key={page.pageNumber}
            className={sourceJump?.pageNumber === page.pageNumber ? "page-source-card active-source-card" : "page-source-card"}
            ref={(node) => {
              pageRefs.current[page.pageNumber] = node;
            }}
          >
            <div className="card-head">
              <h4>Page {page.pageNumber}</h4>
            </div>
            <p>{page.text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

export default PdfEnhancements;
