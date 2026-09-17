import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    questionRef: { type: String, required: true, index: true },
    bankId: { type: String, required: true },
    questionId: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

bookmarkSchema.index({ userId: 1, questionRef: 1 }, { unique: true });

export const Bookmark = mongoose.model("Bookmark", bookmarkSchema);
