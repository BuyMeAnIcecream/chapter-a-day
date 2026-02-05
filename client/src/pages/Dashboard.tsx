import { useEffect, useState, type FormEvent } from "react";
import { fetchToday, fetchProgress, createComment, fetchComments, deleteComment, fetchVersion, type Comment } from "../api";
import { CommentContent } from "../components/CommentContent";
import { NotificationBell } from "../components/NotificationBell";
import { LoginModal } from "../components/LoginModal";

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
  const [showLoginModal, setShowLoginModal] = useState(false);

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
    setShowLoginModal(true);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
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
            const progressData = await fetchProgress(token);
            if (!active) return;
            setLastDate(progressData.progress?.lastDeliveredDate ?? null);
          } catch (err) {
            // If auth fails, user might have invalid token, but continue without auth
            // Don't set error state - just continue without user-specific data
            console.error("Failed to fetch user data:", err);
          }
        } else {
          // Clear user-specific data when logged out
          setLastDate(null);
        }
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Failed to load data";
        console.error("Error loading data:", err);
        // Only set error if it's a critical error (not just missing auth for optional endpoints)
        // If the error is about missing auth and we don't have a token, that's expected
        if (message.includes("Authorization") && !token) {
          // This is expected when not logged in, don't show error
          console.log("Auth not required for public viewing");
        } else {
          // Only show error if we couldn't load the chapter
          setError(message);
        }
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

  if (error) {
    return (
      <div className="panel">
        <h2>Something went wrong</h2>
        <p className="error">{error}</p>
        <p style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#666" }}>
          Please check your connection and try refreshing the page.
        </p>
        {token && <button onClick={onLogout} style={{ marginTop: "1rem" }}>Log out</button>}
      </div>
    );
  }

  if (!today) {
    return (
      <div className="panel">
        <h2>Loading...</h2>
        <p>Please wait while we load today's chapter.</p>
      </div>
    );
  }

  return (
    <>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onAuthSuccess={(newToken, newUsername) => {
          onAuthSuccess(newToken, newUsername);
          setShowLoginModal(false);
        }}
      />
      <div className="panel">
        <div className="header">
          <div>
            <h1>{token ? "Welcome back" : "Chapter a Day"}</h1>
            {username && <p className="subtitle">{username}</p>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {token ? (
              <>
                <NotificationBell 
                  token={token} 
                  onNavigateToComment={scrollToComment}
                />
                <button onClick={onLogout} className="text-button">
                  Log out
                </button>
              </>
            ) : (
              <button onClick={handleLoginPrompt} className="text-button">
                Log in
              </button>
            )}
          </div>
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
        
        <form onSubmit={(e) => handleSubmitComment(e)} className="comment-form">
          <textarea
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              // Show login modal when user starts typing without being logged in
              if (!token && e.target.value.trim().length > 0) {
                handleLoginPrompt();
              }
            }}
            onFocus={() => {
              if (!token) {
                handleLoginPrompt();
              }
            }}
            placeholder="Add a comment..."
            rows={3}
            className="comment-input"
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
    </>
  );
};
