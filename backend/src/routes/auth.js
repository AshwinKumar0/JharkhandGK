import bcrypt from "bcryptjs";
import express from "express";
import { supportedLanguages } from "../config/constants.js";
import { authRequired, requireCurrentUser } from "../middleware/authRequired.js";
import { User } from "../models/User.js";
import { signToken, verifyAuth0IdToken } from "../utils/auth.js";

export const authRouter = express.Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, usernameOrEmail, password, preferredLanguage = "hi" } = req.body;
    if (!name || !usernameOrEmail || !password) {
      return res.status(400).json({ message: "Name, username/email, and password are required" });
    }
    if (!supportedLanguages.has(preferredLanguage)) {
      return res.status(400).json({ message: "Preferred language must be en or hi" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      usernameOrEmail,
      passwordHash,
      preferredLanguage
    });

    res.status(201).json({
      token: signToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Username/email already exists" });
    }
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: "Username/email and password are required" });
    }

    const user = await User.findOne({ usernameOrEmail: String(usernameOrEmail).toLowerCase() });
    if (!user || !user.passwordHash) return res.status(401).json({ message: "Invalid credentials" });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ message: "Invalid credentials" });

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth0", async (req, res, next) => {
  try {
    const { idToken, preferredLanguage = "hi" } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Auth0 ID token is required" });
    }
    if (!supportedLanguages.has(preferredLanguage)) {
      return res.status(400).json({ message: "Preferred language must be en or hi" });
    }

    const payload = await verifyAuth0IdToken(idToken);
    const email = String(payload.email || `${payload.sub}@auth0.local`).toLowerCase();
    const name = payload.name || payload.nickname || email;

    let user = await User.findOne({ auth0Sub: payload.sub });
    if (!user) {
      user = await User.findOne({ usernameOrEmail: email });
      if (user) {
        user.auth0Sub = payload.sub;
        user.name = user.name || name;
        await user.save();
      } else {
        user = await User.create({
          name,
          usernameOrEmail: email,
          auth0Sub: payload.sub,
          preferredLanguage
        });
      }
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    if (!error.status) error.status = 401;
    next(error);
  }
});

authRouter.get("/me", authRequired, requireCurrentUser, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    usernameOrEmail: user.usernameOrEmail,
    preferredLanguage: user.preferredLanguage,
    xp: user.xp,
    streak: user.streak
  };
}
