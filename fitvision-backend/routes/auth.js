// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { User } from "../models/User.js";
import { serializeProfile } from "./profile.js";

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút." },
});

const EMAIL_REGEX =
    /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function validateEmail(email) {
    return EMAIL_REGEX.test(email || "");
}

function validatePassword(password) {
    return PASSWORD_REGEX.test(password || "");
}

function signToken(user) {
    const payload = {
        sub: user._id.toString(),
        email: user.email,
    };
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    return jwt.sign(payload, secret, { expiresIn });
}

function buildUserResponse(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        profile: serializeProfile(user.profile),
    };
}

async function enqueueEmailVerification(user) {
    try {
        const token = jwt.sign(
            { sub: user._id.toString(), type: "verify-email" },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );
        // Hook cho dịch vụ email thực tế (SendGrid, Resend, v.v.)
        console.log(
            `[verify-email] Send verification link to ${user.email} with token ${token}`
        );
    } catch (err) {
        console.error("enqueueEmailVerification error:", err.message);
    }
}

/**
 * POST /api/auth/register
 * body: { name?, email, password }
 */
router.post("/register", authLimiter, async (req, res) => {
    try {
        const { name, email, password } = req.body || {};

        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "Email và password là bắt buộc." });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: "Email không hợp lệ." });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({
                error:
                    "Mật khẩu phải ≥ 8 ký tự và có ít nhất 1 chữ hoa, 1 chữ thường, 1 số.",
            });
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

        enqueueEmailVerification(user);

        const token = signToken(user);

        res.json({
            token,
            user: buildUserResponse(user),
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
router.post("/login", authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "Email và password là bắt buộc." });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: "Email không hợp lệ." });
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
            user: buildUserResponse(user),
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Cannot login" });
    }
});

export default router;
