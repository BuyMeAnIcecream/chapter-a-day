import express from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production");
}
export const JWT_SECRET_OR_DEV = JWT_SECRET || "dev-secret-change-me";

export type AuthRequest = express.Request & { userId?: string };

export const authMiddleware: express.RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET_OR_DEV) as { userId: string };
    (req as AuthRequest).userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const optionalAuthMiddleware: express.RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (header) {
    const [type, token] = header.split(" ");
    if (type === "Bearer" && token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET_OR_DEV) as { userId: string };
        (req as AuthRequest).userId = payload.userId;
      } catch {
        // Invalid token, but continue without auth
      }
    }
  }
  next();
};
