// src/api/client.js
import axios from "axios";

const API_BASE = "http://localhost:5000";

export async function checkBackendHealth() {
  const res = await axios.get(`${API_BASE}/api/health`);
  return res.data;
}

export async function checkAIHealth() {
  const res = await axios.get(`${API_BASE}/api/ai/health`);
  return res.data;
}

export async function analyzeBody(formData) {
    const res = await axios.post(
      `${API_BASE}/api/ai/analyze`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return res.data;
  }
  