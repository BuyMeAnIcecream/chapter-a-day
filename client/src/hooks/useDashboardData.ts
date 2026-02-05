import { useEffect, useState, useCallback } from "react";
import {
  fetchToday,
  fetchProgress,
  fetchComments,
  fetchVersion,
  type Comment,
} from "../api";
import type { TodayResponse } from "../types";

export function useDashboardData(token: string | null) {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const loadComments = useCallback(
    async (chapterId: string) => {
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
    },
    [token]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const [todayData, versionData] = await Promise.all([
          fetchToday(token),
          fetchVersion(),
        ]);
        if (!active) return;
        setToday(todayData);
        setVersion(versionData.version);

        if (todayData.chapter.id) {
          loadComments(todayData.chapter.id);
        }

        if (token) {
          try {
            const progressData = await fetchProgress(token);
            if (!active) return;
            setLastDate(progressData.progress?.lastDeliveredDate ?? null);
          } catch (err) {
            console.error("Failed to fetch user data:", err);
          }
        } else {
          setLastDate(null);
        }
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Failed to load data";
        console.error("Error loading data:", err);
        if (message.includes("Authorization") && !token) {
          console.log("Auth not required for public viewing");
        } else {
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
  }, [token, loadComments]);

  return {
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
  };
}
