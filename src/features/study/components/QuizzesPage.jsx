import EmptyState from "../../../shared/ui/EmptyState";

function QuizzesPage({ allQuizzes }) {
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
          {allQuizzes.length === 0 && (
            <EmptyState title="No quizzes yet" text="Generate quizzes from any document to see them here." />
          )}
        </div>
      </div>
    </section>
  );
}

export default QuizzesPage;
