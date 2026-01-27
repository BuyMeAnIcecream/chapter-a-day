// Use environment variable or detect hostname for mobile access
const getApiBase = () => {
  // Check if we have a VITE_API_URL (set at build time)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development, use the current hostname (works for localhost and network IP)
  if (import.meta.env.DEV) {
    const hostname = window.location.hostname;
    return `http://${hostname}:4000`;
  }
  
  // In production (Docker), use the same hostname with port 4000
  // This assumes the server is accessible on the same hostname
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  // If running on port 80, assume server is on 4000
  if (window.location.port === '' || window.location.port === '80') {
    return `${protocol}//${hostname}:4000`;
  }
  // Otherwise use the same port (for development)
  return `${protocol}//${hostname}:4000`;
};

const API_BASE = getApiBase();

type AuthResponse = {
  token: string;
  user: { id: string; username: string };
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
  username: string,
  password: string
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return handleResponse<AuthResponse>(response);
};

export const loginUser = async (
  username: string,
  password: string
): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return handleResponse<AuthResponse>(response);
};

export const fetchMe = async (token: string): Promise<{ user: { id: string; username: string; createdAt: string } }> => {
  const response = await fetch(`${API_BASE}/api/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse<{ user: { id: string; username: string; createdAt: string } }>(response);
};

export const fetchToday = async (token?: string | null) => {
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}/api/today`, {
    headers
  });
  return handleResponse<{
    date: string;
    progress: { currentChapterIndex: number; totalChapters: number };
    chapter: { id: string; book: string; chapterNumber: number; content: string };
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

export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
  };
  parentId: string | null;
  replies: Comment[];
};

export const createComment = async (
  chapterId: string,
  content: string,
  token: string,
  parentId?: string
): Promise<Comment> => {
  const response = await fetch(`${API_BASE}/api/chapters/${chapterId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ content, parentId })
  });
  return handleResponse<Comment>(response);
};

export const fetchComments = async (
  chapterId: string,
  token?: string | null
): Promise<{ comments: Comment[] }> => {
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}/api/chapters/${chapterId}/comments`, {
    headers
  });
  return handleResponse<{ comments: Comment[] }>(response);
};

export const deleteComment = async (
  commentId: string,
  token: string
): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE}/api/comments/${commentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse<{ success: boolean }>(response);
};

export const fetchVersion = async (): Promise<{ version: string }> => {
  const response = await fetch(`${API_BASE}/api/version`);
  return handleResponse<{ version: string }>(response);
};

export type Notification = {
  id: string;
  commentId: string;
  parentCommentId: string;
  read: boolean;
  createdAt: string;
  comment: {
    id: string;
    content: string;
    user: { username: string };
    chapter: { book: string; chapterNumber: number };
  };
  parentComment: {
    id: string;
    content: string;
  };
};

export const fetchNotifications = async (
  token: string
): Promise<{ notifications: Notification[]; unreadCount: number }> => {
  const response = await fetch(`${API_BASE}/api/notifications`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse<{ notifications: Notification[]; unreadCount: number }>(response);
};

export const markNotificationRead = async (
  notificationId: string,
  token: string
): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse<{ success: boolean }>(response);
};

export const markAllNotificationsRead = async (
  token: string
): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE}/api/notifications/read-all`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse<{ success: boolean }>(response);
};
