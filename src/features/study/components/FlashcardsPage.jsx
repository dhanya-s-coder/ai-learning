import { useMemo, useState } from "react";
import EmptyState from "../../../shared/ui/EmptyState";

function getSetStats(set) {
  return {
    reviewed: set.cards.filter((card) => card.reviewed).length,
    mastered: set.cards.filter((card) => card.mastered).length,
    due: set.cards.filter((card) => !card.dueAt || new Date(card.dueAt).getTime() <= Date.now()).length
  };
}

function getDeckStats(deck) {
  const cards = deck.sets.flatMap((set) => (set.cards || []).map((card) => ({ ...card, setId: set.id })));
  const reviewed = cards.filter((card) => card.reviewed).length;
  const mastered = cards.filter((card) => card.mastered).length;
  const due = cards.filter((card) => !card.dueAt || new Date(card.dueAt).getTime() <= Date.now()).length;
  const progress = cards.length ? Math.round((reviewed / cards.length) * 100) : 0;
  return { cards, reviewed, mastered, due, progress };
}

function getCardId(card) {
  return card?.id || card?._id || "";
}

function buildDecks(allFlashcardSets) {
  const deckMap = new Map();
  allFlashcardSets.forEach((set) => {
    const key = set.documentId;
    if (!deckMap.has(key)) {
      deckMap.set(key, {
        id: key,
        title: set.documentTitle,
        createdAt: set.createdAt,
        sets: []
      });
    }
    deckMap.get(key).sets.push(set);
  });
  return [...deckMap.values()];
}

function FlashcardsPage({ allFlashcardSets, onOpenStudy, onDeleteSet, onReviewCard, flashcardFilters, setFlashcardFilter }) {
  const decks = useMemo(() => buildDecks(allFlashcardSets), [allFlashcardSets]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [cardIndexes, setCardIndexes] = useState({});
  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId) || decks[0] || null;
  const primarySet = selectedDeck?.sets[0] || null;
  const selectedFilter = primarySet ? flashcardFilters[primarySet.id] || "all" : "all";
  const selectedStats = selectedDeck ? getDeckStats(selectedDeck) : { cards: [], reviewed: 0, mastered: 0, due: 0, progress: 0 };
  const activeIndex = selectedDeck ? Math.min(cardIndexes[selectedDeck.id] || 0, Math.max(selectedStats.cards.length - 1, 0)) : 0;
  const activeCard = selectedStats.cards[activeIndex] || null;
  const totals = decks.reduce(
    (accumulator, deck) => {
      const stats = getDeckStats(deck);
      accumulator.cards += stats.cards.length;
      accumulator.reviewed += stats.reviewed;
      accumulator.due += stats.due;
      accumulator.mastered += stats.mastered;
      return accumulator;
    },
    { cards: 0, reviewed: 0, due: 0, mastered: 0 }
  );
  const retentionRate = totals.cards ? Math.round((totals.reviewed / totals.cards) * 100) : 0;

  function handleStudyDeck() {
    const targetSetId = activeCard?.setId || primarySet?.id;
    if (!selectedDeck || !targetSetId) return;
    onOpenStudy(selectedDeck.id, targetSetId, selectedFilter);
  }

  function moveCard(direction) {
    if (!selectedDeck || selectedStats.cards.length === 0) return;
    setCardIndexes((current) => {
      const currentIndex = current[selectedDeck.id] || 0;
      const nextIndex =
        direction === "next"
          ? Math.min(currentIndex + 1, selectedStats.cards.length - 1)
          : Math.max(currentIndex - 1, 0);
      return { ...current, [selectedDeck.id]: nextIndex };
    });
  }

  async function handleInlineReview(confidence) {
    if (!activeCard || !onReviewCard) return;
    const cardToReview = activeCard;
    moveCard("next");
    await onReviewCard(cardToReview.setId, getCardId(cardToReview), confidence);
  }

  return (
    <section className="flashcards-page">
      <div className="flashcard-dashboard-stats">
        <div className="dashboard-stat-card green">
          <div className="stat-icon" aria-hidden="true">🗂️</div>
          <div><span>Total Flashcards</span><strong>{totals.cards}</strong><small>Across all decks</small></div>
        </div>
        <div className="dashboard-stat-card blue">
          <div className="stat-icon" aria-hidden="true">📘</div>
          <div><span>Cards Studied</span><strong>{totals.reviewed}</strong><small>This week</small></div>
        </div>
        <div className="dashboard-stat-card violet">
          <div className="stat-icon" aria-hidden="true">🎯</div>
          <div><span>Retention Rate</span><strong>{retentionRate}%</strong><small>Good progress</small></div>
        </div>
        <div className="dashboard-stat-card amber">
          <div className="stat-icon" aria-hidden="true">⏰</div>
          <div><span>Due for Review</span><strong>{totals.due}</strong><small>Cards to revise</small></div>
        </div>
        <div className="dashboard-stat-card mint">
          <div className="stat-icon" aria-hidden="true">🏆</div>
          <div><span>Mastered Cards</span><strong>{totals.mastered}</strong><small>Well done</small></div>
        </div>
      </div>

      {decks.length === 0 ? (
        <div className="card">
          <EmptyState title="No flashcards yet" text="Generate flashcards from any document to see them here." />
        </div>
      ) : (
        <div className="flashcards-workspace">
          <aside className="flashcard-deck-sidebar">
            <div className="card deck-list-card">
              <div className="card-head">
                <h3>Your Decks</h3>
                <span>{decks.length} Decks</span>
              </div>
              <div className="deck-list">
                {decks.map((deck) => {
                  const stats = getDeckStats(deck);
                  return (
                    <button
                      key={deck.id}
                      className={selectedDeck?.id === deck.id ? "deck-item active" : "deck-item"}
                      onClick={() => {
                        setSelectedDeckId(deck.id);
                        setCardIndexes((current) => ({ ...current, [deck.id]: current[deck.id] || 0 }));
                      }}
                    >
                      <div className="deck-icon" aria-hidden="true">📄</div>
                      <div>
                        <strong>{deck.title}</strong>
                        <span>{deck.sets.length} set(s) • {stats.cards.length} cards</span>
                      </div>
                      <small>{stats.progress}%</small>
                      <div className="deck-progress"><span style={{ width: `${stats.progress}%` }} /></div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card deck-progress-card">
              <div className="card-head">
                <h3>Deck Progress</h3>
                <span>{selectedStats.progress}%</span>
              </div>
              <div className="deck-progress-layout">
                <div className="deck-ring" style={{ "--progress": `${selectedStats.progress}%` }}>
                  <strong>{selectedStats.progress}%</strong>
                  <span>Completed</span>
                </div>
                <div className="deck-progress-legend">
                  <span><b className="green-dot" /> Learned {selectedStats.reviewed}</span>
                  <span><b className="amber-dot" /> Due now {selectedStats.due}</span>
                  <span><b className="blue-dot" /> New {Math.max(selectedStats.cards.length - selectedStats.reviewed, 0)}</span>
                </div>
              </div>
              <div className="due-card-list">
                <strong>Due cards</strong>
                {selectedStats.cards
                  .filter((card) => !card.dueAt || new Date(card.dueAt).getTime() <= Date.now())
                  .slice(0, 5)
                  .map((card, index) => (
                    <button
                      key={getCardId(card) || index}
                      onClick={() =>
                        selectedDeck &&
                        setCardIndexes((current) => ({
                          ...current,
                          [selectedDeck.id]: selectedStats.cards.findIndex((item) => getCardId(item) === getCardId(card))
                        }))
                      }
                    >
                      <span>{index + 1}</span>
                      {card.question}
                    </button>
                  ))}
                {selectedStats.due === 0 && <small>No cards are due right now.</small>}
              </div>
            </div>
          </aside>

          <main className="card flashcard-review-panel">
            <div className="flashcard-review-header">
              <div>
                <h3>{selectedDeck.title}</h3>
                <span>{selectedStats.cards.length} cards</span>
              </div>
              <div className="inline-actions">
                <button className="chip active-chip" onClick={handleStudyDeck}>
                  Review Mode
                </button>
                {primarySet && (
                  <button className="text-btn danger" onClick={() => onDeleteSet(selectedDeck.id, primarySet.id)}>
                    Delete Deck
                  </button>
                )}
              </div>
            </div>

            <div className="review-progress-line">
              <span style={{ width: `${selectedStats.progress}%` }} />
            </div>

            <div className="flashcard-stage">
              <button className="round-nav" onClick={() => moveCard("prev")} aria-label="Previous card">‹</button>
              <div className="study-preview-card">
                <div className="study-card-label">Question</div>
                <button className="star-btn" aria-label="Star card">☆</button>
                <h2>{activeCard?.question || "No card available in this deck."}</h2>
                <div className="answer-hint">Card {activeIndex + 1} of {selectedStats.cards.length}</div>
              </div>
              <button className="round-nav" onClick={() => moveCard("next")} aria-label="Next card">›</button>
            </div>

            <div className="flashcard-review-actions">
              <button className="review-hard" onClick={() => handleInlineReview("hard")} disabled={!activeCard}>✕ Don't Know</button>
              <button className="review-medium" onClick={() => handleInlineReview("medium")} disabled={!activeCard}>● Unsure</button>
              <button className="review-easy" onClick={() => handleInlineReview("easy")} disabled={!activeCard}>✓ I Know</button>
            </div>
          </main>
        </div>
      )}
    </section>
  );
}

export default FlashcardsPage;
