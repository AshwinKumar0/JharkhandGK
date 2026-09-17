import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    questionRef: { type: String, required: true, index: true },
    bankId: { type: String, required: true },
    questionId: { type: String, required: true },
    sourceQuestionNumber: Number,
    sourcePageStart: Number,
    sourcePageEnd: Number,
    reason: {
      type: String,
      enum: ["Wrong answer", "Typo", "Confusing wording", "Bad explanation", "Suggest topic/tag", "Other"],
      required: true
    },
    message: { type: String, default: "" },
    suggestedTopicTitle: { type: String, default: "" },
    suggestedTags: { type: [String], default: [] },
    status: { type: String, enum: ["open", "reviewed", "dismissed"], default: "open" }
  },
  { timestamps: true }
);

export const Report = mongoose.model("Report", reportSchema);
