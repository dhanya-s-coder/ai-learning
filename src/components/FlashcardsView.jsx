const FlashcardsView = ({
  documents,
  selectedFlashcardSet,
  setSelectedFlashcardSet,
  currentCardIndex,
  setCurrentCardIndex,
  revealAnswer,
  setRevealAnswer,
  onToggleStar,
  onDeleteSet
}) => {
  const allSets = documents.flatMap((doc) =>
    doc.flashcardSets.map((set) => ({
      ...set,
      documentTitle: doc.title,
      documentId: doc.id
    }))
  );

  const activeSet =
    allSets.find((set) => set.id === selectedFlashcardSet) || allSets[0] || null;
  const activeCard = activeSet?.cards[currentCardIndex] || null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Flashcards</p>
          <h2>All flashcard sets in one place</h2>
        </div>
      </div>

      <div className="split-grid flash-layout">
        <section className="panel">
          <div className="panel-title">
            <h3>All Sets</h3>
            <span>Across every document</span>
          </div>
          <div className="set-list">
            {allSets.map((set) => (
              <button
                key={set.id}
                className={set.id === activeSet?.id ? "set-row active" : "set-row"}
                onClick={() => {
                  setSelectedFlashcardSet(set.id);
                  setCurrentCardIndex(0);
                  setRevealAnswer(false);
                }}
              >
                <div>
                  <h4>{set.title}</h4>
                  <p>{set.documentTitle}</p>
                </div>
                <strong>{set.progress}%</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          {activeSet && activeCard ? (
            <>
              <div className="collection-top">
                <div>
                  <h4>{activeSet.title}</h4>
                  <p>{activeSet.documentTitle}</p>
                </div>
                <button
                  className="danger-btn"
                  onClick={() => onDeleteSet(activeSet.documentId, activeSet.id)}
                >
                  Delete Set
                </button>
              </div>

              <div className="flashcard-player">
                <span>
                  Card {currentCardIndex + 1} of {activeSet.cards.length}
                </span>
                <h3>{activeCard.question}</h3>
                <button
                  className="ghost-btn"
                  onClick={() => setRevealAnswer(!revealAnswer)}
                >
                  {revealAnswer ? "Hide Answer" : "Click to Reveal Answer"}
                </button>
                {revealAnswer && <p className="answer-box">{activeCard.answer}</p>}
                <div className="player-actions">
                  <button
                    className="ghost-btn"
                    onClick={() =>
                      setCurrentCardIndex((index) => Math.max(index - 1, 0))
                    }
                  >
                    Previous
                  </button>
                  <button
                    className={activeCard.starred ? "star-btn active" : "star-btn"}
                    onClick={() =>
                      onToggleStar(activeSet.documentId, activeSet.id, activeCard.id)
                    }
                  >
                    {activeCard.starred ? "Starred" : "Star"}
                  </button>
                  <button
                    className="primary-btn"
                    onClick={() =>
                      setCurrentCardIndex((index) =>
                        Math.min(index + 1, activeSet.cards.length - 1)
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">No flashcard set available yet.</div>
          )}
        </section>
      </div>
    </div>
  );
};

export default FlashcardsView;
