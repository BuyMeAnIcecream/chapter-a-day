import { useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import "./App.css";

const TOKEN_KEY = "chapter_a_day_token";
const EMAIL_KEY = "chapter_a_day_email";

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem(TOKEN_KEY)
  );
  const [email, setEmail] = useState<string | null>(
    localStorage.getItem(EMAIL_KEY)
  );

  const handleAuthSuccess = (newToken: string, userEmail: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(EMAIL_KEY, userEmail);
    setToken(newToken);
    setEmail(userEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setToken(null);
    setEmail(null);
  };

  return (
    <div className="app">
      {token && email ? (
        <Dashboard token={token} email={email} onLogout={handleLogout} />
      ) : (
        <Login onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

export default App;
