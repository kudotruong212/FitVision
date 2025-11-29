// src/api/client.js
import axios from "axios";

// ===============================
// CẤU HÌNH API
// ===============================
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Tạo instance chung, có timeout + tự bắt lỗi
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export { api }; 

const RETRYABLE_STATUS = [408, 425, 429, 500, 502, 503, 504];

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(requestFn, options = {}) {
  const {
    retries = 2,
    delay = 500,
    multiplier = 1.5,
    retryOn = RETRYABLE_STATUS,
    retryOnNetworkError = true,
  } = options;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestFn();
    } catch (error) {
      const status = error.response?.status;
      const isNetworkError = !status;
      const shouldRetry =
        (status && retryOn.includes(status)) ||
        (retryOnNetworkError && isNetworkError);

      if (!shouldRetry || attempt === retries) {
        throw error;
      }

      const backoff = Math.round(delay * multiplier ** attempt);
      await wait(backoff);
    }
  }
}

//Helper quản lý token
const TOKEN_KEY = "fitvision_token";
const USER_KEY = "fitvision_user";

// Callback để xử lý khi token invalid (để AuthContext có thể logout)
let onAuthErrorCallback = null;

export function setOnAuthError(callback) {
  onAuthErrorCallback = callback;
}

export function clearAuth() {
  delete api.defaults.headers.common["Authorization"];
  
  // Clear all authentication-related localStorage
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  
  // Clear cached scan data
  localStorage.removeItem("fitvision_last_analysis");
  
  // Clear all history cache keys (fitvision_history_*)
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("fitvision_history_")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  if (onAuthErrorCallback) {
    onAuthErrorCallback();
  }
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    clearAuth();
  }
}

// Khi app khởi động, nếu localStorage đã có token thì gắn luôn
const existingToken = localStorage.getItem(TOKEN_KEY);
if (existingToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${existingToken}`;
}

// Axios response interceptor để xử lý 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalid hoặc hết hạn
      console.warn("Unauthorized request - clearing auth");
      clearAuth();
      // Redirect sẽ được xử lý bởi AuthContext hoặc component
    }
    return Promise.reject(error);
  }
);

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
    const res = await withRetry(
      () =>
        api.post("/api/ai/analyze", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }),
      { retries: 2, delay: 600 }
    );
    return res.data;
  } catch (error) {
    console.error("❌ analyzeBody error:", error.response?.data || error.message);
    throw error;
  }
}

// ===============================
// TẠO PLAN TẬP LUYỆN (AI / LOGIC BACKEND)
// ===============================
export async function generateWorkoutPlan(analysis, profile = null) {
  try {
    const payload = profile ? { analysis, profile } : analysis;
    const res = await withRetry(
      () =>
        api.post("/api/plan/generate", payload, {
          timeout: 30000,
        }),
      { retries: 1, delay: 800 }
    );
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

export async function fetchScanQuota() {
  const res = await api.get("/api/scan/quota");
  return res.data;
}

export async function fetchSignedScanImage(id) {
  const res = await api.get(`/api/media/scan/${id}`);
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

export async function deleteScanSession(id) {
  const res = await api.delete(`/api/scan/${id}`);
  return res.data;
}

// ===============================
// AI COACH CHAT
// ===============================
export async function aiCoachChat(messages, analysis = null, profile = null) {
  try {
    const res = await api.post("/api/ai/chat", {
      messages,
      analysis,
      profile,
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
export async function registerUser({ name, email, password, rememberMe = false }) {
  const res = await api.post("/api/auth/register", {
    name,
    email,
    password,
    rememberMe,
  });
  const { token, user } = res.data;
  setAuthToken(token);
  // lưu user để hiển thị trên UI nếu muốn
  localStorage.setItem("fitvision_user", JSON.stringify(user));
  return user;
}

export async function loginUser({ email, password, rememberMe = false }) {
  const res = await api.post("/api/auth/login", {
    email,
    password,
    rememberMe,
  });
  const { token, user } = res.data;
  setAuthToken(token);
  localStorage.setItem("fitvision_user", JSON.stringify(user));
  return user;
}

export function logoutUser() {
  clearAuth();
}

// Verify token với backend
export async function verifyToken() {
  try {
    const res = await api.get("/api/profile/me");
    return { valid: true, user: res.data };
  } catch (error) {
    if (error.response?.status === 401) {
      return { valid: false };
    }
    throw error;
  }
}

// Password reset
export async function requestPasswordReset(email) {
  const res = await api.post("/api/auth/forgot-password", { email });
  return res.data;
}

export async function resetPassword(token, newPassword) {
  const res = await api.post("/api/auth/reset-password", {
    token,
    newPassword,
  });
  return res.data;
}

// Email verification
export async function verifyEmail(token) {
  const res = await api.post("/api/auth/verify-email", { token });
  return res.data;
}

export async function resendVerificationEmail(email) {
  const res = await api.post("/api/auth/resend-verification", { email });
  return res.data;
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

// ===============================
// USER PROFILE
// ===============================
export async function fetchProfile() {
  const res = await api.get("/api/profile/me");
  return res.data;
}

export async function updateProfile(profile) {
  const res = await api.put("/api/profile/me", profile);
  return res.data;
}

export async function downloadWeeklyReport() {
  const res = await api.get("/api/reports/weekly", {
    responseType: "blob",
  });
  return res.data;
}
