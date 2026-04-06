import { useEffect, useMemo, useState } from "react";

function getTone(card) {
  const confidence = card?.confidence || "new";
  if (confidence === "easy") return "easy";
  if (confidence === "medium") return "medium";
  if (confidence === "hard") return "hard";
  if (confidence === "mastered") return "mastered";
  return "fresh";
}

function FlashcardViewer({
  isOpen,
  set,
  documentTitle,
  card,
  cards,
  currentIndex,
  selectedFilter,
  onPrev,
  onNext,
  onClose,
  onFinish,
  onToggleStar,
  onReview
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [busyReview, setBusyReview] = useState("");

  useEffect(() => {
    setShowAnswer(false);
    setBusyReview("");
  }, [card?.id, card?._id]);

  const reviewedCount = useMemo(() => cards.filter((item) => item.reviewed).length, [cards]);

  if (!isOpen || !set || !card) return null;

  async function handleReview(confidence) {
    setBusyReview(confidence);
    try {
      await onReview(confidence);
      if (currentIndex >= cards.length - 1) {
        onFinish();
        return;
      }
      onNext();
    } finally {
      setBusyReview("");
    }
  }

  function handlePrimaryAction() {
    if (!showAnswer) {
      setShowAnswer(true);
      return;
    }
    if (currentIndex >= cards.length - 1) {
      onFinish();
      return;
    }
    onNext();
  }

  return (
    <div className="study-modal-overlay" onClick={onClose}>
      <div className="study-modal" onClick={(event) => event.stopPropagation()}>
        <div className="study-modal-header">
          <div>
            <span className="eyebrow">Flashcard Study Mode</span>
            <h3>{set.name}</h3>
            <p>
              {documentTitle} | Category: {selectedFilter}
            </p>
          </div>
          <div className="study-header-actions">
            <div className="score-pill">
              {reviewedCount}/{cards.length} reviewed
            </div>
            <button className={card.starred ? "star-btn active" : "star-btn"} onClick={onToggleStar}>
              {card.starred ? "Starred" : "Star"}
            </button>
            <button className="secondary-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="study-progress-row">
          <div className="progress-track large">
            <span
              className="progress-fill"
              style={{ width: `${cards.length ? ((currentIndex + 1) / cards.length) * 100 : 0}%` }}
            />
          </div>
          <span className="question-note">
            Card {currentIndex + 1} of {cards.length}
          </span>
        </div>

        <div className={`study-card-shell tone-${getTone(card)} ${showAnswer ? "revealed" : ""}`}>
          <div className="study-card-surface">
            <div className="study-card-face study-card-front">
              <span className="study-label">Question</span>
              <h4>{card.question}</h4>
              <p>Reveal the answer when you are ready, then rate the card and continue.</p>
            </div>
            <div className="study-card-face study-card-back">
              <span className="study-label">Answer</span>
              <h4>{card.answer}</h4>
              <p>
                Status: {card.confidence || "new"}
                {card.dueAt ? ` | Due ${new Date(card.dueAt).toLocaleDateString()}` : ""}
              </p>
            </div>
          </div>
        </div>

        {showAnswer && (
          <div className="review-actions review-actions-wide">
            <button className="chip review-hard" onClick={() => handleReview("hard")} disabled={Boolean(busyReview)}>
              {busyReview === "hard" ? "Saving..." : "Hard"}
            </button>
            <button className="chip review-medium" onClick={() => handleReview("medium")} disabled={Boolean(busyReview)}>
              {busyReview === "medium" ? "Saving..." : "Medium"}
            </button>
            <button className="chip review-easy" onClick={() => handleReview("easy")} disabled={Boolean(busyReview)}>
              {busyReview === "easy" ? "Saving..." : "Easy"}
            </button>
            <button className="chip review-mastered" onClick={() => handleReview("mastered")} disabled={Boolean(busyReview)}>
              {busyReview === "mastered" ? "Saving..." : "Mastered"}
            </button>
          </div>
        )}

        <div className="flashcard-controls study-controls">
          <button className="secondary-btn" onClick={onPrev} disabled={currentIndex === 0 || Boolean(busyReview)}>
            Previous
          </button>
          <button className="primary-btn study-primary-btn" onClick={handlePrimaryAction} disabled={Boolean(busyReview)}>
            {!showAnswer ? "Reveal Answer" : currentIndex >= cards.length - 1 ? "Finish Session" : "Next Card"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FlashcardViewer;
