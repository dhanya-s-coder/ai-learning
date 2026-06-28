import { useEffect, useMemo, useState } from "react";
import AuthScreen from "../features/auth/components/AuthScreen";
import DashboardPage from "../features/dashboard/components/DashboardPage";
import DocumentsPage from "../features/documents/components/DocumentsPage";
import FlashcardsPage from "../features/study/components/FlashcardsPage";
import QuizzesPage from "../features/study/components/QuizzesPage";
import { authApi, documentsApi, flashcardsApi, quizzesApi } from "../shared/api/client";
import { NAV_ITEMS } from "../shared/constants/app";
import FlashcardViewer from "../shared/ui/FlashcardViewer";

function getCardId(card) {
  return card?.id || card?._id || "";
}

function getFlashcardIndexKey(setId, filter = "all") {
  return `${setId}:${filter}`;
}

function getFilteredCards(set, filter) {
  if (!set) return [];
  if (filter === "all") {
    return set.cards;
  }
  if (filter === "starred") {
    return set.cards.filter((card) => card.starred);
  }
  if (filter === "due") {
    const now = Date.now();
    return set.cards.filter((card) => !card.dueAt || new Date(card.dueAt).getTime() <= now);
  }
  if (filter === "new") {
    return set.cards.filter((card) => (card.confidence || "new") === "new");
  }
  return set.cards.filter((card) => (card.confidence || "new") === filter);
}

function App() {
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
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    resetToken: ""
  });
  const [chatInput, setChatInput] = useState("");
  const [conceptInput, setConceptInput] = useState("");
  const [quizForm, setQuizForm] = useState({ difficulty: "Medium", totalQuestions: 5 });
  const [uploadForm, setUploadForm] = useState({ title: "", file: null });
  const [flashcardIndexes, setFlashcardIndexes] = useState({});
  const [flashcardFilters, setFlashcardFilters] = useState({});
  const [flashcardStudy, setFlashcardStudy] = useState({
    isOpen: false,
    setId: "",
    documentId: "",
    filter: "all"
  });
  const [loading, setLoading] = useState(Boolean(authApi.getToken()));
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");

  const selectedDocument = useMemo(
    () =>
      appState.documents.find((item) => item.id === appState.selectedDocumentId) ||
      appState.documents[0] ||
      null,
    [appState.documents, appState.selectedDocumentId]
  );

  const allFlashcardSets = useMemo(
    () =>
      appState.documents.flatMap((document) =>
        document.flashcardSets.map((set) => ({
          ...set,
          documentId: document.id,
          documentTitle: document.title
        }))
      ),
    [appState.documents]
  );

  const allQuizzes = useMemo(
    () =>
      appState.documents.flatMap((document) =>
        document.quizzes.map((quiz) => ({
          ...quiz,
          documentId: document.id,
          documentTitle: document.title
        }))
      ),
    [appState.documents]
  );

  const stats = useMemo(
    () => ({
      docs: appState.documents.length,
      flashcards: allFlashcardSets.length,
      quizzes: allQuizzes.length,
      reviewed: allFlashcardSets.reduce(
        (total, set) => total + set.cards.filter((card) => card.reviewed).length,
        0
      )
    }),
    [appState.documents, allFlashcardSets, allQuizzes]
  );

  const activeStudyDocument = useMemo(
    () =>
      appState.documents.find((document) => document.id === flashcardStudy.documentId) || null,
    [appState.documents, flashcardStudy.documentId]
  );

  const activeStudySet = useMemo(
    () =>
      activeStudyDocument?.flashcardSets.find((set) => set.id === flashcardStudy.setId) || null,
    [activeStudyDocument, flashcardStudy.setId]
  );

  const activeStudyCards = useMemo(
    () => getFilteredCards(activeStudySet, flashcardStudy.filter),
    [activeStudySet, flashcardStudy.filter]
  );

  const activeStudyIndexKey = useMemo(
    () => getFlashcardIndexKey(flashcardStudy.setId, flashcardStudy.filter),
    [flashcardStudy.filter, flashcardStudy.setId]
  );

  const activeStudyIndex = activeStudyCards.length
    ? Math.min(flashcardIndexes[activeStudyIndexKey] || 0, activeStudyCards.length - 1)
    : 0;

  const activeStudyCard = activeStudyCards[activeStudyIndex] || null;

  useEffect(() => {
    if (!authApi.getToken()) return;
    void refreshApp();
  }, []);

  async function refreshApp() {
    setLoading(true);
    setError("");
    try {
      const data = await documentsApi.bootstrap();
      setAppState((current) => ({
        ...current,
        user: data.user,
        documents: data.documents,
        activity: data.activity,
        selectedDocumentId:
          current.selectedDocumentId &&
          data.documents.some((document) => document.id === current.selectedDocumentId)
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
      documents: current.documents.map((document) =>
        document.id === updatedDocument.id ? updatedDocument : document
      )
    }));
  }

  function replaceFlashcardSet(updatedSet) {
    setAppState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id !== updatedSet.documentId
          ? document
          : {
              ...document,
              flashcardSets: document.flashcardSets.map((set) =>
                set.id === updatedSet.id ? updatedSet : set
              )
            }
      )
    }));
  }

  function replaceQuiz(updatedQuiz) {
    setAppState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id !== updatedQuiz.documentId
          ? document
          : {
              ...document,
              quizzes: document.quizzes.map((quiz) =>
                quiz.id === updatedQuiz.id ? updatedQuiz : quiz
              )
            }
      )
    }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError("");
    setBusyAction("auth");
    try {
      if (forgotMode) {
        await authApi.resetPassword(authForm);
        setForgotMode(false);
        setError("Password reset complete. Please login.");
        return;
      }
      const payload =
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
      const document = await documentsApi.uploadDocument(formData);
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
      const data = await documentsApi.chat(selectedDocument.id, chatInput.trim());
      mergeDocument({ ...selectedDocument, chat: data.chat });
      setChatInput("");
      await refreshApp();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction("");
    }
  }

  async function handleGenerateSummary() {
    if (!selectedDocument) return;
    setBusyAction("summary");
    setError("");
    try {
      const data = await documentsApi.generateSummary(selectedDocument.id);
      mergeDocument({ ...selectedDocument, summary: data.summary, summarySources: data.sources || [] });
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
      const data = await documentsApi.explainConcept(selectedDocument.id, conceptInput.trim());
      mergeDocument({
        ...selectedDocument,
        conceptExplanation: data.conceptExplanation,
        conceptSources: data.sources || []
      });
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
      const set = await flashcardsApi.generate(selectedDocument.id, 8);
      mergeDocument({
        ...selectedDocument,
        flashcardSets: [set, ...selectedDocument.flashcardSets]
      });
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
      await flashcardsApi.deleteSet(setId);
      setAppState((current) => ({
        ...current,
        documents: current.documents.map((document) =>
          document.id !== documentId
            ? document
            : {
                ...document,
                flashcardSets: document.flashcardSets.filter((set) => set.id !== setId)
              }
        )
      }));
      setFlashcardStudy((current) =>
        current.setId === setId ? { isOpen: false, setId: "", documentId: "", filter: "all" } : current
      );
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
      const updatedSet = await flashcardsApi.toggleStar(cardId);
      replaceFlashcardSet(updatedSet);
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeFlashcardIndex(setId, direction, totalCards, filter = "all") {
    const indexKey = getFlashcardIndexKey(setId, filter);
    const currentIndex = flashcardIndexes[indexKey] || 0;
    const nextIndex =
      direction === "next"
        ? Math.min(currentIndex + 1, totalCards - 1)
        : Math.max(currentIndex - 1, 0);
    setFlashcardIndexes((current) => ({ ...current, [indexKey]: nextIndex }));
  }

  async function handleReviewFlashcard(setId, cardId, confidence) {
    try {
      const updatedSet = await flashcardsApi.review(setId, cardId, confidence);
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
      const quiz = await quizzesApi.generate(
        selectedDocument.id,
        quizForm.difficulty,
        Number(quizForm.totalQuestions)
      );
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
      const updatedQuiz = await quizzesApi.answer(quizId, questionId, option);
      replaceQuiz(updatedQuiz);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStartQuiz(quizId) {
    try {
      const updatedQuiz = await quizzesApi.start(quizId);
      replaceQuiz(updatedQuiz);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCompleteQuiz(quizId) {
    try {
      const updatedQuiz = await quizzesApi.complete(quizId);
      replaceQuiz(updatedQuiz);
      await refreshApp();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRetryWrongQuiz(quizId) {
    try {
      const retryQuiz = await quizzesApi.retryWrong(quizId);
      if (!selectedDocument) return;
      mergeDocument({ ...selectedDocument, quizzes: [retryQuiz, ...selectedDocument.quizzes] });
      await refreshApp();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRenameDocument(document) {
    const nextTitle = window.prompt("Rename document", document.title);
    if (!nextTitle || nextTitle === document.title) return;
    try {
      await documentsApi.renameDocument(document.id, nextTitle);
      await refreshApp();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteDocument(documentId) {
    if (!window.confirm("Delete this document and all generated sets/quizzes?")) return;
    try {
      await documentsApi.deleteDocument(documentId);
      await refreshApp();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReprocessDocument(documentId) {
    try {
      await documentsApi.reprocessDocument(documentId);
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

  function handleOpenFlashcardStudy(documentId, setId, filter = "all") {
    setFlashcardStudy({ isOpen: true, documentId, setId, filter });
    setFlashcardIndexes((current) => ({
      ...current,
      [getFlashcardIndexKey(setId, filter)]: 0
    }));
  }

  function handleCloseFlashcardStudy() {
    setFlashcardStudy((current) => ({ ...current, isOpen: false }));
  }

  function handleFinishFlashcardStudy() {
    setFlashcardStudy((current) => ({ ...current, isOpen: false }));
    setAppState((current) => ({ ...current, activeNav: "flashcards" }));
  }

  function handleSetFlashcardFilter(setId, filter) {
    setFlashcardFilters((current) => ({ ...current, [setId]: filter }));
    setFlashcardIndexes((current) => ({
      ...current,
      [getFlashcardIndexKey(setId, filter)]: 0
    }));
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
              <span>Professional study workspace</span>
            </div>
          </div>

          <nav className="nav-links">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={appState.activeNav === item.id ? "nav-link active" : "nav-link"}
                onClick={() => setAppState((current) => ({ ...current, activeNav: item.id }))}
              >
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
            onOpenDocuments={() => setAppState((current) => ({ ...current, activeNav: "documents" }))}
            onOpenFlashcards={() => setAppState((current) => ({ ...current, activeNav: "flashcards" }))}
            onOpenQuizzes={() => setAppState((current) => ({ ...current, activeNav: "quizzes" }))}
            onAskQuestion={() => setAppState((current) => ({ ...current, activeNav: "documents", activeDocTab: "chat" }))}
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
            onOpenFlashcardStudy={handleOpenFlashcardStudy}
            flashcardFilters={flashcardFilters}
            setFlashcardFilter={handleSetFlashcardFilter}
          />
        )}

        {appState.activeNav === "flashcards" && (
          <FlashcardsPage
            allFlashcardSets={allFlashcardSets}
            onOpenStudy={handleOpenFlashcardStudy}
            onDeleteSet={handleDeleteFlashcardSet}
            onReviewCard={handleReviewFlashcard}
            flashcardFilters={flashcardFilters}
            setFlashcardFilter={handleSetFlashcardFilter}
          />
        )}
        {appState.activeNav === "quizzes" && <QuizzesPage allQuizzes={allQuizzes} />}
      </main>

      <FlashcardViewer
        isOpen={flashcardStudy.isOpen}
        set={activeStudySet}
        documentTitle={activeStudyDocument?.title || ""}
        card={activeStudyCard}
        cards={activeStudyCards}
        currentIndex={activeStudyIndex}
        selectedFilter={flashcardStudy.filter}
        onClose={handleCloseFlashcardStudy}
        onFinish={handleFinishFlashcardStudy}
        onPrev={() =>
          activeStudySet
            ? changeFlashcardIndex(activeStudySet.id, "prev", activeStudyCards.length, flashcardStudy.filter)
            : undefined
        }
        onNext={() =>
          activeStudySet
            ? changeFlashcardIndex(activeStudySet.id, "next", activeStudyCards.length, flashcardStudy.filter)
            : undefined
        }
        onToggleStar={() =>
          activeStudyDocument && activeStudySet && activeStudyCard
            ? handleToggleStar(activeStudyDocument.id, activeStudySet.id, getCardId(activeStudyCard))
            : undefined
        }
        onReview={(confidence) =>
          activeStudySet && activeStudyCard
            ? handleReviewFlashcard(activeStudySet.id, getCardId(activeStudyCard), confidence)
            : undefined
        }
      />
    </div>
  );
}

export default App;
