import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

app.use(cors({ origin: "http://localhost:5173", credentials: false }));
app.use(express.json());

type AuthRequest = express.Request & { userId?: string };

const getDateKey = (date: Date) =>
  date.toISOString().slice(0, 10);

const getStartOfDayUtc = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00.000Z`);

const authMiddleware: express.RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as AuthRequest).userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

app.post("/api/register", async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, progress: { create: {} } },
    select: { id: true, email: true }
  });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: "7d"
  });

  return res.json({ token, user });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: "7d"
  });

  return res.json({ token, user: { id: user.id, email: user.email } });
});

app.get("/api/me", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, createdAt: true }
  });
  return res.json({ user });
});

app.get("/api/today", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const todayKey = getDateKey(new Date());

  const progress = await prisma.progress.findUnique({
    where: { userId }
  });

  if (!progress) {
    return res.status(404).json({ error: "Progress not found" });
  }

  const totalChapters = await prisma.chapter.count();
  if (totalChapters === 0) {
    return res.status(500).json({ error: "Chapter data not seeded" });
  }

  const lastKey = progress.lastDeliveredDate
    ? getDateKey(progress.lastDeliveredDate)
    : null;

  let currentIndex = progress.currentChapterIndex;
  if (!lastKey || lastKey < todayKey) {
    if (lastKey) {
      currentIndex = Math.min(currentIndex + 1, totalChapters);
    } else {
      currentIndex = Math.max(1, Math.min(currentIndex, totalChapters));
    }

    await prisma.progress.update({
      where: { userId },
      data: {
        currentChapterIndex: currentIndex,
        lastDeliveredDate: getStartOfDayUtc(todayKey)
      }
    });
  }

  const chapter = await prisma.chapter.findUnique({
    where: { sequence: currentIndex }
  });

  if (!chapter) {
    return res.status(404).json({ error: "Chapter not found" });
  }

  return res.json({
    date: todayKey,
    progress: {
      currentChapterIndex: currentIndex,
      totalChapters
    },
    chapter: {
      id: chapter.id,
      book: chapter.book,
      chapterNumber: chapter.chapterNumber,
      content: chapter.content
    }
  });
});

app.get("/api/progress", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const progress = await prisma.progress.findUnique({
    where: { userId }
  });

  const totalChapters = await prisma.chapter.count();

  return res.json({
    progress,
    totalChapters
  });
});

// Comments endpoints
app.post("/api/chapters/:chapterId/comments", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const chapterId = Array.isArray(req.params.chapterId) ? req.params.chapterId[0] : req.params.chapterId;
  const { content, parentId } = req.body as {
    content?: string;
    parentId?: string;
  };

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: "Comment content is required" });
  }

  // Verify chapter exists
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId }
  });

  if (!chapter) {
    return res.status(404).json({ error: "Chapter not found" });
  }

  // If parentId is provided, verify parent comment exists and belongs to same chapter
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId }
    });

    if (!parent) {
      return res.status(404).json({ error: "Parent comment not found" });
    }

    if (parent.chapterId !== chapterId) {
      return res.status(400).json({ error: "Parent comment must belong to the same chapter" });
    }
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      userId,
      chapterId,
      parentId: parentId || null
    },
    include: {
      user: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });

  return res.json({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    user: {
      id: comment.user.id,
      email: comment.user.email
    },
    parentId: comment.parentId
  });
});

app.get("/api/chapters/:chapterId/comments", authMiddleware, async (req, res) => {
  const chapterId = Array.isArray(req.params.chapterId) ? req.params.chapterId[0] : req.params.chapterId;

  // Verify chapter exists
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId }
  });

  if (!chapter) {
    return res.status(404).json({ error: "Chapter not found" });
  }

  // Get all comments for this chapter
  const comments = await prisma.comment.findMany({
    where: { chapterId },
    include: {
      user: {
        select: {
          id: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  // Transform to nested structure
  const commentMap = new Map<string, any>();
  const rootComments: any[] = [];

  // First pass: create map and identify root comments
  comments.forEach((comment: any) => {
    const commentData = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: comment.user.id,
        email: comment.user.email
      },
      parentId: comment.parentId,
      replies: []
    };

    commentMap.set(comment.id, commentData);

    if (!comment.parentId) {
      rootComments.push(commentData);
    }
  });

  // Second pass: nest replies under parents
  comments.forEach((comment: any) => {
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      const child = commentMap.get(comment.id);
      if (parent && child) {
        parent.replies.push(child);
      }
    }
  });

  return res.json({ comments: rootComments });
});

app.delete("/api/comments/:commentId", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const commentId = Array.isArray(req.params.commentId) ? req.params.commentId[0] : req.params.commentId;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId }
  });

  if (!comment) {
    return res.status(404).json({ error: "Comment not found" });
  }

  if (comment.userId !== userId) {
    return res.status(403).json({ error: "You can only delete your own comments" });
  }

  // Delete comment (cascade will handle replies)
  await prisma.comment.delete({
    where: { id: commentId }
  });

  return res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
