const TOKEN_KEY = "ai-learning-auth-token";
const REFRESH_TOKEN_KEY = "ai-learning-refresh-token";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";

function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

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
    const refreshed = await fetch(buildApiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  getToken,
  clearToken: () => {
    setToken("");
    setRefreshToken("");
  },
  async login(payload) {
    const data = await request(buildApiUrl("/api/auth/login"), {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    return data;
  },
  async signup(payload) {
    const data = await request(buildApiUrl("/api/auth/signup"), {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    return data;
  },
  forgotPassword(payload) {
    return request(buildApiUrl("/api/auth/forgot-password"), {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  resetPassword(payload) {
    return request(buildApiUrl("/api/auth/reset-password"), {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};

export function getAssetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return buildApiUrl(path);
}

export const documentsApi = {
  bootstrap: () => request(buildApiUrl("/api/bootstrap")),
  uploadDocument(formData) {
    return request(buildApiUrl("/api/documents"), { method: "POST", body: formData });
  },
  renameDocument(documentId, title) {
    return request(buildApiUrl(`/api/documents/${documentId}`), {
      method: "PATCH",
      body: JSON.stringify({ title })
    });
  },
  deleteDocument(documentId) {
    return request(buildApiUrl(`/api/documents/${documentId}`), { method: "DELETE" });
  },
  reprocessDocument(documentId) {
    return request(buildApiUrl(`/api/documents/${documentId}/reprocess`), {
      method: "POST",
      body: JSON.stringify({})
    });
  },
  saveOcr(documentId, pages) {
    return request(buildApiUrl(`/api/documents/${documentId}/ocr`), {
      method: "PATCH",
      body: JSON.stringify({ pages })
    });
  },
  generateSummary(documentId) {
    return request(buildApiUrl(`/api/documents/${documentId}/summary`), {
      method: "POST",
      body: JSON.stringify({})
    });
  },
  explainConcept(documentId, concept) {
    return request(buildApiUrl(`/api/documents/${documentId}/explain`), {
      method: "POST",
      body: JSON.stringify({ concept })
    });
  },
  chat(documentId, message) {
    return request(buildApiUrl(`/api/documents/${documentId}/chat`), {
      method: "POST",
      body: JSON.stringify({ message })
    });
  }
};

export const flashcardsApi = {
  generate(documentId, count = 8) {
    return request(buildApiUrl(`/api/documents/${documentId}/flashcards`), {
      method: "POST",
      body: JSON.stringify({ count })
    });
  },
  review(setId, cardId, confidence) {
    return request(buildApiUrl(`/api/flashcard-sets/${setId}/review`), {
      method: "PATCH",
      body: JSON.stringify({ cardId, confidence })
    });
  },
  toggleStar(cardId) {
    return request(buildApiUrl(`/api/flashcards/${cardId}/star`), {
      method: "PATCH",
      body: JSON.stringify({})
    });
  },
  deleteSet(setId) {
    return request(buildApiUrl(`/api/flashcard-sets/${setId}`), { method: "DELETE" });
  }
};

export const quizzesApi = {
  generate(documentId, difficulty, totalQuestions) {
    return request(buildApiUrl(`/api/documents/${documentId}/quizzes`), {
      method: "POST",
      body: JSON.stringify({ difficulty, totalQuestions })
    });
  },
  start(quizId) {
    return request(buildApiUrl(`/api/quizzes/${quizId}/start`), { method: "POST", body: JSON.stringify({}) });
  },
  answer(quizId, questionId, option) {
    return request(buildApiUrl(`/api/quizzes/${quizId}/answer`), {
      method: "PATCH",
      body: JSON.stringify({ questionId, option })
    });
  },
  complete(quizId) {
    return request(buildApiUrl(`/api/quizzes/${quizId}/complete`), { method: "POST", body: JSON.stringify({}) });
  },
  retryWrong(quizId) {
    return request(buildApiUrl(`/api/quizzes/${quizId}/retry-wrong`), { method: "POST", body: JSON.stringify({}) });
  }
};
