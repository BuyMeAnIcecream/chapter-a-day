import { useState } from "react";
import { useDashboardData } from "../hooks/useDashboardData";
import { CommentSection } from "../components/CommentSection";
import { InfoButton } from "../components/InfoButton";
import { NotificationBell } from "../components/NotificationBell";
import { LoginModal } from "../components/LoginModal";

type Props = {
  token: string | null;
  username: string | null;
  onLogout: () => void;
  onAuthSuccess: (token: string, username: string) => void;
};

export const Dashboard = ({ token, username, onLogout, onAuthSuccess }: Props) => {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const {
    today,
    version,
    lastDate,
    comments,
    commentsLoading,
    commentError,
    setCommentError,
    loading,
    error,
    loadComments,
  } = useDashboardData(token);

  const handleLoginPrompt = () => {
    setShowLoginModal(true);
  };

  const scrollToComment = (commentId: string) => {
    const commentElement = document.querySelector(
      `[data-comment-id="${commentId}"]`
    );
    if (commentElement) {
      commentElement.scrollIntoView({ behavior: "smooth", block: "center" });
      commentElement.classList.add("comment-highlight");
      setTimeout(() => {
        commentElement.classList.remove("comment-highlight");
      }, 2000);
    }
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
        {token && (
          <button onClick={onLogout} style={{ marginTop: "1rem" }}>
            Log out
          </button>
        )}
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
            <InfoButton version={version} />
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
              {lastDate
                ? new Date(lastDate).toISOString().slice(0, 10)
                : "Today"}
            </div>
          </div>
        )}

        <CommentSection
          chapterId={today.chapter.id}
          chapterContent={today.chapter.content}
          book={today.chapter.book}
          chapterNumber={today.chapter.chapterNumber}
          token={token}
          username={username}
          comments={comments}
          commentsLoading={commentsLoading}
          commentError={commentError}
          loadComments={loadComments}
          onLoginRequired={handleLoginPrompt}
          onCommentError={setCommentError}
        />
      </div>
    </>
  );
};
