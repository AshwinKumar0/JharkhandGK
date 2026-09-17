import express from "express";
import { practiceConfig } from "../config/constants.js";
import { authRequired } from "../middleware/authRequired.js";
import { PracticeSession } from "../models/PracticeSession.js";
import { Question } from "../models/Question.js";
import { UserQuestionStat } from "../models/UserQuestionStat.js";
import { nextAverage, nextValue } from "../utils/practice.js";
import { publicQuestion, weightedPick } from "../utils/questions.js";
import { parseRange } from "./questions.js";

export const practiceRouter = express.Router();

practiceRouter.post("/start", authRequired, async (req, res, next) => {
  try {
    const { bankId = process.env.DEFAULT_BANK_ID, rangeStart, rangeEnd } = req.body;
    const range = parseRange(rangeStart, rangeEnd);
    if (!range) return res.status(400).json({ message: "Valid rangeStart and rangeEnd are required" });

    const session = await PracticeSession.create({
      userId: req.user._id,
      bankId,
      rangeStart: range.start,
      rangeEnd: range.end
    });

    const nextQuestion = await choosePracticeQuestion({
      userId: req.user._id,
      language: req.user.preferredLanguage,
      bankId,
      rangeStart: range.start,
      rangeEnd: range.end
    });

    res.status(201).json({ sessionId: session._id, nextQuestion });
  } catch (error) {
    next(error);
  }
});

practiceRouter.post("/answer", authRequired, async (req, res, next) => {
  try {
    const { sessionId, questionRef, selectedOptionKey, timeTakenMs, timedOut = false } = req.body;
    if (!sessionId || !questionRef) {
      return res.status(400).json({ message: "sessionId and questionRef are required" });
    }

    const session = await PracticeSession.findOne({ _id: sessionId, userId: req.user._id, endedAt: null });
    if (!session) return res.status(404).json({ message: "Active practice session not found" });

    const question = await Question.findOne({
      _id: questionRef,
      bankId: session.bankId,
      sourceQuestionNumber: { $gte: session.rangeStart, $lte: session.rangeEnd },
      "quality.needsReview": { $ne: true }
    }).lean();
    if (!question) return res.status(404).json({ message: "Question not found in this session range" });

    const isCorrect = !timedOut && selectedOptionKey === question.correctOptionKey;
    const existingStat = await UserQuestionStat.findOne({ userId: req.user._id, questionRef });
    const currentValue = existingStat?.value ?? practiceConfig.BASE_VALUE;
    const updatedValue = nextValue(currentValue, {
      isCorrect,
      timedOut,
      timeTakenMs: Number(timeTakenMs) || practiceConfig.QUESTION_TIME_LIMIT_MS
    });

    const previousSeen = existingStat?.timesSeen ?? 0;
    await UserQuestionStat.findOneAndUpdate(
      { userId: req.user._id, questionRef },
      {
        $set: {
          bankId: question.bankId,
          questionId: question.questionId,
          value: updatedValue,
          lastTimeTakenMs: Number(timeTakenMs) || null,
          avgTimeTakenMs: nextAverage(existingStat?.avgTimeTakenMs, previousSeen, Number(timeTakenMs) || null),
          lastSeenAt: new Date()
        },
        $inc: {
          timesSeen: 1,
          timesCorrect: isCorrect ? 1 : 0,
          timesWrong: !isCorrect && !timedOut ? 1 : 0,
          timesTimedOut: timedOut ? 1 : 0
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await PracticeSession.updateOne(
      { _id: session._id },
      {
        $inc: {
          totalAnswered: 1,
          correctCount: isCorrect ? 1 : 0,
          wrongCount: !isCorrect && !timedOut ? 1 : 0,
          timeoutCount: timedOut ? 1 : 0
        }
      }
    );

    req.user.xp += isCorrect ? 10 : 2;
    await req.user.save();

    const nextQuestion = await choosePracticeQuestion({
      userId: req.user._id,
      language: req.user.preferredLanguage,
      bankId: session.bankId,
      rangeStart: session.rangeStart,
      rangeEnd: session.rangeEnd,
      excludeQuestionRef: questionRef
    });

    res.json({
      isCorrect,
      correctOptionKey: question.correctOptionKey,
      explanation: publicQuestion(question, req.user.preferredLanguage).explanation,
      examFacts: publicQuestion(question, req.user.preferredLanguage).examFacts,
      updatedValue,
      nextQuestion
    });
  } catch (error) {
    next(error);
  }
});

practiceRouter.post("/end", authRequired, async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const session = await PracticeSession.findOneAndUpdate(
      { _id: sessionId, userId: req.user._id, endedAt: null },
      { $set: { endedAt: new Date() } },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: "Active practice session not found" });
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

async function choosePracticeQuestion({ userId, language, bankId, rangeStart, rangeEnd, excludeQuestionRef }) {
  const questions = await Question.find({
    bankId,
    sourceQuestionNumber: { $gte: rangeStart, $lte: rangeEnd },
    "quality.needsReview": { $ne: true },
    ...(excludeQuestionRef ? { _id: { $ne: excludeQuestionRef } } : {})
  }).lean();

  if (!questions.length) return null;

  const refs = questions.map((question) => question._id);
  const stats = await UserQuestionStat.find({ userId, questionRef: { $in: refs } }).lean();
  const statsByRef = new Map(stats.map((stat) => [stat.questionRef, stat]));

  const weightedQuestions = questions.map((question) => {
    const stat = statsByRef.get(question._id);
    const value = stat?.value ?? practiceConfig.BASE_VALUE;
    const recentWeakBoost = stat && (stat.timesWrong > stat.timesCorrect || stat.timesTimedOut > 0) ? 25 : 0;
    return { question, value: value + recentWeakBoost };
  });

  const picked = weightedPick(weightedQuestions);
  return publicQuestion(picked.question, language, { value: picked.value });
}
