import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { authRouter } from "./routes/auth.js";
import { bookmarksRouter } from "./routes/bookmarks.js";
import { learningRouter } from "./routes/learning.js";
import { practiceRouter } from "./routes/practice.js";
import { progressRouter } from "./routes/progress.js";
import { questionsRouter } from "./routes/questions.js";
import { reportsRouter } from "./routes/reports.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/questions", questionsRouter);
  app.use("/api/practice", practiceRouter);
  app.use("/api/learning", learningRouter);
  app.use("/api/bookmarks", bookmarksRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/progress", progressRouter);

  app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));
  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message || "Internal server error" });
  });

  return app;
}
