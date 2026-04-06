const docTabs = [
  { id: "content", label: "Content" },
  { id: "chat", label: "Chat" },
  { id: "actions", label: "AI Actions" },
  { id: "flashcards", label: "Flashcards" },
  { id: "quizzes", label: "Quizzes" }
];

const DocumentsView = ({
  documents,
  activeDocumentId,
  setActiveDocumentId,
  activeDocTab,
  setActiveDocTab,
  onGenerateFlashcards,
  onGenerateQuiz
}) => {
  const activeDocument =
    documents.find((doc) => doc.id === activeDocumentId) || documents[0];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Documents</p>
          <h2>Upload and explore study material</h2>
        </div>
        <button className="primary-btn">+ Upload New Document</button>
      </div>

      <div className="document-library">
        {documents.map((doc) => (
          <button
            key={doc.id}
            className={
              doc.id === activeDocument.id ? "library-card active" : "library-card"
            }
            onClick={() => setActiveDocumentId(doc.id)}
          >
            <h3>{doc.title}</h3>
            <p>
              {doc.category} . {doc.size}
            </p>
            <span>{doc.updatedAt}</span>
          </button>
        ))}
      </div>

      <section className="panel">
        <div className="document-top">
          <div>
            <h3>{activeDocument.title}</h3>
            <p>
              {activeDocument.pages} pages . progress {activeDocument.progress}%
            </p>
          </div>
          <div className="tab-switcher">
            {docTabs.map((tab) => (
              <button
                key={tab.id}
                className={activeDocTab === tab.id ? "active" : ""}
                onClick={() => setActiveDocTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeDocTab === "content" && (
          <div className="content-box">
            <p className="muted-text">
              Yahan uploaded PDF ka extracted raw content dikhega.
            </p>
            <pre>{activeDocument.rawContent}</pre>
          </div>
        )}

        {activeDocTab === "chat" && (
          <div className="chat-box">
            {activeDocument.chat.map((msg) => (
              <div
                key={msg.id}
                className={msg.role === "assistant" ? "chat-msg ai" : "chat-msg user"}
              >
                <strong>{msg.role === "assistant" ? "AI" : "You"}</strong>
                <p>{msg.text}</p>
              </div>
            ))}
            <div className="ask-bar">
              <input placeholder="Ask anything related to this document..." />
              <button className="primary-btn">Ask AI</button>
            </div>
          </div>
        )}

        {activeDocTab === "actions" && (
          <div className="actions-grid">
            <div className="action-card">
              <h4>Generate Summary</h4>
              <p>Poore PDF ka short summary ek click mein.</p>
              <div className="action-output">{activeDocument.summary}</div>
              <button className="primary-btn">Summarize</button>
            </div>
            <div className="action-card">
              <h4>Explain Any Concept</h4>
              <p>Specific topic ko detail mein samjhao.</p>
              <input placeholder="e.g. useEffect cleanup" />
              <button className="ghost-btn">Explain in Detail</button>
            </div>
          </div>
        )}

        {activeDocTab === "flashcards" && (
          <div className="collection-panel">
            <div className="collection-top">
              <div>
                <h4>Flashcard Sets</h4>
                <p>Ek document ke multiple sets generate ho sakte hain.</p>
              </div>
              <button
                className="primary-btn"
                onClick={() => onGenerateFlashcards(activeDocument.id)}
              >
                Generate Flashcards
              </button>
            </div>
            <div className="collection-grid">
              {activeDocument.flashcardSets.map((set) => (
                <article className="set-card" key={set.id}>
                  <h5>{set.title}</h5>
                  <p>{set.cards.length} cards</p>
                  <span>{set.progress}% reviewed</span>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeDocTab === "quizzes" && (
          <div className="collection-panel">
            <div className="collection-top">
              <div>
                <h4>Quiz Generator</h4>
                <p>User level aur number of questions choose kar sakta hai.</p>
              </div>
              <button
                className="primary-btn"
                onClick={() => onGenerateQuiz(activeDocument.id)}
              >
                Generate Quiz
              </button>
            </div>
            <div className="quiz-builder">
              <input placeholder="Difficulty: Easy / Medium / Hard" />
              <input placeholder="Number of questions" />
            </div>
            <div className="collection-grid">
              {activeDocument.quizzes.map((quiz) => (
                <article className="set-card" key={quiz.id}>
                  <h5>{quiz.title}</h5>
                  <p>
                    {quiz.questions} questions . {quiz.difficulty}
                  </p>
                  <span>Best score: {quiz.score}%</span>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default DocumentsView;
