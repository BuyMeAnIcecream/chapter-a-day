import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import authRouter from "./routes/auth";
import chaptersRouter from "./routes/chapters";
import commentsRouter from "./routes/comments";
import notificationsRouter from "./routes/notifications";
import versionRouter from "./routes/version";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 4000);

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);
app.use(express.json());

app.use("/api", authRouter);
app.use("/api", chaptersRouter);
app.use("/api", commentsRouter);
app.use("/api", notificationsRouter);
app.use("/api", versionRouter);

export { app };

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    console.log(`Access from this machine: http://localhost:${PORT}`);
  });
}
