const DashboardView = ({ documents, activities }) => {
  const totalFlashcards = documents.reduce(
    (sum, doc) => sum + doc.flashcardSets.length,
    0
  );
  const totalQuizzes = documents.reduce((sum, doc) => sum + doc.quizzes.length, 0);

  const metrics = [
    { label: "Documents", value: documents.length, hint: "uploaded docs" },
    { label: "Flashcard Sets", value: totalFlashcards, hint: "across all docs" },
    { label: "Quizzes", value: totalQuizzes, hint: "AI generated" }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Your learning workspace</h2>
        </div>
      </div>

      <div className="stats-grid">
        {metrics.map((item) => (
          <article className="stat-card" key={item.label}>
            <p>{item.label}</p>
            <h3>{item.value}</h3>
            <span>{item.hint}</span>
          </article>
        ))}
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="panel-title">
            <h3>Recent Activity</h3>
            <span>Latest actions</span>
          </div>
          <div className="activity-list">
            {activities.map((item) => (
              <div className="activity-row" key={item}>
                <span className="dot" />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h3>Recent Documents</h3>
            <span>Continue where you left off</span>
          </div>
          <div className="doc-stack">
            {documents.map((doc) => (
              <div className="doc-card" key={doc.id}>
                <div>
                  <h4>{doc.title}</h4>
                  <p>
                    {doc.category} . {doc.pages} pages
                  </p>
                </div>
                <strong>{doc.progress}%</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardView;
