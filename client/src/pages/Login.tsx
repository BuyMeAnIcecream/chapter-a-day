import { FormEvent, useState } from "react";
import { loginUser, registerUser } from "../api";

type Props = {
  onAuthSuccess: (token: string, username: string) => void;
};

export const Login = ({ onAuthSuccess }: Props) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const auth =
        mode === "login"
          ? await loginUser(username, password)
          : await registerUser(username, password);
      onAuthSuccess(auth.token, auth.user.username);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h1>Chapter a Day</h1>
      <p className="subtitle">
        {mode === "login"
          ? "Log in to get today’s chapter"
          : "Create an account to start your daily journey"}
      </p>
      <form onSubmit={handleSubmit} className="stack">
        <label className="field">
          Username
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            minLength={3}
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button type="submit" disabled={loading}>
          {loading
            ? "Please wait..."
            : mode === "login"
            ? "Log in"
            : "Create account"}
        </button>
      </form>
      <button
        type="button"
        className="text-button"
        onClick={() =>
          setMode((current) => (current === "login" ? "register" : "login"))
        }
      >
        {mode === "login"
          ? "Need an account? Register"
          : "Already have an account? Log in"}
      </button>
    </div>
  );
};
