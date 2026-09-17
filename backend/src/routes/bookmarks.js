import express from "express";
import { authRequired } from "../middleware/authRequired.js";
import { Bookmark } from "../models/Bookmark.js";
import { Question } from "../models/Question.js";
import { publicQuestion, publicQuestionProjection } from "../utils/questions.js";

export const bookmarksRouter = express.Router();

bookmarksRouter.get("/", authRequired, async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    const refs = bookmarks.map((bookmark) => bookmark.questionRef);
    const questions = await Question.find({ _id: { $in: refs }, "quality.needsReview": { $ne: true } })
      .select(publicQuestionProjection)
      .lean();
    res.json({ questions: questions.map((question) => publicQuestion(question, req.user.preferredLanguage)) });
  } catch (error) {
    next(error);
  }
});

bookmarksRouter.post("/", authRequired, async (req, res, next) => {
  try {
    const { questionRef } = req.body;
    const question = await Question.findOne({ _id: questionRef, "quality.needsReview": { $ne: true } })
      .select({ _id: 1, bankId: 1, questionId: 1 })
      .lean();
    if (!question) return res.status(404).json({ message: "Question not found" });

    const bookmark = await Bookmark.findOneAndUpdate(
      { userId: req.user._id, questionRef },
      {
        $setOnInsert: {
          userId: req.user._id,
          questionRef,
          bankId: question.bankId,
          questionId: question.questionId
        }
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ bookmark });
  } catch (error) {
    next(error);
  }
});

bookmarksRouter.delete("/:questionRef", authRequired, async (req, res, next) => {
  try {
    await Bookmark.deleteOne({ userId: req.user._id, questionRef: req.params.questionRef });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
