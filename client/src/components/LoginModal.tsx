import { type FormEvent, useState, useEffect, useRef } from "react";
import { loginUser, registerUser } from "../api";
import "./LoginModal.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (token: string, username: string) => void;
};

export const LoginModal = ({ isOpen, onClose, onAuthSuccess }: Props) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

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
      onClose();
      setUsername("");
      setPassword("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Focus username input when modal opens
  useEffect(() => {
    if (isOpen && usernameInputRef.current) {
      setTimeout(() => usernameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" ref={modalRef}>
        <button
          className="modal-close"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          ×
        </button>
        <h2>Log in to comment</h2>
        <p className="modal-subtitle">
          {mode === "login"
            ? "Log in to post your comment"
            : "Create an account to comment"}
        </p>
        <form onSubmit={handleSubmit} className="stack">
          <label className="field">
            Username
            <input
              ref={usernameInputRef}
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
    </div>
  );
};
