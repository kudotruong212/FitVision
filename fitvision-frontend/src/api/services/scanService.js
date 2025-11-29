// src/api/services/scanService.js
// Body scan API calls

import { api } from "../client.js";
import { API_ENDPOINTS } from "../../constants/apiEndpoints.js";
import { withRetry } from "../utils/retry.js";

export async function analyzeBody(formData, onUploadProgress) {
  try {
    const res = await withRetry(
      () =>
        api.post(API_ENDPOINTS.SCAN.ANALYZE, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          onUploadProgress: onUploadProgress || undefined,
        }),
      { retries: 2, delay: 600 }
    );
    return res.data;
  } catch (error) {
    console.error("❌ analyzeBody error:", error.response?.data || error.message);
    throw error;
  }
}

export async function generateWorkoutPlan(analysis, profile = null) {
  try {
    const payload = profile ? { analysis, profile } : analysis;
    const res = await withRetry(
      () =>
        api.post(API_ENDPOINTS.PLAN.GENERATE, payload, {
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

export async function saveScanSession(analysis, plan) {
  const res = await api.post(API_ENDPOINTS.SCAN.SAVE, { analysis, plan });
  return res.data;
}

export async function fetchScanQuota() {
  const res = await api.get(API_ENDPOINTS.SCAN.QUOTA);
  return res.data;
}

export async function fetchSignedScanImage(id) {
  const res = await api.get(`/api/media/scan/${id}`);
  return res.data;
}

export async function fetchScanHistory(limit = 20) {
  try {
    const res = await api.get(API_ENDPOINTS.SCAN.HISTORY, {
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

