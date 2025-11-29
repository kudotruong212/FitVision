import { api } from "./client";

export async function fetchCoachThread() {
  const res = await api.get("/api/coach/thread");
  return res.data;
}

export async function resetCoachThread() {
  const res = await api.delete("/api/coach/thread");
  return res.data;
}

export async function sendCoachMessage(payload) {
  const res = await api.post("/api/coach/chat", payload);
  return res.data;
}