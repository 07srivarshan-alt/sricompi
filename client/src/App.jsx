import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [name, setName] = useState(localStorage.getItem("name") || "");
  const [mode, setMode] = useState("login");
  const [page, setPage] = useState("dashboard");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [exam, setExam] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [seconds, setSeconds] = useState(300);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (page !== "test" || result || busy) return;
    if (seconds === 0) {
      submitExam();
      return;
    }
    const timer = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [page, seconds, result, busy]);

  const api = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` }
  });

  async function handleAuth(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (mode === "register") {
        await axios.post(`${API}/auth/register`, form);
      }

      const { data } = await axios.post(`${API}/auth/login`, {
        email: form.email,
        password: form.password
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name);
      setToken(data.token);
      setName(data.name);
      setPage("dashboard");
    } catch (err) {
      setMessage(err.response?.data?.message || "Connection failed");
    } finally {
      setBusy(false);
    }
  }

  async function startExam(selected) {
    setBusy(true);
    try {
      const { data } = await api.get(`/questions/${selected}`);

      if (!data.length) {
        alert("No questions found");
        return;
      }

      setExam(selected);
      setQuestions(data);
      setAnswers({});
      setResult(null);
      setSeconds(300);
      setPage("test");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load questions");
    } finally {
      setBusy(false);
    }
  }

  async function submitExam() {
    if (busy || result) return;
    setBusy(true);
    try {
      const { data } = await api.post("/submit", { exam, answers });
      setResult(data);
      setPage("result");
    } catch (err) {
      alert(err.response?.data?.message || "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  async function showHistory() {
    try {
      const { data } = await api.get("/results");
      setHistory(data);
      setPage("history");
    } catch {
      alert("Failed to load results");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    setToken("");
    setName("");
    setPage("dashboard");
  }

  if (!token) {
    return (
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleAuth}>
          <h1>EXAM SUCCESS</h1>
          <h2>{mode === "login" ? "Student Login" : "Student Registration"}</h2>
          <p>TNPSC & RRB Competitive Exam Portal</p>

          {mode === "register" && (
            <input
              placeholder="Full Name"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            required
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />

          <input
            type="password"
            placeholder="Password (minimum 8 characters)"
            required
            minLength={8}
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />

          {message && <p className="error">{message}</p>}

          <button type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </button>

          <p>
            {mode === "login" ? "New student? " : "Already registered? "}
            <a href="#" onClick={e => {
              e.preventDefault();
              setMode(mode === "login" ? "register" : "login");
              setMessage("");
            }}>
              {mode === "login" ? "Create Account" : "Login"}
            </a>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>EXAM SUCCESS</h2>
        <button onClick={() => setPage("dashboard")}>Dashboard</button>
        <button onClick={() => startExam("TNPSC")}>TNPSC Mock Test</button>
        <button onClick={() => startExam("RRB")}>RRB Mock Test</button>
        <button onClick={showHistory}>My Results</button>
        <button className="logout" onClick={logout}>Logout</button>
      </aside>

      <div className="content">
        <header className="topbar">
          <h2>Competitive Exam Practice Portal</h2>
          <span>Welcome, {name}</span>
        </header>

        <main>
          {page === "dashboard" && (
            <>
              <div className="welcome">
                <h1>Welcome, {name}!</h1>
                <p>Prepare for TNPSC and RRB government examinations.</p>
              </div>

              <h2>Available Examinations</h2>

              <div className="cards">
                <div className="exam-card">
                  <h3>📚 TNPSC Examination</h3>
                  <p>General Knowledge and Tamil Nadu History.</p>
                  <button onClick={() => startExam("TNPSC")}>
                    Start TNPSC
                  </button>
                </div>

                <div className="exam-card">
                  <h3>🚆 RRB Examination</h3>
                  <p>Mathematics, Science and General Awareness.</p>
                  <button onClick={() => startExam("RRB")}>
                    Start RRB
                  </button>
                </div>

                <div className="exam-card">
                  <h3>🏆 My Performance</h3>
                  <p>View your saved examination results.</p>
                  <button onClick={showHistory}>View Results</button>
                </div>
              </div>
            </>
          )}

          {page === "test" && (
            <>
              <div className="test-header">
                <h2>{exam} Mock Test</h2>
                <div className="timer">
                  Time: {Math.floor(seconds / 60)}:
                  {String(seconds % 60).padStart(2, "0")}
                </div>
              </div>

              <p>Answered: {Object.keys(answers).length}/{questions.length}</p>

              {questions.map((q, index) => (
                <div className="question" key={q._id}>
                  <small>{q.subject}</small>
                  <h3>{index + 1}. {q.question}</h3>

                  {q.options.map((option, i) => (
                    <label className="option" key={i}>
                      <input
                        type="radio"
                        name={q._id}
                        checked={answers[q._id] === i}
                        onChange={() => setAnswers({
                          ...answers,
                          [q._id]: i
                        })}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ))}

              <button disabled={busy} onClick={submitExam}>
                Submit Examination
              </button>
            </>
          )}

          {page === "result" && result && (
            <div className="result-card">
              <h1>🎉 Examination Completed!</h1>
              <p>Your {exam} Score</p>
              <div className="score">{result.score}/{result.total}</div>
              <h2>
                {result.total
                  ? ((result.score / result.total) * 100).toFixed(1)
                  : 0}%
              </h2>
              <button onClick={() => setPage("dashboard")}>
                Dashboard
              </button>
              <button onClick={showHistory}>View History</button>
            </div>
          )}

          {page === "history" && (
            <>
              <h2>My Exam Results</h2>
              <div className="history">
                {history.length === 0 && <p>No attempts yet.</p>}
                {history.map(item => (
                  <div className="history-row" key={item._id}>
                    <strong>{item.exam}</strong>
                    <span>{item.score}/{item.total}</span>
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
