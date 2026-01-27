import { useEffect, useState, type FormEvent } from "react";
import { fetchToday, fetchProgress, createComment, fetchComments, deleteComment, fetchVersion, fetchMe, type Comment } from "../api";
import { CommentContent } from "../components/CommentContent";
import { NotificationBell } from "../components/NotificationBell";
import { Login } from "./Login";

type Props = {
  token: string | null;
  username: string | null;
  onLogout: () => void;
  onAuthSuccess: (token: string, username: string) => void;
};

type TodayResponse = {
  date: string;
  progress: { currentChapterIndex: number; totalChapters: number };
  chapter: { id: string; book: string; chapterNumber: number; content: string };
};

export const Dashboard = ({ token, username, onLogout, onAuthSuccess }: Props) => {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
  const [version, setVersion] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadComments = async (chapterId: string) => {
    setCommentsLoading(true);
    setCommentError(null);
    try {
      const data = await fetchComments(chapterId, token);
      setComments(data.comments);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load comments";
      setCommentError(message);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleLoginPrompt = () => {
    // Scroll to top to show login form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        // Always fetch today's chapter and version (public)
        const [todayData, versionData] = await Promise.all([
          fetchToday(token),
          fetchVersion()
        ]);
        if (!active) return;
        setToday(todayData);
        setVersion(versionData.version);
        
        // Load comments for the chapter (public)
        if (todayData.chapter.id) {
          loadComments(todayData.chapter.id);
        }

        // Only fetch user-specific data if logged in
        if (token) {
          try {
            const [progressData, meData] = await Promise.all([
              fetchProgress(token),
              fetchMe(token)
            ]);
            if (!active) return;
            setLastDate(progressData.progress?.lastDeliveredDate ?? null);
            setUserId(meData.user.id);
          } catch (err) {
            // If auth fails, user might have invalid token, but continue without auth
            console.error("Failed to fetch user data:", err);
          }
        }
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Failed to load data";
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmitComment = async (e: FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!today?.chapter.id) return;

    // Require login to comment
    if (!token) {
      handleLoginPrompt();
      return;
    }

    const content = parentId ? replyContent[parentId] : newComment;
    if (!content || content.trim().length === 0) return;

    try {
      await createComment(today.chapter.id, content.trim(), token, parentId);
      
      if (parentId) {
        // Reload comments to get updated nested structure
        await loadComments(today.chapter.id);
        setReplyContent({ ...replyContent, [parentId]: "" });
        setReplyingTo(null);
      } else {
        // Reload comments
        await loadComments(today.chapter.id);
        setNewComment("");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to post comment";
      setCommentError(message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!today?.chapter.id || !token) return;
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await deleteComment(commentId, token);
      await loadComments(today.chapter.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete comment";
      setCommentError(message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const scrollToComment = (commentId: string) => {
    const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (commentElement) {
      commentElement.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add highlight effect
      commentElement.classList.add("comment-highlight");
      setTimeout(() => {
        commentElement.classList.remove("comment-highlight");
      }, 2000);
    }
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    if (!today) return null;
    
    const isOwner = token && username && comment.user.username === username;
    const isReplying = replyingTo === comment.id;

    return (
      <div 
        key={comment.id} 
        className="comment" 
        data-comment-id={comment.id}
        style={{ marginLeft: `${depth * 2}rem` }}
      >
        <div className="comment-header">
          <span className="comment-author">{comment.user.username}</span>
          <span className="comment-date">{formatDate(comment.createdAt)}</span>
        </div>
        <div className="comment-content">
          <CommentContent
            content={comment.content}
            chapterContent={today.chapter.content}
            book={today.chapter.book}
            chapterNumber={today.chapter.chapterNumber}
          />
        </div>
        <div className="comment-actions">
          <button
            type="button"
            className="text-button comment-action"
            onClick={() => {
              if (!token) {
                handleLoginPrompt();
                return;
              }
              setReplyingTo(isReplying ? null : comment.id);
            }}
          >
            {isReplying ? "Cancel" : "Reply"}
          </button>
          {isOwner && (
            <button
              type="button"
              className="text-button comment-action delete-button"
              onClick={() => handleDeleteComment(comment.id)}
            >
              Delete
            </button>
          )}
        </div>
        {isReplying && (
          <form
            className="comment-reply-form"
            onSubmit={(e) => handleSubmitComment(e, comment.id)}
          >
            <textarea
              value={replyContent[comment.id] || ""}
              onChange={(e) =>
                setReplyContent({ ...replyContent, [comment.id]: e.target.value })
              }
              placeholder="Write a reply..."
              rows={3}
              className="comment-input"
            />
            <div className="comment-form-actions">
              <button type="submit">Post Reply</button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent({ ...replyContent, [comment.id]: "" });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {comment.replies.length > 0 && (
          <div className="comment-replies">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="panel">Loading your chapter...</div>;
  }

  if (error || !today) {
    return (
      <div className="panel">
        <h2>Something went wrong</h2>
        <p className="error">{error ?? "No chapter data found."}</p>
        <button onClick={onLogout}>Log out</button>
      </div>
    );
  }

  return (
    <div className="panel">
      {!token && (
        <div style={{ marginBottom: "2rem", padding: "1rem", backgroundColor: "#f5f5f5", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
          <Login onAuthSuccess={onAuthSuccess} />
        </div>
      )}
      <div className="header">
        <div>
          <h1>{token ? "Welcome back" : "Chapter a Day"}</h1>
          {username && <p className="subtitle">{username}</p>}
        </div>
        {token && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {userId && (
              <NotificationBell 
                token={token} 
                onNavigateToComment={scrollToComment}
              />
            )}
            <button onClick={onLogout} className="text-button">
              Log out
            </button>
          </div>
        )}
      </div>
      <div className="card">
        <h2>
          {today.chapter.book} {today.chapter.chapterNumber}
        </h2>
        <p className="muted">Date: {today.date}</p>
        <p className="content">{today.chapter.content}</p>
      </div>
      {token && (
        <div className="progress">
          <div>
            Chapter {today.progress.currentChapterIndex} of{" "}
            {today.progress.totalChapters}
          </div>
          <div className="muted">
            Last delivered:{" "}
            {lastDate ? new Date(lastDate).toISOString().slice(0, 10) : "Today"}
          </div>
        </div>
      )}

      <div className="comments-section">
        <h3>Comments</h3>
        {commentError && <div className="error">{commentError}</div>}
        
        {!token && (
          <div style={{ padding: "1rem", backgroundColor: "#fff3cd", borderRadius: "8px", marginBottom: "1rem", border: "1px solid #ffc107" }}>
            <p style={{ margin: 0, color: "#856404" }}>
              Please log in to post a comment.
            </p>
          </div>
        )}
        
        <form onSubmit={(e) => handleSubmitComment(e)} className="comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={token ? "Add a comment..." : "Log in to add a comment..."}
            rows={3}
            className="comment-input"
            disabled={!token}
            onFocus={() => {
              if (!token) {
                handleLoginPrompt();
              }
            }}
          />
          <button type="submit" disabled={!newComment.trim() || !token}>
            Post Comment
          </button>
        </form>

        {commentsLoading ? (
          <div className="muted">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="muted">No comments yet. Be the first to comment!</div>
        ) : (
          <div className="comments-list">
            {comments.map((comment) => renderComment(comment))}
          </div>
        )}
      </div>
      {version && (
        <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #e0e0e0", textAlign: "center" }}>
          <p className="muted" style={{ fontSize: "0.875rem" }}>
            Version {version}
          </p>
          <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
            Developed by Christ's silliest goose Anton Starodub
          </p>
        </div>
      )}
    </div>
  );
};
