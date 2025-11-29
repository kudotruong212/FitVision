// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { User } from "../models/User.js";
import { serializeProfile } from "./profile.js";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from "../validators/authValidator.js";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../services/emailService.js";
import logger from "../utils/logger.js";
import { emailQueue } from "../workers/emailWorker.js";

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

function signToken(user, rememberMe = false) {
    const payload = {
        sub: user._id.toString(),
        email: user.email,
    };
    const secret = process.env.JWT_SECRET;
    const expiresIn = rememberMe ? (process.env.JWT_EXPIRES_IN || "7d") : "1d";

    return jwt.sign(payload, secret, { expiresIn });
}

function buildUserResponse(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified || false,
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
        // Try to use queue if available, otherwise send directly
        const queue = await getEmailQueue();
        if (queue) {
            await queue.add('send-verification', { user, token });
        } else {
            await sendVerificationEmail(user, token);
        }
    } catch (err) {
        logger.error("enqueueEmailVerification error", { error: err.message });
    }
}

/**
 * POST /api/auth/register
 * body: { name?, email, password }
 */
router.post("/register", authLimiter, validate(registerSchema), async (req, res) => {
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

        // Queue verification email (non-blocking)
        const verifyToken = jwt.sign(
            { sub: user._id.toString(), type: "verify-email" },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );
        getEmailQueue().then(queue => {
            if (queue) {
                queue.add('send-verification', { user, token: verifyToken }).catch(err => {
                    logger.error("Failed to queue verification email", { error: err.message });
                });
                queue.add('send-welcome', { user }).catch(err => {
                    logger.error("Failed to queue welcome email", { error: err.message });
                });
            } else {
                // Fallback to direct sending
                sendVerificationEmail(user, verifyToken).catch(err => {
                    logger.error("Failed to send verification email", { error: err.message });
                });
                sendWelcomeEmail(user).catch(err => {
                    logger.error("Failed to send welcome email", { error: err.message });
                });
            }
        }).catch(() => {
            // Fallback if queue import fails
            sendVerificationEmail(user, verifyToken).catch(err => {
                logger.error("Failed to send verification email", { error: err.message });
            });
            sendWelcomeEmail(user).catch(err => {
                logger.error("Failed to send welcome email", { error: err.message });
            });
        });

        const rememberMe = req.body.rememberMe === true;
        const token = signToken(user, rememberMe);

        res.json({
            token,
            user: buildUserResponse(user),
        });
    } catch (err) {
        logger.error("Register error", { error: err.message, stack: err.stack });
        res.status(500).json({ error: "Cannot register user" });
    }
});

/**
 * POST /api/auth/login
 * body: { email, password }
 */
router.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
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

        const rememberMe = req.body.rememberMe === true;
        const token = signToken(user, rememberMe);

        res.json({
            token,
            user: buildUserResponse(user),
        });
    } catch (err) {
        logger.error("Login error", { error: err.message, stack: err.stack });
        res.status(500).json({ error: "Cannot login" });
    }
});

/**
 * POST /api/auth/forgot-password
 * body: { email }
 */
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) {
            return res.status(400).json({ error: "Email là bắt buộc." });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: "Email không hợp lệ." });
        }

        const user = await User.findOne({ email });
        // Luôn trả về success để không leak thông tin về email tồn tại
        if (user) {
            try {
                const resetToken = jwt.sign(
                    { sub: user._id.toString(), type: "reset-password" },
                    process.env.JWT_SECRET,
                    { expiresIn: "1h" }
                );
                // Queue password reset email
                emailQueue.add('send-password-reset', { user, token: resetToken }).catch(err => {
                    logger.error("Failed to queue password reset email", { error: err.message });
                });
            } catch (err) {
                logger.error("enqueuePasswordReset error", { error: err.message });
            }
        }

        res.json({
            message: "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.",
        });
    } catch (err) {
        logger.error("Forgot password error", { error: err.message, stack: err.stack });
        res.status(500).json({ error: "Cannot process request" });
    }
});

/**
 * POST /api/auth/reset-password
 * body: { token, newPassword }
 */
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), async (req, res) => {
    try {
        const { token, newPassword } = req.body || {};
        if (!token || !newPassword) {
            return res
                .status(400)
                .json({ error: "Token và mật khẩu mới là bắt buộc." });
        }

        if (!validatePassword(newPassword)) {
            return res.status(400).json({
                error:
                    "Mật khẩu phải ≥ 8 ký tự và có ít nhất 1 chữ hoa, 1 chữ thường, 1 số.",
            });
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ error: "Token không hợp lệ hoặc đã hết hạn." });
        }

        if (payload.type !== "reset-password") {
            return res.status(400).json({ error: "Token không hợp lệ." });
        }

        const user = await User.findById(payload.sub);
        if (!user) {
            return res.status(404).json({ error: "Người dùng không tồn tại." });
        }

        const password_hash = await bcrypt.hash(newPassword, 10);
        user.password_hash = password_hash;
        await user.save();

        res.json({ message: "Mật khẩu đã được đặt lại thành công." });
    } catch (err) {
        logger.error("Reset password error", { error: err.message, stack: err.stack });
        res.status(500).json({ error: "Cannot reset password" });
    }
});

/**
 * POST /api/auth/verify-email
 * body: { token }
 */
router.post("/verify-email", authLimiter, validate(verifyEmailSchema), async (req, res) => {
    try {
        const { token } = req.body || {};
        if (!token) {
            return res.status(400).json({ error: "Token là bắt buộc." });
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ error: "Token không hợp lệ hoặc đã hết hạn." });
        }

        if (payload.type !== "verify-email") {
            return res.status(400).json({ error: "Token không hợp lệ." });
        }

        const user = await User.findById(payload.sub);
        if (!user) {
            return res.status(404).json({ error: "Người dùng không tồn tại." });
        }

        user.email_verified = true;
        await user.save();

        res.json({ message: "Email đã được xác nhận thành công." });
    } catch (err) {
        logger.error("Verify email error", { error: err.message, stack: err.stack });
        res.status(500).json({ error: "Cannot verify email" });
    }
});

/**
 * POST /api/auth/resend-verification
 * Requires authentication
 */
router.post("/resend-verification", authLimiter, validate(resendVerificationSchema), async (req, res) => {
    try {
        // This endpoint should be protected, but for now we'll check email in body
        const { email } = req.body || {};
        if (!email) {
            return res.status(400).json({ error: "Email là bắt buộc." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "Người dùng không tồn tại." });
        }

        if (user.email_verified) {
            return res.json({ message: "Email đã được xác nhận rồi." });
        }

        await enqueueEmailVerification(user);

        res.json({ message: "Email xác nhận đã được gửi lại." });
    } catch (err) {
        logger.error("Resend verification error", { error: err.message, stack: err.stack });
        res.status(500).json({ error: "Cannot resend verification" });
    }
});

export default router;
