// src/pages/BodyScan.jsx
import React from "react";
import { analyzeBody } from "../api/client";

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
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const data = await analyzeBody(formData);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Có lỗi khi gọi AI phân tích.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Tiêu đề & mô tả */}
      <div>
        <h2 className="text-3xl font-bold mb-2">AI Body Scan</h2>
        <p className="text-gray-300">
          Tải lên 1 ảnh toàn thân (đứng thẳng) để AI phân tích tư thế & gợi ý bài tập.
        </p>
      </div>

      <div className="grid md:grid-cols-[260px,1fr] gap-6 items-start">
        {/* Cột trái: upload + preview + button */}
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

          {error && (
            <div className="mt-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Cột phải: kết quả phân tích */}
        <div>
          {result ? (
            <div className="space-y-4">
              {/* Hàng trên: điểm số + tư thế */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Card điểm số */}
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

                {/* Card tư thế */}
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

              {/* Hàng dưới: cơ yếu + vùng mỡ thừa + gợi ý */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Cơ yếu */}
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

                {/* Vùng mỡ thừa */}
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

                {/* Gợi ý tập luyện */}
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
