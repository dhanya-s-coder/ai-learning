import {
  createFlashcardsFromText,
  createQuizFromText,
  createSummary,
  explainConceptFromText,
  getTopKeywords,
} from "../lib/documentTools";

const starterText = `React is a JavaScript library for building user interfaces with reusable components. JSX lets developers write UI syntax inside JavaScript. Props pass data from parent to child components, while state stores values that change over time. Hooks such as useState and useEffect help function components manage logic and side effects. React applications are easier to maintain when components stay small, focused, and reusable.`;

export function createSeedDocument() {
  return {
    id: "doc-react",
    title: "React JS Concept Guide",
    filename: "react-js-concepts.pdf",
    sizeLabel: "2.4 MB",
    topic: "React, Components, State",
    uploadedAt: "Apr 7, 2026",
    previewUrl: "",
    pageCount: 4,
    content: starterText,
    summary: createSummary(starterText, "React JS Concept Guide"),
    conceptExplanation: explainConceptFromText(
      starterText,
      "useEffect",
      "React JS Concept Guide"
    ),
    chat: [
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "Ask anything from this document. Answers will be generated from the extracted PDF text.",
      },
    ],
    flashcardSets: [
      {
        id: crypto.randomUUID(),
        name: "React Basics",
        progress: 0,
        createdAt: "Apr 7, 2026",
        cards: createFlashcardsFromText(starterText, "React JS Concept Guide", 4),
      },
    ],
    quizzes: [
      {
        id: crypto.randomUUID(),
        name: "React Fundamentals Quiz",
        difficulty: "Medium",
        score: 0,
        totalQuestions: 4,
        createdAt: "Apr 7, 2026",
        questions: createQuizFromText(starterText, "React JS Concept Guide", "Medium", 4),
      },
    ],
    keywords: getTopKeywords(starterText, 6),
  };
}

export function createInitialState() {
  const starterDocument = createSeedDocument();
  return {
    user: null,
    activeNav: "dashboard",
    activeDocTab: "content",
    selectedDocumentId: starterDocument.id,
    documents: [starterDocument],
    activity: [
      {
        id: crypto.randomUUID(),
        type: "summary",
        text: "Generated summary for React JS Concept Guide",
        time: "2m ago",
      },
      {
        id: crypto.randomUUID(),
        type: "flashcards",
        text: "Created flashcard set from React JS Concept Guide",
        time: "11m ago",
      },
      {
        id: crypto.randomUUID(),
        type: "quiz",
        text: "Generated React Fundamentals Quiz",
        time: "18m ago",
      },
    ],
  };
}

export function sanitizeStateForStorage(state) {
  return JSON.stringify({
    ...state,
    documents: state.documents.map((document) => ({
      ...document,
      previewUrl: "",
    })),
  });
}
