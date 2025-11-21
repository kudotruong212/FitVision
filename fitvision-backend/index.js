import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import fs from 'fs';
import FormData from 'form-data';

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
  
      // Tạo form-data gửi sang FastAPI
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
  
      // Xoá file tạm sau khi gửi
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Cannot delete temp file:', err.message);
      });
  
      res.json(response.data);
    } catch (err) {
      console.error('Error calling AI analyze:', err.response?.data || err.message);
      res.status(500).json({ error: 'Cannot analyze body' });
    }
  });

  app.post('/api/plan/generate', (req, res) => {
    try {
      const { score = 60, weak_muscles = [], fat_area } = req.body || {};
  
      // Xác định level & số buổi/tuần
      let level = 'beginner';
      let sessionsPerWeek = 3;
      if (score >= 80) {
        level = 'advanced';
        sessionsPerWeek = 5;
      } else if (score >= 50) {
        level = 'intermediate';
        sessionsPerWeek = 4;
      }
  
      // Focus areas
      const focusAreas = new Set();
  
      weak_muscles.forEach((m) => {
        focusAreas.add(m);
        if (m.toLowerCase().includes('back')) focusAreas.add('posture');
        if (m.toLowerCase().includes('core')) focusAreas.add('core stability');
        if (m.toLowerCase().includes('shoulder')) focusAreas.add('shoulder mobility');
      });
  
      if (fat_area) {
        focusAreas.add('fat loss');
        focusAreas.add('cardio');
      }
  
      // Tạo sessions đơn giản
      const sessions = [];
  
      const baseExercises = {
        posture: [
          { name: 'Face Pull', sets: '3', reps: '12–15' },
          { name: 'Band Pull Apart', sets: '3', reps: '15' },
        ],
        'upper back': [
          { name: 'Seated Row', sets: '3', reps: '10–12' },
          { name: 'Lat Pulldown', sets: '3', reps: '10–12' },
        ],
        core: [
          { name: 'Plank', sets: '3', reps: '30–45 giây' },
          { name: 'Dead Bug', sets: '3', reps: '12 mỗi bên' },
        ],
        'fat loss': [
          { name: 'Incline Walk', sets: '20–30 phút', reps: '' },
          { name: 'Cycling / Elliptical', sets: '20 phút', reps: '' },
        ],
        cardio: [
          { name: 'Interval Bike', sets: '10x', reps: '30s work / 30s rest' },
        ],
      };
  
      const focusArray = Array.from(focusAreas);
      if (focusArray.length === 0) {
        focusArray.push('full body');
      }
  
      for (let i = 0; i < sessionsPerWeek; i++) {
        const focus = focusArray[i % focusArray.length];
  
        const exercises =
          baseExercises[focus] ||
          [
            { name: 'Goblet Squat', sets: '3', reps: '10–12' },
            { name: 'Push-up', sets: '3', reps: 'tối đa có thể' },
            { name: 'Plank', sets: '3', reps: '30–45 giây' },
          ];
  
        sessions.push({
          day: `Buổi ${i + 1}`,
          focus,
          exercises,
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
      console.error('Error generating plan:', err.message);
      res.status(500).json({ error: 'Cannot generate workout plan' });
    }
  });
  

  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
  