import express from "express";
import { authRequired, requireCurrentUser } from "../middleware/authRequired.js";
import { practiceConfig } from "../config/constants.js";
import { Bookmark } from "../models/Bookmark.js";
import { PracticeSession } from "../models/PracticeSession.js";
import { UserQuestionStat } from "../models/UserQuestionStat.js";

export const progressRouter = express.Router();

progressRouter.get("/summary", authRequired, requireCurrentUser, async (req, res, next) => {
  try {
    const [questionsPracticed, weakQuestionCount, sessionAgg, bookmarkCount] = await Promise.all([
      UserQuestionStat.countDocuments({ userId: req.user._id }),
      UserQuestionStat.countDocuments({ userId: req.user._id, value: { $gt: practiceConfig.BASE_VALUE } }),
      PracticeSession.aggregate([
        { $match: { userId: req.user._id } },
        {
          $group: {
            _id: null,
            totalAnswered: { $sum: "$totalAnswered" },
            correctCount: { $sum: "$correctCount" },
            wrongCount: { $sum: "$wrongCount" },
            timeoutCount: { $sum: "$timeoutCount" }
          }
        }
      ]),
      Bookmark.countDocuments({ userId: req.user._id })
    ]);

    const totals = sessionAgg[0] || { totalAnswered: 0, correctCount: 0, wrongCount: 0, timeoutCount: 0 };
    const completionRate = totals.totalAnswered ? totals.correctCount / totals.totalAnswered : 0;

    res.json({
      questionsPracticed,
      correctAnswers: totals.correctCount,
      wrongAnswers: totals.wrongCount,
      timeouts: totals.timeoutCount,
      completionRate,
      bookmarkedCount: bookmarkCount,
      weakQuestionCount,
      xp: req.user.xp,
      streak: req.user.streak
    });
  } catch (error) {
    next(error);
  }
});
