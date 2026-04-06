export const documents = [
  {
    id: "react-guide",
    title: "React JS Concept Guide",
    category: "Frontend",
    pages: 42,
    updatedAt: "2 hours ago",
    size: "8.2 MB",
    progress: 68,
    summary:
      "This document explains React fundamentals, component composition, hooks, state updates, lifecycle thinking, and performance-friendly UI patterns.",
    rawContent: `React is a JavaScript library for building user interfaces.

Core ideas:
- Components split UI into reusable pieces.
- Props allow data flow from parent to child.
- State lets a component manage local data.
- Hooks help us reuse logic in function components.
- Effects synchronize UI with outside systems.

Best practices:
- Keep components small and focused.
- Lift state when multiple components need the same data.
- Prefer derived UI over duplicated state.
- Use semantic HTML and accessible interactions.`,
    chat: [
      {
        id: "c1",
        role: "assistant",
        text: "Upload ke baad yahan user PDF se related koi bhi question pooch sakta hai, aur AI document ke context ke basis par answer dega."
      },
      {
        id: "c2",
        role: "user",
        text: "What is the benefit of component-based architecture?"
      },
      {
        id: "c3",
        role: "assistant",
        text: "Component-based architecture reusability, maintainability, aur faster UI development ko improve karta hai because each section isolated logic ke saath manage hota hai."
      }
    ],
    flashcardSets: [
      {
        id: "fs1",
        title: "Hooks Basics",
        starred: 2,
        progress: 60,
        cards: [
          {
            id: "f1",
            question: "What does useState do in React?",
            answer: "It adds state to a functional component.",
            starred: true
          },
          {
            id: "f2",
            question: "When is useEffect commonly used?",
            answer: "To sync the component with APIs, timers, or subscriptions.",
            starred: false
          },
          {
            id: "f3",
            question: "Why should state not be mutated directly?",
            answer: "Direct mutation can prevent React from detecting and rendering updates correctly.",
            starred: true
          }
        ]
      },
      {
        id: "fs2",
        title: "Component Patterns",
        starred: 1,
        progress: 25,
        cards: [
          {
            id: "f4",
            question: "What are props?",
            answer: "Inputs passed from a parent component to a child component.",
            starred: false
          },
          {
            id: "f5",
            question: "What is lifting state up?",
            answer: "Moving shared state to the nearest common parent.",
            starred: true
          }
        ]
      }
    ],
    quizzes: [
      {
        id: "q1",
        title: "React Foundations",
        difficulty: "Medium",
        questions: 5,
        score: 80
      },
      {
        id: "q2",
        title: "Hooks Challenge",
        difficulty: "Hard",
        questions: 8,
        score: 0
      }
    ]
  },
  {
    id: "node-notes",
    title: "Node.js Interview Notes",
    category: "Backend",
    pages: 28,
    updatedAt: "Yesterday",
    size: "4.7 MB",
    progress: 41,
    summary:
      "Covers Node.js runtime, event loop, middleware, REST API structure, async patterns, and common interview scenarios.",
    rawContent: `Node.js runs JavaScript on the server using the V8 engine.

Important topics:
- Event loop and non-blocking I/O
- Express middleware
- Async/await and promises
- Error handling
- Authentication basics`,
    chat: [
      {
        id: "n1",
        role: "assistant",
        text: "Node.js ka event loop async operations ko efficiently handle karta hai."
      }
    ],
    flashcardSets: [
      {
        id: "fs3",
        title: "Node Core",
        starred: 0,
        progress: 10,
        cards: [
          {
            id: "f6",
            question: "What is non-blocking I/O?",
            answer: "Operations continue without stopping the main thread while waiting for tasks to complete.",
            starred: false
          }
        ]
      }
    ],
    quizzes: [
      {
        id: "q3",
        title: "Backend Basics",
        difficulty: "Easy",
        questions: 6,
        score: 66
      }
    ]
  }
];

export const activities = [
  "Generated 1 flashcard set for React JS Concept Guide",
  "Asked AI to explain useEffect in detail",
  "Completed Hooks Challenge quiz with 80%",
  "Uploaded Node.js Interview Notes"
];

export const authHighlights = [
  "Email login and signup flow",
  "Quick dashboard metrics after login",
  "Recent activity, progress tracking, and document library",
  "Per-document content, chat, AI actions, flashcards, and quizzes"
];
