const STAT_CARDS = [
  { key: "docs", label: "Total Documents", hint: "Uploaded files", icon: "📄", tone: "green" },
  { key: "pages", label: "Total Pages", hint: "Extracted pages", icon: "📘", tone: "blue" },
  { key: "queries", label: "AI Queries", hint: "This session", icon: "💬", tone: "violet" },
  { key: "flashcards", label: "Flashcards", hint: "Created", icon: "🗂️", tone: "amber" },
  { key: "quizzes", label: "Quizzes", hint: "Taken", icon: "📝", tone: "mint" }
];

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DashboardPage({
  activity,
  documents,
  onOpenDocuments,
  onOpenFlashcards,
  onOpenQuizzes,
  onAskQuestion
}) {
  const allFlashcardSets = documents.flatMap((document) => document.flashcardSets || []);
  const allCards = allFlashcardSets.flatMap((set) => set.cards || []);
  const allQuizzes = documents.flatMap((document) => document.quizzes || []);
  const allHistory = documents
    .flatMap((document) =>
      (document.uploadHistory || []).map((item) => ({
        ...item,
        documentTitle: document.title,
        filename: document.filename
      }))
    )
    .slice(-5)
    .reverse();

  const reviewedCards = allCards.filter((card) => card.reviewed).length;
  const unreviewedCards = Math.max(allCards.length - reviewedCards, 0);
  const attemptedQuizzes = allQuizzes.filter((quiz) => quiz.status === "completed" || quiz.score > 0).length;
  const pendingQuizzes = Math.max(allQuizzes.length - attemptedQuizzes, 0);
  const totalPages = documents.reduce((total, document) => total + (document.pageCount || 0), 0);
  const aiQueries = documents.reduce(
    (total, document) => total + (document.chat || []).filter((message) => message.role === "user").length,
    0
  );
  const hasStudyMaterial = allCards.length > 0 || allQuizzes.length > 0;

  const statValues = {
    docs: documents.length,
    pages: totalPages,
    queries: aiQueries,
    flashcards: allCards.length,
    quizzes: allQuizzes.length
  };

  const lineLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const lineSeries = [
    {
      label: "Documents",
      tone: "green",
      values: [0, Math.min(documents.length, 1), 0, documents.length, Math.max(documents.length - 1, 0), documents.length, documents.length]
    },
    {
      label: "Pages",
      tone: "blue",
      values: [0, Math.ceil(totalPages * 0.2), Math.ceil(totalPages * 0.35), Math.ceil(totalPages * 0.25), Math.ceil(totalPages * 0.55), Math.ceil(totalPages * 0.75), totalPages]
    },
    {
      label: "AI Queries",
      tone: "violet",
      values: [0, 0, Math.ceil(aiQueries * 0.25), Math.ceil(aiQueries * 0.45), Math.ceil(aiQueries * 0.6), aiQueries, aiQueries]
    }
  ];
  const lineMax = Math.max(...lineSeries.flatMap((series) => series.values), 1);
  const toPoints = (values) =>
    values
      .map((value, index) => {
        const x = 18 + index * 44;
        const y = 142 - (value / lineMax) * 112;
        return `${x},${y}`;
      })
      .join(" ");
  const attemptedTotal = reviewedCards + attemptedQuizzes;
  const pendingTotal = unreviewedCards + pendingQuizzes;
  const studyTotal = Math.max(attemptedTotal + pendingTotal, 1);
  const attemptedPercent = Math.round((attemptedTotal / studyTotal) * 100);

  return (
    <section className="dashboard-page">
      <div className="dashboard-stats-grid">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className={`dashboard-stat-card ${card.tone}`}>
            <div className="stat-icon" aria-hidden="true">
              {card.icon}
            </div>
            <div>
              <span>{card.label}</span>
              <strong>{statValues[card.key]}</strong>
              <small>{card.hint}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-layout">
        <div className="card dashboard-card recent-documents-card">
          <div className="card-head">
            <h3>Recent Documents</h3>
            <button className="text-btn" onClick={onOpenDocuments}>View all</button>
          </div>
          <div className="dashboard-list scrollable-list recent-documents-grid">
            {documents.slice(0, 8).map((document) => (
              <button key={document.id} className="dashboard-doc-item" onClick={onOpenDocuments}>
                <div className="file-icon" aria-hidden="true">PDF</div>
                <div>
                  <strong>{document.filename || document.title}</strong>
                  <span>{document.pageCount || 0} pages</span>
                  <small>Uploaded on {formatDate(document.createdAt || document.uploadedAt)}</small>
                </div>
              </button>
            ))}
            {documents.length === 0 && (
              <div className="dashboard-empty-box">
                <strong>No documents yet</strong>
                <span>Upload your first PDF to start studying.</span>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-row three-card-row">
          <div className="card dashboard-card recent-ai-card">
            <div className="card-head">
              <h3>Recent Activities</h3>
              <span>{activity.length} items</span>
            </div>
            {activity.length > 0 ? (
              <div className="dashboard-list scrollable-list">
                {activity.slice(0, 8).map((item) => (
                  <div key={item.id} className="activity-item compact">
                    <div>
                      <strong>{item.text}</strong>
                      <span>{item.type}</span>
                    </div>
                    <time>{item.time}</time>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-box centered">
                <strong>No AI queries yet</strong>
                <span>Ask a question from your document to see activity here.</span>
                <button className="primary-btn" onClick={onAskQuestion}>Ask AI Question</button>
              </div>
            )}
          </div>

        <div className="card dashboard-card activity-overview-card">
          <div className="card-head">
            <h3>Activity Overview</h3>
            <span>This workspace</span>
          </div>
          <div className="line-chart-card">
            <div className="line-chart-legend">
              {lineSeries.map((series) => (
                <span key={series.label} className={series.tone}>{series.label}</span>
              ))}
            </div>
            <svg className="line-chart" viewBox="0 0 300 170" role="img" aria-label="Activity overview line graph">
              {[30, 58, 86, 114, 142].map((y) => (
                <line key={y} x1="18" y1={y} x2="284" y2={y} className="chart-grid-line" />
              ))}
              {lineSeries.map((series) => (
                <g key={series.label}>
                  <polyline className={`line-path ${series.tone}`} points={toPoints(series.values)} />
                  {series.values.map((value, index) => {
                    const x = 18 + index * 44;
                    const y = 142 - (value / lineMax) * 112;
                    return <circle key={`${series.label}-${index}`} className={`line-dot ${series.tone}`} cx={x} cy={y} r="3.5" />;
                  })}
                </g>
              ))}
              {lineLabels.map((label, index) => (
                <text key={label} x={18 + index * 44} y="162" textAnchor="middle" className="chart-axis-label">
                  {label}
                </text>
              ))}
            </svg>
          </div>
        </div>

        <div className="card dashboard-card quick-actions-card">
          <div className="card-head">
            <h3>Quick Actions</h3>
            <span>Jump in</span>
          </div>
          <div className="quick-action-list">
            <button onClick={onOpenDocuments}><span>⬆️</span>Upload Document</button>
            <button onClick={onAskQuestion}><span>💬</span>Ask AI a Question</button>
            <button onClick={onOpenFlashcards}><span>🗂️</span>Create Flashcards</button>
            <button onClick={onOpenQuizzes}><span>📝</span>Take a Quiz</button>
          </div>
        </div>
        </div>

        <div className="dashboard-row two-card-row">
          <div className="card dashboard-card upload-history-dashboard-card">
            <div className="card-head">
              <h3>Upload History</h3>
              <button className="text-btn" onClick={onOpenDocuments}>View all</button>
            </div>
            <div className="dashboard-list scrollable-list">
              {allHistory.map((item) => (
                <div key={item._id || item.id || `${item.documentTitle}-${item.event}`} className="history-row">
                  <div>
                    <strong>{item.filename || item.documentTitle}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <small>{item.event}</small>
                </div>
              ))}
              {allHistory.length === 0 && (
                <div className="dashboard-empty-box">
                  <strong>No upload history yet</strong>
                  <span>Your processed PDFs will appear here.</span>
                </div>
              )}
            </div>
          </div>

          <div className="card dashboard-card study-progress-card">
            <div className="card-head">
              <h3>Study Progress</h3>
              <span>Attempts</span>
            </div>
            {hasStudyMaterial ? (
              <div className="study-progress-content">
                <div
                  className="study-pie-chart"
                  style={{ "--attempted": `${attemptedPercent}%` }}
                  aria-label={`${attemptedPercent}% attempted`}
                >
                  <strong>{attemptedPercent}%</strong>
                  <span>Attempted</span>
                </div>
                <div className="progress-breakdown">
                  <div><span>Flashcards attempted</span><strong>{reviewedCards}</strong></div>
                  <div><span>Flashcards pending</span><strong>{unreviewedCards}</strong></div>
                  <div><span>Quizzes attempted</span><strong>{attemptedQuizzes}</strong></div>
                  <div><span>Quizzes pending</span><strong>{pendingQuizzes}</strong></div>
                </div>
              </div>
            ) : (
              <div className="dashboard-empty-box centered">
                <strong>Create flashcards and generate quizzes for tracking progress.</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
