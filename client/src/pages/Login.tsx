import { FormEvent, useState } from "react";
import { loginUser, registerUser } from "../api";

type Props = {
  onAuthSuccess: (token: string, email: string) => void;
};

export const Login = ({ onAuthSuccess }: Props) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
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
          ? await loginUser(email, password)
          : await registerUser(email, password);
      onAuthSuccess(auth.token, auth.user.email);
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
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
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
