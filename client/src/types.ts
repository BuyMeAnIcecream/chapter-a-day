export type AuthResponse = {
  token: string;
  user: { id: string; username: string };
};

export type TodayResponse = {
  date: string;
  progress: { currentChapterIndex: number; totalChapters: number };
  chapter: { id: string; book: string; chapterNumber: number; content: string };
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
