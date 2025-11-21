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

  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
  