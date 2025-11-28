import React from "react";
import { fetchCoachContext } from "../api/client";
import { analyzeCoachChat } from "../api/coachApi";

export default function CoachChat() {
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [context, setContext] = React.useState(null);

  // Load context khi mở trang
  React.useEffect(() => {
    async function load() {
      const ctx = await fetchCoachContext();
      setContext(ctx);
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
      // Gửi kèm context vào API
      const response = await analyzeCoachChat({
        user_message: input,
        context,
      });

      setMessages((msgs) => [
        ...msgs,
        { role: "assistant", content: response.reply },
      ]);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        {
          role: "assistant",
          content: "Xin lỗi, hệ thống gặp lỗi khi trả lời.",
        },
      ]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h2 className="text-3xl font-bold">AI Coach</h2>
      <p className="text-gray-400">
        Huấn luyện viên ảo dựa trên dữ liệu cơ thể của bạn.
      </p>

      {!context && (
        <div className="text-sm text-yellow-300">
          ⚠ Bạn cần thực hiện AI Scan trước.
        </div>
      )}

      {/* khung chat */}
      <div className="bg-slate-800 rounded-xl p-4 h-[500px] overflow-y-auto border border-slate-700 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === "user"
                ? "text-right text-blue-300"
                : "text-left text-emerald-300"
            }
          >
            {msg.content}
          </div>
        ))}
        {loading && <div className="text-gray-500">Đang trả lời...</div>}
      </div>

      {/* input */}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded bg-slate-700 px-3 py-2"
          placeholder="Nhập câu hỏi..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-emerald-500 rounded"
          disabled={loading}
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
