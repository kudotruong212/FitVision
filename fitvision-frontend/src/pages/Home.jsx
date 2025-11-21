// src/pages/Home.jsx
import React from "react";
import { checkBackendHealth, checkAIHealth } from "../api/client";

export default function Home() {
  const [status, setStatus] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const handleCheck = async () => {
    setLoading(true);
    try {
      const be = await checkBackendHealth();
      const ai = await checkAIHealth();
      setStatus({ backend: be, ai });
    } catch (e) {
      console.error(e);
      setStatus({ error: "Lỗi gọi API" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-3xl font-bold mb-2">
        Trang Home - FitVision
      </h2>
      <p className="text-gray-300">
        Bấm nút bên dưới để kiểm tra backend & AI service có đang chạy không.
      </p>
      <button
        onClick={handleCheck}
        disabled={loading}
        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 rounded text-white font-semibold"
      >
        {loading ? "Đang kiểm tra..." : "Kiểm tra kết nối hệ thống"}
      </button>

      {status && (
        <pre className="mt-4 bg-slate-800 p-3 rounded text-sm overflow-x-auto">
          {JSON.stringify(status, null, 2)}
        </pre>
      )}
    </div>
  );
}
