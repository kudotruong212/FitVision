// src/pages/WorkoutPlan.jsx
import React from "react";
import { Link } from "react-router-dom";
import { fetchScanHistory } from "../api/client";

export default function WorkoutPlan() {
  const [history, setHistory] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [focusFilter, setFocusFilter] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchScanHistory(50);
      setHistory(data || []);
      const latestWithPlan = data?.find((item) => item.plan);
      if (latestWithPlan) {
        setSelectedId(latestWithPlan._id);
      } else {
        const local = localStorage.getItem("fitvision_last_analysis");
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.plan) {
            setHistory([
              {
                _id: "local-plan",
                createdAt: new Date().toISOString(),
                plan: parsed.plan,
                score: parsed.analysis?.score ?? null,
              },
            ]);
            setSelectedId("local-plan");
          }
        }
      }
    } catch (e) {
      console.error(e);
      setError("Không tải được kế hoạch.");
    } finally {
      setLoading(false);
    }
  }

  const plans = history.filter((item) => item.plan);
  const selectedPlan = plans.find((p) => p._id === selectedId)?.plan;
  const focusOptions = Array.from(
    new Set(plans.flatMap((p) => p.plan?.focus_areas || []))
  );

  if (!loading && plans.length === 0) {
    return (
      <div className="p-6 space-y-3">
        <h2 className="text-3xl font-bold">Workout Plan cá nhân</h2>
        <p className="text-gray-300">
          Chưa có plan. Hãy vào tab <b>AI Scan</b>, phân tích cơ thể, sau đó quay lại đây.
        </p>
        <Link
          to="/scan"
          className="inline-flex px-4 py-2 rounded-xl bg-emerald-500 text-slate-900 text-sm font-semibold"
        >
          Thực hiện AI Scan
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-300">
            Personalized coach
          </p>
          <h2 className="text-3xl font-bold">Workout Plan cá nhân</h2>
          <p className="text-gray-300 text-sm">
            Chọn plan theo từng lần scan, lọc focus area và mở bài tập liên quan.
          </p>
        </div>
        <button
          onClick={loadPlans}
          className="px-3 py-2 rounded-xl border border-slate-600 text-sm"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {loading && <p className="text-gray-400 text-sm">Đang tải...</p>}

      <div className="grid lg:grid-cols-[280px,1fr] gap-6">
        <aside className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Danh sách plan</p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {plans.map((entry) => (
                <button
                  key={entry._id}
                  onClick={() => setSelectedId(entry._id)}
                  className={`w-full text-left px-3 py-2 rounded-xl border text-sm ${
                    selectedId === entry._id
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 text-gray-300 hover:border-emerald-500/40"
                  }`}
                >
                  <div className="font-semibold">
                    {entry.plan?.level || "Plan"}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                  {entry.score && (
                    <div className="text-xs text-gray-400">
                      Score: {entry.score}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {focusOptions.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase mb-2">Lọc theo focus</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    focusFilter === "all"
                      ? "border-emerald-500/50 text-emerald-200 bg-emerald-500/10"
                      : "border-slate-700 text-gray-400"
                  }`}
                  onClick={() => setFocusFilter("all")}
                >
                  Tất cả
                </button>
                {focusOptions.map((focus) => (
                  <button
                    key={focus}
                    className={`px-3 py-1.5 rounded-full text-xs border ${
                      focusFilter === focus
                        ? "border-emerald-500/50 text-emerald-200 bg-emerald-500/10"
                        : "border-slate-700 text-gray-400"
                    }`}
                    onClick={() => setFocusFilter(focus)}
                  >
                    {focus}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="space-y-6">
          {selectedPlan ? (
            <>
              <header className="bg-slate-800 rounded-2xl p-5 border border-slate-700 grid md:grid-cols-3 gap-4">
                <InfoBlock label="Level" value={selectedPlan.level} />
                <InfoBlock
                  label="Buổi/tuần"
                  value={selectedPlan.sessions_per_week}
                />
                <InfoBlock
                  label="Focus chính"
                  value={(selectedPlan.focus_areas || []).join(", ")}
                />
              </header>

              <div className="space-y-4">
                {(selectedPlan.sessions || [])
                  .filter((session) => {
                    if (focusFilter === "all") return true;
                    const focus = Array.isArray(session.focus)
                      ? session.focus
                      : [session.focus];
                    return focus.some((f) =>
                      (f || "").toLowerCase().includes(focusFilter.toLowerCase())
                    );
                  })
                  .map((session, idx) => (
                    <SessionCard key={idx} session={session} index={idx} />
                  ))}
              </div>

              <details className="mt-4">
                <summary className="text-sm text-gray-400 cursor-pointer">
                  Xem JSON plan (debug)
                </summary>
                <pre className="mt-2 bg-slate-900 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedPlan, null, 2)}
                </pre>
              </details>
            </>
          ) : (
            <p className="text-gray-400 text-sm">
              Hãy chọn một plan ở cột bên trái để xem chi tiết.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-400 uppercase">{label}</div>
      <div className="text-lg font-semibold text-white">
        {value || "—"}
      </div>
    </div>
  );
}

function SessionCard({ session, index }) {
  const focusTags = Array.isArray(session.focus)
    ? session.focus
    : session.focus
    ? [session.focus]
    : [];
  const blocks = Array.isArray(session.blocks) ? session.blocks : [];
  const exercises = Array.isArray(session.exercises) ? session.exercises : [];

  return (
    <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          {session.title || `Buổi ${index + 1}`}
        </h3>
        <div className="flex flex-wrap gap-2">
          {focusTags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900/60 border border-slate-600 text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      {blocks.length > 0 ? (
        <div className="space-y-3">
          {blocks.map((block, idx) => (
            <div
              key={idx}
              className="border border-slate-700 rounded-xl p-3 bg-slate-900/30 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  {block.title || `Block ${idx + 1}`}
                </p>
                {block.duration && (
                  <span className="text-xs text-gray-400">
                    ⏱ {block.duration}
                  </span>
                )}
              </div>
              {block.description && (
                <p className="text-xs text-gray-400">{block.description}</p>
              )}
              <ExerciseList exercises={block.exercises || []} />
            </div>
          ))}
        </div>
      ) : (
        <ExerciseList exercises={exercises} />
      )}
    </div>
  );
}

function ExerciseList({ exercises }) {
  if (!exercises || exercises.length === 0) {
    return <p className="text-sm text-gray-400">Chưa có bài tập cụ thể.</p>;
  }

  return (
      <ul className="space-y-2 text-sm text-gray-200">
      {exercises.map((ex, i) => (
          <li
          key={`${ex.name}-${i}`}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-slate-700 rounded-xl px-3 py-2 bg-slate-900/40 gap-2"
          >
          <div className="space-y-1">
            <div>
              {ex.slug ? (
                <Link
                  to={`/exercises/${ex.slug}`}
                  className="font-semibold text-emerald-300 hover:underline"
                >
                  {ex.name}
                </Link>
              ) : (
                <span className="font-semibold">{ex.name}</span>
              )}
              {ex.muscle_group && (
                <span className="ml-2 text-xs text-gray-400">
                  ({ex.muscle_group})
                </span>
              )}
              {ex.type && (
                <span className="ml-2 text-[11px] text-gray-500 uppercase">
                  {ex.type}
                </span>
              )}
            </div>
            {ex.notes && (
              <p className="text-xs text-gray-400">{ex.notes}</p>
            )}
            {ex.equipment && (
              <p className="text-[11px] text-gray-500">
                Dụng cụ: {ex.equipment}
              </p>
            )}
            {ex.duration && !ex.sets && !ex.reps && (
              <p className="text-[11px] text-gray-500">⏱ {ex.duration}</p>
            )}
            {ex.tempo && (
              <p className="text-[11px] text-gray-500">Tempo: {ex.tempo}</p>
            )}
          </div>
          <div className="text-sm text-emerald-300 text-right">
              {ex.sets && ex.reps ? (
                <>
                  {ex.sets} x {ex.reps}
                </>
              ) : (
              ex.sets || ex.reps || ex.hold || ""
              )}
            </div>
          </li>
        ))}
      </ul>
  );
}
