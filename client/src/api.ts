const API_BASE = "http://localhost:4000";

type AuthResponse = {
  token: string;
  user: { id: string; email: string };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data?.error === "string" ? data.error : "Request failed";
    throw new Error(message);
  }
  return data as T;
};

export const registerUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return handleResponse<AuthResponse>(response);
};

export const loginUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return handleResponse<AuthResponse>(response);
};

export const fetchToday = async (token: string) => {
  const response = await fetch(`${API_BASE}/api/today`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse<{
    date: string;
    progress: { currentChapterIndex: number; totalChapters: number };
    chapter: { book: string; chapterNumber: number; content: string };
  }>(response);
};

export const fetchProgress = async (token: string) => {
  const response = await fetch(`${API_BASE}/api/progress`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse<{
    progress: { currentChapterIndex: number; lastDeliveredDate: string | null };
    totalChapters: number;
  }>(response);
};
