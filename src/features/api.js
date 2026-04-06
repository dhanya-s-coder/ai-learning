const TOKEN_KEY = "ai-learning-auth-token";
const REFRESH_TOKEN_KEY = "ai-learning-refresh-token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

function setRefreshToken(token) {
  if (!token) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  if (response.status === 401 && getRefreshToken() && !options.__retry) {
    const refreshed = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken: getRefreshToken() })
    });
    if (refreshed.ok) {
      const refreshData = await refreshed.json();
      setToken(refreshData.token);
      return request(path, { ...options, __retry: true });
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export const authApi = {
  tokenKey: TOKEN_KEY,
  getToken,
  clearToken: () => {
    setToken("");
    setRefreshToken("");
  },
  async login(payload) {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    return data;
  },
  async signup(payload) {
    const data = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    return data;
  },
  forgotPassword(payload) {
    return request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  resetPassword(payload) {
    return request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};

export const appApi = {
  bootstrap: () => request("/api/bootstrap"),
  uploadDocument(formData) {
    return request("/api/documents", {
      method: "POST",
      body: formData
    });
  },
  renameDocument(documentId, title) {
    return request(`/api/documents/${documentId}`, {
      method: "PATCH",
      body: JSON.stringify({ title })
    });
  },
  deleteDocument(documentId) {
    return request(`/api/documents/${documentId}`, { method: "DELETE" });
  },
  reprocessDocument(documentId) {
    return request(`/api/documents/${documentId}/reprocess`, { method: "POST", body: JSON.stringify({}) });
  },
  generateSummary(documentId) {
    return request(`/api/documents/${documentId}/summary`, { method: "POST", body: JSON.stringify({}) });
  },
  explainConcept(documentId, concept) {
    return request(`/api/documents/${documentId}/explain`, {
      method: "POST",
      body: JSON.stringify({ concept })
    });
  },
  chat(documentId, message) {
    return request(`/api/documents/${documentId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message })
    });
  },
  generateFlashcards(documentId, count = 8) {
    return request(`/api/documents/${documentId}/flashcards`, {
      method: "POST",
      body: JSON.stringify({ count })
    });
  },
  reviewFlashcard(setId, cardId, confidence) {
    return request(`/api/flashcard-sets/${setId}/review`, {
      method: "PATCH",
      body: JSON.stringify({ cardId, confidence })
    });
  },
  toggleFlashcardStar(cardId) {
    return request(`/api/flashcards/${cardId}/star`, { method: "PATCH", body: JSON.stringify({}) });
  },
  deleteFlashcardSet(setId) {
    return request(`/api/flashcard-sets/${setId}`, { method: "DELETE" });
  },
  generateQuiz(documentId, difficulty, totalQuestions) {
    return request(`/api/documents/${documentId}/quizzes`, {
      method: "POST",
      body: JSON.stringify({ difficulty, totalQuestions })
    });
  },
  answerQuiz(quizId, questionId, option) {
    return request(`/api/quizzes/${quizId}/answer`, {
      method: "PATCH",
      body: JSON.stringify({ questionId, option })
    });
  },
  startQuiz(quizId) {
    return request(`/api/quizzes/${quizId}/start`, { method: "POST", body: JSON.stringify({}) });
  },
  completeQuiz(quizId) {
    return request(`/api/quizzes/${quizId}/complete`, { method: "POST", body: JSON.stringify({}) });
  },
  retryWrongQuiz(quizId) {
    return request(`/api/quizzes/${quizId}/retry-wrong`, { method: "POST", body: JSON.stringify({}) });
  }
};
