import mongoose from "mongoose";

const practiceSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bankId: { type: String, required: true },
    rangeStart: { type: Number, required: true },
    rangeEnd: { type: Number, required: true },
    totalAnswered: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    timeoutCount: { type: Number, default: 0 },
    questionIds: { type: [String], default: [] },
    currentIndex: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

practiceSessionSchema.index({ userId: 1, endedAt: 1 });
practiceSessionSchema.index({ userId: 1, updatedAt: -1 });

export const PracticeSession = mongoose.model("PracticeSession", practiceSessionSchema);
