import express from "express";
import { authRequired } from "../middleware/authRequired.js";
import { Question } from "../models/Question.js";
import { Report } from "../models/Report.js";

export const reportsRouter = express.Router();

reportsRouter.post("/", authRequired, async (req, res, next) => {
  try {
    const { questionRef, reason, message = "", suggestedTopicTitle = "", suggestedTags = [] } = req.body;
    const question = await Question.findOne({ _id: questionRef })
      .select({ _id: 1, bankId: 1, questionId: 1, sourceQuestionNumber: 1, sourcePageStart: 1, sourcePageEnd: 1 })
      .lean();
    if (!question) return res.status(404).json({ message: "Question not found" });

    const report = await Report.create({
      userId: req.user._id,
      questionRef,
      bankId: question.bankId,
      questionId: question.questionId,
      sourceQuestionNumber: question.sourceQuestionNumber,
      sourcePageStart: question.sourcePageStart,
      sourcePageEnd: question.sourcePageEnd,
      reason,
      message,
      suggestedTopicTitle,
      suggestedTags
    });

    res.status(201).json({ report });
  } catch (error) {
    next(error);
  }
});
