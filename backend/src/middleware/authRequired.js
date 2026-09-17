import { User } from "../models/User.js";
import { verifyToken } from "../utils/auth.js";

export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Authentication required" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Authentication required" });
  }
}
