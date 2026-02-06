import express from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

const getChapterId = (req: express.Request) =>
  Array.isArray(req.params.chapterId) ? req.params.chapterId[0] : req.params.chapterId;

const getCommentId = (req: express.Request) =>
  Array.isArray(req.params.commentId) ? req.params.commentId[0] : req.params.commentId;

router.post("/chapters/:chapterId/comments", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const chapterId = getChapterId(req);
  const { content, parentId } = req.body as {
    content?: string;
    parentId?: string;
  };

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: "Comment content is required" });
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
  });

  if (!chapter) {
    return res.status(404).json({ error: "Chapter not found" });
  }

  let parentComment = null;
  if (parentId) {
    parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
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
      parentId: parentId || null,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (parentId && parentComment && parentComment.userId !== userId) {
    await prisma.notification.create({
      data: {
        userId: parentComment.userId,
        commentId: comment.id,
        parentCommentId: parentId,
      },
    });
  }

  return res.json({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    user: {
      id: comment.user.id,
      username: comment.user.username,
    },
    parentId: comment.parentId,
  });
});

router.get("/chapters/:chapterId/comments", async (req, res) => {
  const chapterId = getChapterId(req);

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
  });

  if (!chapter) {
    return res.status(404).json({ error: "Chapter not found" });
  }

  const comments = await prisma.comment.findMany({
    where: { chapterId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const commentMap = new Map<string, any>();
  const rootComments: any[] = [];

  comments.forEach((comment: any) => {
    const commentData = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: comment.user.id,
        username: comment.user.username,
      },
      parentId: comment.parentId,
      replies: [],
    };

    commentMap.set(comment.id, commentData);

    if (!comment.parentId) {
      rootComments.push(commentData);
    }
  });

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

router.delete("/comments/:commentId", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const commentId = getCommentId(req);

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    return res.status(404).json({ error: "Comment not found" });
  }

  if (comment.userId !== userId) {
    return res.status(403).json({ error: "You can only delete your own comments" });
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  return res.json({ success: true });
});

export default router;
