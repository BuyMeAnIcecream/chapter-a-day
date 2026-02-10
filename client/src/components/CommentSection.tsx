import { useState, type FormEvent } from "react";
import {
  createComment,
  deleteComment,
  type Comment,
} from "../api";
import { CommentContent } from "./CommentContent";
import { ConfirmModal } from "./ConfirmModal";

type Props = {
  chapterId: string;
  chapterContent: string;
  book: string;
  chapterNumber: number;
  token: string | null;
  username: string | null;
  comments: Comment[];
  commentsLoading: boolean;
  commentError: string | null;
  loadComments: (chapterId: string) => Promise<void>;
  onLoginRequired: () => void;
  onCommentError?: (message: string) => void;
};

export const CommentSection = ({
  chapterId,
  chapterContent,
  book,
  chapterNumber,
  token,
  username,
  comments,
  commentsLoading,
  commentError,
  loadComments,
  onLoginRequired,
  onCommentError,
}: Props) => {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  const handleSubmitComment = async (e: FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!token) {
      onLoginRequired();
      return;
    }

    const content = parentId ? replyContent[parentId] : newComment;
    if (!content || content.trim().length === 0) return;

    try {
      await createComment(chapterId, content.trim(), token, parentId);

      if (parentId) {
        await loadComments(chapterId);
        setReplyContent((prev) => ({ ...prev, [parentId]: "" }));
        setReplyingTo(null);
      } else {
        await loadComments(chapterId);
        setNewComment("");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to post comment";
      onCommentError?.(message);
    }
  };

  const handleDeleteClick = (commentId: string) => {
    setCommentToDelete(commentId);
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete || !token) return;

    try {
      await deleteComment(commentToDelete, token);
      await loadComments(chapterId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete comment";
      onCommentError?.(message);
    } finally {
      setCommentToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
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
            chapterContent={chapterContent}
            book={book}
            chapterNumber={chapterNumber}
          />
        </div>
        <div className="comment-actions">
          <button
            type="button"
            className="text-button comment-action"
            onClick={() => setReplyingTo(isReplying ? null : comment.id)}
          >
            {isReplying ? "Cancel" : "Reply"}
          </button>
          {isOwner && (
            <button
              type="button"
              className="text-button comment-action delete-button"
              onClick={() => handleDeleteClick(comment.id)}
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
                setReplyContent({
                  ...replyContent,
                  [comment.id]: e.target.value,
                })
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

  return (
    <>
      <ConfirmModal
        isOpen={commentToDelete !== null}
        title="Delete comment"
        message="Are you sure you want to delete this comment? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setCommentToDelete(null)}
      />
      <div className="comments-section">
        <h3>Comments</h3>
        {commentError && <div className="error">{commentError}</div>}

        <form
          onSubmit={(e) => handleSubmitComment(e)}
          className="comment-form"
        >
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="comment-input"
          />
          <button type="submit" disabled={!newComment.trim()}>
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
    </>
  );
};
