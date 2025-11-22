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
    const res = await api.post("/api/plan/generate", analysis, {
      timeout: 30000, // ⬅ 30 giây cho plan vì OpenAI có thể lâu
    });
    return res.data;
  } catch (error) {
    console.error(
      "❌ generateWorkoutPlan error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Lưu history lên backend (MongoDB)
export async function saveScanSession(analysis, plan) {
  const res = await api.post("/api/scan/save", { analysis, plan });
  return res.data;
}

// Lấy history từ backend
export async function fetchScanHistory(limit = 20) {
  const res = await api.get("/api/scan/history", {
    params: { limit },
  });
  return res.data;
}
