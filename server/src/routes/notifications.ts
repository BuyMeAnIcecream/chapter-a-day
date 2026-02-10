import express from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

const getNotificationId = (req: express.Request) =>
  Array.isArray(req.params.notificationId)
    ? req.params.notificationId[0]
    : req.params.notificationId;

router.get("/notifications", authMiddleware, async (req, res) => {
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
                username: true,
              },
            },
            chapter: {
              select: {
                book: true,
                chapterNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const parentCommentIds = notifications
      .map((n: any) => n.parentCommentId)
      .filter((id: string, index: number, self: string[]) => self.indexOf(id) === index);

    const parentComments = await prisma.comment.findMany({
      where: {
        id: { in: parentCommentIds },
      },
      select: {
        id: true,
        content: true,
      },
    });

    const parentCommentMap = new Map(parentComments.map((pc) => [pc.id, pc]));

    const unreadCount = notifications.filter((n) => !n.read).length;

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
          username: notification.comment.user.username,
        },
        chapter: {
          book: notification.comment.chapter.book,
          chapterNumber: notification.comment.chapter.chapterNumber,
        },
      },
      parentComment: parentCommentMap.get(notification.parentCommentId) || {
        id: notification.parentCommentId,
        content: "[Comment deleted]",
      },
    }));

    return res.json({
      notifications: formattedNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.put("/notifications/:notificationId/read", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const notificationId = getNotificationId(req);

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

router.put("/notifications/read-all", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;

  try {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
});

export default router;
