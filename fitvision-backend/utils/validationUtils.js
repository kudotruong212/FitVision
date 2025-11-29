// utils/validationUtils.js
// Validation utility functions

const UNSAFE_KEYWORDS = ["tự tử", "suicide", "kill myself", "overdose"];

export function detectUnsafeMessage(text = "") {
  if (!text) return null;
  const lower = text.toLowerCase();
  const matched = UNSAFE_KEYWORDS.find((kw) => lower.includes(kw));
  if (matched) {
    return "Tin nhắn chứa nội dung nhạy cảm. Vui lòng liên hệ chuyên gia sức khỏe hoặc hotline hỗ trợ khẩn cấp.";
  }
  if (text.length > 800) {
    return "Tin nhắn quá dài. Hãy chia nhỏ câu hỏi để AI Coach phản hồi chính xác hơn.";
  }
  return null;
}

