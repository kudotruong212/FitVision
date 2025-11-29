// src/constants/apiEndpoints.js
// Centralized API endpoint paths

export const API_ENDPOINTS = {
  HEALTH: "/api/health",
  AI_HEALTH: "/api/ai/health",
  
  AUTH: {
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    RESET_PASSWORD: "/api/auth/reset-password",
    VERIFY_EMAIL: "/api/auth/verify-email",
    RESEND_VERIFICATION: "/api/auth/resend-verification",
  },
  
  SCAN: {
    ANALYZE: "/api/ai/analyze",
    QUOTA: "/api/scan/quota",
    SAVE: "/api/scan/save",
    HISTORY: "/api/scan/history",
    HISTORY_ALL: "/api/history/all",
    DELETE: "/api/scan/:id",
    MEDIA: "/api/media/scan/:id",
  },
  
  PLAN: {
    GENERATE: "/api/plan/generate",
  },
  
  COACH: {
    CHAT: "/api/ai/chat",
    CONTEXT: "/api/coach/context",
    THREAD: "/api/coach/thread",
    CHAT_MESSAGE: "/api/coach/chat",
  },
  
  EXERCISES: {
    LIST: "/api/exercises",
    BY_SLUG: "/api/exercises/:slug",
    SEED: "/api/exercises/seed",
  },
  
  PROFILE: {
    ME: "/api/profile/me",
  },
  
  STATS: {
    SCAN_SUMMARY: "/api/stats/scan-summary",
    WEEKLY_REPORT: "/api/reports/weekly",
    METRICS: "/api/metrics",
  },
};

