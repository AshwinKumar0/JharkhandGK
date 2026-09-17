import { User } from "../models/User.js";
import { verifyToken } from "../utils/auth.js";

export function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const payload = verifyToken(token);
    req.user = {
      _id: payload.sub,
      id: payload.sub,
      preferredLanguage: payload.preferredLanguage || "hi"
    };
    next();
  } catch {
    res.status(401).json({ message: "Authentication required" });
  }
}

export async function requireCurrentUser(req, res, next) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "Authentication required" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Authentication required" });
  }
}
