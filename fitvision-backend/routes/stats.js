// routes/stats.js
// Statistics and reporting routes

import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { ScanSession } from '../models/ScanSession.js';
import logger from '../utils/logger.js';
import { getScanStats } from '../services/scanService.js';
import { csvEscape } from '../utils/csvUtils.js';
import { getAIMetrics } from '../services/aiService.js';

const router = express.Router();

// Get scan summary statistics
router.get("/stats/scan-summary", authRequired, async (req, res) => {
  try {
    const userId = req.user._id;
    logger.info("User accessing scan summary", { userId });
    
    const stats = await getScanStats(userId);
    res.json(stats);
  } catch (err) {
    logger.error("Error scan summary", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot load scan stats" });
  }
});

// Export weekly report as CSV
router.get("/reports/weekly", authRequired, async (req, res) => {
  try {
    const sessions = await ScanSession.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(14)
      .lean();

    const headers = [
      "date",
      "score",
      "score_delta",
      "weak_muscles",
      "fat_area",
      "risk_level",
      "pose_symmetry",
    ];

    const rows = sessions.map((session) => {
      const line = [
        new Date(session.createdAt).toISOString(),
        session.score ?? "",
        session?.derived_metrics?.score_delta ?? "",
        (session.weak_muscles || []).join(" | "),
        session.fat_area || "",
        session.risk_level || "",
        session?.derived_metrics?.pose_symmetry ?? "",
      ];
      return line.map(csvEscape).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=fitvision-weekly-report.csv"
    );
    res.send(csvContent);
  } catch (err) {
    logger.error("Weekly report error", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot export report" });
  }
});

// Get system metrics
router.get("/metrics", authRequired, async (req, res) => {
  try {
    const userId = req.user._id;
    const totalSessions = await ScanSession.countDocuments({ user: userId });
    const aiMetrics = getAIMetrics();

    res.json({
      uptime_seconds: Math.round(process.uptime()),
      total_scans: totalSessions,
      ai_latency_ms: {
        analyze_avg: aiMetrics.analyze.avgMs,
        plan_avg: aiMetrics.plan.avgMs,
        chat_avg: aiMetrics.chat.avgMs,
      },
    });
  } catch (err) {
    logger.error("Metrics endpoint error", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Cannot load metrics" });
  }
});

export default router;

