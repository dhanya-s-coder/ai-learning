import StatCard from "../../../shared/ui/StatCard";
import UploadForm from "../../../shared/ui/UploadForm";

function DashboardPage({
  stats,
  activity,
  documents,
  uploadForm,
  setUploadForm,
  handleUpload,
  uploading,
  uploadError,
  onOpenFlashcards
}) {
  return (
    <section className="page-grid">
      <div className="stats-grid">
        <StatCard label="Documents" value={stats.docs} tone="green" />
        <StatCard label="Flashcard Sets" value={stats.flashcards} tone="blue" onClick={onOpenFlashcards} />
        <StatCard label="Quizzes" value={stats.quizzes} tone="pink" />
        <StatCard label="Cards Reviewed" value={stats.reviewed} tone="amber" />
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

export default DashboardPage;
