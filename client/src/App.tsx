import { useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import "./App.css";

const TOKEN_KEY = "chapter_a_day_token";
const USERNAME_KEY = "chapter_a_day_username";

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem(TOKEN_KEY)
  );
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem(USERNAME_KEY)
  );

  const handleAuthSuccess = (newToken: string, userUsername: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USERNAME_KEY, userUsername);
    setToken(newToken);
    setUsername(userUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    setToken(null);
    setUsername(null);
  };

  return (
    <div className="app">
      <Dashboard 
        token={token} 
        username={username} 
        onLogout={handleLogout}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;
