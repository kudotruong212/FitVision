// middleware/auth.js
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { ScanSession } from "../models/ScanSession.js";

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

/**
 * Middleware để validate user ownership của scan session
 * Sử dụng cho các endpoints có req.params.id (scan ID)
 */
export async function validateUserOwnership(req, res, next) {
    try {
        // Phải có authRequired trước đó
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const scanId = req.params.id;
        if (!scanId) {
            return next(); // Không có ID thì skip validation
        }

        const session = await ScanSession.findById(scanId).lean();
        if (!session) {
            return res.status(404).json({ error: "Scan not found" });
        }

        // Kiểm tra ownership
        const userId = req.user._id.toString();
        const sessionUserId = session.user?.toString();
        
        if (sessionUserId !== userId) {
            console.warn(`[SECURITY] User ${userId} attempted to access scan ${scanId} owned by ${sessionUserId}`);
            return res.status(403).json({ error: "Forbidden: You don't have access to this resource" });
        }

        next();
    } catch (err) {
        console.error("validateUserOwnership error:", err);
        return res.status(500).json({ error: "Validation error" });
    }
}
