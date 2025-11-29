import 'dotenv/config'; // ✅ Load .env FIRST before other imports
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';
import FormData from 'form-data';
import { connectDB } from "./db.js";
import { ScanSession } from "./models/ScanSession.js";
import { AnalysisLog } from "./models/AnalysisLog.js";
import cloudinary from "./cloudinary.js";
import authRoutes from "./routes/auth.js";
import profileRoutes, { serializeProfile } from "./routes/profile.js";
import { authRequired, validateUserOwnership } from "./middleware/auth.js";
import { Exercise } from "./models/Exercise.js";
import { CoachThread } from "./models/CoachThread.js";



export const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

const upload = multer({ dest: 'uploads/' });

const PORT = process.env.PORT || 5000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const DEFAULT_DAILY_SCAN_MAX = Number(process.env.SCAN_QUOTA_PER_DAY || 20);
const RAW_ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || "";
const ENCRYPTION_ENABLED = RAW_ENCRYPTION_KEY.length > 0;
const ENCRYPTION_KEY = ENCRYPTION_ENABLED
  ? crypto.createHash("sha256").update(RAW_ENCRYPTION_KEY).digest()
  : null;
const IV_LENGTH = 16;
const SIGNED_URL_TTL = 60 * 5; // 5 phút

console.log(">>> Backend index.js STARTED <<<");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const aiMetrics = {
  analyze: { count: 0, totalMs: 0 },
  plan: { count: 0, totalMs: 0 },
  chat: { count: 0, totalMs: 0 },
};

function estimatePoseSymmetry(points = []) {
  if (!Array.isArray(points) || points.length === 0) return null;
  const xs = points
    .map((pt) => (typeof pt.x === "number" ? pt.x : null))
    .filter((x) => x !== null);
  if (!xs.length) return null;
  const mean = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const variance =
    xs.reduce((sum, x) => sum + (x - mean) ** 2, 0) / Math.max(xs.length, 1);
  const normalized = Math.max(0, 1 - Math.min(variance * 10, 1));
  return Math.round(normalized * 100);
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function stddev(values = []) {
  if (values.length <= 1) return 0;
  const avg = average(values);
  const variance =
    values.reduce((sum, val) => sum + (val - avg) ** 2, 0) /
    Math.max(values.length, 1);
  return Math.sqrt(variance);
}

const UNSAFE_KEYWORDS = ["tự tử", "suicide", "kill myself", "overdose"];

function detectUnsafeMessage(text = "") {
  if (!text) return null;
  const lower = text.toLowerCase();
  const matched = UNSAFE_KEYWORDS.find((kw) => lower.includes(kw));
  if (matched) {
    return "Tin nhắn chứa nội dung nhạy cảm. Vui lòng liên hệ chuyên gia sức khỏe hoặc hotline hỗ trợ khẩn cấp.";
  }
  if (text.length > 800) {
    return "Tin nhắn quá dài. Hãy chia nhỏ câu hỏi để AI Coach phản hồi chính xác hơn.";
  }
  return null;
}

function recordMetric(bucket, durationMs) {
  if (!aiMetrics[bucket]) return;
  aiMetrics[bucket].count += 1;
  aiMetrics[bucket].totalMs += durationMs;
}

function encryptSensitive(value) {
  if (!value || !ENCRYPTION_ENABLED) return value || null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-ctr", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptSensitive(payload) {
  if (!payload || !ENCRYPTION_ENABLED) return payload;
  const [ivHex, dataHex] = payload.split(":");
  if (!ivHex || !dataHex) return payload;
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-ctr", ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

function getSignedImageUrl(publicId) {
  if (!publicId) return null;
  try {
    return cloudinary.url(publicId, {
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL,
    });
  } catch (err) {
    console.error("Cannot sign Cloudinary URL:", err.message);
    return null;
  }
}

function serializeSession(session) {
  if (!session) return session;
  const plain = typeof session.toObject === "function" ? session.toObject() : { ...session };
  
  // 🔒 Security: Loại bỏ sensitive fields
  delete plain.user; // Không trả về user ID
  delete plain.__v; // Mongoose version key
  
  if (plain.image_url) {
    plain.image_url = decryptSensitive(plain.image_url);
  }
  plain.signed_image_url = getSignedImageUrl(plain.image_public_id);
  return plain;
}

function getQuotaState(user) {
  const today = new Date().toISOString().slice(0, 10);
  const max = user.scanQuota?.max || DEFAULT_DAILY_SCAN_MAX;
  const lastDate = user.scanQuota?.date;
  const count = lastDate === today ? user.scanQuota?.count || 0 : 0;
  const left = Math.max(0, max - count);
  return { allowed: left > 0, left, max, date: today, count };
}

async function incrementQuota(user, quotaState) {
  const nextCount = quotaState.count + 1;
  user.scanQuota = {
    date: quotaState.date,
    count: nextCount,
    max: quotaState.max,
  };
  await user.save();
  const left = Math.max(0, quotaState.max - nextCount);
  return {
    allowed: left > 0,
    left,
    max: quotaState.max,
  };
}

async function logAIEvent({
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
    console.error("Cannot write AnalysisLog:", logErr.message);
  }
}

async function uploadToCloudinaryWithRetry(filePath, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await cloudinary.uploader.upload(filePath, options);
    } catch (err) {
      lastError = err;
      console.error(
        `Cloudinary upload failed (attempt ${attempt + 1}):`,
        err.message
      );
      if (attempt < 2) {
        await sleep(400 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

async function forwardImageToAI(filePath, originalname, mimetype) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const formData = new FormData();
      formData.append("image", fs.createReadStream(filePath), {
        filename: originalname,
        contentType: mimetype,
      });

      const started = Date.now();
      const response = await axios.post(`${AI_SERVICE_URL}/ai/analyze`, formData, {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
      });
      recordMetric("analyze", Date.now() - started);
      return response;
    } catch (err) {
      lastError = err;
      console.error(
        `AI analyze call failed (attempt ${attempt + 1}):`,
        err.response?.data || err.message
      );
      if (attempt < 2) {
        await sleep(500 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

app.get('/api/ai/health', async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/ai/health`);
    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Cannot reach AI service' });
  }
});

app.post('/api/ai/analyze', authRequired, upload.single('image'), async (req, res) => {
  const requestMeta = req.file
    ? {
        filename: req.file.originalname,
        size_kb: Math.round((req.file.size || 0) / 1024),
        ip: req.ip,
        user: req.user._id,
      }
    : { ip: req.ip, user: req.user?._id };
  const tempPath = req.file?.path;
  const quotaState = getQuotaState(req.user);

  if (!quotaState.allowed) {
    return res.status(429).json({
      error: "Bạn đã sử dụng hết lượt scan hôm nay.",
      quota: quotaState,
    });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // 1) Upload lên Cloudinary (có retry)
    const uploadResult = await uploadToCloudinaryWithRetry(req.file.path, {
      folder: "fitvision/body-scan",
    });

    const imageUrl = uploadResult.secure_url;
    const publicId = uploadResult.public_id;

    // 2) Gửi ảnh sang FastAPI để AI analyze (retry)
    const response = await forwardImageToAI(
      req.file.path,
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
    console.error(
      "Error calling AI analyze:",
      err.response?.data || err.message
    );
    await logAIEvent({
      kind: "body_analyze",
      status: "error",
      requestMeta,
      error: err.message,
    });
    res.status(500).json({ error: "Cannot analyze body" });
  } finally {
    if (tempPath) {
      fs.unlink(tempPath, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Cannot delete temp file:", unlinkErr.message);
        }
      });
    }
  }
});

app.get("/api/scan/quota", authRequired, (req, res) => {
  const quota = getQuotaState(req.user);
  res.json(quota);
});


function buildFallbackPlan({ score = 60, weak_muscles = [], fat_area }) {
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

async function requestAIWorkoutPlan(payload) {
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

app.post("/api/plan/generate", authRequired, async (req, res) => {
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
    console.error("AI workout plan error:", err.response?.data || err.message);
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
      console.error("Fallback plan error:", fallbackErr.message);
      return res.status(500).json({ error: "Cannot generate workout plan" });
    }
  }
});



// ✅ NEW: forward plan generate sang FastAPI
// Lưu 1 lần scan (analysis + plan) vào DB – yêu cầu đăng nhập
app.post("/api/scan/save", authRequired, async (req, res) => {
  try {
    const { analysis, plan } = req.body || {};
    if (!analysis) {
      return res.status(400).json({ error: "Missing analysis data" });
    }

    const userId = req.user._id; // 🔹 từ middleware authRequired
    console.log(`[AUDIT] User ${userId} saving scan session (score: ${analysis.score || 'N/A'})`);

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
      user: userId, // 🔹 gắn user
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

    res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error("Error saving scan session:", err);
    res.status(500).json({ error: "Cannot save scan session" });
  }
});

// Lấy danh sách lịch sử scan (mới nhất trước) - yêu cầu đăng nhập
app.get("/api/scan/history", authRequired, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 20);
    const userId = req.user._id; // 🔹 từ middleware authRequired
    console.log(`[AUDIT] User ${userId} accessing /api/scan/history (limit: ${limit})`);

    const list = await ScanSession.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    console.log(`[AUDIT] User ${userId} found ${list.length} scan sessions`);

    const safeList = list.map((item) => serializeSession(item));
    res.json(safeList);
  } catch (err) {
    console.error("Error get scan history:", err);
    res.status(500).json({ error: "Cannot get scan history" });
  }
});

// Lấy toàn bộ lịch sử scan
app.get("/api/history/all", authRequired, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`[AUDIT] User ${userId} accessing /api/history/all`);
    const sessions = await ScanSession.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
    console.log(`[AUDIT] User ${userId} found ${sessions.length} total scan sessions`);
    res.json(sessions.map((item) => serializeSession(item)));
  } catch (err) {
    res.status(500).json({ error: "Cannot load history" });
  }
});

app.delete("/api/scan/:id", authRequired, validateUserOwnership, async (req, res) => {
  try {
    const userId = req.user._id;
    const scanId = req.params.id;
    console.log(`[AUDIT] User ${userId} attempting to delete scan ${scanId}`);
    const scan = await ScanSession.findOne({
      _id: scanId,
      user: userId,
    });
    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }
    if (scan.image_public_id) {
      try {
        await cloudinary.uploader.destroy(scan.image_public_id);
      } catch (cloudErr) {
        console.error("Cloudinary destroy error:", cloudErr.message);
      }
    }
    await scan.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete scan error:", err);
    res.status(500).json({ error: "Cannot delete scan" });
  }
});

app.get("/api/media/scan/:id", authRequired, validateUserOwnership, async (req, res) => {
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
    console.error("Signed media error:", err);
    res.status(500).json({ error: "Cannot fetch media" });
  }
});

// Chat với AI Coach (forward sang FastAPI)
app.post("/api/ai/chat", authRequired, async (req, res) => {
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
    console.error(
      "Error calling AI coach chat:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Cannot chat with AI coach" });
  }
});


app.get("/api/coach/context", authRequired, async (req, res) => {
  try {
    // Lấy bản scan mới nhất
    const latest = await ScanSession.findOne({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    if (!latest) {
      return res.json({ latest_scan: null, plan: null });
    }

    res.json({
      latest_scan: serializeSession(latest),
      plan: latest.plan || null,
    });
  } catch (err) {
    console.error("Error coach context:", err);
    res.status(500).json({ error: "Cannot load coach context" });
  }
});

app.get("/api/coach/thread", authRequired, async (req, res) => {
  try {
    const thread = await CoachThread.findOne({ user: req.user._id }).lean();
    res.json(thread ? thread.messages.slice(-20) : []);
  } catch (err) {
    console.error("Coach thread fetch error:", err);
    res.status(500).json({ error: "Cannot load coach history" });
  }
});

app.delete("/api/coach/thread", authRequired, async (req, res) => {
  try {
    await CoachThread.deleteOne({ user: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    console.error("Coach thread reset error:", err);
    res.status(500).json({ error: "Cannot reset coach history" });
  }
});

app.post("/api/coach/chat", authRequired, async (req, res) => {
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
    recordMetric("chat", Date.now() - started);

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
    console.error("Coach chat error:", err);
    res.status(500).json({ error: "Coach chat failed" });
  }
});

// Lấy danh sách bài tập, có thể filter theo muscle_group hoặc level
app.get("/api/exercises", async (req, res) => {
  try {
    const { muscle, level } = req.query;

    const filter = {};
    if (muscle) {
      filter.muscle_group = muscle;
    }
    if (level) {
      filter.level = level;
    }

    const list = await Exercise.find(filter).sort({ name: 1 }).lean();
    res.json(list);
  } catch (err) {
    console.error("Error get exercises:", err);
    res.status(500).json({ error: "Cannot load exercises" });
  }
});

// ⚠️ chỉ dùng để seed dữ liệu dev, không dùng production
app.post("/api/exercises/seed", async (req, res) => {
  try {
    const sample = [
      {
        name: "Push-up",
        slug: "push-up",
        muscle_group: "chest",
        level: "beginner",
        equipment: "bodyweight",
        type: "strength",
        thumbnail_url:
          "https://wger.de/media/exercise-images/316/Push-up-1.png",
        description: "Hít đất cơ bản, tập trung ngực, vai và tay sau.",
        cues: [
          "Giữ thân người thành 1 đường thẳng",
          "Không võng lưng",
          "Hít xuống, thở ra khi đẩy lên",
        ],
      },
      {
        name: "Face Pull",
        slug: "face-pull",
        muscle_group: "back",
        level: "intermediate",
        equipment: "cable",
        type: "strength",
        thumbnail_url:
          "https://wger.de/media/exercise-images/228/Face-pull-1.png",
        description: "Bài tập rất tốt cho vai sau và cải thiện tư thế.",
        cues: [
          "Kéo tay ngang mặt",
          "Giữ khuỷu tay cao",
          "Siết cơ vai sau ở đỉnh động tác",
        ],
      },
      {
        name: "Plank",
        slug: "plank",
        muscle_group: "core",
        level: "beginner",
        equipment: "bodyweight",
        type: "core",
        thumbnail_url:
          "https://wger.de/media/exercise-images/132/Plank-1.png",
        description: "Giữ plank để tăng sức mạnh core và ổn định cột sống.",
        cues: [
          "Giữ người thẳng từ đầu đến gót chân",
          "Không đẩy mông quá cao hoặc quá thấp",
          "Thở đều",
        ],
      },
    ];

    await Exercise.deleteMany({});
    const inserted = await Exercise.insertMany(sample);

    res.json({ ok: true, count: inserted.length });
  } catch (err) {
    console.error("Seed exercises error:", err);
    res.status(500).json({ error: "Cannot seed exercises" });
  }
});

// Lấy chi tiết 1 bài tập theo slug
app.get("/api/exercises/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const ex = await Exercise.findOne({ slug }).lean();

    if (!ex) {
      return res.status(404).json({ error: "Exercise not found" });
    }

    res.json(ex);
  } catch (err) {
    console.error("Error get exercise detail:", err);
    res.status(500).json({ error: "Cannot load exercise detail" });
  }
});

// Thống kê các lần AI Body Scan
app.get("/api/stats/scan-summary", authRequired, async (req, res) => {
  try {
    const userId = req.user._id; // 🔹 từ middleware authRequired
    console.log(`[AUDIT] User ${userId} accessing /api/stats/scan-summary`);
    
    // 🔒 SECURITY: Đảm bảo chỉ query sessions của user này, loại bỏ null/undefined
    const sessions = await ScanSession.find({ 
      user: { $eq: userId, $ne: null } 
    }).sort({ createdAt: 1 }).lean();
    
    // 🔒 SECURITY: Double-check - filter lại ở application level để đảm bảo
    const filteredSessions = sessions.filter(s => 
      s.user && s.user.toString() === userId.toString()
    );
    
    console.log(`[AUDIT] User ${userId} found ${filteredSessions.length} scan sessions (filtered from ${sessions.length} total)`);
    
    if (!filteredSessions.length) {
      return res.json({
        totalScans: 0,
        avgScore: 0,
        lastScore: 0,
        lastScanAt: null,
        byDay: [],
      });
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
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
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

    // chỉ lấy 14 ngày gần nhất cho chart
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

    res.json({
      totalScans,
      avgScore,
      lastScore: last.score ?? 0,
      lastScanAt: last.createdAt,
      byDay: recentByDay,
      rolling,
      focusSummary,
      fatAreas,
    });
  } catch (err) {
    console.error("Error scan summary:", err);
    res.status(500).json({ error: "Cannot load scan stats" });
  }
});

app.get("/api/reports/weekly", authRequired, async (req, res) => {
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
    console.error("Weekly report error:", err);
    res.status(500).json({ error: "Cannot export report" });
  }
});

app.get("/api/metrics", authRequired, async (req, res) => {
  try {
    // System-wide metrics (AI latency, uptime) + user-specific scan count
    const userId = req.user._id;
    const totalSessions = await ScanSession.countDocuments({ user: userId });
    const avgAnalyze =
      aiMetrics.analyze.count > 0
        ? Math.round(
            (aiMetrics.analyze.totalMs / aiMetrics.analyze.count) * 10
          ) / 10
        : 0;
    const avgPlan =
      aiMetrics.plan.count > 0
        ? Math.round((aiMetrics.plan.totalMs / aiMetrics.plan.count) * 10) / 10
        : 0;
    const avgChat =
      aiMetrics.chat.count > 0
        ? Math.round((aiMetrics.chat.totalMs / aiMetrics.chat.count) * 10) / 10
        : 0;

    res.json({
      uptime_seconds: Math.round(process.uptime()),
      total_scans: totalSessions,
      ai_latency_ms: {
        analyze_avg: avgAnalyze,
        plan_avg: avgPlan,
        chat_avg: avgChat,
      },
    });
  } catch (err) {
    console.error("Metrics endpoint error:", err);
    res.status(500).json({ error: "Cannot load metrics" });
  }
});



export const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
  }
};

if (process.env.NODE_ENV !== "test") {
  start();
}

export {
  getQuotaState,
  incrementQuota,
  serializeSession,
  encryptSensitive,
  decryptSensitive,
};