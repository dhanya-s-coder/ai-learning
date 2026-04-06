import { useEffect, useState } from "react";

export function UploadForm({ uploadForm, setUploadForm, handleUpload, compact = false, uploading, uploadError }) {
  return (
    <form className={compact ? "upload-form compact" : "upload-form"} onSubmit={handleUpload}>
      <label>
        Document Title
        <input
          value={uploadForm.title}
          onChange={(event) => setUploadForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="e.g. React Interview Prep"
        />
      </label>
      <label>
        PDF File
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => setUploadForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
        />
      </label>
      {uploadError && <div className="error-text">{uploadError}</div>}
      <button className="primary-btn" type="submit" disabled={uploading}>
        {uploading ? "Uploading PDF..." : "Upload Document"}
      </button>
    </form>
  );
}

export function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function FlashcardViewer({
  set,
  card,
  currentIndex,
  onPrev,
  onNext,
  onToggleStar,
  onReview
}) {
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    setShowAnswer(false);
  }, [card.id]);

  return (
    <div className="flashcard-viewer">
      <div className="flashcard-main">
        <span>
          Card {currentIndex + 1} / {set.cards.length}
        </span>
        <h4>{card.question}</h4>
        {showAnswer ? (
          <>
            <p>{card.answer}</p>
            <div className="review-actions">
              <button className="chip" onClick={() => onReview("hard")}>
                Hard
              </button>
              <button className="chip" onClick={() => onReview("easy")}>
                Easy
              </button>
              <button className="chip active-chip" onClick={() => onReview("mastered")}>
                Mastered
              </button>
            </div>
            <small className="question-note">
              Status: {card.confidence || "new"} {card.dueAt ? `| Due: ${new Date(card.dueAt).toLocaleDateString()}` : ""}
            </small>
          </>
        ) : (
          <button className="chip" onClick={() => setShowAnswer(true)}>
            Click to reveal answer
          </button>
        )}
      </div>
      <div className="flashcard-controls">
        <button className="secondary-btn" onClick={onPrev}>
          Previous
        </button>
        <button className={card.starred ? "star-btn active" : "star-btn"} onClick={onToggleStar}>
          {card.starred ? "Starred" : "Star"}
        </button>
        <button className="secondary-btn" onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
}

export function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
