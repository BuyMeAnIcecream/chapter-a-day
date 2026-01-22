import { useEffect, useState } from "react";
import { fetchToday, fetchProgress } from "../api";

type Props = {
  token: string;
  email: string;
  onLogout: () => void;
};

type TodayResponse = {
  date: string;
  progress: { currentChapterIndex: number; totalChapters: number };
  chapter: { book: string; chapterNumber: number; content: string };
};

export const Dashboard = ({ token, email, onLogout }: Props) => {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [todayData, progressData] = await Promise.all([
          fetchToday(token),
          fetchProgress(token)
        ]);
        if (!active) return;
        setToday(todayData);
        setLastDate(progressData.progress?.lastDeliveredDate ?? null);
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
      <div className="header">
        <div>
          <h1>Welcome back</h1>
          <p className="subtitle">{email}</p>
        </div>
        <button onClick={onLogout} className="text-button">
          Log out
        </button>
      </div>
      <div className="card">
        <h2>
          {today.chapter.book} {today.chapter.chapterNumber}
        </h2>
        <p className="muted">Date: {today.date}</p>
        <p className="content">{today.chapter.content}</p>
      </div>
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
    </div>
  );
};
