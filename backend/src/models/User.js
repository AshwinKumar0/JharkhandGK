import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    usernameOrEmail: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String },
    auth0Sub: { type: String, unique: true, sparse: true },
    preferredLanguage: { type: String, enum: ["en", "hi"], default: "hi" },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastPracticeDate: { type: String, default: null }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
