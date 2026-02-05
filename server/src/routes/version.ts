import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/version", async (req, res) => {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { key: "version" },
    });

    const version = config?.value || "1.2.0";
    return res.json({ version });
  } catch (error) {
    console.error("Error fetching version:", error);
    return res.json({ version: "1.2.0" });
  }
});

export default router;
