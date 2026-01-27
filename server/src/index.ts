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

// Allow CORS from all origins (for fun project to show friends)
// This allows the client to make requests from any domain
app.use(cors({ 
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false 
}));
app.use(express.json());

type AuthRequest = express.Request & { userId?: string };

const getDateKey = (date: Date) =>
  date.toISOString().slice(0, 10);

const getStartOfDayUtc = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00.000Z`);

// Start date for chapter delivery - all users see the same chapter on the same day
// This is the date when chapter 1 was first delivered
const CHAPTER_DELIVERY_START_DATE = new Date("2026-01-01T00:00:00.000Z");

const getDaysSinceStart = (date: Date): number => {
  const start = new Date(CHAPTER_DELIVERY_START_DATE);
  start.setUTCHours(0, 0, 0, 0);
  const current = new Date(date);
  current.setUTCHours(0, 0, 0, 0);
  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

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
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, passwordHash, progress: { create: {} } },
    select: { id: true, username: true }
  });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: "7d"
  });

  return res.json({ token, user });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const user = await prisma.user.findUnique({ where: { username } });
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

  return res.json({ token, user: { id: user.id, username: user.username } });
});

app.get("/api/me", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, createdAt: true }
  });
  return res.json({ user });
});

app.get("/api/today", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const today = new Date();
  const todayKey = getDateKey(today);

  // Ensure user has progress record
  let progress = await prisma.progress.findUnique({
    where: { userId }
  });

  if (!progress) {
    return res.status(404).json({ error: "Progress not found" });
  }

  const totalChapters = await prisma.chapter.count();
  if (totalChapters === 0) {
    return res.status(500).json({ error: "Chapter data not seeded" });
  }

  // Calculate which chapter should be shown today based on days since start date
  // All users see the same chapter on the same day
  const daysSinceStart = getDaysSinceStart(today);
  const todayChapterIndex = Math.min(daysSinceStart + 1, totalChapters);

  // Update user's progress to reflect they've seen up to today's chapter
  // This is for tracking purposes, but doesn't affect which chapter is shown
  const lastKey = progress.lastDeliveredDate
    ? getDateKey(progress.lastDeliveredDate)
    : null;

  if (!lastKey || lastKey < todayKey) {
    await prisma.progress.update({
      where: { userId },
      data: {
        currentChapterIndex: todayChapterIndex,
        lastDeliveredDate: getStartOfDayUtc(todayKey)
      }
    });
  }

  const chapter = await prisma.chapter.findUnique({
    where: { sequence: todayChapterIndex }
  });

  if (!chapter) {
    return res.status(404).json({ error: "Chapter not found" });
  }

  return res.json({
    date: todayKey,
    progress: {
      currentChapterIndex: todayChapterIndex,
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
  let parentComment = null;
  if (parentId) {
    parentComment = await prisma.comment.findUnique({
      where: { id: parentId }
    });

    if (!parentComment) {
      return res.status(404).json({ error: "Parent comment not found" });
    }

    if (parentComment.chapterId !== chapterId) {
      return res.status(400).json({ error: "Parent comment must belong to the same chapter" });
    }
  }

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
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
          username: true
        }
      }
    }
  });

  // Create notification if this is a reply to someone else's comment
  if (parentId && parentComment && parentComment.userId !== userId) {
    await prisma.notification.create({
      data: {
        userId: parentComment.userId,
        commentId: comment.id,
        parentCommentId: parentId
      }
    });
  }

  return res.json({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    user: {
      id: comment.user.id,
      username: comment.user.username
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
          username: true
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
        username: comment.user.username
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

// Get app version (public endpoint)
app.get("/api/version", async (req, res) => {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { key: "version" }
    });
    
    const version = config?.value || "1.0.0";
    return res.json({ version });
  } catch (error) {
    console.error("Error fetching version:", error);
    return res.json({ version: "1.0.0" }); // Fallback version
  }
});

// Get notifications for current user
app.get("/api/notifications", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        comment: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            },
            chapter: {
              select: {
                book: true,
                chapterNumber: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50 // Limit to 50 most recent
    });

    // Get parent comments for context
    const parentCommentIds = notifications
      .map((n: any) => n.parentCommentId)
      .filter((id: string, index: number, self: string[]) => self.indexOf(id) === index);

    const parentComments = await prisma.comment.findMany({
      where: {
        id: { in: parentCommentIds }
      },
      select: {
        id: true,
        content: true
      }
    });

    const parentCommentMap = new Map(parentComments.map(pc => [pc.id, pc]));

    const unreadCount = notifications.filter(n => !n.read).length;

    const formattedNotifications = notifications.map((notification: any) => ({
      id: notification.id,
      commentId: notification.commentId,
      parentCommentId: notification.parentCommentId,
      read: notification.read,
      createdAt: notification.createdAt,
      comment: {
        id: notification.comment.id,
        content: notification.comment.content,
        user: {
          username: notification.comment.user.username
        },
        chapter: {
          book: notification.comment.chapter.book,
          chapterNumber: notification.comment.chapter.chapterNumber
        }
      },
      parentComment: parentCommentMap.get(notification.parentCommentId) || {
        id: notification.parentCommentId,
        content: "[Comment deleted]"
      }
    }));

    return res.json({
      notifications: formattedNotifications,
      unreadCount
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark notification as read
app.put("/api/notifications/:notificationId/read", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const notificationId = Array.isArray(req.params.notificationId) 
    ? req.params.notificationId[0] 
    : req.params.notificationId;

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read
app.put("/api/notifications/read-all", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;

  try {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
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

// Export app for testing
export { app };

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    console.log(`Access from this machine: http://localhost:${PORT}`);
    console.log(`Access from network: http://192.168.1.68:${PORT}`);
  });
}
