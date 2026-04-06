import { useEffect, useMemo, useState } from "react";
import AuthScreen from "./AuthScreen";
import { authApi, appApi } from "./api";
import { NAV_ITEMS } from "./constants";
import { DashboardPage, DocumentsPage, FlashcardsPage, QuizzesPage } from "./Pages";

function AppShellApi() {
  const [appState, setAppState] = useState({
    user: null,
    documents: [],
    activity: [],
    activeNav: "dashboard",
    activeDocTab: "content",
    selectedDocumentId: null
  });
  const [authMode, setAuthMode] = useState("login");
  const [forgotMode, setForgotMode] = useState(false);
  const [resetTokenHint, setResetTokenHint] = useState("");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", confirmPassword: "", resetToken: "" });
  const [chatInput, setChatInput] = useState("");
  const [conceptInput, setConceptInput] = useState("");
  const [quizForm, setQuizForm] = useState({ difficulty: "Medium", totalQuestions: 5 });
  const [uploadForm, setUploadForm] = useState({ title: "", file: null });
  const [flashcardIndexes, setFlashcardIndexes] = useState({});
  const [loading, setLoading] = useState(Boolean(authApi.getToken()));
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");

  const selectedDocument = useMemo(
    () => appState.documents.find((item) => item.id === appState.selectedDocumentId) || appState.documents[0] || null,
    [appState.documents, appState.selectedDocumentId]
  );

  const allFlashcardSets = useMemo(
    () =>
      appState.documents.flatMap((document) =>
        document.flashcardSets.map((set) => ({ ...set, documentId: document.id, documentTitle: document.title }))
      ),
    [appState.documents]
  );

  const allQuizzes = useMemo(
    () =>
      appState.documents.flatMap((document) =>
        document.quizzes.map((quiz) => ({ ...quiz, documentId: document.id, documentTitle: document.title }))
      ),
    [appState.documents]
  );

  const stats = useMemo(
    () => ({
      docs: appState.documents.length,
      flashcards: allFlashcardSets.length,
      quizzes: allQuizzes.length,
      reviewed: allFlashcardSets.reduce((total, set) => total + set.cards.filter((card) => card.reviewed).length, 0)
    }),
    [appState.documents, allFlashcardSets, allQuizzes]
  );

  useEffect(() => {
    if (!authApi.getToken()) return;
    void refreshApp();
  }, []);

  async function refreshApp() {
    setLoading(true);
    setError("");
    try {
      const data = await appApi.bootstrap();
      setAppState((current) => ({
        ...current,
        user: data.user,
        documents: data.documents,
        activity: data.activity,
        selectedDocumentId:
          current.selectedDocumentId && data.documents.some((document) => document.id === current.selectedDocumentId)
            ? current.selectedDocumentId
            : data.documents[0]?.id || null
      }));
    } catch (err) {
      authApi.clearToken();
      setAppState((current) => ({ ...current, user: null, documents: [], activity: [] }));
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function mergeDocument(updatedDocument) {
    setAppState((current) => ({
      ...current,
      documents: current.documents.map((document) => (document.id === updatedDocument.id ? updatedDocument : document))
    }));
  }

  function replaceFlashcardSet(updatedSet) {
    setAppState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id !== updatedSet.documentId
          ? document
          : { ...document, flashcardSets: document.flashcardSets.map((set) => (set.id === updatedSet.id ? updatedSet : set)) }
      )
    }));
  }

  function replaceQuiz(updatedQuiz) {
    setAppState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id !== updatedQuiz.documentId
          ? document
          : { ...document, quizzes: document.quizzes.map((quiz) => (quiz.id === updatedQuiz.id ? updatedQuiz : quiz)) }
      )
    }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError("");
    setBusyAction("auth");
    try {
      let payload;
      if (forgotMode) {
        payload = await authApi.resetPassword(authForm);
        setForgotMode(false);
        setError("Password reset complete. Please login.");
        return;
      }
      payload =
        authMode === "signup"
          ? await authApi.signup(authForm)
          : await authApi.login({ email: authForm.email, password: authForm.password });
      setAppState((current) => ({ ...current, user: payload.user }));
      await refreshApp();
      setAuthForm({ name: "", email: "", password: "", confirmPassword: "", resetToken: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleForgotPassword() {
    setError("");
    try {
      const data = await authApi.forgotPassword({ email: authForm.email });
      setForgotMode(true);
      setResetTokenHint(data.debugResetToken || "");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (!uploadForm.title.trim() || !uploadForm.file) {
      setError("Please enter a title and choose a PDF file.");
      return;
    }

    setBusyAction("upload");
    setError("");
    try {
      const formData = new FormData();
      formData.append("title", uploadForm.title.trim());
      formData.append("file", uploadForm.file);
      const document = await appApi.uploadDocument(formData);
      setAppState((current) => ({
        ...current,
        activeNav: "documents",
        activeDocTab: "content",
        selectedDocumentId: document.id,
        documents: [document, ...current.documents]
      }));
      setUploadForm({ title: "", file: null });
      await refreshApp();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleSendChat() {
    if (!chatInput.trim() || !selectedDocument) return;
    setBusyAction("chat");
    setError("");
    try {
      const data = await appApi.chat(selectedDocument.id, chatInput.trim());
      mergeDocument({ ...selectedDocument, chat: data.chat });
      setChatInput("");
      await refreshApp();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleRenameDocument(document) {
    const nextTitle = window.prompt("Rename document", document.title);
    if (!nextTitle || nextTitle === document.title) return;
    try {
      await appApi.renameDocument(document.id, nextTitle);
      await refreshApp();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteDocument(documentId) {
    if (!window.confirm("Delete this document and all generated sets/quizzes?")) return;
    try {
      await appApi.deleteDocument(documentId);
      await refreshApp();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReprocessDocument(documentId) {
    try {
      await appApi.reprocessDocument(documentId);
      await refreshApp();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerateSummary() {
    if (!selectedDocument) return;
    setBusyAction("summary");
    setError("");
    try {
      const data = await appApi.generateSummary(selectedDocument.id);
      mergeDocument({ ...selectedDocument, summary: data.summary });
      await refreshApp();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleExplainConcept() {
    if (!selectedDocument || !conceptInput.trim()) return;
    setBusyAction("concept");
    setError("");
    try {
      const data = await appApi.explainConcept(selectedDocument.id, conceptInput.trim());
      mergeDocument({ ...selectedDocument, conceptExplanation: data.conceptExplanation });
      setConceptInput("");
      await refreshApp();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleGenerateFlashcards() {
    if (!selectedDocument) return;
    setBusyAction("flashcards");
    setError("");
    try {
      const set = await appApi.generateFlashcards(selectedDocument.id, 8);
      mergeDocument({ ...selectedDocument, flashcardSets: [set, ...selectedDocument.flashcardSets] });
      setFlashcardIndexes((current) => ({ ...current, [set.id]: 0 }));
      await refreshApp();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleDeleteFlashcardSet(documentId, setId) {
    setBusyAction("flashcards");
    setError("");
    try {
      await appApi.deleteFlashcardSet(setId);
      setAppState((current) => ({
        ...current,
        documents: current.documents.map((document) =>
          document.id !== documentId ? document : { ...document, flashcardSets: document.flashcardSets.filter((set) => set.id !== setId) }
        )
      }));
      await refreshApp();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleToggleStar(_documentId, _setId, cardId) {
    setError("");
    try {
      const updatedSet = await appApi.toggleFlashcardStar(cardId);
      replaceFlashcardSet(updatedSet);
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeFlashcardIndex(setId, direction, totalCards, _cardId) {
    const currentIndex = flashcardIndexes[setId] || 0;
    const nextIndex = direction === "next" ? Math.min(currentIndex + 1, totalCards - 1) : Math.max(currentIndex - 1, 0);
    setFlashcardIndexes((current) => ({ ...current, [setId]: nextIndex }));
  }

  async function handleReviewFlashcard(setId, cardId, confidence) {
    try {
      const updatedSet = await appApi.reviewFlashcard(setId, cardId, confidence);
      replaceFlashcardSet(updatedSet);
      await refreshApp();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerateQuiz() {
    if (!selectedDocument) return;
    setBusyAction("quiz");
    setError("");
    try {
      const quiz = await appApi.generateQuiz(selectedDocument.id, quizForm.difficulty, Number(quizForm.totalQuestions));
      mergeDocument({ ...selectedDocument, quizzes: [quiz, ...selectedDocument.quizzes] });
      await refreshApp();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleSelectQuizOption(_documentId, quizId, questionId, option) {
    setError("");
    try {
      const updatedQuiz = await appApi.answerQuiz(quizId, questionId, option);
      replaceQuiz(updatedQuiz);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStartQuiz(quizId) {
    try {
      const updatedQuiz = await appApi.startQuiz(quizId);
      replaceQuiz(updatedQuiz);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCompleteQuiz(quizId) {
    try {
      const updatedQuiz = await appApi.completeQuiz(quizId);
      replaceQuiz(updatedQuiz);
      await refreshApp();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRetryWrongQuiz(quizId) {
    try {
      const retryQuiz = await appApi.retryWrongQuiz(quizId);
      const selected = selectedDocument;
      if (!selected) return;
      mergeDocument({ ...selected, quizzes: [retryQuiz, ...selected.quizzes] });
      await refreshApp();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    authApi.clearToken();
    setAppState({
      user: null,
      documents: [],
      activity: [],
      activeNav: "dashboard",
      activeDocTab: "content",
      selectedDocumentId: null
    });
  }

  if (!appState.user) {
    return (
      <>
        <AuthScreen
          authMode={authMode}
          authForm={authForm}
          onModeChange={setAuthMode}
          onFormChange={setAuthForm}
          onSubmit={handleAuthSubmit}
          forgotMode={forgotMode}
          onForgotToggle={forgotMode ? () => setForgotMode(false) : handleForgotPassword}
          resetTokenHint={resetTokenHint}
        />
        {error && <div className="app-toast error-text">{error}</div>}
      </>
    );
  }

  if (loading) {
    return <div className="loading-screen">Loading your workspace...</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-mark">AI</div>
            <div>
              <h2>AI Learning</h2>
              <span>Gemini-powered study workspace</span>
            </div>
          </div>

          <nav className="nav-links">
            {NAV_ITEMS.map((item) => (
              <button key={item.id} className={appState.activeNav === item.id ? "nav-link active" : "nav-link"} onClick={() => setAppState((current) => ({ ...current, activeNav: item.id }))}>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="profile-card">
          <strong>{appState.user.name}</strong>
          <span>{appState.user.email}</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <span className="eyebrow">AI study workspace</span>
            <h1>{NAV_ITEMS.find((item) => item.id === appState.activeNav)?.label}</h1>
          </div>
          <button className="secondary-btn" onClick={handleLogout}>
            Logout
          </button>
        </header>

        {error && <div className="inline-banner error-text">{error}</div>}

        {appState.activeNav === "dashboard" && (
          <DashboardPage
            stats={stats}
            activity={appState.activity}
            documents={appState.documents}
            uploadForm={uploadForm}
            setUploadForm={setUploadForm}
            handleUpload={handleUpload}
            uploading={busyAction === "upload"}
            uploadError={error}
          />
        )}

        {appState.activeNav === "documents" && selectedDocument && (
          <DocumentsPage
            appState={appState}
            setAppState={setAppState}
            selectedDocument={selectedDocument}
            uploadForm={uploadForm}
            setUploadForm={setUploadForm}
            handleUpload={handleUpload}
            uploading={busyAction === "upload"}
            uploadError={error}
            chatInput={chatInput}
            setChatInput={setChatInput}
            handleSendChat={handleSendChat}
            conceptInput={conceptInput}
            setConceptInput={setConceptInput}
            handleGenerateSummary={handleGenerateSummary}
            handleExplainConcept={handleExplainConcept}
            handleQuickPrompt={setChatInput}
            handleGenerateFlashcards={handleGenerateFlashcards}
            flashcardIndexes={flashcardIndexes}
            changeFlashcardIndex={changeFlashcardIndex}
            handleToggleStar={handleToggleStar}
            handleDeleteFlashcardSet={handleDeleteFlashcardSet}
            quizForm={quizForm}
            setQuizForm={setQuizForm}
            handleGenerateQuiz={handleGenerateQuiz}
            handleSelectQuizOption={handleSelectQuizOption}
            handleRenameDocument={handleRenameDocument}
            handleDeleteDocument={handleDeleteDocument}
            handleReprocessDocument={handleReprocessDocument}
            handleStartQuiz={handleStartQuiz}
            handleCompleteQuiz={handleCompleteQuiz}
            handleRetryWrongQuiz={handleRetryWrongQuiz}
            handleReviewFlashcard={handleReviewFlashcard}
            busyAction={busyAction}
          />
        )}

        {appState.activeNav === "flashcards" && <FlashcardsPage allFlashcardSets={allFlashcardSets} />}
        {appState.activeNav === "quizzes" && <QuizzesPage allQuizzes={allQuizzes} />}
      </main>
    </div>
  );
}

export default AppShellApi;
