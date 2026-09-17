import mongoose from "mongoose";

const localizedTextSchema = new mongoose.Schema(
  {
    en: { type: String, default: null },
    hi: { type: String, default: null }
  },
  { _id: false, strict: false }
);

const optionSchema = new mongoose.Schema(
  {
    key: String,
    rawText: String,
    text: localizedTextSchema
  },
  { _id: false, strict: false }
);

const questionSchema = new mongoose.Schema(
  {
    _id: { type: String },
    bankId: { type: String, index: true },
    questionId: { type: String, index: true },
    chapterId: String,
    chapterTitle: String,
    sourceQuestionNumber: { type: Number, index: true },
    sourcePageStart: Number,
    sourcePageEnd: Number,
    type: String,
    question: localizedTextSchema,
    options: [optionSchema],
    correctOptionKey: String,
    explanation: localizedTextSchema,
    examFacts: [localizedTextSchema],
    quality: {
      needsReview: { type: Boolean, default: false },
      issues: { type: [String], default: [] }
    },
    raw: mongoose.Schema.Types.Mixed
  },
  { strict: false, collection: process.env.QUESTION_COLLECTION || "questions" }
);

questionSchema.index({ bankId: 1, sourceQuestionNumber: 1 });

export const Question = mongoose.model("Question", questionSchema);
