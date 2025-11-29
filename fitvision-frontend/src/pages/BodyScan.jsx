// src/pages/BodyScan.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  analyzeBody,
  generateWorkoutPlan,
  saveScanSession,
  fetchScanQuota,
} from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

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

function validateImageQuality(file) {
  const sizeKB = Math.round(file.size / 1024);
  if (sizeKB < 80) {
    return { ok: false, message: "Ảnh quá nhỏ (<80KB). Hãy chụp ảnh rõ hơn." };
  }
  if (sizeKB > 8 * 1024) {
    return { ok: false, message: "Ảnh quá lớn (>8MB). Hãy nén hoặc chụp lại." };
  }
  return { ok: true, message: `Kích thước ảnh: ${sizeKB}KB` };
}

function getImageDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// =================== Component ===================

export default function BodyScan() {
  const { profile, profileLoading } = useAuth();
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const [latestPlan, setLatestPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [quotaInfo, setQuotaInfo] = React.useState({
    allowed: true,
    left: null,
    max: null,
    loading: true,
  });
  const [showGuide, setShowGuide] = React.useState(false);
  const [qualityNote, setQualityNote] = React.useState(null);
  const [imageMeta, setImageMeta] = React.useState(null);
  const [quotaMessage, setQuotaMessage] = React.useState(null);
  const [planStatus, setPlanStatus] = React.useState("idle"); // idle | loading | success | error
  const [planError, setPlanError] = React.useState(null);
  const profileReady = Boolean(profile && profile.goal);
  const profileSnapshot = profileReady ? profile : null;

  React.useEffect(() => {
    refreshQuota();
  }, []);

  async function refreshQuota() {
    try {
      setQuotaMessage(null);
      setQuotaInfo((prev) => ({ ...prev, loading: true }));
      const data = await fetchScanQuota();
      setQuotaInfo({ ...data, loading: false });
    } catch (err) {
      console.error(err);
      setQuotaMessage("Không tải được quota từ server.");
      setQuotaInfo((prev) => ({ ...prev, loading: false }));
    }
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setLatestPlan(null);
    setError(null);
    setPlanStatus("idle");
    setPlanError(null);

    const quality = validateImageQuality(f);
    setQualityNote(quality);
    getImageDimensions(f).then((meta) => {
      if (!meta) return;
      setImageMeta(meta);
      if (meta.height < 600 || meta.width < 400) {
        setQualityNote({
          ok: false,
          message: "Ảnh nên >= 400x600px để AI nhận diện pose rõ ràng.",
        });
      }
    });
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Vui lòng chọn một ảnh trước.");
      return;
    }

    if (qualityNote && !qualityNote.ok) {
      setError("Ảnh chưa đạt yêu cầu. Vui lòng chụp lại theo hướng dẫn.");
      return;
    }

    if (quotaInfo.loading) {
      setError("Đang kiểm tra quota. Vui lòng đợi vài giây.");
      return;
    }
    if (!quotaInfo.allowed) {
      setError("Bạn đã sử dụng hết lượt scan hôm nay.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLatestPlan(null);
    setPlanStatus("loading");
    setPlanError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      // 1) Gọi AI Body Scan (OpenAI Vision qua backend AI)
      const analysisResponse = await analyzeBody(formData);
      const { quota: serverQuota, ...analysis } = analysisResponse || {};
      if (serverQuota) {
        setQuotaInfo({ ...serverQuota, loading: false });
      }

      // 2) Gọi backend sinh Workout Plan (nếu có)
      let plan = null;
      try {
        plan = await generateWorkoutPlan(analysis, profileSnapshot);
        setPlanStatus("success");
        setLatestPlan(plan);
      } catch (e) {
        console.warn("Không tạo được workout plan:", e);
        setPlanStatus("error");
        setPlanError("Không tạo được kế hoạch tập luyện tự động. Hãy thử lại sau.");
      }

      // 3) Lưu lần gần nhất
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

      // 4) Hiển thị kết quả
      setResult(analysis);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 429) {
        const quota = err.response?.data?.quota;
        if (quota) {
          setQuotaInfo({ ...quota, loading: false });
        }
        setError(err.response?.data?.error || "Bạn đã hết lượt scan hôm nay.");
      } else {
        setError("Có lỗi khi gọi AI phân tích.");
      }
      setPlanStatus("idle");
      setPlanError(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-bold">AI Body Scan</h2>
          <span className="text-xs px-3 py-1 rounded-full border border-emerald-500/50 text-emerald-300">
            {quotaInfo.loading
              ? "Đang kiểm tra quota..."
              : quotaInfo.allowed
              ? `Còn ${quotaInfo.left}/${quotaInfo.max} lượt hôm nay`
              : "Đã hết lượt hôm nay"}
          </span>
          <button
            onClick={refreshQuota}
            className="text-xs text-gray-400 hover:text-white underline"
            type="button"
            disabled={quotaInfo.loading}
          >
            Làm mới
          </button>
        </div>
        <p className="text-gray-300 mt-1">
          Tải ảnh toàn thân đủ sáng, đứng thẳng. AI phân tích posture, nhóm cơ yếu và sinh workout plan.
        </p>
        <button
          onClick={() => setShowGuide(true)}
          className="mt-3 text-sm text-emerald-300 hover:text-emerald-200 underline"
        >
          Xem hướng dẫn chụp ảnh chuẩn →
        </button>
        {profileLoading && (
          <div className="mt-4 text-xs text-gray-300 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2">
            Đang tải hồ sơ mục tiêu...
          </div>
        )}
        {!profileLoading && !profileReady && (
          <div className="mt-4 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-3">
            ⚠ Bạn chưa cập nhật mục tiêu luyện tập. AI sẽ chính xác hơn nếu bạn
            bổ sung{" "}
            <Link to="/profile" className="underline font-semibold">
              hồ sơ mục tiêu
            </Link>{" "}
            trước khi scan.
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[320px,1fr] gap-6 items-start">
        {/* Cột trái: upload + preview */}
        <div className="space-y-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <label className="block text-sm font-semibold text-gray-200">
            1. Chọn ảnh toàn thân
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mt-1 text-sm text-gray-300"
          />

          {preview && (
            <div className="mt-2">
              <img
                src={preview}
                alt="preview"
                className="w-full h-72 object-cover rounded-xl border border-slate-700"
              />
              {imageMeta && (
                <p className="text-xs text-gray-400 mt-1">
                  Kích thước ảnh: {imageMeta.width}x{imageMeta.height}px
                </p>
              )}
            </div>
          )}

          {qualityNote && (
            <div
              className={`text-xs px-3 py-2 rounded-lg border ${
                qualityNote.ok
                  ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"
                  : "text-amber-300 border-amber-500/40 bg-amber-500/10"
              }`}
            >
              {qualityNote.message}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || quotaInfo.loading || !quotaInfo.allowed}
            className="mt-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 rounded-xl text-slate-900 font-semibold w-full"
          >
            {loading ? "Đang phân tích..." : "Phân tích cơ thể"}
          </button>

          {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
          {quotaMessage && (
            <div className="mt-1 text-xs text-amber-300">{quotaMessage}</div>
          )}

          <div className="text-xs text-gray-400 border-t border-slate-800 pt-3">
            Mẹo: hãy mặc đồ ôm, không che khớp, đứng cách camera 2m và giữ nền gọn gàng.
          </div>

          {planStatus === "loading" && (
            <div className="mt-3 text-xs px-3 py-2 rounded-lg border border-emerald-500/50 text-emerald-200 bg-emerald-500/10">
              Đang tạo kế hoạch tập luyện cá nhân…
            </div>
          )}
          {planStatus === "error" && planError && (
            <div className="mt-3 text-xs px-3 py-2 rounded-lg border border-amber-500/50 text-amber-200 bg-amber-500/10">
              {planError}
            </div>
          )}
          {planStatus === "success" && latestPlan && (
            <div className="mt-3 text-xs px-3 py-2 rounded-lg border border-emerald-500/50 text-emerald-200 bg-emerald-500/10">
              ✅ Plan mới đã sẵn sàng ({latestPlan.level}) – mở tab{" "}
              <Link to="/plan" className="underline font-semibold">
                Workout Plan
              </Link>{" "}
              để xem chi tiết.
            </div>
          )}
        </div>

        {/* Cột phải: kết quả */}
        <div>
          {result ? (
            <div className="space-y-4">
              {result.pose_warning && (
                <div className="bg-amber-500/10 border border-amber-500/40 text-amber-200 text-sm px-4 py-3 rounded-xl">
                  ⚠ {result.pose_warning}
                </div>
              )}
              {/* Score + posture */}
              <div className="grid md:grid-cols-4 gap-4">
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

                {/* Pose confidence */}
                <PoseConfidenceCard
                  confidence={result.pose_confidence}
                  points={result.pose_points}
                />

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
          ) : loading ? (
            <AnalysisSkeleton />
          ) : (
            <p className="text-gray-500 text-sm">
              Kết quả sẽ hiển thị tại đây sau khi bạn tải ảnh và bấm{" "}
              <span className="font-semibold">“Phân tích cơ thể”.</span>
            </p>
          )}
        </div>
      </div>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, idx) => (
          <div
            key={idx}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 animate-pulse h-32"
          />
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, idx) => (
          <div
            key={idx}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 animate-pulse h-40"
          />
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, idx) => (
          <div
            key={idx}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 animate-pulse h-40"
          />
        ))}
      </div>
    </div>
  );
}

function GuideModal({ onClose }) {
  const tips = [
    "Đứng cách camera 2–3 mét, bật đủ sáng và hướng thẳng.",
    "Giữ khung hình bao trọn đầu tới chân, tránh bị cắt tay.",
    "Mặc đồ ôm hoặc thể thao để AI thấy rõ đường cơ thể.",
    "Dùng chân máy hoặc đặt điện thoại cố định để không bị rung.",
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Hướng dẫn chụp ảnh chuẩn</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        <ul className="space-y-2 text-sm text-gray-300 list-disc list-inside">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-emerald-500 text-slate-900 font-semibold"
        >
          Đã hiểu
        </button>
      </div>
    </div>
  );
}

function PoseConfidenceCard({ confidence, points = [] }) {
  if (confidence == null) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col justify-center">
        <span className="text-sm text-gray-400 mb-1">Độ tin cậy pose</span>
        <p className="text-sm text-gray-500">
          Chưa có dữ liệu pose. Hãy thử lại với ảnh rõ hơn.
        </p>
      </div>
    );
  }

  const percentage = Math.round(confidence * 100);
  const strong = percentage >= 70;
  const medium = percentage >= 50 && percentage < 70;
  const levelClass = strong
    ? "text-emerald-300"
    : medium
    ? "text-amber-300"
    : "text-red-300";

  const highlight = (points || []).slice(0, 4);

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <span className="text-sm text-gray-400">Độ tin cậy pose</span>
      <div className={`text-3xl font-extrabold ${levelClass}`}>{percentage}%</div>
      <p className="text-[11px] text-gray-500">
        Trung bình visibility của {points?.length || 0} landmarks.
      </p>
      {highlight.length > 0 && (
        <div className="mt-2 text-[10px] text-gray-400 space-y-1">
          {highlight.map((pt, idx) => (
            <div key={idx}>
              #{idx + 1}: ({pt.x}, {pt.y}) · vis {pt.visibility}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
