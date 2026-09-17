import express from "express";
import { authRequired } from "../middleware/authRequired.js";
import { Question } from "../models/Question.js";
import { publicQuestion } from "../utils/questions.js";

export const questionsRouter = express.Router();

questionsRouter.get("/range", authRequired, async (req, res, next) => {
  try {
    const { bankId = process.env.DEFAULT_BANK_ID, start, end } = req.query;
    const range = parseRange(start, end);
    if (!range) return res.status(400).json({ message: "Valid start and end are required" });

    const questions = await Question.find({
      bankId,
      sourceQuestionNumber: { $gte: range.start, $lte: range.end },
      "quality.needsReview": { $ne: true }
    })
      .sort({ sourceQuestionNumber: 1 })
      .limit(500)
      .lean();

    res.json({
      questions: questions.map((question) => publicQuestion(question, req.user.preferredLanguage))
    });
  } catch (error) {
    next(error);
  }
});

export function parseRange(start, end) {
  const rangeStart = Number(start);
  const rangeEnd = Number(end);
  if (!Number.isInteger(rangeStart) || !Number.isInteger(rangeEnd)) return null;
  if (rangeStart < 1 || rangeEnd < rangeStart) return null;
  return { start: rangeStart, end: rangeEnd };
}
