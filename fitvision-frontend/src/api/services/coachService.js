// src/api/services/coachService.js
// AI Coach API calls

import { api } from "../client.js";
import { API_ENDPOINTS } from "../../constants/apiEndpoints.js";

export async function fetchCoachThread() {
  const res = await api.get(API_ENDPOINTS.COACH.THREAD);
  return res.data;
}

export async function resetCoachThread() {
  const res = await api.delete(API_ENDPOINTS.COACH.THREAD);
  return res.data;
}

export async function sendCoachMessage(payload) {
  const res = await api.post(API_ENDPOINTS.COACH.CHAT_MESSAGE, payload);
  return res.data;
}

export async function aiCoachChat(messages, analysis = null, profile = null) {
  try {
    const res = await api.post(API_ENDPOINTS.COACH.CHAT, {
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

export async function fetchCoachContext() {
  const res = await api.get(API_ENDPOINTS.COACH.CONTEXT);
  return res.data;
}

