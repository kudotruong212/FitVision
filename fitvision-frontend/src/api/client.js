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

export { api }; 


//Helper quản lý token
const TOKEN_KEY = "fitvision_token";

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    delete api.defaults.headers.common["Authorization"];
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Khi app khởi động, nếu localStorage đã có token thì gắn luôn
const existingToken = localStorage.getItem(TOKEN_KEY);
if (existingToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${existingToken}`;
}

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

// HISTORY (lấy từ backend / MongoDB)
export async function fetchScanHistory(limit = 20) {
  try {
    const res = await api.get("/api/scan/history", {
      params: { limit },
    });
    return res.data;
  } catch (error) {
    console.error(
      "❌ fetchScanHistory error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// ===============================
// AI COACH CHAT
// ===============================
export async function aiCoachChat(messages, analysis = null) {
  try {
    const res = await api.post("/api/ai/chat", {
      messages,
      analysis,
    });
    return res.data; // { answer: "..." }
  } catch (error) {
    console.error(
      "❌ aiCoachChat error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// CoachAI
export async function fetchCoachContext() {
  const res = await api.get("/api/coach/context");
  return res.data;
}

// ===============================
// AUTH
// ===============================
export async function registerUser({ name, email, password }) {
  const res = await api.post("/api/auth/register", {
    name,
    email,
    password,
  });
  const { token, user } = res.data;
  setAuthToken(token);
  // lưu user để hiển thị trên UI nếu muốn
  localStorage.setItem("fitvision_user", JSON.stringify(user));
  return user;
}

export async function loginUser({ email, password }) {
  const res = await api.post("/api/auth/login", {
    email,
    password,
  });
  const { token, user } = res.data;
  setAuthToken(token);
  localStorage.setItem("fitvision_user", JSON.stringify(user));
  return user;
}

export function logoutUser() {
  setAuthToken(null);
  localStorage.removeItem("fitvision_user");
}

// Lấy danh sách bài tập
export async function fetchExercises(filters = {}) {
  const params = {};

  if (filters.muscle) params.muscle = filters.muscle;
  if (filters.level) params.level = filters.level;

  const res = await api.get("/api/exercises", { params });
  return res.data;
}

// Lấy chi tiết 1 bài tập theo slug
export async function fetchExerciseBySlug(slug) {
  const res = await api.get(`/api/exercises/${slug}`);
  return res.data;
}

// Thống kê scan summary (Dashboard)
export async function fetchScanStats() {
  const res = await api.get("/api/stats/scan-summary");
  return res.data;
}
