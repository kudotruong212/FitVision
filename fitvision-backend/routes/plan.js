// routes/plan.js
// Workout plan generation routes

import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { serializeProfile } from './profile.js';
import { requestAIWorkoutPlan, buildFallbackPlan } from '../services/aiService.js';
import { logAIEvent } from '../services/scanService.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post("/plan/generate", authRequired, async (req, res) => {
  const body = req.body || {};
  const hasNestedAnalysis =
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    body.analysis &&
    typeof body.analysis === "object";
  const analysis = hasNestedAnalysis ? body.analysis : body;
  const incomingProfile = hasNestedAnalysis ? body.profile : null;
  const normalizedProfile = incomingProfile
    ? serializeProfile(incomingProfile)
    : null;

  const { score = 60, weak_muscles = [], fat_area } = analysis;
  const requestMeta = {
    score,
    weak_muscles: weak_muscles.length,
    has_fat_area: Boolean(fat_area),
    profile_goal: normalizedProfile?.goal || null,
  };

  try {
    const planPayload = normalizedProfile
      ? { analysis, profile: normalizedProfile }
      : analysis;
    const plan = await requestAIWorkoutPlan(planPayload);
    await logAIEvent({
      kind: "plan_generate",
      requestMeta,
      responseMeta: {
        level: plan.level,
        sessions_per_week: plan.sessions_per_week,
        focus_areas: plan.focus_areas,
      },
    });
    return res.json(plan);
  } catch (err) {
    logger.error("AI workout plan error", { 
      error: err.response?.data || err.message 
    });
    await logAIEvent({
      kind: "plan_generate",
      status: "error",
      requestMeta,
      error: err.message,
    });
    try {
      const fallbackPlan = buildFallbackPlan({ score, weak_muscles, fat_area });
      await logAIEvent({
        kind: "plan_generate",
        status: "success",
        requestMeta,
        responseMeta: {
          level: fallbackPlan.level,
          sessions_per_week: fallbackPlan.sessions_per_week,
          focus_areas: fallbackPlan.focus_areas,
          source: "fallback",
        },
      });
      return res.json(fallbackPlan);
    } catch (fallbackErr) {
      logger.error("Fallback plan error", { error: fallbackErr.message });
      return res.status(500).json({ error: "Cannot generate workout plan" });
    }
  }
});

export default router;

