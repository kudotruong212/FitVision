import React from "react";
import { Link } from "react-router-dom";
import { fetchCoachContext } from "../api/client";
import {
  fetchCoachThread,
  sendCoachMessage,
  resetCoachThread,
} from "../api/coachApi";
import { useAuth } from "../context/AuthContext.jsx";

export default function CoachChat() {
  const { profile } = useAuth();
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [context, setContext] = React.useState(null);
  const [loadingHistory, setLoadingHistory] = React.useState(true);
  const [error, setError] = React.useState(null);

  const quickSuggestions = [
    "Gợi ý bài kéo giãn cổ-vai cho văn phòng",
    "Ưu tiên bài core để giảm võng lưng",
    "Điều chỉnh dinh dưỡng giảm mỡ bụng",
  ];

  React.useEffect(() => {
    async function load() {
      try {
        setLoadingHistory(true);
        const [ctx, history] = await Promise.all([
          fetchCoachContext(),
          fetchCoachThread(),
        ]);
        setContext(ctx);
        setMessages(history || []);
      } catch (err) {
        console.error(err);
        setError("Không tải được lịch sử chat.");
      } finally {
        setLoadingHistory(false);
      }
    }
    load();
  }, []);

  async function handleSend() {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await sendCoachMessage({
        user_message: userMsg.content,
        context,
      });
      if (response.history) {
        setMessages(response.history);
      } else {
        setMessages((msgs) => [
          ...msgs,
          { role: "assistant", content: response.reply },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((msgs) => [
        ...msgs,
        {
          role: "assistant",
          content: "Xin lỗi, hệ thống gặp lỗi khi trả lời.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetThread() {
    try {
      await resetCoachThread();
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">AI Coach</h2>
            <p className="text-gray-400">
            Huấn luyện viên ảo dựa trên dữ liệu cơ thể của bạn.
          </p>
        </div>
        <button
          onClick={handleResetThread}
          className="text-xs text-gray-400 hover:text-white underline"
        >
          Xóa lịch sử
        </button>
      </div>

      {!profile?.goal && (
        <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2">
          Mẹo: cập nhật{" "}
          <Link to="/profile" className="underline font-semibold">
            hồ sơ mục tiêu
          </Link>{" "}
          để AI Coach hiểu rõ mục tiêu luyện tập của bạn hơn.
        </div>
      )}

      {!context && (
        <div className="text-sm text-yellow-300">
          ⚠ Bạn cần thực hiện AI Scan trước.
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}

      <div className="bg-slate-800 rounded-xl p-4 h-[500px] overflow-y-auto border border-slate-700 flex flex-col gap-3">
        {loadingHistory && (
          <div className="text-sm text-gray-400">Đang tải cuộc hội thoại...</div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={`${msg.role}-${i}`} message={msg} />
        ))}
        {loading && (
          <div className="self-start text-xs text-gray-400">Đang trả lời...</div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {quickSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setInput(suggestion)}
            className="px-3 py-1 rounded-full border border-slate-700 text-gray-300 hover:border-emerald-500/40"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded bg-slate-700 px-3 py-2"
          placeholder="Nhập câu hỏi..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-emerald-500 rounded disabled:opacity-60"
          disabled={loading}
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
        isUser
          ? "self-end bg-emerald-500 text-slate-900"
          : "self-start bg-slate-700 text-gray-100"
      }`}
    >
      {message.content}
    </div>
  );
}
