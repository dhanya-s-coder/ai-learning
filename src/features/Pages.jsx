import { DOC_TABS, QUICK_PROMPTS } from "./constants";
import { EmptyState, FlashcardViewer, StatCard, UploadForm } from "./Shared";

export function DashboardPage({ stats, activity, documents, uploadForm, setUploadForm, handleUpload, uploading, uploadError }) {
  return (
    <section className="page-grid">
      <div className="stats-grid">
        <StatCard label="Documents" value={stats.docs} tone="green" />
        <StatCard label="Flashcard Sets" value={stats.flashcards} tone="blue" />
        <StatCard label="Quizzes" value={stats.quizzes} tone="pink" />
        <StatCard label="Cards Available" value={stats.reviewed} tone="amber" />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Recent Activity</h3>
          <span>{activity.length} items</span>
        </div>
        <div className="activity-list">
          {activity.map((item) => (
            <div key={item.id} className="activity-item">
              <div>
                <strong>{item.text}</strong>
                <span>{item.type}</span>
              </div>
              <time>{item.time}</time>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-head">
            <h3>Quick Upload</h3>
            <span>Add a new PDF</span>
          </div>
          <UploadForm
            uploadForm={uploadForm}
            setUploadForm={setUploadForm}
            handleUpload={handleUpload}
            uploading={uploading}
            uploadError={uploadError}
          />
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Recent Documents</h3>
            <span>{documents.length} total</span>
          </div>
          <div className="global-list">
            {documents.slice(0, 4).map((document) => (
              <div key={document.id} className="global-card">
                <div>
                  <strong>{document.title}</strong>
                  <span>
                    {document.pageCount} pages | {document.topic}
                  </span>
                </div>
                <div className="inline-meta">
                  <span>{document.flashcardSets.length} sets</span>
                  <span>{document.quizzes.length} quizzes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function DocumentsPage(props) {
  const {
    appState,
    setAppState,
    selectedDocument,
    uploadForm,
    setUploadForm,
    handleUpload,
    uploading,
    uploadError,
    chatInput,
    setChatInput,
    handleSendChat,
    conceptInput,
    setConceptInput,
    handleGenerateSummary,
    handleExplainConcept,
    handleQuickPrompt,
    handleGenerateFlashcards,
    flashcardIndexes,
    changeFlashcardIndex,
    handleToggleStar,
    handleDeleteFlashcardSet,
    quizForm,
    setQuizForm,
    handleGenerateQuiz,
    handleSelectQuizOption,
    handleRenameDocument,
    handleDeleteDocument,
    handleReprocessDocument,
    handleStartQuiz,
    handleCompleteQuiz,
    handleRetryWrongQuiz,
    handleReviewFlashcard,
  } = props;

  return (
    <section className="documents-layout">
      <div className="card">
        <div className="card-head">
          <h3>My Documents</h3>
          <span>{appState.documents.length} files</span>
        </div>
        <UploadForm
          uploadForm={uploadForm}
          setUploadForm={setUploadForm}
          handleUpload={handleUpload}
          compact
          uploading={uploading}
          uploadError={uploadError}
        />
        <div className="document-list">
          {appState.documents.map((document) => (
            <button
              key={document.id}
              className={selectedDocument.id === document.id ? "document-item active" : "document-item"}
              onClick={() => setAppState((current) => ({ ...current, selectedDocumentId: document.id, activeDocTab: "content" }))}
            >
              <div>
                <strong>{document.title}</strong>
                <span>
                  {document.filename} | {document.sizeLabel}
                </span>
              </div>
              <small>{document.uploadedAt}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="workspace-layout">
        <div className="workspace-header card">
          <div>
            <span className="eyebrow">Selected Document</span>
            <h2>{selectedDocument.title}</h2>
            <p>
              {selectedDocument.pageCount} pages extracted. Status: {selectedDocument.status}. Topic hints: {selectedDocument.keywords?.slice(0, 5).join(", ") || selectedDocument.topic}
            </p>
          </div>
          <div className="workspace-badges">
            <span>{selectedDocument.flashcardSets.length} sets</span>
            <span>{selectedDocument.quizzes.length} quizzes</span>
            <button className="chip" onClick={() => handleRenameDocument(selectedDocument)}>
              Rename
            </button>
            <button className="chip" onClick={() => handleReprocessDocument(selectedDocument.id)}>
              Reprocess
            </button>
            <button className="chip" onClick={() => handleDeleteDocument(selectedDocument.id)}>
              Delete
            </button>
          </div>
        </div>

        <div className="card">
          <div className="tab-bar">
            {DOC_TABS.map((tab) => (
              <button
                key={tab.id}
                className={appState.activeDocTab === tab.id ? "chip active-chip" : "chip"}
                onClick={() => setAppState((current) => ({ ...current, activeDocTab: tab.id }))}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {appState.activeDocTab === "content" && (
          <div className="tabbed-grid single-column">
            <div className="card panel-card">
              <div className="card-head">
                <h3>Raw Extracted Content</h3>
                <span>{selectedDocument.pageCount} pages</span>
              </div>
              <div className="content-box scroll-box">
                <p>{selectedDocument.content}</p>
              </div>
            </div>
            {selectedDocument.previewUrl && (
              <div className="card panel-card">
                <div className="card-head">
                  <h3>PDF Preview</h3>
                  <span>Available until refresh</span>
                </div>
                <iframe title={selectedDocument.title} src={selectedDocument.previewUrl} className="pdf-frame" />
              </div>
            )}
            <div className="card panel-card">
              <div className="card-head">
                <h3>Upload History</h3>
                <span>{selectedDocument.uploadHistory?.length || 0} events</span>
              </div>
              <div className="global-list">
                {(selectedDocument.uploadHistory || []).map((item) => (
                  <div key={item._id || item.id} className="global-card">
                    <div>
                      <strong>{item.event}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {appState.activeDocTab === "chat" && (
          <div className="card panel-card">
            <div className="card-head">
              <h3>Chat With PDF</h3>
              <span>Answers use extracted text</span>
            </div>
            <div className="prompt-row">
              {QUICK_PROMPTS.map((prompt) => (
                <button key={prompt} className="chip" onClick={() => handleQuickPrompt(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
            <div className="chat-box">
              {selectedDocument.chat.map((message) => (
                <div key={message.id} className={`chat-message ${message.role}`}>
                  <strong>{message.role === "assistant" ? "AI" : "You"}</strong>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask any question related to this document" />
              <button className="primary-btn" onClick={handleSendChat}>
                Send
              </button>
            </div>
          </div>
        )}

        {appState.activeDocTab === "actions" && (
          <div className="tabbed-grid">
            <div className="card panel-card">
              <div className="card-head">
                <h3>Generate Summary</h3>
                <span>From extracted text</span>
              </div>
              <div className="action-item">
                <p>{selectedDocument.summary}</p>
                <button className="primary-btn" onClick={handleGenerateSummary}>
                  Refresh Summary
                </button>
              </div>
            </div>

            <div className="card panel-card">
              <div className="card-head">
                <h3>Explain a Concept</h3>
                <span>Concept-based extraction</span>
              </div>
              <div className="action-item concept-action">
                <p>{selectedDocument.conceptExplanation}</p>
                <div className="concept-row">
                  <input value={conceptInput} onChange={(event) => setConceptInput(event.target.value)} placeholder="Enter concept name" />
                  <button className="secondary-btn" onClick={handleExplainConcept}>
                    Explain
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {appState.activeDocTab === "flashcards" && (
          <div className="card panel-card">
            <div className="card-head">
              <h3>Flashcards</h3>
              <span>Generated from document concepts</span>
            </div>
            <div className="inline-actions">
              <button className="primary-btn" onClick={handleGenerateFlashcards}>
                Generate Flashcards
              </button>
            </div>
            <div className="set-list">
              {selectedDocument.flashcardSets.map((set) => {
                const currentIndex = flashcardIndexes[set.id] || 0;
                const activeCard = set.cards[currentIndex];
                return (
                  <div key={set.id} className="flashcard-set">
                    <div className="set-head">
                      <div>
                        <strong>{set.name}</strong>
                        <span>
                          {set.cards.length} cards | {set.progress}% progress
                        </span>
                      </div>
                      <button className="text-btn danger" onClick={() => handleDeleteFlashcardSet(selectedDocument.id, set.id)}>
                        Delete set
                      </button>
                    </div>
                    {activeCard && (
                      <FlashcardViewer
                        set={set}
                        card={activeCard}
                        currentIndex={currentIndex}
                        onPrev={() => changeFlashcardIndex(set.id, "prev", set.cards.length, activeCard.id)}
                        onNext={() => changeFlashcardIndex(set.id, "next", set.cards.length, activeCard.id)}
                        onToggleStar={() => handleToggleStar(selectedDocument.id, set.id, activeCard.id)}
                        onReview={(confidence) => handleReviewFlashcard(set.id, activeCard.id, confidence)}
                      />
                    )}
                  </div>
                );
              })}
              {selectedDocument.flashcardSets.length === 0 && (
                <EmptyState title="No flashcard sets yet" text="Generate the first set and real cards from this PDF will appear here." />
              )}
            </div>
          </div>
        )}

        {appState.activeDocTab === "quizzes" && (
          <div className="card panel-card">
            <div className="card-head">
              <h3>Quizzes</h3>
              <span>Create MCQ quizzes from this document</span>
            </div>
            <div className="quiz-form">
              <label>
                Difficulty
                <select value={quizForm.difficulty} onChange={(event) => setQuizForm((current) => ({ ...current, difficulty: event.target.value }))}>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </label>
              <label>
                Number of Questions
                <input
                  type="number"
                  min="3"
                  max="15"
                  value={quizForm.totalQuestions}
                  onChange={(event) => setQuizForm((current) => ({ ...current, totalQuestions: event.target.value }))}
                />
              </label>
              <button className="primary-btn" onClick={handleGenerateQuiz}>
                Generate Quiz
              </button>
            </div>

            <div className="quiz-list">
              {selectedDocument.quizzes.map((quiz) => (
                <div key={quiz.id} className="quiz-card">
                  <div className="quiz-card-head">
                    <div>
                      <strong>{quiz.name}</strong>
                      <span>
                        {quiz.difficulty} | {quiz.totalQuestions} questions
                      </span>
                    </div>
                    <div className="score-pill">Score: {quiz.score}%</div>
                  </div>
                  <div className="inline-actions">
                    <button className="chip" onClick={() => handleStartQuiz(quiz.id)}>
                      Start Quiz
                    </button>
                    <button className="chip" onClick={() => handleCompleteQuiz(quiz.id)}>
                      Finish
                    </button>
                    <button className="chip" onClick={() => handleRetryWrongQuiz(quiz.id)}>
                      Retry Wrong
                    </button>
                  </div>

                  {quiz.status === "completed" ? (
                    <div className="question-card">
                      <p>Quiz completed. Review all answers below.</p>
                      <div className="question-stack">
                        {quiz.questions.map((question) => (
                          <div key={question._id || question.id} className="question-card">
                            <p>{question.question}</p>
                            <small className="question-note">
                              Correct: {question.answer} | Your answer: {question.selected || "Not answered"}
                            </small>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="question-stack">
                      {quiz.questions
                        .filter((_question, index) => index === (quiz.currentQuestionIndex || 0))
                        .map((question) => (
                          <div key={question._id || question.id} className="question-card">
                            <p>{question.question}</p>
                            <div className="options-grid">
                              {question.options.map((option) => {
                                const isSelected = question.selected === option;
                                const isCorrect = question.selected && option === question.answer;
                                const isWrongSelected = isSelected && option !== question.answer;
                                const className = isCorrect ? "option-btn correct" : isWrongSelected ? "option-btn wrong" : isSelected ? "option-btn active" : "option-btn";
                                return (
                                  <button
                                    key={option}
                                    className={className}
                                    onClick={() => handleSelectQuizOption(selectedDocument.id, quiz.id, question._id || question.id, option)}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                            {question.selected && <small className="question-note">{question.explanation}</small>}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
              {selectedDocument.quizzes.length === 0 && (
                <EmptyState title="No quizzes yet" text="Generate a quiz and start answering document-based MCQs here." />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function FlashcardsPage({ allFlashcardSets }) {
  return (
    <section className="page-grid">
      <div className="card">
        <div className="card-head">
          <h3>All Flashcard Sets</h3>
          <span>Across all documents</span>
        </div>
        <div className="global-list">
          {allFlashcardSets.map((set) => (
            <div key={set.id} className="global-card">
              <div>
                <strong>{set.name}</strong>
                <span>{set.documentTitle}</span>
              </div>
              <div className="inline-meta">
                <span>{set.cards.length} cards</span>
                <span>{set.progress}% progress</span>
              </div>
            </div>
          ))}
          {allFlashcardSets.length === 0 && <EmptyState title="No flashcards yet" text="Generate flashcards from any document to see them here." />}
        </div>
      </div>
    </section>
  );
}

export function QuizzesPage({ allQuizzes }) {
  return (
    <section className="page-grid">
      <div className="card">
        <div className="card-head">
          <h3>All Quizzes</h3>
          <span>Across all documents</span>
        </div>
        <div className="global-list">
          {allQuizzes.map((quiz) => (
            <div key={quiz.id} className="global-card">
              <div>
                <strong>{quiz.name}</strong>
                <span>{quiz.documentTitle}</span>
              </div>
              <div className="inline-meta">
                <span>{quiz.difficulty}</span>
                <span>{quiz.totalQuestions} questions</span>
                <span>{quiz.score}% score</span>
              </div>
            </div>
          ))}
          {allQuizzes.length === 0 && <EmptyState title="No quizzes yet" text="Generate quizzes from any document to see them here." />}
        </div>
      </div>
    </section>
  );
}
