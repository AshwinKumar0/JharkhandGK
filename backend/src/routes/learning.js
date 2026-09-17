import express from "express";
import { authRequired } from "../middleware/authRequired.js";
import { Question } from "../models/Question.js";
import { publicQuestion } from "../utils/questions.js";
import { parseRange } from "./questions.js";

export const learningRouter = express.Router();

learningRouter.get("/questions", authRequired, async (req, res, next) => {
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
