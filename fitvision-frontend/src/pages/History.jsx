// src/pages/History.jsx
import React from "react";
import {
  fetchScanHistory,
  fetchSignedScanImage,
  deleteScanSession,
} from "../api/services/scanService.js";
import BodyScanViewer3D from "../components/3d/BodyScanViewer3D.jsx";

const RISK_FILTERS = ["all", "low", "medium", "high"];
const SORTING = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "score", label: "Điểm cao nhất" },
];

export default function History() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [riskFilter, setRiskFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("newest");
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState([]);
  const [planPreview, setPlanPreview] = React.useState(null);
  const [deletingId, setDeletingId] = React.useState(null);

  React.useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchScanHistory(100);
      
      // Validate data structure
      if (!Array.isArray(data)) {
        console.warn("[SECURITY] Invalid history data received:", data);
        setError("Dữ liệu không hợp lệ từ server.");
        setItems([]);
        return;
      }
      
      // Validate each item has required fields
      const validItems = data.filter((item) => {
        if (!item || typeof item !== "object") {
          console.warn("[SECURITY] Invalid history item:", item);
          return false;
        }
        // Ensure item has _id (from server) or id (from local)
        if (!item._id && !item.id) {
          console.warn("[SECURITY] History item missing ID:", item);
          return false;
        }
        return true;
      });
      
      setItems(validItems);
      setSelected([]);
    } catch (e) {
      console.error(e);
      setError("Không tải được lịch sử từ server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm(
      "Bạn có chắc chắn muốn xóa bản scan này? Hành động không thể hoàn tác."
    );
    if (!confirmDelete) return;
    try {
      setDeletingId(id);
      await deleteScanSession(id);
      setItems((prev) => prev.filter((item) => item._id !== id));
      setSelected((prev) => prev.filter((pid) => pid !== id));
    } catch (err) {
      console.error(err);
      setError("Không xóa được bản ghi. Thử lại sau.");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = items
    .filter((item) => {
      const risk = (item.risk_level || item.analysis?.risk_level || "")
        .toString()
        .toLowerCase();
      const matchesRisk =
        riskFilter === "all" || risk.includes(riskFilter.toLowerCase());
      const matchesSearch =
        !search ||
        (item.posture || item.analysis?.posture || "")
          .toLowerCase()
          .includes(search.toLowerCase());
      return matchesRisk && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortBy === "score") {
        const scoreA = a.score ?? a.analysis?.score ?? 0;
        const scoreB = b.score ?? b.analysis?.score ?? 0;
        return scoreB - scoreA;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-300">
            Scan timeline
          </p>
          <h2 className="text-3xl font-bold mb-1">Lịch sử AI Body Scan</h2>
          <p className="text-gray-300 text-sm">
            Lọc theo risk level, so sánh giữa các phiên và mở workout plan tương
            ứng.
          </p>
        </div>
        <button
          onClick={loadHistory}
          className="px-3 py-2 rounded-xl border border-slate-600 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 grid md:grid-cols-[2fr,1fr] gap-4">
        <div className="flex flex-wrap gap-2">
          {RISK_FILTERS.map((rf) => (
            <button
              key={rf}
              onClick={() => setRiskFilter(rf)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                riskFilter === rf
                  ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/50"
                  : "text-gray-400 border-slate-700"
              }`}
            >
              {rf === "all" ? "Tất cả risk" : `Risk ${rf}`}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
            placeholder="Tìm posture, ví dụ: rounded shoulders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORTING.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <p className="text-gray-400 text-sm">Đang tải lịch sử...</p>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-gray-400 text-sm">
          Không tìm thấy bản ghi. Thử thay đổi bộ lọc hoặc thực hiện thêm AI
          Scan.
        </p>
      )}

      <div className="space-y-4">
        {filtered.map((item) => (
          <HistoryCard
            key={item._id}
            item={item}
            active={selected.includes(item._id)}
            onToggle={() => toggleSelect(item._id)}
            onOpenPlan={() => setPlanPreview(item.plan || item.analysis?.plan)}
            onDelete={() => handleDelete(item._id)}
            deleting={deletingId === item._id}
          />
        ))}
      </div>

      {selected.length > 0 && (
        <ComparisonPanel
          items={items.filter((it) => selected.includes(it._id))}
          onClear={() => setSelected([])}
        />
      )}

      {planPreview && (
        <PlanPreview plan={planPreview} onClose={() => setPlanPreview(null)} />
      )}
    </div>
  );

  function toggleSelect(id) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((pid) => pid !== id);
      }
      if (prev.length === 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  }
}

function HistoryCard({ item, active, onToggle, onOpenPlan, onDelete, deleting }) {
  const [signedUrl, setSignedUrl] = React.useState(
    item.signed_image_url || item.analysis?.signed_image_url || null
  );
  const imgUrl =
    signedUrl ||
    item.image_url ||
    item.analysis?.image_url ||
    null;

  React.useEffect(() => {
    let mounted = true;
    if (!signedUrl && item._id) {
      fetchSignedScanImage(item._id)
        .then((res) => {
          if (mounted && res?.url) {
            setSignedUrl(res.url);
          }
        })
        .catch((err) => {
          console.error("Fetch signed image failed:", err);
        });
    }
    return () => {
      mounted = false;
    };
  }, [signedUrl, item._id]);
  const score = item.score ?? item.analysis?.score ?? "N/A";
  const risk = item.risk_level ?? item.analysis?.risk_level ?? "N/A";
  const posture = item.posture ?? item.analysis?.posture ?? "N/A";
  const poseConfidence =
    item.pose_confidence ?? item.analysis?.pose_confidence ?? null;
  const poseWarning = item.pose_warning ?? item.analysis?.pose_warning ?? null;
  const scoreDelta =
    item.derived_metrics?.score_delta ??
    item.analysis?.derived_metrics?.score_delta ??
    null;
  const poseSymmetry =
    item.derived_metrics?.pose_symmetry ??
    item.analysis?.derived_metrics?.pose_symmetry ??
    null;

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        active
          ? "border-emerald-500/60 bg-emerald-500/5"
          : "border-slate-700 bg-slate-800"
      }`}
    >
      <div className="flex items-start gap-4">
        {imgUrl && (
          <img
            src={imgUrl}
            alt="scan"
            className="w-24 h-24 object-cover rounded-xl border border-slate-600"
          />
        )}

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-gray-400">
                {new Date(item.createdAt).toLocaleString()}
              </div>
              <div className="text-xl font-semibold">Score: {score}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onToggle}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  active
                    ? "bg-emerald-500 text-slate-900 border-emerald-500"
                    : "border-slate-700 text-gray-300"
                }`}
              >
                {active ? "Đang so sánh" : "So sánh"}
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="px-3 py-1.5 rounded-full text-xs border border-red-500/40 text-red-300 disabled:opacity-60"
              >
                {deleting ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-300">
            Posture: <span className="text-white">{posture}</span>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            {item.body_shape && <span>Body shape: {item.body_shape}</span>}
            {item.fat_area && <span>Vùng mỡ: {item.fat_area}</span>}
            <span
              className={`px-2 py-1 rounded-full border ${
                risk?.toLowerCase() === "high"
                  ? "border-red-500/40 text-red-300"
                  : risk?.toLowerCase() === "medium"
                  ? "border-amber-500/40 text-amber-300"
                  : "border-emerald-500/40 text-emerald-300"
              }`}
            >
              Risk: {risk}
            </span>
            {poseConfidence !== null && (
              <span className="px-2 py-1 rounded-full border border-slate-600 text-gray-300">
                Pose conf: {Math.round(poseConfidence * 100)}%
              </span>
            )}
            {poseSymmetry !== null && (
              <span className="px-2 py-1 rounded-full border border-slate-600 text-gray-300">
                Symmetry: {poseSymmetry}%
              </span>
            )}
            {scoreDelta !== null && (
              <span
                className={`px-2 py-1 rounded-full border ${
                  scoreDelta >= 0
                    ? "border-emerald-500/40 text-emerald-300"
                    : "border-amber-500/40 text-amber-300"
                }`}
              >
                Δ {scoreDelta} pts
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            {item.weak_muscles?.length > 0 && (
              <span className="text-gray-400">
                Cơ yếu: {item.weak_muscles.join(", ")}
              </span>
            )}
            {poseWarning && (
              <span className="text-amber-300">⚠ {poseWarning}</span>
            )}
            {item.plan && (
              <button
                onClick={onOpenPlan}
                className="text-emerald-300 hover:text-emerald-200 underline"
              >
                Xem workout plan
              </button>
            )}
          </div>

          <details className="mt-1 text-xs text-gray-400">
            <summary className="cursor-pointer">Xem JSON chi tiết</summary>
            <pre className="mt-2 bg-slate-900 p-3 rounded overflow-x-auto">
              {JSON.stringify(item, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

function ComparisonPanel({ items, onClear }) {
  const [show3D, setShow3D] = React.useState(false);
  
  if (items.length === 0) return null;

  // Get scan data for comparison
  const scan1 = items[0];
  const scan2 = items.length > 1 ? items[1] : null;
  
  const scan1Data = scan1.analysis || scan1;
  const scan2Data = scan2 ? (scan2.analysis || scan2) : null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">So sánh đã chọn ({items.length})</h3>
        <div className="flex gap-2">
          {scan2Data && (
            <button
              onClick={() => setShow3D(!show3D)}
              className="text-xs px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
            >
              {show3D ? "Ẩn 3D" : "Hiện 3D"}
            </button>
          )}
          <button
            onClick={onClear}
            className="text-xs text-gray-400 hover:text-white underline"
          >
            Xóa
          </button>
        </div>
      </div>

      {/* 3D Comparison */}
      {show3D && scan2Data && (
        <div className="mb-4">
          <BodyScanViewer3D
            scanData={scan1Data}
            comparisonData={scan2Data}
            showComparison={true}
            height="80"
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item._id} className="border border-slate-700 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">
              {new Date(item.createdAt).toLocaleString()}
            </p>
            <p className="text-xl font-semibold">
              Score: {item.score ?? item.analysis?.score ?? "N/A"}
            </p>
            <p className="text-sm text-gray-300">
              Posture: {item.posture ?? item.analysis?.posture ?? "N/A"}
            </p>
            {(
              item.pose_confidence ?? item.analysis?.pose_confidence
            ) != null && (
            <p className="text-xs text-gray-400">
                Pose conf:{" "}
                {Math.round(
                  (item.pose_confidence ?? item.analysis?.pose_confidence) * 100
                )}
                %
            </p>
          )}
            {(
              item.derived_metrics?.score_delta ??
              item.analysis?.derived_metrics?.score_delta
            ) != null && (
              <p className="text-xs text-gray-400">
                Δ{" "}
                {item.derived_metrics?.score_delta ??
                  item.analysis?.derived_metrics?.score_delta}{" "}
                pts
              </p>
            )}
            {item.plan && (
              <p className="text-xs text-gray-400 mt-1">
                Focus: {(item.plan.focus_areas || []).join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanPreview({ plan, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-end md:items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-t-3xl md:rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">
              Workout plan
            </p>
            <h3 className="text-2xl font-semibold">
              {plan.level || "Kế hoạch"} · {plan.sessions_per_week || "?"} buổi/tuần
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-emerald-300">
          {(plan.focus_areas || []).map((focus) => (
            <span
              key={focus}
              className="px-3 py-1 rounded-full border border-emerald-500/40"
            >
              {focus}
            </span>
          ))}
        </div>
        <div className="space-y-4">
          {(plan.sessions || []).map((session, idx) => (
            <div
              key={idx}
              className="border border-slate-700 rounded-2xl p-4 space-y-2 bg-slate-900/40"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">
                  {session.title || `Buổi ${idx + 1}`}
                </h4>
                <p className="text-xs text-gray-400">
                  {Array.isArray(session.focus)
                    ? session.focus.join(", ")
                    : session.focus}
                </p>
              </div>
              <ul className="text-sm text-gray-200 space-y-1">
                {(session.exercises || []).map((ex, i) => (
                  <li key={i}>
                    <span className="font-semibold">{ex.name}</span>{" "}
                    {ex.sets && ex.reps && (
                      <span className="text-emerald-300">
                        {ex.sets} x {ex.reps}
                      </span>
                    )}
                    {ex.notes && (
                      <span className="text-gray-400"> – {ex.notes}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}