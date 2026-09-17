import mongoose from "mongoose";

const practiceAnswerEventSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "PracticeSession", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answerId: { type: String, required: true },
    questionRef: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    timedOut: { type: Boolean, default: false },
    timeTakenMs: { type: Number, default: null },
    xpEarned: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

practiceAnswerEventSchema.index({ sessionId: 1, answerId: 1 }, { unique: true });
practiceAnswerEventSchema.index({ userId: 1, createdAt: -1 });

export const PracticeAnswerEvent = mongoose.model("PracticeAnswerEvent", practiceAnswerEventSchema);
