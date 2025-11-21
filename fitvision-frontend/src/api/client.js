// src/api/client.js
import axios from "axios";

// ===============================
// CẤU HÌNH API
// ===============================
export const API_BASE = "http://localhost:5000";

// Tạo instance chung, có timeout + tự bắt lỗi
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// ===============================
// CHECK HEALTH
// ===============================
export async function checkBackendHealth() {
  const res = await api.get("/api/health");
  return res.data;
}

export async function checkAIHealth() {
  const res = await api.get("/api/ai/health");
  return res.data;
}

// ===============================
// PHÂN TÍCH ẢNH (BODY SCAN) 🧍‍♂️
// ===============================
export async function analyzeBody(formData) {
  try {
    const res = await api.post("/api/ai/analyze", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return res.data;
  } catch (error) {
    console.error("❌ analyzeBody error:", error.response?.data || error.message);
    throw error;
  }
}

// ===============================
// TẠO PLAN TẬP LUYỆN (AI / LOGIC BACKEND)
// ===============================
export async function generateWorkoutPlan(analysis) {
  try {
    const res = await api.post("/api/plan/generate", analysis);
    return res.data;
  } catch (error) {
    console.error("❌ generateWorkoutPlan error:", error.response?.data || error.message);
    throw error;
  }
}
