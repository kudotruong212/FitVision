// routes/coach.js
// AI Coach chat routes

import express from 'express';
import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { authRequired } from '../middleware/auth.js';
import { coachChatLimiter } from '../middleware/rateLimiter.js';
import { trackAIRequest } from '../middleware/metrics.js';
import { serializeProfile } from './profile.js';
import { detectUnsafeMessage } from '../utils/validationUtils.js';
import { ScanSession } from '../models/ScanSession.js';
import { CoachThread } from '../models/CoachThread.js';
import { serializeSession } from '../utils/sessionUtils.js';
import { decryptSensitive } from '../services/encryptionService.js';

const router = express.Router();
const AI_SERVICE_URL = config.ai.serviceUrl;


// Chat with AI Coach (forward to FastAPI)
router.post("/ai/chat", coachChatLimiter, authRequired, async (req, res) => {
  try {
    const payload = {
      ...req.body,
      profile: serializeProfile(req.user?.profile),
    };
    const response = await axios.post(`${AI_SERVICE_URL}/ai/chat`, payload, {
        timeout: 30000,
    });

    res.json(response.data);
  } catch (err) {
    logger.error("Error calling AI coach chat", {
      error: err.response?.data || err.message
    });
    res.status(500).json({ error: "Cannot chat with AI coach" });
  }
});

// Get coach context (latest scan and plan)
router.get("/coach/context", authRequired, async (req, res) => {
  try {
    const latest = await ScanSession.findOne({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    if (!latest) {
      return res.json({ latest_scan: null, plan: null });
    }

    res.json({
      latest_scan: serializeSession(latest, decryptSensitive),
      plan: latest.plan || null,
    });
  } catch (err) {
    logger.error("Error coach context", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot load coach context" });
  }
});

// Get coach thread messages
router.get("/coach/thread", authRequired, async (req, res) => {
  try {
    const thread = await CoachThread.findOne({ user: req.user._id }).lean();
    res.json(thread ? thread.messages.slice(-20) : []);
  } catch (err) {
    logger.error("Coach thread fetch error", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot load coach history" });
  }
});

// Delete coach thread
router.delete("/coach/thread", authRequired, async (req, res) => {
  try {
    await CoachThread.deleteOne({ user: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    logger.error("Coach thread reset error", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot reset coach history" });
  }
});

// Chat with coach (with thread management)
router.post("/coach/chat", authRequired, async (req, res) => {
  try {
    const userMessage = req.body?.user_message;
    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ error: "Missing user_message" });
    }

    const unsafe = detectUnsafeMessage(userMessage);
    if (unsafe) {
      return res.status(400).json({ error: unsafe });
    }

    if (req.body?.reset === true) {
      await CoachThread.deleteOne({ user: req.user._id });
    }

    let thread = await CoachThread.findOne({ user: req.user._id });
    if (!thread) {
      thread = new CoachThread({ user: req.user._id, messages: [] });
    }

    const recentMessages = thread.messages.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const payload = {
      messages: [...recentMessages, { role: "user", content: userMessage }],
      analysis: req.body?.context?.latest_scan || null,
      profile: serializeProfile(req.user?.profile),
    };

    const started = Date.now();
    const response = await axios.post(`${AI_SERVICE_URL}/ai/chat`, payload, {
      timeout: 60000,
    });
    const duration = Date.now() - started;
    trackAIRequest("chat", duration, true);

    const reply =
      response.data?.answer || response.data?.reply || "Xin lỗi, tôi chưa hiểu.";

    const updatedMessages = [
      ...recentMessages,
      { role: "user", content: userMessage, createdAt: new Date() },
      { role: "assistant", content: reply, createdAt: new Date() },
    ];

    thread.messages = updatedMessages;
    await thread.save();

    res.json({
      reply,
      history: thread.messages.slice(-20),
    });
  } catch (err) {
    logger.error("Coach chat error", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Coach chat failed" });
  }
});

export default router;

