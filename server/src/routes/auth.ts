import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, JWT_SECRET_OR_DEV, type AuthRequest } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/register", async (req, res) => {
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
    select: { id: true, username: true },
  });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET_OR_DEV, {
    expiresIn: "7d",
  });

  return res.json({ token, user });
});

router.post("/login", async (req, res) => {
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

  const token = jwt.sign({ userId: user.id }, JWT_SECRET_OR_DEV, {
    expiresIn: "7d",
  });

  return res.json({ token, user: { id: user.id, username: user.username } });
});

router.get("/me", authMiddleware, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, createdAt: true },
  });
  return res.json({ user });
});

export default router;
