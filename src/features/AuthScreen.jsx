function AuthScreen({
  authMode,
  authForm,
  onModeChange,
  onFormChange,
  onSubmit,
  forgotMode = false,
  onForgotToggle,
  resetTokenHint
}) {
  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div>
          <span className="badge">Full Stack AI Learning</span>
          <h1>Turn uploaded PDFs into chat, summaries, flashcards, and quizzes.</h1>
          <p>
            Students can upload documents, inspect extracted text, ask AI-style questions, generate revision sets,
            create quizzes by difficulty, and track learning progress in one workspace.
          </p>
        </div>

        <div className="hero-grid">
          <div className="hero-card">
            <strong>Real PDF Parsing</strong>
            <span>Upload a text-based PDF and the app extracts readable content instantly.</span>
          </div>
          <div className="hero-card">
            <strong>Smart Revision</strong>
            <span>Generate summaries, concept explanations, flashcards, and quizzes from extracted text.</span>
          </div>
          <div className="hero-card">
            <strong>Persistent Workspace</strong>
            <span>Your generated document data stays saved in local storage between refreshes.</span>
          </div>
        </div>
      </div>

      <form className="auth-panel" onSubmit={onSubmit}>
        <div className="auth-tabs">
          <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => onModeChange("login")}>
            Login
          </button>
          <button type="button" className={authMode === "signup" ? "active" : ""} onClick={() => onModeChange("signup")}>
            Sign Up
          </button>
        </div>

        <h2>{forgotMode ? "Reset your password" : authMode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p>
          {forgotMode
            ? "Request a reset token or set a new password."
            : authMode === "login"
              ? "Login to continue learning."
              : "Start your smart study workspace."}
        </p>

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

        {(authMode === "signup" || forgotMode) && (
          <label>
            Confirm Password
            <input
              type="password"
              value={authForm.confirmPassword || ""}
              onChange={(event) => onFormChange((current) => ({ ...current, confirmPassword: event.target.value }))}
              placeholder="Confirm password"
            />
          </label>
        )}

        {forgotMode && (
          <label>
            Reset Token
            <input
              value={authForm.resetToken || ""}
              onChange={(event) => onFormChange((current) => ({ ...current, resetToken: event.target.value }))}
              placeholder="Paste reset token"
            />
          </label>
        )}

        {resetTokenHint && <div className="inline-banner">Dev reset token: {resetTokenHint}</div>}

        <button className="primary-btn" type="submit">
          {forgotMode ? "Reset Password" : authMode === "login" ? "Login" : "Create Account"}
        </button>

        <button className="text-btn" type="button" onClick={onForgotToggle}>
          {forgotMode ? "Back to login" : "Forgot password?"}
        </button>
      </form>
    </div>
  );
}

export default AuthScreen;
