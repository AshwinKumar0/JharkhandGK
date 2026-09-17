import mongoose from "mongoose";

const userQuestionStatSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    questionRef: { type: String, required: true, index: true },
    bankId: { type: String, required: true },
    questionId: { type: String, required: true },
    value: { type: Number, required: true },
    timesSeen: { type: Number, default: 0 },
    timesCorrect: { type: Number, default: 0 },
    timesWrong: { type: Number, default: 0 },
    timesTimedOut: { type: Number, default: 0 },
    lastTimeTakenMs: { type: Number, default: null },
    avgTimeTakenMs: { type: Number, default: null },
    lastSeenAt: { type: Date, default: null }
  },
  { timestamps: true }
);

userQuestionStatSchema.index({ userId: 1, questionRef: 1 }, { unique: true });

export const UserQuestionStat = mongoose.model("UserQuestionStat", userQuestionStatSchema);
