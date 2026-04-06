import { useEffect, useMemo, useState } from "react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "documents", label: "Documents" },
  { id: "flashcards", label: "Flashcards" },
  { id: "quizzes", label: "Quizzes" },
];

const QUICK_PROMPTS = [
  "Explain the key ideas from this PDF in simple words.",
  "Give me interview questions from this document.",
  "Which topics should I revise first before a test?",
];

const starterDocument = {
  id: "doc-react",
  title: "React JS Concept Guide",
  filename: "react-js-concepts.pdf",
  sizeLabel: "2.4 MB",
  topic: "Frontend Development",
  uploadedAt: "Apr 6, 2026",
  previewUrl: "",
  summary:
    "This guide covers React components, JSX, props, state, hooks, lifecycle thinking, rendering flow, and common patterns for building reusable UI.",
  conceptExplanation:
    "Hooks let us use state and side effects inside function components. useState stores values between renders and useEffect runs logic after rendering.",
  chat: [
    {
      id: "chat-1",
      role: "assistant",
      text: "Ask anything from this document. I can explain concepts, summarize sections, or help you revise important topics.",
    },
  ],
  content:
    "React is a JavaScript library for building user interfaces. It uses reusable components, JSX syntax, declarative rendering, and hooks like useState and useEffect.",
  flashcardSets: [
    {
      id: "set-react-1",
      name: "React Basics",
      progress: 50,
      cards: [
        {
          id: "card-1",
          question: "What is JSX?",
          answer:
            "JSX is a syntax extension that lets us write HTML-like markup inside JavaScript for React components.",
          starred: true,
        },
        {
          id: "card-2",
          question: "What does useState do?",
          answer:
            "It adds state to a function component and lets the UI update when the state changes.",
          starred: false,
        },
      ],
      createdAt: "Apr 6, 2026",
    },
  ],
  quizzes: [
    {
      id: "quiz-react-1",
      name: "React Fundamentals Quiz",
      difficulty: "Medium",
      score: 80,
      totalQuestions: 5,
      createdAt: "Apr 6, 2026",
      questions: [
        {
          id: "q1",
          question: "Which hook is used to store local component state?",
          options: ["useRef", "useState", "useMemo", "useContext"],
          answer: "useState",
          selected: "useState",
        },
        {
          id: "q2",
          question: "Why are keys used in React lists?",
          options: [
            "To style list items",
            "To optimize and track item identity",
            "To create routes",
            "To call APIs",
          ],
          answer: "To optimize and track item identity",
          selected: "",
        },
      ],
    },
  ],
};

const starterActivity = [
  { id: "act-1", type: "summary", text: "Generated summary for React JS Concept Guide", time: "2m ago" },
  { id: "act-2", type: "flashcards", text: "Created flashcard set: React Basics", time: "12m ago" },
  { id: "act-3", type: "quiz", text: "Completed React Fundamentals Quiz", time: "1h ago" },
];

const STORAGE_KEY = "ai-learning-app-state-v1";

function createInitialState() {
  return {
    user: null,
    activeNav: "dashboard",
    selectedDocumentId: starterDocument.id,
    documents: [starterDocument],
    activity: starterActivity,
  };
}

function App() {
  const [appState, setAppState] = useState(createInitialState);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [chatInput, setChatInput] = useState("");
  const [conceptInput, setConceptInput] = useState("");
  const [quizForm, setQuizForm] = useState({ difficulty: "Medium", totalQuestions: 5 });
  const [uploadForm, setUploadForm] = useState({ title: "", file: null });
  const [flashcardIndexes, setFlashcardIndexes] = useState({});

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  const selectedDocument = useMemo(
    () => appState.documents.find((item) => item.id === appState.selectedDocumentId) || appState.documents[0],
    [appState.documents, appState.selectedDocumentId]
  );

  const allFlashcardSets = useMemo(
    () =>
      appState.documents.flatMap((document) =>
        document.flashcardSets.map((set) => ({
          ...set,
          documentId: document.id,
          documentTitle: document.title,
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
          documentTitle: document.title,
        }))
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
      activity: [{ id: crypto.randomUUID(), text, type, time: "Just now" }, ...current.activity].slice(0, 8),
    }));
  };

  const handleAuthSubmit = (event) => {
    event.preventDefault();
    const name = authMode === "signup" ? authForm.name || "Learner" : "Learner";
    setAppState((current) => ({
      ...current,
      user: { name, email: authForm.email || "learner@example.com" },
    }));
  };

  const handleUpload = (event) => {
    event.preventDefault();
    if (!uploadForm.title.trim()) return;
    const previewUrl = uploadForm.file ? URL.createObjectURL(uploadForm.file) : "";
    const fileSizeInMb = uploadForm.file ? uploadForm.file.size / (1024 * 1024) : 1;
    const title = uploadForm.title.trim();
    const newDocument = {
      id: crypto.randomUUID(),
      title,
      filename: uploadForm.file?.name || `${title.toLowerCase().replaceAll(" ", "-")}.pdf`,
      sizeLabel: `${fileSizeInMb.toFixed(1)} MB`,
      topic: "Custom Document",
      uploadedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      previewUrl,
      summary:
        "Upload complete. Use AI actions to generate a summary, explain difficult concepts, create flashcards, or build quizzes.",
      conceptExplanation:
        "Pick any concept from the document and this section can show a detailed explanation for quick revision.",
      chat: [
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `Your document "${title}" is ready. Ask me anything related to this PDF.`,
        },
      ],
      content:
        "Raw extracted PDF text will appear here. In a real backend, this area would show parsed text or a rendered document preview.",
      flashcardSets: [],
      quizzes: [],
    };

    setAppState((current) => ({
      ...current,
      activeNav: "documents",
      selectedDocumentId: newDocument.id,
      documents: [newDocument, ...current.documents],
    }));
    setUploadForm({ title: "", file: null });
    addActivity(`Uploaded new document: ${title}`, "upload");
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || !selectedDocument) return;
    const prompt = chatInput.trim();
    updateSelectedDocument((document) => ({
      ...document,
      chat: [
        ...document.chat,
        { id: crypto.randomUUID(), role: "user", text: prompt },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `Based on "${document.title}", ${prompt} is explained through the document's key points, examples, and revision-friendly ideas.`,
        },
      ],
    }));
    setChatInput("");
    addActivity(`Asked AI about ${selectedDocument.title}`, "chat");
  };

  const handleGenerateSummary = () => {
    if (!selectedDocument) return;
    updateSelectedDocument((document) => ({
      ...document,
      summary: `${document.title} summary: This PDF introduces the topic, explains important terms, highlights key ideas, and turns them into useful revision material.`,
    }));
    addActivity(`Generated summary for ${selectedDocument.title}`, "summary");
  };

  const handleExplainConcept = () => {
    if (!selectedDocument || !conceptInput.trim()) return;
    const concept = conceptInput.trim();
    updateSelectedDocument((document) => ({
      ...document,
      conceptExplanation: `${concept}: This concept matters because it connects the document theory with practical understanding, examples, and related sub-topics for revision.`,
    }));
    setConceptInput("");
    addActivity(`Explained concept "${concept}" from ${selectedDocument.title}`, "explain");
  };

  const handleGenerateFlashcards = () => {
    if (!selectedDocument) return;
    const count = selectedDocument.flashcardSets.length + 1;
    const newSet = {
      id: crypto.randomUUID(),
      name: `${selectedDocument.title} Set ${count}`,
      progress: 0,
      createdAt: "Just now",
      cards: [
        {
          id: crypto.randomUUID(),
          question: `What is the main idea of ${selectedDocument.title}?`,
          answer: `The document helps the learner understand ${selectedDocument.topic.toLowerCase()} concepts from the uploaded PDF.`,
          starred: false,
        },
        {
          id: crypto.randomUUID(),
          question: `Name one important concept from ${selectedDocument.title}.`,
          answer: "A key concept is one of the central definitions, examples, or frameworks described inside the PDF.",
          starred: false,
        },
        {
          id: crypto.randomUUID(),
          question: "Why should this document be revised with flashcards?",
          answer: "Flashcards break dense notes into quick recall prompts that improve memory and exam preparation.",
          starred: false,
        },
      ],
    };

    updateSelectedDocument((document) => ({
      ...document,
      flashcardSets: [newSet, ...document.flashcardSets],
    }));
    addActivity(`Created flashcard set for ${selectedDocument.title}`, "flashcards");
  };

  const handleDeleteFlashcardSet = (documentId, setId) => {
    setAppState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id === documentId
          ? { ...document, flashcardSets: document.flashcardSets.filter((set) => set.id !== setId) }
          : document
      ),
    }));
    addActivity("Deleted a flashcard set", "flashcards");
  };

  const handleToggleStar = (documentId, setId, cardId) => {
    setAppState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id === documentId
          ? {
              ...document,
              flashcardSets: document.flashcardSets.map((set) =>
                set.id === setId
                  ? {
                      ...set,
                      cards: set.cards.map((card) =>
                        card.id === cardId ? { ...card, starred: !card.starred } : card
                      ),
                    }
                  : set
              ),
            }
          : document
      ),
    }));
  };

  const changeFlashcardIndex = (setId, direction, totalCards) => {
    setFlashcardIndexes((current) => {
      const currentIndex = current[setId] || 0;
      const nextIndex =
        direction === "next"
          ? Math.min(currentIndex + 1, totalCards - 1)
          : Math.max(currentIndex - 1, 0);
      return { ...current, [setId]: nextIndex };
    });
  };

  const handleGenerateQuiz = () => {
    if (!selectedDocument) return;
    const total = Number(quizForm.totalQuestions);
    const questions = Array.from({ length: total }, (_, index) => ({
      id: crypto.randomUUID(),
      question: `Question ${index + 1}: Which statement best matches ${selectedDocument.title}?`,
      options: [
        "It focuses only on unrelated general knowledge.",
        "It helps the learner revise concepts from the uploaded document.",
        "It is only a compiler output.",
        "It contains no important concepts.",
      ],
      answer: "It helps the learner revise concepts from the uploaded document.",
      selected: "",
    }));

    const newQuiz = {
      id: crypto.randomUUID(),
      name: `${selectedDocument.title} Quiz ${selectedDocument.quizzes.length + 1}`,
      difficulty: quizForm.difficulty,
      totalQuestions: total,
      score: 0,
      createdAt: "Just now",
      questions,
    };

    updateSelectedDocument((document) => ({
      ...document,
      quizzes: [newQuiz, ...document.quizzes],
    }));
    addActivity(`Generated ${quizForm.difficulty} quiz for ${selectedDocument.title}`, "quiz");
  };

  const handleSelectQuizOption = (documentId, quizId, questionId, option) => {
    setAppState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id === documentId
          ? {
              ...document,
              quizzes: document.quizzes.map((quiz) => {
                if (quiz.id !== quizId) return quiz;
                const updatedQuestions = quiz.questions.map((question) =>
                  question.id === questionId ? { ...question, selected: option } : question
                );
                const correct = updatedQuestions.filter((question) => question.selected === question.answer).length;
                return {
                  ...quiz,
                  questions: updatedQuestions,
                  score: Math.round((correct / updatedQuestions.length) * 100),
                };
              }),
            }
          : document
      ),
    }));
  };

  if (!appState.user) {
    return (
      <AuthScreen
        authMode={authMode}
        authForm={authForm}
        onModeChange={setAuthMode}
        onFormChange={setAuthForm}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <MainLayout
      appState={appState}
      setAppState={setAppState}
      selectedDocument={selectedDocument}
      allFlashcardSets={allFlashcardSets}
      allQuizzes={allQuizzes}
      stats={stats}
      uploadForm={uploadForm}
      setUploadForm={setUploadForm}
      handleUpload={handleUpload}
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
  );
}

function AuthScreen({ authMode, authForm, onModeChange, onFormChange, onSubmit }) {
  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div>
          <span className="badge">Full Stack AI Learning</span>
          <h1>Turn uploaded PDFs into chat, summaries, flashcards, and quizzes.</h1>
          <p>
            Students can upload documents, read raw PDF content, ask AI questions, generate flashcard sets,
            create quizzes by difficulty, and track progress from one dashboard.
          </p>
        </div>

        <div className="hero-grid">
          <div className="hero-card">
            <strong>Documents</strong>
            <span>Upload PDFs and open each document workspace.</span>
          </div>
          <div className="hero-card">
            <strong>Flashcards</strong>
            <span>Create many sets, reveal answers, star cards, and track progress.</span>
          </div>
          <div className="hero-card">
            <strong>Quizzes</strong>
            <span>Generate MCQ quizzes from document concepts with custom difficulty.</span>
          </div>
        </div>
      </div>

      <form className="auth-panel" onSubmit={onSubmit}>
        <div className="auth-tabs">
          <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => onModeChange("login")}>
            Login
          </button>
          <button
            type="button"
            className={authMode === "signup" ? "active" : ""}
            onClick={() => onModeChange("signup")}
          >
            Sign Up
          </button>
        </div>

        <h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p>{authMode === "login" ? "Login to continue learning." : "Start building your smart study space."}</p>

        {authMode === "signup" && (
          <label>
            Full Name
            <input
              value={authForm.name}
              onChange={(event) => onFormChange((current) => ({ ...current, name: event.target.value }))}
              placeholder="Your name"
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            value={authForm.email}
            onChange={(event) => onFormChange((current) => ({ ...current, email: event.target.value }))}
            placeholder="name@example.com"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={authForm.password}
            onChange={(event) => onFormChange((current) => ({ ...current, password: event.target.value }))}
            placeholder="Enter password"
          />
        </label>

        <button className="primary-btn" type="submit">
          {authMode === "login" ? "Login" : "Create Account"}
        </button>
      </form>
    </div>
  );
}

function MainLayout(props) {
  const {
    appState,
    setAppState,
    selectedDocument,
    allFlashcardSets,
    allQuizzes,
    stats,
    uploadForm,
    setUploadForm,
    handleUpload,
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
  } = props;

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
            <h1>
              {appState.activeNav === "dashboard" && "Dashboard"}
              {appState.activeNav === "documents" && "Documents"}
              {appState.activeNav === "flashcards" && "Flashcards"}
              {appState.activeNav === "quizzes" && "Quizzes"}
            </h1>
          </div>
          <button className="secondary-btn" onClick={() => setAppState((current) => ({ ...current, user: null }))}>
            Logout
          </button>
        </header>

        {appState.activeNav === "dashboard" && (
          <DashboardPage
            stats={stats}
            activity={appState.activity}
            uploadForm={uploadForm}
            setUploadForm={setUploadForm}
            handleUpload={handleUpload}
          />
        )}

        {appState.activeNav === "documents" && selectedDocument && (
          <DocumentsPage
            documents={appState.documents}
            selectedDocument={selectedDocument}
            setAppState={setAppState}
            uploadForm={uploadForm}
            setUploadForm={setUploadForm}
            handleUpload={handleUpload}
            chatInput={chatInput}
            setChatInput={setChatInput}
            handleSendChat={handleSendChat}
            conceptInput={conceptInput}
            setConceptInput={setConceptInput}
            handleGenerateSummary={handleGenerateSummary}
            handleExplainConcept={handleExplainConcept}
            handleQuickPrompt={handleQuickPrompt}
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

function DashboardPage({ stats, activity, uploadForm, setUploadForm, handleUpload }) {
  return (
    <section className="page-grid">
      <div className="stats-grid">
        <StatCard label="Documents" value={stats.docs} tone="green" />
        <StatCard label="Flashcard Sets" value={stats.flashcards} tone="blue" />
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

      <div className="card">
        <div className="card-head">
          <h3>Quick Upload</h3>
          <span>Add a new PDF</span>
        </div>
        <UploadForm uploadForm={uploadForm} setUploadForm={setUploadForm} handleUpload={handleUpload} />
      </div>
    </section>
  );
}

function DocumentsPage(props) {
  const {
    documents,
    selectedDocument,
    setAppState,
    uploadForm,
    setUploadForm,
    handleUpload,
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
  } = props;

  return (
    <section className="documents-layout">
      <div className="card">
        <div className="card-head">
          <h3>My Documents</h3>
          <span>{documents.length} files</span>
        </div>
        <UploadForm uploadForm={uploadForm} setUploadForm={setUploadForm} handleUpload={handleUpload} compact />
        <div className="document-list">
          {documents.map((document) => (
            <button
              key={document.id}
              className={selectedDocument.id === document.id ? "document-item active" : "document-item"}
              onClick={() => setAppState((current) => ({ ...current, selectedDocumentId: document.id }))}
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
              Raw content, AI chat, AI actions, flashcards, and quizzes are all available for this one document.
            </p>
          </div>
          <div className="workspace-badges">
            <span>{selectedDocument.flashcardSets.length} sets</span>
            <span>{selectedDocument.quizzes.length} quizzes</span>
          </div>
        </div>

        <div className="tabbed-grid">
          <div className="card panel-card">
            <div className="card-head">
              <h3>Content</h3>
              <span>Raw PDF / preview</span>
            </div>
            {selectedDocument.previewUrl ? (
              <iframe title={selectedDocument.title} src={selectedDocument.previewUrl} className="pdf-frame" />
            ) : (
              <div className="content-box">
                <p>{selectedDocument.content}</p>
              </div>
            )}
          </div>

          <div className="card panel-card">
            <div className="card-head">
              <h3>Chat</h3>
              <span>Ask anything from this PDF</span>
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
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Ask any question related to this document"
              />
              <button className="primary-btn" onClick={handleSendChat}>
                Send
              </button>
            </div>
          </div>

          <div className="card panel-card">
            <div className="card-head">
              <h3>AI Actions</h3>
              <span>Summarize or explain concepts</span>
            </div>
            <div className="action-box">
              <div className="action-item">
                <div>
                  <strong>Generate Summary</strong>
                  <p>{selectedDocument.summary}</p>
                </div>
                <button className="primary-btn" onClick={handleGenerateSummary}>
                  Summarize
                </button>
              </div>
              <div className="action-item concept-action">
                <div>
                  <strong>Explain a Concept</strong>
                  <p>{selectedDocument.conceptExplanation}</p>
                </div>
                <div className="concept-row">
                  <input
                    value={conceptInput}
                    onChange={(event) => setConceptInput(event.target.value)}
                    placeholder="Enter concept name"
                  />
                  <button className="secondary-btn" onClick={handleExplainConcept}>
                    Explain
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card panel-card">
            <div className="card-head">
              <h3>Flashcards</h3>
              <span>Generate and revise sets</span>
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
                        onPrev={() => changeFlashcardIndex(set.id, "prev", set.cards.length)}
                        onNext={() => changeFlashcardIndex(set.id, "next", set.cards.length)}
                        onToggleStar={() => handleToggleStar(selectedDocument.id, set.id, activeCard.id)}
                      />
                    )}
                  </div>
                );
              })}
              {selectedDocument.flashcardSets.length === 0 && (
                <EmptyState title="No flashcard sets yet" text="Generate the first set and all cards for this document will appear here." />
              )}
            </div>
          </div>

          <div className="card panel-card full-span">
            <div className="card-head">
              <h3>Quizzes</h3>
              <span>Create MCQ quizzes from this document</span>
            </div>
            <div className="quiz-form">
              <label>
                Difficulty
                <select
                  value={quizForm.difficulty}
                  onChange={(event) => setQuizForm((current) => ({ ...current, difficulty: event.target.value }))}
                >
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

                  <div className="question-stack">
                    {quiz.questions.map((question) => (
                      <div key={question.id} className="question-card">
                        <p>{question.question}</p>
                        <div className="options-grid">
                          {question.options.map((option) => (
                            <button
                              key={option}
                              className={question.selected === option ? "option-btn active" : "option-btn"}
                              onClick={() => handleSelectQuizOption(selectedDocument.id, quiz.id, question.id, option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlashcardsPage({ allFlashcardSets }) {
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
          {allFlashcardSets.length === 0 && (
            <EmptyState title="No flashcards yet" text="Generate flashcards from any document to see them here." />
          )}
        </div>
      </div>
    </section>
  );
}

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

function UploadForm({ uploadForm, setUploadForm, handleUpload, compact = false }) {
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
      <button className="primary-btn" type="submit">
        Upload Document
      </button>
    </form>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FlashcardViewer({ set, card, currentIndex, onPrev, onNext, onToggleStar }) {
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    setShowAnswer(false);
  }, [card.id]);

  return (
    <div className="flashcard-viewer">
      <div className="flashcard-main">
        <span>
          Card {currentIndex + 1} / {set.cards.length}
        </span>
        <h4>{card.question}</h4>
        {showAnswer ? <p>{card.answer}</p> : <button className="chip" onClick={() => setShowAnswer(true)}>Click to reveal answer</button>}
      </div>
      <div className="flashcard-controls">
        <button className="secondary-btn" onClick={onPrev}>
          Previous
        </button>
        <button className={card.starred ? "star-btn active" : "star-btn"} onClick={onToggleStar}>
          {card.starred ? "Starred" : "Star"}
        </button>
        <button className="secondary-btn" onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export default App;
