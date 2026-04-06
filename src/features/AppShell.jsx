import { useEffect, useMemo, useState } from "react";
import AuthScreen from "./AuthScreen";
import { NAV_ITEMS, STORAGE_KEY } from "./constants";
import { DashboardPage, DocumentsPage, FlashcardsPage, QuizzesPage } from "./Pages";
import { createInitialState, sanitizeStateForStorage } from "./state";
import {
  answerQuestionFromText,
  createFlashcardsFromText,
  createQuizFromText,
  createSummary,
  explainConceptFromText,
  extractPdfData,
  inferTopic,
} from "../lib/documentTools";

function AppShell() {
  const [appState, setAppState] = useState(createInitialState);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [chatInput, setChatInput] = useState("");
  const [conceptInput, setConceptInput] = useState("");
  const [quizForm, setQuizForm] = useState({ difficulty: "Medium", totalQuestions: 5 });
  const [uploadForm, setUploadForm] = useState({ title: "", file: null });
  const [flashcardIndexes, setFlashcardIndexes] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setAppState(JSON.parse(saved));
    } catch (error) {
      console.error("Could not parse app state", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, sanitizeStateForStorage(appState));
  }, [appState]);

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
      reviewed: allFlashcardSets.reduce((total, set) => total + set.cards.length, 0),
    }),
    [appState.documents, allFlashcardSets, allQuizzes]
  );

  const updateSelectedDocument = (updater) => {
    setAppState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id === current.selectedDocumentId ? updater(document) : document
      ),
    }));
  };

  const addActivity = (text, type = "activity") => {
    setAppState((current) => ({
      ...current,
      activity: [{ id: crypto.randomUUID(), text, type, time: "Just now" }, ...current.activity].slice(0, 10),
    }));
  };

  const handleAuthSubmit = (event) => {
    event.preventDefault();
    const name = authMode === "signup" ? authForm.name || "Learner" : "Learner";
    setAppState((current) => ({ ...current, user: { name, email: authForm.email || "learner@example.com" } }));
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadForm.title.trim() || !uploadForm.file) {
      setUploadError("Please enter a title and choose a PDF file.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const previewUrl = URL.createObjectURL(uploadForm.file);
      const pdfData = await extractPdfData(uploadForm.file);
      const title = uploadForm.title.trim();
      const content = pdfData.text || "This PDF was uploaded, but readable text could not be extracted from it.";
      const newDocument = {
        id: crypto.randomUUID(),
        title,
        filename: uploadForm.file.name,
        sizeLabel: `${(uploadForm.file.size / (1024 * 1024)).toFixed(1)} MB`,
        topic: inferTopic(content, title),
        uploadedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        previewUrl,
        pageCount: pdfData.pageCount,
        content,
        summary: createSummary(content, title),
        conceptExplanation: `Enter any concept name from ${title} and AI Actions will explain it from the extracted text.`,
        chat: [
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: `Your PDF "${title}" is ready. I extracted ${pdfData.pageCount} page(s) and found keywords like ${pdfData.keywords.slice(0, 4).join(", ") || "the main topic"}.`,
          },
        ],
        flashcardSets: [],
        quizzes: [],
        keywords: pdfData.keywords,
      };

      setAppState((current) => ({
        ...current,
        activeNav: "documents",
        activeDocTab: "content",
        selectedDocumentId: newDocument.id,
        documents: [newDocument, ...current.documents],
      }));
      setUploadForm({ title: "", file: null });
      addActivity(`Uploaded and parsed ${title}`, "upload");
    } catch (error) {
      console.error(error);
      setUploadError("Could not read this PDF. Try another file or a text-based PDF.");
    } finally {
      setUploading(false);
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || !selectedDocument) return;
    const prompt = chatInput.trim();
    updateSelectedDocument((document) => ({
      ...document,
      chat: [
        ...document.chat,
        { id: crypto.randomUUID(), role: "user", text: prompt },
        { id: crypto.randomUUID(), role: "assistant", text: answerQuestionFromText(document.content, prompt, document.title) },
      ],
    }));
    setChatInput("");
    addActivity(`Asked AI about ${selectedDocument.title}`, "chat");
  };

  const handleGenerateSummary = () => {
    if (!selectedDocument) return;
    updateSelectedDocument((document) => ({ ...document, summary: createSummary(document.content, document.title) }));
    addActivity(`Generated summary for ${selectedDocument.title}`, "summary");
  };

  const handleExplainConcept = () => {
    if (!selectedDocument || !conceptInput.trim()) return;
    const concept = conceptInput.trim();
    updateSelectedDocument((document) => ({
      ...document,
      conceptExplanation: explainConceptFromText(document.content, concept, document.title),
    }));
    setConceptInput("");
    addActivity(`Explained "${concept}" from ${selectedDocument.title}`, "explain");
  };

  const handleGenerateFlashcards = () => {
    if (!selectedDocument) return;
    const cards = createFlashcardsFromText(selectedDocument.content, selectedDocument.title, 6);
    if (!cards.length) return;
    const newSet = {
      id: crypto.randomUUID(),
      name: `${selectedDocument.title} Set ${selectedDocument.flashcardSets.length + 1}`,
      progress: 0,
      createdAt: "Just now",
      cards,
    };
    updateSelectedDocument((document) => ({ ...document, flashcardSets: [newSet, ...document.flashcardSets] }));
    setFlashcardIndexes((current) => ({ ...current, [newSet.id]: 0 }));
    addActivity(`Created flashcard set for ${selectedDocument.title}`, "flashcards");
  };

  const handleDeleteFlashcardSet = (documentId, setId) => {
    setAppState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id === documentId ? { ...document, flashcardSets: document.flashcardSets.filter((set) => set.id !== setId) } : document
      ),
    }));
    addActivity("Deleted a flashcard set", "flashcards");
  };

  const handleToggleStar = (documentId, setId, cardId) => {
    setAppState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id !== documentId
          ? document
          : {
              ...document,
              flashcardSets: document.flashcardSets.map((set) =>
                set.id !== setId
                  ? set
                  : { ...set, cards: set.cards.map((card) => (card.id === cardId ? { ...card, starred: !card.starred } : card)) }
              ),
            }
      ),
    }));
  };

  const changeFlashcardIndex = (setId, direction, totalCards) => {
    setFlashcardIndexes((current) => {
      const currentIndex = current[setId] || 0;
      const nextIndex = direction === "next" ? Math.min(currentIndex + 1, totalCards - 1) : Math.max(currentIndex - 1, 0);
      return { ...current, [setId]: nextIndex };
    });
  };

  const handleGenerateQuiz = () => {
    if (!selectedDocument) return;
    const questions = createQuizFromText(
      selectedDocument.content,
      selectedDocument.title,
      quizForm.difficulty,
      Number(quizForm.totalQuestions)
    );
    const newQuiz = {
      id: crypto.randomUUID(),
      name: `${selectedDocument.title} Quiz ${selectedDocument.quizzes.length + 1}`,
      difficulty: quizForm.difficulty,
      totalQuestions: questions.length,
      score: 0,
      createdAt: "Just now",
      questions,
    };
    updateSelectedDocument((document) => ({ ...document, quizzes: [newQuiz, ...document.quizzes] }));
    addActivity(`Generated ${quizForm.difficulty} quiz for ${selectedDocument.title}`, "quiz");
  };

  const handleSelectQuizOption = (documentId, quizId, questionId, option) => {
    setAppState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id !== documentId
          ? document
          : {
              ...document,
              quizzes: document.quizzes.map((quiz) => {
                if (quiz.id !== quizId) return quiz;
                const updatedQuestions = quiz.questions.map((question) =>
                  question.id === questionId ? { ...question, selected: option } : question
                );
                const correct = updatedQuestions.filter((question) => question.selected === question.answer).length;
                return { ...quiz, questions: updatedQuestions, score: Math.round((correct / updatedQuestions.length) * 100) };
              }),
            }
      ),
    }));
  };

  if (!appState.user) {
    return <AuthScreen authMode={authMode} authForm={authForm} onModeChange={setAuthMode} onFormChange={setAuthForm} onSubmit={handleAuthSubmit} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-mark">AI</div>
            <div>
              <h2>AI Learning</h2>
              <span>Smart revision workspace</span>
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
          <button className="secondary-btn" onClick={() => setAppState((current) => ({ ...current, user: null }))}>
            Logout
          </button>
        </header>

        {appState.activeNav === "dashboard" && (
          <DashboardPage
            stats={stats}
            activity={appState.activity}
            documents={appState.documents}
            uploadForm={uploadForm}
            setUploadForm={setUploadForm}
            handleUpload={handleUpload}
            uploading={uploading}
            uploadError={uploadError}
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
            uploading={uploading}
            uploadError={uploadError}
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
          />
        )}

        {appState.activeNav === "flashcards" && <FlashcardsPage allFlashcardSets={allFlashcardSets} />}
        {appState.activeNav === "quizzes" && <QuizzesPage allQuizzes={allQuizzes} />}
      </main>
    </div>
  );
}

export default AppShell;
