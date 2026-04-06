function UploadForm({ uploadForm, setUploadForm, handleUpload, compact = false, uploading, uploadError }) {
  return (
    <form className={compact ? "upload-form compact" : "upload-form"} onSubmit={handleUpload}>
      <label>
        Document Title
        <input
          value={uploadForm.title}
          onChange={(event) => setUploadForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="e.g. React Interview Prep"
        />
      </label>
      <label>
        PDF File
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => setUploadForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
        />
      </label>
      {uploadError && <div className="error-text">{uploadError}</div>}
      <button className="primary-btn" type="submit" disabled={uploading}>
        {uploading ? "Uploading PDF..." : "Upload Document"}
      </button>
    </form>
  );
}

export default UploadForm;
