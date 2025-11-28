import 'dotenv/config'; // ✅ Load .env FIRST before other imports
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import multer from 'multer';
import fs from 'fs';
import FormData from 'form-data';
import { connectDB } from "./db.js";
import { ScanSession } from "./models/ScanSession.js";
import cloudinary from "./cloudinary.js";
import authRoutes from "./routes/auth.js";
import { authRequired } from "./middleware/auth.js";
import { Exercise } from "./models/Exercise.js";



const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

const upload = multer({ dest: 'uploads/' });

const PORT = process.env.PORT || 5000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

console.log(">>> Backend index.js STARTED <<<");

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

app.post('/api/ai/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // 1) Upload lên Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: "fitvision/body-scan", // tên folder trên Cloudinary
    });

    const imageUrl = uploadResult.secure_url;   // ✅ URL ảnh online
    const publicId = uploadResult.public_id;    // ✅ ID để xoá/sửa sau này nếu cần

    // 2) Gửi ảnh sang FastAPI để AI analyze (vẫn dùng file local)
    const formData = new FormData();
    formData.append("image", fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(
      `${AI_SERVICE_URL}/ai/analyze`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
      }
    );

    // 3) Xoá file local tạm (vì đã có trên Cloudinary rồi)
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Cannot delete temp file:", err.message);
    });

    // 4) Gắn thêm image_url & cloudinary_public_id vào kết quả AI
    const aiResult = {
      ...response.data,
      image_url: imageUrl,
      image_public_id: publicId,
    };

    res.json(aiResult);
  } catch (err) {
    console.error(
      "Error calling AI analyze:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Cannot analyze body" });
  }
});


// Tạo workout plan từ kết quả phân tích (gọi sang AI service FastAPI)
app.post("/api/plan/generate", (req, res) => {
  try {
    const { score = 60, weak_muscles = [], fat_area } = req.body || {};

    // Xác định level & số buổi/tuần
    let level = "beginner";
    let sessionsPerWeek = 3;
    if (score >= 80) {
      level = "advanced";
      sessionsPerWeek = 5;
    } else if (score >= 50) {
      level = "intermediate";
      sessionsPerWeek = 4;
    }

    // Focus areas
    const focusAreas = new Set();

    weak_muscles.forEach((m) => {
      focusAreas.add(m);
      if (m.toLowerCase().includes("back")) focusAreas.add("posture");
      if (m.toLowerCase().includes("core")) focusAreas.add("core stability");
      if (m.toLowerCase().includes("shoulder")) focusAreas.add("shoulder mobility");
    });

    if (fat_area) {
      focusAreas.add("fat loss");
      focusAreas.add("cardio");
    }

    // 💪 Base exercises – thêm slug để link sang /exercises/:slug
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

    const focusArray = Array.from(focusAreas);
    if (focusArray.length === 0) {
      focusArray.push("full body");
    }

    const sessions = [];

    for (let i = 0; i < sessionsPerWeek; i++) {
      const focus = focusArray[i % focusArray.length];

      const exList =
        baseExercises[focus] || baseExercises.default_fullbody;

      sessions.push({
        day: `Buổi ${i + 1}`,
        focus,
        exercises: exList,
      });
    }

    const plan = {
      level,
      sessions_per_week: sessionsPerWeek,
      focus_areas: focusArray,
      sessions,
    };

    res.json(plan);
  } catch (err) {
    console.error("Error generating plan:", err.message);
    res.status(500).json({ error: "Cannot generate workout plan" });
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
      image_url: analysis.image_url || null,
      image_public_id: analysis.image_public_id || null,
      plan: plan || null,
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

    const list = await ScanSession.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(list);
  } catch (err) {
    console.error("Error get scan history:", err);
    res.status(500).json({ error: "Cannot get scan history" });
  }
});

// Lấy toàn bộ lịch sử scan
app.get("/api/history/all", authRequired, async (req, res) => {
  try {
    const sessions = await ScanSession.find().sort({ createdAt: -1 }).lean();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: "Cannot load history" });
  }
});

// Chat với AI Coach (forward sang FastAPI)
app.post("/api/ai/chat", async (req, res) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/ai/chat`,
      req.body,
      {
        timeout: 30000,
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(
      "Error calling AI coach chat:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Cannot chat with AI coach" });
  }
});


app.get("/api/coach/context", async (req, res) => {
  try {
    // Lấy bản scan mới nhất
    const latest = await ScanSession.findOne().sort({ createdAt: -1 }).lean();

    if (!latest) {
      return res.json({ latest_scan: null, plan: null });
    }

    res.json({
      latest_scan: latest,
      plan: latest.plan || null,
    });
  } catch (err) {
    console.error("Error coach context:", err);
    res.status(500).json({ error: "Cannot load coach context" });
  }
});


app.post("/api/coach/chat", async (req, res) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/ai/coach`,
      req.body
    );
    res.json(response.data);
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
app.get("/api/stats/scan-summary", async (req, res) => {
  try {
    const sessions = await ScanSession.find().sort({ createdAt: 1 }).lean();

    if (!sessions.length) {
      return res.json({
        totalScans: 0,
        avgScore: 0,
        lastScore: 0,
        lastScanAt: null,
        byDay: [],
      });
    }

    const totalScans = sessions.length;
    const scores = sessions
      .map((s) => (typeof s.score === "number" ? s.score : null))
      .filter((x) => x !== null);

    const avgScore =
      scores.length > 0
        ? Math.round(
            (scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10
          ) / 10
        : 0;

    const last = sessions[sessions.length - 1];

    // Gom theo ngày
    const byDayMap = {};
    for (const s of sessions) {
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

    res.json({
      totalScans,
      avgScore,
      lastScore: last.score ?? 0,
      lastScanAt: last.createdAt,
      byDay: recentByDay,
    });
  } catch (err) {
    console.error("Error scan summary:", err);
    res.status(500).json({ error: "Cannot load scan stats" });
  }
});



const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
};

start();