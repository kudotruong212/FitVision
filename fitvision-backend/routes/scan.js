// routes/scan.js
// Scan-related routes

import express from 'express';
import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { authRequired, validateUserOwnership } from '../middleware/auth.js';
import { upload, validateUpload } from '../middleware/uploadValidation.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { getQuotaState, incrementQuota } from '../services/quotaService.js';
import { uploadToCloudinaryWithRetry, forwardImageToAI } from '../services/aiService.js';
import { logAIEvent } from '../services/scanService.js';
import { saveScanSession, getScanHistory, getAllScanHistory, deleteScanSession } from '../services/scanService.js';
import { getSignedImageUrl } from '../utils/sessionUtils.js';
import { ScanSession } from '../models/ScanSession.js';

const router = express.Router();
const AI_SERVICE_URL = config.ai.serviceUrl;
const SIGNED_URL_TTL = 60 * 5; // 5 phút

// Health check for AI service
router.get('/ai/health', async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/ai/health`);
    res.json(response.data);
  } catch (err) {
    logger.error("Cannot reach AI service", { error: err.message });
    res.status(500).json({ error: 'Cannot reach AI service' });
  }
});

// Analyze body image
router.post('/ai/analyze', aiLimiter, authRequired, upload.single('image'), validateUpload, async (req, res) => {
  const requestMeta = req.file
    ? {
        filename: req.file.originalname,
        size_kb: Math.round((req.file.size || 0) / 1024),
        ip: req.ip,
        user: req.user._id,
      }
    : { ip: req.ip, user: req.user?._id };
  const quotaState = getQuotaState(req.user);

  if (!quotaState.allowed) {
    return res.status(429).json({
      error: "Bạn đã sử dụng hết lượt scan hôm nay.",
      quota: quotaState,
    });
  }

  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // 1) Upload lên Cloudinary (có retry) - dùng buffer từ memory
    const uploadResult = await uploadToCloudinaryWithRetry(req.file.buffer, {
      folder: "fitvision/body-scan",
    });

    const imageUrl = uploadResult.secure_url;
    const publicId = uploadResult.public_id;

    // 2) Gửi ảnh sang FastAPI để AI analyze (retry) - dùng buffer
    const response = await forwardImageToAI(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // 3) Gắn thêm image_url & cloudinary_public_id vào kết quả AI
    const aiResult = {
      ...response.data,
      image_url: imageUrl,
      image_public_id: publicId,
    };

    const updatedQuota = await incrementQuota(req.user, quotaState);
    aiResult.quota = updatedQuota;

    await logAIEvent({
      kind: "body_analyze",
      requestMeta,
      responseMeta: {
        score: aiResult.score,
        risk_level: aiResult.risk_level,
        pose_confidence: aiResult.pose_confidence,
      },
    });

    res.json(aiResult);
  } catch (err) {
    const errorDetails = err.response?.data || { error: err.message };
    logger.error(
      "Error calling AI analyze:",
      { 
        error: errorDetails,
        message: err.message,
        stack: err.stack,
        responseStatus: err.response?.status,
        responseData: err.response?.data
      }
    );
    await logAIEvent({
      kind: "body_analyze",
      status: "error",
      requestMeta,
      error: err.message,
      errorDetails: errorDetails,
    });
    
    // Return more detailed error to frontend
    const statusCode = err.response?.status || 500;
    res.status(statusCode).json({ 
      error: errorDetails.error || "Cannot analyze body",
      message: errorDetails.message || err.message,
      details: errorDetails
    });
  }
});

// Get scan quota
router.get("/scan/quota", authRequired, (req, res) => {
  const quota = getQuotaState(req.user);
  res.json(quota);
});

// Save scan session
router.post("/scan/save", authRequired, async (req, res) => {
  try {
    const { analysis, plan } = req.body || {};
    if (!analysis) {
      return res.status(400).json({ error: "Missing analysis data" });
    }

    const userId = req.user._id;
    logger.info("User saving scan session", { 
      userId, 
      score: analysis.score || 'N/A' 
    });

    const doc = await saveScanSession(userId, analysis, plan);
    res.json({ ok: true, id: doc._id });
  } catch (err) {
    logger.error("Error saving scan session", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot save scan session" });
  }
});

// Get scan history
router.get("/scan/history", authRequired, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 20);
    const userId = req.user._id;
    logger.info("User accessing scan history", { userId, limit });

    const list = await getScanHistory(userId, limit);
    logger.debug("Scan history retrieved", { userId, count: list.length });

    res.json(list);
  } catch (err) {
    logger.error("Error getting scan history", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot get scan history" });
  }
});

// Get all scan history
router.get("/history/all", authRequired, async (req, res) => {
  try {
    const userId = req.user._id;
    logger.info("User accessing full history", { userId });
    const sessions = await getAllScanHistory(userId);
    logger.debug("Full history retrieved", { userId, count: sessions.length });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: "Cannot load history" });
  }
});

// Delete scan session
router.delete("/scan/:id", authRequired, validateUserOwnership, async (req, res) => {
  try {
    const userId = req.user._id;
    const scanId = req.params.id;
    logger.info("User attempting to delete scan", { userId, scanId });
    
    const deleted = await deleteScanSession(userId, scanId);
    if (!deleted) {
      return res.status(404).json({ error: "Scan not found" });
    }
    
    res.json({ ok: true });
  } catch (err) {
    logger.error("Delete scan error", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot delete scan" });
  }
});

// Get signed media URL
router.get("/media/scan/:id", authRequired, validateUserOwnership, async (req, res) => {
  try {
    const scan = await ScanSession.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).lean();

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const url = getSignedImageUrl(scan.image_public_id);
    if (!url) {
      return res.status(500).json({ error: "Cannot generate signed URL" });
    }

    res.json({
      url,
      expiresAt: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL,
    });
  } catch (err) {
    logger.error("Signed media error", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot fetch media" });
  }
});

export default router;

