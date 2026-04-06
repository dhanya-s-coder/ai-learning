import EmptyState from "../../../shared/ui/EmptyState";

const FLASHCARD_FILTERS = [
  { id: "all", label: "All" },
  { id: "starred", label: "Starred" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
  { id: "mastered", label: "Mastered" }
];

function getFilterCards(set, filter) {
  if (filter === "all") return set.cards;
  if (filter === "starred") return set.cards.filter((card) => card.starred);
  return set.cards.filter((card) => (card.confidence || "new") === filter);
}

function getSetStats(set) {
  return {
    reviewed: set.cards.filter((card) => card.reviewed).length,
    starred: set.cards.filter((card) => card.starred).length,
    mastered: set.cards.filter((card) => card.mastered).length,
    due: set.cards.filter((card) => !card.dueAt || new Date(card.dueAt).getTime() <= Date.now()).length
  };
}

function FlashcardsPage({ allFlashcardSets, onOpenStudy, onDeleteSet, flashcardFilters, setFlashcardFilter }) {
  const totals = allFlashcardSets.reduce(
    (accumulator, set) => {
      const stats = getSetStats(set);
      accumulator.cards += set.cards.length;
      accumulator.reviewed += stats.reviewed;
      accumulator.starred += stats.starred;
      accumulator.mastered += stats.mastered;
      accumulator.due += stats.due;
      return accumulator;
    },
    { cards: 0, reviewed: 0, starred: 0, mastered: 0, due: 0 }
  );

  return (
    <section className="page-grid">
      <div className="card flashcards-hero">
        <div className="card-head">
          <div>
            <h3>Flashcard Studio</h3>
            <span>Pick a category, track progress, and launch a focused full-screen review session.</span>
          </div>
          <div className="flashcards-summary-pills">
            <span>{allFlashcardSets.length} sets</span>
            <span>{totals.cards} cards</span>
            <span>{totals.due} due now</span>
            <span>{totals.mastered} mastered</span>
          </div>
        </div>
      </div>

      <div className="flashcards-grid">
        {allFlashcardSets.map((set) => {
          const selectedFilter = flashcardFilters[set.id] || "all";
          const filteredCards = getFilterCards(set, selectedFilter);
          const stats = getSetStats(set);
          return (
            <div key={set.id} className="card flashcard-library-card">
              <div className="set-head">
                <div>
                  <strong>{set.name}</strong>
                  <span>{set.documentTitle}</span>
                </div>
                <div className="inline-actions">
                  <button
                    className="primary-btn"
                    onClick={() => onOpenStudy(set.documentId, set.id, selectedFilter)}
                    disabled={filteredCards.length === 0}
                  >
                    Study {filteredCards.length ? `${filteredCards.length} Cards` : "Unavailable"}
                  </button>
                  <button className="text-btn danger" onClick={() => onDeleteSet(set.documentId, set.id)}>
                    Delete
                  </button>
                </div>
              </div>

              <div className="flashcard-overview-grid">
                <div className="flashcard-overview-stat">
                  <span>Progress</span>
                  <strong>{set.progress}%</strong>
                </div>
                <div className="flashcard-overview-stat">
                  <span>Reviewed</span>
                  <strong>{stats.reviewed}</strong>
                </div>
                <div className="flashcard-overview-stat">
                  <span>Due</span>
                  <strong>{stats.due}</strong>
                </div>
                <div className="flashcard-overview-stat">
                  <span>Starred</span>
                  <strong>{stats.starred}</strong>
                </div>
              </div>

              <div className="progress-track">
                <span className="progress-fill" style={{ width: `${set.progress}%` }} />
              </div>

              <div className="filter-row">
                {FLASHCARD_FILTERS.map((filter) => {
                  const count = getFilterCards(set, filter.id).length;
                  return (
                    <button
                      key={filter.id}
                      className={selectedFilter === filter.id ? "chip active-chip" : "chip"}
                      onClick={() => setFlashcardFilter(set.id, filter.id)}
                    >
                      {filter.label} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="inline-meta">
                <span>{filteredCards.length} cards in selected category</span>
                <span>{stats.mastered} mastered</span>
              </div>
            </div>
          );
        })}
      </div>

      {allFlashcardSets.length === 0 && (
        <div className="card">
          <EmptyState title="No flashcards yet" text="Generate flashcards from any document to see them here." />
        </div>
      )}
    </section>
  );
}

export default FlashcardsPage;
