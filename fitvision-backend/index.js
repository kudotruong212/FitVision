import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import fs from 'fs';
import FormData from 'form-data';
import { connectDB } from "./db.js";
import { ScanSession } from "./models/ScanSession.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path), {
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

    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Cannot delete temp file:', err.message);
    });

    res.json(response.data);
  } catch (err) {
    console.error('Error calling AI analyze:', err.response?.data || err.message);
    res.status(500).json({ error: 'Cannot analyze body' });
  }
});

// Tạo workout plan từ kết quả phân tích (gọi sang AI service FastAPI)
app.post("/api/plan/generate", async (req, res) => {
  try {
    // req.body chính là object analysis mà BodyScan gửi lên
    // ví dụ:
    // {
    //   posture: '...',
    //   weak_muscles: [...],
    //   fat_area: '...',
    //   score: 72,
    //   recommendations: [...],
    //   body_shape: '...',
    //   risk_level: '...',
    //   notes: '...'
    // }

    const response = await axios.post(
      `${AI_SERVICE_URL}/ai/plan/generate`,
      req.body,
      {
        timeout: 30000, // cho GPT thời gian trả lời
      }
    );

    // Trả nguyên dữ liệu AI về cho frontend
    res.json(response.data);
  } catch (err) {
    console.error(
      "Error calling AI plan:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Cannot generate workout plan" });
  }
});


// ✅ NEW: forward plan generate sang FastAPI
// Lưu 1 lần scan (analysis + plan) vào DB
app.post("/api/scan/save", async (req, res) => {
  try {
    const { analysis, plan } = req.body || {};
    if (!analysis) {
      return res.status(400).json({ error: "Missing analysis data" });
    }

    const doc = await ScanSession.create({
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
      plan: plan || null,
    });

    res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error("Error saving scan session:", err);
    res.status(500).json({ error: "Cannot save scan session" });
  }
});

// Lấy danh sách lịch sử scan (mới nhất trước)
app.get("/api/scan/history", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 20);

    const list = await ScanSession.find()
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
app.get("/api/history/all", async (req, res) => {
  try {
    const sessions = await ScanSession.find().sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: "Cannot load history" });
  }
});




const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
};

start();