// services/scanService.js
// Scan session business logic

import { ScanSession } from '../models/ScanSession.js';
import { AnalysisLog } from '../models/AnalysisLog.js';
import cloudinary from '../cloudinary.js';
import logger from '../utils/logger.js';
import { estimatePoseSymmetry } from '../utils/metricsUtils.js';
import { encryptSensitive } from './encryptionService.js';
import { serializeSession } from '../utils/sessionUtils.js';
import { decryptSensitive } from './encryptionService.js';
import { average, stddev } from '../utils/metricsUtils.js';

export async function logAIEvent({
  kind,
  status = "success",
  requestMeta = {},
  responseMeta = {},
  error = null,
}) {
  try {
    await AnalysisLog.create({
      kind,
      status,
      request_meta: requestMeta,
      response_meta: responseMeta,
      error,
    });
  } catch (logErr) {
    logger.error("Cannot write AnalysisLog", { error: logErr.message });
  }
}

export async function saveScanSession(userId, analysis, plan) {
  const storedImageUrl = encryptSensitive(analysis.image_url || null);
  const lastSession = await ScanSession.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .lean();

  const currentScore =
    typeof analysis.score === "number" ? analysis.score : null;
  const previousScore =
    lastSession && typeof lastSession.score === "number"
      ? lastSession.score
      : null;
  const scoreDelta =
    currentScore !== null && previousScore !== null
      ? Math.round((currentScore - previousScore) * 10) / 10
      : null;

  const derivedMetrics = {
    score_delta: scoreDelta,
    weak_focus: (analysis.weak_muscles || []).filter(Boolean).slice(0, 3),
    pose_symmetry:
      estimatePoseSymmetry(analysis.pose_points) ??
      (analysis.pose_confidence != null
        ? Math.round(analysis.pose_confidence * 100)
        : null),
    fat_area_confidence:
      analysis.pose_confidence != null
        ? Math.round(analysis.pose_confidence * 100)
        : null,
  };

  const doc = await ScanSession.create({
    user: userId,
    filename: analysis.filename,
    size_kb: analysis.size_kb,
    posture: analysis.posture,
    weak_muscles: analysis.weak_muscles || [],
    fat_area: analysis.fat_area,
    score: analysis.score,
    recommendations: analysis.recommendations || [],
    body_shape: analysis.body_shape,
    risk_level: analysis.risk_level,
    notes: analysis.notes,
    pose_confidence: analysis.pose_confidence ?? null,
    pose_points: analysis.pose_points || [],
    pose_warning: analysis.pose_warning || null,
    image_url: storedImageUrl,
    image_public_id: analysis.image_public_id || null,
    plan: plan || null,
    derived_metrics: derivedMetrics,
  });

  return doc;
}

export async function getScanHistory(userId, limit = 20) {
  const list = await ScanSession.find({ 
    user: userId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return list.map((item) => serializeSession(item, decryptSensitive));
}

export async function getAllScanHistory(userId) {
  const sessions = await ScanSession.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();
  return sessions.map((item) => serializeSession(item, decryptSensitive));
}

export async function deleteScanSession(userId, scanId) {
  const scan = await ScanSession.findOne({
    _id: scanId,
    user: userId,
  });
  
  if (!scan) {
    return null;
  }

  if (scan.image_public_id) {
    try {
      await cloudinary.uploader.destroy(scan.image_public_id);
    } catch (cloudErr) {
      logger.warn("Cloudinary destroy error", { error: cloudErr.message });
    }
  }
  
  await scan.deleteOne();
  return true;
}

export async function getScanStats(userId) {
  const sessions = await ScanSession.find({ 
    user: { $eq: userId, $ne: null } 
  }).sort({ createdAt: 1 }).lean();
  
  const filteredSessions = sessions.filter(s => 
    s.user && s.user.toString() === userId.toString()
  );
  
  if (!filteredSessions.length) {
    return {
      totalScans: 0,
      avgScore: 0,
      lastScore: 0,
      lastScanAt: null,
      byDay: [],
      rolling: { avg7: 0, avg30: 0, volatility7: 0 },
      focusSummary: [],
      fatAreas: [],
    };
  }

  const totalScans = filteredSessions.length;
  const scores = filteredSessions
    .map((s) => (typeof s.score === "number" ? s.score : null))
    .filter((x) => x !== null);

  const avgScore =
    scores.length > 0
      ? Math.round(
          (scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10
        ) / 10
      : 0;

  const last = filteredSessions[filteredSessions.length - 1];

  // Gom theo ngày
  const byDayMap = {};
  for (const s of filteredSessions) {
    const d = new Date(s.createdAt);
    const key = d.toISOString().slice(0, 10);
    if (!byDayMap[key]) {
      byDayMap[key] = { date: key, count: 0, avgScore: 0, scores: [] };
    }
    const score =
      typeof s.score === "number" && !isNaN(s.score) ? s.score : null;
    if (score !== null) {
      byDayMap[key].scores.push(score);
    }
    byDayMap[key].count += 1;
  }

  const byDay = Object.values(byDayMap).map((d) => {
    const avg =
      d.scores.length > 0
        ? Math.round(
            (d.scores.reduce((sum, s) => sum + s, 0) / d.scores.length) * 10
          ) / 10
        : 0;
    return {
      date: d.date,
      count: d.count,
      avgScore: avg,
    };
  });

  const byDaySorted = byDay.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );
  const recentByDay = byDaySorted.slice(-14);

  const last7Scores = scores.slice(-7);
  const last30Scores = scores.slice(-30);
  const rolling = {
    avg7:
      last7Scores.length > 0
        ? Math.round(average(last7Scores) * 10) / 10
        : 0,
    avg30:
      last30Scores.length > 0
        ? Math.round(average(last30Scores) * 10) / 10
        : 0,
    volatility7:
      last7Scores.length > 1
        ? Math.round(stddev(last7Scores) * 10) / 10
        : 0,
  };

  const focusMap = {};
  const fatMap = {};
  for (const session of filteredSessions) {
    const focusList = Array.isArray(session.weak_muscles)
      ? session.weak_muscles
      : [];
    focusList.forEach((muscle) => {
      if (!muscle) return;
      if (!focusMap[muscle]) {
        focusMap[muscle] = { count: 0, scores: [], deltas: [] };
      }
      focusMap[muscle].count += 1;
      if (typeof session.score === "number") {
        focusMap[muscle].scores.push(session.score);
      }
      if (typeof session?.derived_metrics?.score_delta === "number") {
        focusMap[muscle].deltas.push(session.derived_metrics.score_delta);
      }
    });

    const fatKey = session.fat_area || "Không xác định";
    if (!fatMap[fatKey]) {
      fatMap[fatKey] = { count: 0 };
    }
    fatMap[fatKey].count += 1;
  }

  const focusSummary = Object.entries(focusMap)
    .map(([focus, data]) => ({
      focus,
      sessions: data.count,
      avgScore:
        data.scores.length > 0
          ? Math.round((average(data.scores) || 0) * 10) / 10
          : 0,
      avgDelta:
        data.deltas.length > 0
          ? Math.round(average(data.deltas) * 10) / 10
          : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 6);

  const fatAreas = Object.entries(fatMap)
    .map(([area, data]) => ({
      area,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalScans,
    avgScore,
    lastScore: last.score ?? 0,
    lastScanAt: last.createdAt,
    byDay: recentByDay,
    rolling,
    focusSummary,
    fatAreas,
  };
}

