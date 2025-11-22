import React from "react";
import axios from "axios";
import { API_BASE } from "../api/client";

export default function History() {
  const [items, setItems] = React.useState([]);

  React.useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const res = await axios.get(`${API_BASE}/api/history/all`);
      setItems(res.data);
    } catch (e) {
      console.warn("Không load được history từ server:", e);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold">Lịch sử AI Body Scan</h2>

      {items.length === 0 ? (
        <p className="text-gray-400">Chưa có dữ liệu nào.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-slate-800 p-4 rounded-xl border border-slate-700"
            >
              <div className="text-sm text-gray-400">
                {new Date(item.createdAt).toLocaleString()}
              </div>
              <div className="text-white font-semibold mt-2">
                Score: {item.analysis?.score}
              </div>
              <div className="text-gray-300">
                Posture: {item.analysis?.posture}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
