import express from "express";

// server/package.json is the single source of truth for the app version.
// Resolves from both src/routes (dev) and dist/routes (production).
const { version } = require("../../package.json") as { version: string };

const router = express.Router();

router.get("/version", (req, res) => {
  return res.json({ version });
});

export default router;
