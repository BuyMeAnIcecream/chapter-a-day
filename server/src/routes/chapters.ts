import express from "express";
import { PrismaClient } from "@prisma/client";
import { optionalAuthMiddleware, authMiddleware, type AuthRequest } from "../middleware/auth";
import { getDateKey, getStartOfDayPacific, getDaysSinceStart } from "../utils";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/today", optionalAuthMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const today = new Date();
  const todayKey = getDateKey(today);

  const totalChapters = await prisma.chapter.count();
  if (totalChapters === 0) {
    return res.status(500).json({ error: "Chapter data not seeded" });
  }

  const daysSinceStart = getDaysSinceStart(today);
  const todayChapterIndex = Math.min(daysSinceStart + 1, totalChapters);

  if (userId) {
    let progress = await prisma.progress.findUnique({
      where: { userId },
    });

    if (!progress) {
      progress = await prisma.progress.create({
        data: { userId },
      });
    }

    const lastKey = progress.lastDeliveredDate
      ? getDateKey(progress.lastDeliveredDate)
      : null;

    if (!lastKey || lastKey < todayKey) {
      await prisma.progress.update({
        where: { userId },
        data: {
          currentChapterIndex: todayChapterIndex,
          lastDeliveredDate: getStartOfDayPacific(todayKey),
        },
      });
    }
  }

  const chapter = await prisma.chapter.findUnique({
    where: { sequence: todayChapterIndex },
  });

  if (!chapter) {
    return res.status(404).json({ error: "Chapter not found" });
  }

  return res.json({
    date: todayKey,
    progress: {
      currentChapterIndex: todayChapterIndex,
      totalChapters,
    },
    chapter: {
      id: chapter.id,
      book: chapter.book,
      chapterNumber: chapter.chapterNumber,
      content: chapter.content,
    },
  });
});

router.get("/progress", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const progress = await prisma.progress.findUnique({
    where: { userId },
  });

  const totalChapters = await prisma.chapter.count();

  return res.json({
    progress,
    totalChapters,
  });
});

export default router;
