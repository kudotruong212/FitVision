import { api } from "./client"; // nếu default export
// hoặc import { api } nếu bạn export khác

export async function analyzeCoachChat(data) {
  const res = await api.post("/api/coach/chat", data);
  return res.data;
}


