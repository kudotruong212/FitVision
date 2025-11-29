// services/aiService.js
// AI service integration (OpenAI, Cloudinary)

import axios from 'axios';
import FormData from 'form-data';
import cloudinary from '../cloudinary.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { trackAIRequest } from '../middleware/metrics.js';

const AI_SERVICE_URL = config.ai.serviceUrl;

// Internal metrics tracking (will be moved to a proper metrics service later)
const aiMetrics = {
  analyze: { count: 0, totalMs: 0 },
  plan: { count: 0, totalMs: 0 },
  chat: { count: 0, totalMs: 0 },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function recordMetric(bucket, durationMs) {
  if (!aiMetrics[bucket]) return;
  aiMetrics[bucket].count += 1;
  aiMetrics[bucket].totalMs += durationMs;
}

export async function uploadToCloudinaryWithRetry(buffer, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          options,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(buffer);
      });
    } catch (err) {
      lastError = err;
      logger.warn(`Cloudinary upload failed (attempt ${attempt + 1})`, { 
        error: err.message,
        attempt: attempt + 1 
      });
      if (attempt < 2) {
        await sleep(400 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

export async function forwardImageToAI(buffer, originalname, mimetype) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const formData = new FormData();
      formData.append("image", buffer, {
        filename: originalname,
        contentType: mimetype,
      });

      const started = Date.now();
      const response = await axios.post(`${AI_SERVICE_URL}/ai/analyze`, formData, {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
      });
      const duration = Date.now() - started;
      recordMetric("analyze", duration);
      trackAIRequest("analyze", duration, true);
      return response;
    } catch (err) {
      lastError = err;
      logger.warn(`AI analyze call failed (attempt ${attempt + 1})`, {
        error: err.response?.data || err.message,
        attempt: attempt + 1
      });
      if (attempt < 2) {
        await sleep(500 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

export async function requestAIWorkoutPlan(payload) {
  const started = Date.now();
  const response = await axios.post(
    `${AI_SERVICE_URL}/ai/plan/generate`,
    payload,
    {
      timeout: 45000,
    }
  );
  recordMetric("plan", Date.now() - started);
  return response.data;
}

export function buildFallbackPlan({ score = 60, weak_muscles = [], fat_area }) {
  let level = "beginner";
  let sessionsPerWeek = 3;
  if (score >= 80) {
    level = "advanced";
    sessionsPerWeek = 5;
  } else if (score >= 50) {
    level = "intermediate";
    sessionsPerWeek = 4;
  }

  const focusAreas = new Set();

  weak_muscles.forEach((m = "") => {
    focusAreas.add(m);
    if (m.toLowerCase().includes("back")) focusAreas.add("posture");
    if (m.toLowerCase().includes("core")) focusAreas.add("core stability");
    if (m.toLowerCase().includes("shoulder")) focusAreas.add("shoulder mobility");
  });

  if (fat_area) {
    focusAreas.add("fat loss");
    focusAreas.add("cardio");
  }

  const baseExercises = {
    posture: [
      { name: "Face Pull", slug: "face-pull", sets: "3", reps: "12–15" },
      { name: "Band Pull Apart", slug: "band-pull-apart", sets: "3", reps: "15" },
    ],
    "upper back": [
      { name: "Seated Row", slug: "seated-row", sets: "3", reps: "10–12" },
      { name: "Lat Pulldown", slug: "lat-pulldown", sets: "3", reps: "10–12" },
    ],
    core: [
      { name: "Plank", slug: "plank", sets: "3", reps: "30–45 giây" },
      { name: "Dead Bug", slug: "dead-bug", sets: "3", reps: "12 mỗi bên" },
    ],
    "fat loss": [
      { name: "Incline Walk", slug: "incline-walk", sets: "20–30 phút", reps: "" },
      { name: "Cycling / Elliptical", slug: "cycling-elliptical", sets: "20 phút", reps: "" },
    ],
    cardio: [
      { name: "Interval Bike", slug: "interval-bike", sets: "10x", reps: "30s work / 30s rest" },
    ],
    default_fullbody: [
      { name: "Goblet Squat", slug: "goblet-squat", sets: "3", reps: "10–12" },
      { name: "Push-up", slug: "push-up", sets: "3", reps: "tối đa có thể" },
      { name: "Plank", slug: "plank", sets: "3", reps: "30–45 giây" },
    ],
  };

  const focusArray = Array.from(focusAreas).filter(Boolean);
  if (focusArray.length === 0) {
    focusArray.push("full body");
  }

  const sessions = [];
  for (let i = 0; i < sessionsPerWeek; i += 1) {
    const focus = focusArray[i % focusArray.length];
    const exList = baseExercises[focus] || baseExercises.default_fullbody;
    sessions.push({
      title: `Buổi ${i + 1} – ${focus}`,
      focus: [focus],
      exercises: exList,
    });
  }

  return {
    level,
    sessions_per_week: sessionsPerWeek,
    focus_areas: focusArray,
    sessions,
    source: "fallback",
  };
}

// Export metrics for stats endpoint
export function getAIMetrics() {
  return {
    analyze: {
      count: aiMetrics.analyze.count,
      avgMs: aiMetrics.analyze.count > 0
        ? Math.round((aiMetrics.analyze.totalMs / aiMetrics.analyze.count) * 10) / 10
        : 0,
    },
    plan: {
      count: aiMetrics.plan.count,
      avgMs: aiMetrics.plan.count > 0
        ? Math.round((aiMetrics.plan.totalMs / aiMetrics.plan.count) * 10) / 10
        : 0,
    },
    chat: {
      count: aiMetrics.chat.count,
      avgMs: aiMetrics.chat.count > 0
        ? Math.round((aiMetrics.chat.totalMs / aiMetrics.chat.count) * 10) / 10
        : 0,
    },
  };
}

