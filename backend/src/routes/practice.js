import express from "express";
import mongoose from "mongoose";
import { practiceConfig } from "../config/constants.js";
import { authRequired } from "../middleware/authRequired.js";
import { PracticeAnswerEvent } from "../models/PracticeAnswerEvent.js";
import { PracticeSession } from "../models/PracticeSession.js";
import { Question } from "../models/Question.js";
import { User } from "../models/User.js";
import { UserQuestionStat } from "../models/UserQuestionStat.js";
import { nextAverage, nextValue } from "../utils/practice.js";
import { publicQuestion, publicQuestionProjection, weightedPick } from "../utils/questions.js";
import { parseRange } from "./questions.js";

export const practiceRouter = express.Router();

practiceRouter.post("/start", authRequired, async (req, res, next) => {
  try {
    const { bankId = process.env.DEFAULT_BANK_ID, rangeStart, rangeEnd, batchSize = 20, queueSize = 75 } = req.body;
    const range = parseRange(rangeStart, rangeEnd);
    if (!range) return res.status(400).json({ message: "Valid rangeStart and rangeEnd are required" });

    const questions = await choosePracticeQuestions({
      userId: req.user._id,
      language: req.user.preferredLanguage,
      bankId,
      rangeStart: range.start,
      rangeEnd: range.end,
      queueSize: clampInteger(queueSize, 10, 100),
      batchSize: clampInteger(batchSize, 1, 25)
    });

    const session = await PracticeSession.create({
      userId: req.user._id,
      bankId,
      rangeStart: range.start,
      rangeEnd: range.end,
      questionIds: questions.queueQuestionIds,
      currentIndex: questions.publicQuestions.length
    });

    res.status(201).json({
      sessionId: session._id,
      nextQuestion: questions.publicQuestions[0] || null,
      questions: questions.publicQuestions,
      totalAvailable: questions.totalAvailable,
      nextBatchAvailable: questions.queueQuestionIds.length > questions.publicQuestions.length
    });
  } catch (error) {
    next(error);
  }
});

practiceRouter.post("/answer", authRequired, async (req, res, next) => {
  try {
    const { sessionId, questionRef, selectedOptionKey, timeTakenMs, timedOut = false, answerId } = req.body;
    if (!sessionId || !questionRef) {
      return res.status(400).json({ message: "sessionId and questionRef are required" });
    }

    const sync = await processAnswerBatch({
      userId: req.user._id,
      answers: [
        {
          answerId: answerId || `${sessionId}:${questionRef}:${Date.now()}`,
          sessionId,
          questionRef,
          selectedOptionKey,
          timeTakenMs,
          timedOut
        }
      ]
    });

    if (sync.failed.length) {
      return res.status(sync.failed[0].status || 400).json({ message: sync.failed[0].message, failed: sync.failed });
    }
    if (!sync.results.length) {
      return res.status(409).json({ message: "Answer was already processed", duplicates: sync.duplicates });
    }

    const result = sync.results[0];
    const nextQuestion = await choosePracticeQuestion({
      userId: req.user._id,
      language: req.user.preferredLanguage,
      bankId: result.session.bankId,
      rangeStart: result.session.rangeStart,
      rangeEnd: result.session.rangeEnd,
      excludeQuestionRef: questionRef
    });

    res.json({
      isCorrect: result.isCorrect,
      correctOptionKey: result.question.correctOptionKey,
      explanation: publicQuestion(result.question, req.user.preferredLanguage).explanation,
      examFacts: publicQuestion(result.question, req.user.preferredLanguage).examFacts,
      updatedValue: result.updatedValue,
      nextQuestion
    });
  } catch (error) {
    next(error);
  }
});

practiceRouter.post("/sync", authRequired, async (req, res, next) => {
  try {
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    if (!answers.length) return res.status(400).json({ message: "answers must contain at least one answer" });
    if (answers.length > 50) return res.status(400).json({ message: "answers cannot exceed 50 items" });

    const result = await processAnswerBatch({
      userId: req.user._id,
      answers: answers.map((answer) => ({ ...answer, sessionId: answer.sessionId || req.body.sessionId }))
    });

    res.json({
      processed: result.processed,
      duplicates: result.duplicates,
      failed: result.failed,
      results: result.results.map((answer) => ({
        answerId: answer.answerId,
        questionRef: answer.question._id,
        isCorrect: answer.isCorrect,
        correctOptionKey: answer.question.correctOptionKey,
        updatedValue: answer.updatedValue,
        xpEarned: answer.xpEarned
      }))
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
  const questions = await Question.aggregate([
    {
      $match: {
        bankId,
        sourceQuestionNumber: { $gte: rangeStart, $lte: rangeEnd },
        "quality.needsReview": { $ne: true },
        ...(excludeQuestionRef ? { _id: { $ne: excludeQuestionRef } } : {})
      }
    },
    { $sample: { size: 30 } },
    { $project: publicQuestionProjection }
  ]);

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

async function choosePracticeQuestions({ userId, language, bankId, rangeStart, rangeEnd, queueSize, batchSize }) {
  const match = {
    bankId,
    sourceQuestionNumber: { $gte: rangeStart, $lte: rangeEnd },
    "quality.needsReview": { $ne: true }
  };
  const [totalAvailable, questions] = await Promise.all([
    Question.countDocuments(match),
    Question.aggregate([{ $match: match }, { $sample: { size: queueSize } }, { $project: publicQuestionProjection }])
  ]);

  const refs = questions.map((question) => question._id);
  const stats = await UserQuestionStat.find({ userId, questionRef: { $in: refs } })
    .select({ questionRef: 1, value: 1, timesWrong: 1, timesCorrect: 1, timesTimedOut: 1 })
    .lean();
  const statsByRef = new Map(stats.map((stat) => [stat.questionRef, stat]));
  const weightedQuestions = questions
    .map((question) => {
      const stat = statsByRef.get(question._id);
      const value = stat?.value ?? practiceConfig.BASE_VALUE;
      const recentWeakBoost = stat && (stat.timesWrong > stat.timesCorrect || stat.timesTimedOut > 0) ? 25 : 0;
      return { question, value: value + recentWeakBoost };
    })
    .sort((left, right) => right.value - left.value);

  return {
    totalAvailable,
    queueQuestionIds: weightedQuestions.map(({ question }) => question._id),
    publicQuestions: weightedQuestions
      .slice(0, batchSize)
      .map(({ question, value }) => publicQuestion(question, language, { value }))
  };
}

async function processAnswerBatch({ userId, answers }) {
  const now = new Date();
  const normalizedAnswers = [];
  const failed = [];

  for (const answer of answers) {
    const normalized = normalizeAnswer(answer);
    if (!normalized) {
      failed.push({ answerId: answer?.answerId, message: "Invalid answer payload", retryable: false, status: 400 });
    } else {
      normalizedAnswers.push(normalized);
    }
  }

  const sessionIds = [...new Set(normalizedAnswers.map((answer) => answer.sessionId))];
  const sessions = await PracticeSession.find({ _id: { $in: sessionIds }, userId, endedAt: null }).lean();
  const sessionsById = new Map(sessions.map((session) => [session._id.toString(), session]));

  const questionRefs = [...new Set(normalizedAnswers.map((answer) => answer.questionRef))];
  const questions = await Question.find({ _id: { $in: questionRefs }, "quality.needsReview": { $ne: true } })
    .select(publicQuestionProjection)
    .lean();
  const questionsByRef = new Map(questions.map((question) => [question._id, question]));

  const validAnswers = [];
  for (const answer of normalizedAnswers) {
    const session = sessionsById.get(answer.sessionId);
    const question = questionsByRef.get(answer.questionRef);
    if (!session) {
      failed.push({ answerId: answer.answerId, message: "Active practice session not found", retryable: false, status: 404 });
      continue;
    }
    if (
      !question ||
      question.bankId !== session.bankId ||
      question.sourceQuestionNumber < session.rangeStart ||
      question.sourceQuestionNumber > session.rangeEnd
    ) {
      failed.push({ answerId: answer.answerId, message: "Question not found in this session range", retryable: false, status: 404 });
      continue;
    }
    validAnswers.push({ ...answer, session, question });
  }

  const inserted = await insertNewAnswerEvents({ userId, answers: validAnswers, now });
  const insertedKeys = new Set(inserted.map((answer) => `${answer.sessionId}:${answer.answerId}`));
  const duplicates = validAnswers
    .filter((answer) => !insertedKeys.has(`${answer.sessionId}:${answer.answerId}`))
    .map((answer) => answer.answerId);
  const answersToApply = validAnswers.filter((answer) => insertedKeys.has(`${answer.sessionId}:${answer.answerId}`));

  const existingStats = await UserQuestionStat.find({
    userId,
    questionRef: { $in: answersToApply.map((answer) => answer.questionRef) }
  })
    .select({ questionRef: 1, value: 1, timesSeen: 1, avgTimeTakenMs: 1 })
    .lean();
  const statsByRef = new Map(existingStats.map((stat) => [stat.questionRef, stat]));

  const results = answersToApply.map((answer) => {
    const stat = statsByRef.get(answer.questionRef);
    const timeTakenMs = answer.timeTakenMs || practiceConfig.QUESTION_TIME_LIMIT_MS;
    const isCorrect = !answer.timedOut && answer.selectedOptionKey === answer.question.correctOptionKey;
    const updatedValue = nextValue(stat?.value ?? practiceConfig.BASE_VALUE, {
      isCorrect,
      timedOut: answer.timedOut,
      timeTakenMs
    });

    return {
      ...answer,
      isCorrect,
      updatedValue,
      xpEarned: isCorrect ? 10 : 2,
      avgTimeTakenMs: nextAverage(stat?.avgTimeTakenMs, stat?.timesSeen ?? 0, answer.timeTakenMs)
    };
  });

  await Promise.all([
    results.length
      ? UserQuestionStat.bulkWrite(
          results.map((answer) => ({
            updateOne: {
              filter: { userId, questionRef: answer.questionRef },
              update: {
                $set: {
                  bankId: answer.question.bankId,
                  questionId: answer.question.questionId,
                  value: answer.updatedValue,
                  lastTimeTakenMs: answer.timeTakenMs,
                  avgTimeTakenMs: answer.avgTimeTakenMs,
                  lastSeenAt: now
                },
                $inc: {
                  timesSeen: 1,
                  timesCorrect: answer.isCorrect ? 1 : 0,
                  timesWrong: !answer.isCorrect && !answer.timedOut ? 1 : 0,
                  timesTimedOut: answer.timedOut ? 1 : 0
                }
              },
              upsert: true
            }
          }))
        )
      : Promise.resolve(),
    ...sessionCounterUpdates(results),
    results.length
      ? User.updateOne({ _id: userId }, { $inc: { xp: results.reduce((sum, answer) => sum + answer.xpEarned, 0) } })
      : Promise.resolve()
  ]);

  if (results.length) {
    await PracticeAnswerEvent.bulkWrite(
      results.map((answer) => ({
        updateOne: {
          filter: { sessionId: answer.sessionId, answerId: answer.answerId },
          update: { $set: { isCorrect: answer.isCorrect, xpEarned: answer.xpEarned } }
        }
      }))
    );
  }

  return {
    processed: results.map((answer) => answer.answerId),
    duplicates,
    failed,
    results
  };
}

function normalizeAnswer(answer) {
  if (!answer || typeof answer !== "object") return null;
  const sessionId = typeof answer.sessionId === "string" ? answer.sessionId : "";
  const questionRef = typeof answer.questionRef === "string" ? answer.questionRef : "";
  const answerId = typeof answer.answerId === "string" && answer.answerId.trim() ? answer.answerId.trim() : "";
  const selectedOptionKey =
    typeof answer.selectedOptionKey === "string" && /^[A-Z]$/.test(answer.selectedOptionKey) ? answer.selectedOptionKey : null;
  const timedOut = Boolean(answer.timedOut);
  const timeTakenMs = Number.isFinite(Number(answer.timeTakenMs))
    ? Math.max(0, Math.min(10 * 60 * 1000, Math.round(Number(answer.timeTakenMs))))
    : null;

  if (!mongoose.isValidObjectId(sessionId) || !questionRef || !answerId) return null;
  if (!timedOut && !selectedOptionKey) return null;
  return { sessionId, questionRef, answerId, selectedOptionKey, timedOut, timeTakenMs };
}

async function insertNewAnswerEvents({ userId, answers, now }) {
  if (!answers.length) return [];
  const existing = await PracticeAnswerEvent.find({
    sessionId: { $in: answers.map((answer) => answer.sessionId) },
    answerId: { $in: answers.map((answer) => answer.answerId) }
  })
    .select({ sessionId: 1, answerId: 1 })
    .lean();
  const existingKeys = new Set(existing.map((event) => `${event.sessionId.toString()}:${event.answerId}`));
  const candidates = answers.filter((answer) => !existingKeys.has(`${answer.sessionId}:${answer.answerId}`));
  if (!candidates.length) return [];

  const docs = candidates.map((answer) => ({
    sessionId: answer.sessionId,
    userId,
    answerId: answer.answerId,
    questionRef: answer.questionRef,
    isCorrect: false,
    timedOut: answer.timedOut,
    timeTakenMs: answer.timeTakenMs,
    xpEarned: 0,
    createdAt: now
  }));

  try {
    await PracticeAnswerEvent.insertMany(docs, { ordered: false });
    return candidates;
  } catch (error) {
    if (error?.code !== 11000 && error?.writeErrors == null) throw error;
    const failedIndexes = new Set((error.writeErrors || []).map((writeError) => writeError.index));
    return candidates.filter((_answer, index) => !failedIndexes.has(index));
  }
}

function sessionCounterUpdates(results) {
  const bySession = new Map();
  for (const answer of results) {
    const counters = bySession.get(answer.sessionId) || {
      totalAnswered: 0,
      correctCount: 0,
      wrongCount: 0,
      timeoutCount: 0
    };
    counters.totalAnswered += 1;
    counters.correctCount += answer.isCorrect ? 1 : 0;
    counters.wrongCount += !answer.isCorrect && !answer.timedOut ? 1 : 0;
    counters.timeoutCount += answer.timedOut ? 1 : 0;
    bySession.set(answer.sessionId, counters);
  }

  return [...bySession.entries()].map(([sessionId, counters]) =>
    PracticeSession.updateOne(
      { _id: sessionId },
      {
        $inc: counters
      }
    )
  );
}

function clampInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number)) return min;
  return Math.max(min, Math.min(max, number));
}
