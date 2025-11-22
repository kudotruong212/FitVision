// src/pages/BodyScan.jsx
import React from "react";
import { analyzeBody, generateWorkoutPlan, saveScanSession } from "../api/client";

// =================== Helpers ===================

function getScoreLevel(score) {
  if (score >= 80) {
    return {
      label: "Rất tốt",
      colorClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    };
  }
  if (score >= 50) {
    return {
      label: "Ổn nhưng còn yếu",
      colorClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    };
  }
  return {
    label: "Cần cải thiện nhiều",
    colorClass: "bg-red-500/20 text-red-300 border-red-500/40",
  };
}

// Quota scan mỗi ngày (ví dụ 20 lần/ngày)
function canScanToday(maxScans = 20) {
  const key = "fitvision_scan_quota";
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(
      key,
      JSON.stringify({ date: today, count: 0, max: maxScans })
    );
    return { allowed: true, left: maxScans };
  }

  try {
    const data = JSON.parse(raw);
    if (data.date !== today) {
      localStorage.setItem(
        key,
        JSON.stringify({ date: today, count: 0, max: maxScans })
      );
      return { allowed: true, left: maxScans };
    }

    const left = data.max - data.count;
    return { allowed: left > 0, left };
  } catch (e) {
    console.error("Lỗi parse quota:", e);
    return { allowed: true, left: maxScans };
  }
}

function increaseScanCount() {
  const key = "fitvision_scan_quota";
  const today = new Date().toISOString().slice(0, 10);

  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(
      key,
      JSON.stringify({ date: today, count: 1, max: 20 })
    );
    return;
  }
  try {
    const data = JSON.parse(raw);
    if (data.date !== today) {
      localStorage.setItem(
        key,
        JSON.stringify({ date: today, count: 1, max: data.max || 20 })
      );
    } else {
      data.count = (data.count || 0) + 1;
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (e) {
    console.error("Lỗi update quota:", e);
  }
}

// =================== Component ===================

export default function BodyScan() {
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Vui lòng chọn một ảnh trước.");
      return;
    }

    // Check quota trước khi gọi OpenAI để tiết kiệm chi phí
    const quota = canScanToday(20); // 20 lượt/ngày
    if (!quota.allowed) {
      setError(
        "Bạn đã sử dụng hết lượt scan hôm nay. Vui lòng thử lại vào ngày mai."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      // 1) Gọi AI Body Scan (OpenAI Vision qua backend AI)
      const analysis = await analyzeBody(formData);

      // 2) Gọi backend sinh Workout Plan (nếu có)
      let plan = null;
      try {
        plan = await generateWorkoutPlan(analysis);
      } catch (e) {
        console.warn("Không tạo được workout plan:", e);
      }

      // 3) Tăng số lượt scan (chỉ tăng khi gọi AI thành công)
      increaseScanCount();

      // 4) Lưu lần gần nhất
      localStorage.setItem(
        "fitvision_last_analysis",
        JSON.stringify({ analysis, plan })
      );
      try {
        await saveScanSession(analysis, plan);
      } catch (e) {
        console.warn("Lưu history lên server thất bại (không nghiêm trọng):", e);
      }

      // 5) Append vào lịch sử
      const historyKey = "fitvision_history";
      const raw = localStorage.getItem(historyKey);
      const history = raw ? JSON.parse(raw) : [];

      const newEntry = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        analysis,
        plan,
      };

      history.unshift(newEntry);
      localStorage.setItem(historyKey, JSON.stringify(history));

      // 6) Hiển thị kết quả
      setResult(analysis);
    } catch (err) {
      console.error(err);
      setError("Có lỗi khi gọi AI phân tích.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">AI Body Scan</h2>
        <p className="text-gray-300">
          Tải lên 1 ảnh toàn thân (đứng thẳng) để AI phân tích tư thế &amp; gợi ý
          bài tập.
        </p>
      </div>

      <div className="grid md:grid-cols-[260px,1fr] gap-6 items-start">
        {/* Cột trái: upload + preview */}
        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-2 text-sm text-gray-300"
            />
          </div>

          {preview && (
            <div className="mt-2">
              <img
                src={preview}
                alt="preview"
                className="w-60 h-60 object-cover rounded-xl border border-slate-700"
              />
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 rounded text-white font-semibold w-full"
          >
            {loading ? "Đang phân tích..." : "Phân tích cơ thể"}
          </button>

          {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
        </div>

        {/* Cột phải: kết quả */}
        <div>
          {result ? (
            <div className="space-y-4">
              {/* Score + posture */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Score card */}
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col items-center justify-center">
                  <span className="text-sm text-gray-400 mb-2">
                    Điểm đánh giá
                  </span>
                  <div className="text-4xl font-extrabold text-emerald-400">
                    {result.score}
                  </div>
                  {(() => {
                    const level = getScoreLevel(result.score ?? 0);
                    return (
                      <span
                        className={
                          "mt-2 text-xs px-3 py-1 rounded-full border " +
                          level.colorClass
                        }
                      >
                        {level.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Posture card */}
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 md:col-span-2">
                  <h3 className="text-lg font-semibold mb-2">
                    Tư thế hiện tại
                  </h3>
                  <p className="text-gray-300">{result.posture}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Dựa trên ảnh bạn tải lên, AI đánh giá sơ bộ tư thế cơ thể
                    như trên.
                  </p>
                </div>
              </div>

              {/* Body shape / risk / notes (nếu có) */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-lg font-semibold mb-2">Body shape</h3>
                  <p className="text-gray-300">
                    {result.body_shape || "Chưa xác định"}
                  </p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-lg font-semibold mb-2">Risk level</h3>
                  <p className="text-gray-300">
                    {result.risk_level || "N/A"}
                  </p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <p className="text-gray-300 text-sm">
                    {result.notes || "Không có ghi chú đặc biệt."}
                  </p>
                </div>
              </div>

              {/* Weak muscles + fat area + recommendations */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Weak muscles */}
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-lg font-semibold mb-2">Nhóm cơ yếu</h3>
                  {result.weak_muscles && result.weak_muscles.length > 0 ? (
                    <ul className="list-disc list-inside text-gray-300 space-y-1">
                      {result.weak_muscles.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Chưa phát hiện nhóm cơ yếu cụ thể.
                    </p>
                  )}
                </div>

                {/* Fat area */}
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-lg font-semibold mb-2">
                    Vùng mỡ thừa nổi bật
                  </h3>
                  {result.fat_area ? (
                    <p className="text-gray-300">{result.fat_area}</p>
                  ) : (
                    <p className="text-gray-400 text-sm">Chưa xác định rõ.</p>
                  )}
                  {result.size_kb && (
                    <p className="mt-3 text-xs text-gray-500">
                      Ảnh tải lên: {result.filename} ({result.size_kb} KB)
                    </p>
                  )}
                </div>

                {/* Recommendations */}
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <h3 className="text-lg font-semibold mb-2">
                    Gợi ý tập luyện
                  </h3>
                  {result.recommendations &&
                  result.recommendations.length > 0 ? (
                    <ul className="list-disc list-inside text-gray-300 space-y-1 text-sm">
                      {result.recommendations.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Chưa có gợi ý, hãy thử lại với ảnh rõ hơn.
                    </p>
                  )}
                </div>
              </div>

              {/* JSON debug */}
              <details className="mt-4">
                <summary className="text-sm text-gray-400 cursor-pointer">
                  Xem JSON chi tiết (debug)
                </summary>
                <pre className="mt-2 bg-slate-900 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Kết quả phân tích sẽ hiển thị ở đây sau khi bạn tải ảnh và bấm
              <span className="font-semibold"> "Phân tích cơ thể"</span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
