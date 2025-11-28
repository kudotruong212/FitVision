// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const router = express.Router();

function signToken(user) {
    const payload = {
        sub: user._id.toString(),
        email: user.email,
    };
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    return jwt.sign(payload, secret, { expiresIn });
}

/**
 * POST /api/auth/register
 * body: { name?, email, password }
 */
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body || {};

        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "Email và password là bắt buộc." });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res
                .status(409)
                .json({ error: "Email đã được đăng ký, hãy dùng email khác." });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password_hash,
        });

        const token = signToken(user);

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Cannot register user" });
    }
});

/**
 * POST /api/auth/login
 * body: { email, password }
 */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "Email và password là bắt buộc." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res
                .status(401)
                .json({ error: "Sai email hoặc mật khẩu." });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res
                .status(401)
                .json({ error: "Sai email hoặc mật khẩu." });
        }

        const token = signToken(user);

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Cannot login" });
    }
});

export default router;
