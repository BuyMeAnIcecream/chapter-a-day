import type { AuthResponse, TodayResponse, Comment, Notification } from "./types";
export type { AuthResponse, TodayResponse, Comment, Notification } from "./types";

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
  return `${protocol}//${host}:4000`;
};

const API_BASE = getApiBase();

const handleResponse = async <T>(response: Response): Promise<T> => {
  let data: any = {};
  try {
    const text = await response.text();
    if (text) {
      data = JSON.parse(text);
    }
  } catch {
    // If response isn't JSON, data stays as {}
  }
  
  if (!response.ok) {
    const message =
      typeof data?.error === "string" 
        ? data.error 
        : response.status === 0 
          ? "Unable to connect to server. Please check if the server is running."
          : `Request failed (${response.status})`;
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
  return handleResponse<TodayResponse>(response);
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
