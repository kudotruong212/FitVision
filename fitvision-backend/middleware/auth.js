// middleware/auth.js
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export async function authRequired(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const [type, token] = header.split(" ");

        if (type !== "Bearer" || !token) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload.sub);

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        // gắn user vào request để dùng ở các route sau
        req.user = user;
        next();
    } catch (err) {
        console.error("authRequired error:", err);
        return res.status(401).json({ error: "Invalid token" });
    }
}
