const AuthScreen = ({ onEnter, mode, setMode, highlights }) => {
  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <span className="badge">Full Stack Learning</span>
        <h1>Turn uploaded study documents into chat, flashcards, and quizzes.</h1>
        <p>
          Ek hi app mein PDF upload karo, uska raw content dekho, AI se sawal
          poochho, summary aur detailed explanation lo, phir flashcards aur MCQ
          quizzes generate karo.
        </p>
        <div className="hero-grid">
          {highlights.map((item) => (
            <div className="mini-card" key={item}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <div className="auth-form">
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <label>
            Full Name
            <input placeholder="Aarav Sharma" />
          </label>
          <label>
            Email
            <input placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input type="password" placeholder="••••••••" />
          </label>
          <button className="primary-btn" onClick={onEnter}>
            {mode === "login" ? "Enter Dashboard" : "Create Account"}
          </button>
          <p className="muted-text">
            UI demo ke liye button click karte hi dashboard open ho jayega.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AuthScreen;
