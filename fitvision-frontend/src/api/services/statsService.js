// src/api/services/statsService.js
// Statistics and reports API calls

import { api } from "../client.js";
import { API_ENDPOINTS } from "../../constants/apiEndpoints.js";

export async function fetchScanStats() {
  const res = await api.get(API_ENDPOINTS.STATS.SCAN_SUMMARY);
  return res.data;
}

export async function downloadWeeklyReport() {
  const res = await api.get(API_ENDPOINTS.STATS.WEEKLY_REPORT, {
    responseType: "blob",
  });
  return res.data;
}

export async function checkBackendHealth() {
  const res = await api.get(API_ENDPOINTS.HEALTH);
  return res.data;
}

export async function checkAIHealth() {
  const res = await api.get(API_ENDPOINTS.AI_HEALTH);
  return res.data;
}

