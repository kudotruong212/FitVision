// src/pages/WorkoutPlan.jsx
import React from "react";

export default function WorkoutPlan() {
  const [plan, setPlan] = React.useState(null);

  React.useEffect(() => {
    const raw = localStorage.getItem("fitvision_last_analysis");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.plan) {
        setPlan(parsed.plan);
      }
    } catch (e) {
      console.error("Không parse được last_analysis:", e);
    }
  }, []);

  if (!plan) {
    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold mb-2">Workout Plan cá nhân</h2>
        <p className="text-gray-300">
          Chưa có plan. Hãy vào tab <b>AI Scan</b>, phân tích cơ thể, sau đó quay
          lại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Workout Plan cá nhân</h2>
        <p className="text-gray-300">
          Kế hoạch được sinh tự động dựa trên kết quả AI Body Scan gần nhất.
        </p>
      </div>

      {/* Header info */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 grid md:grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-gray-400">Level</div>
          <div className="text-lg font-semibold text-white">
            {plan.level || "N/A"}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400">Buổi/tuần</div>
          <div className="text-lg font-semibold text-white">
            {plan.sessions_per_week || "N/A"}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400">Focus chính</div>
          <div className="text-sm text-emerald-300">
            {(plan.focus_areas || []).join(", ")}
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="space-y-4">
        {(plan.sessions || []).map((session, idx) => (
          <div
            key={idx}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700"
          >
            <h3 className="text-xl font-semibold mb-1">
              {session.title || `Buổi ${idx + 1}`}
            </h3>
            {session.focus && (
              <p className="text-sm text-gray-400 mb-2">
                Focus: {(session.focus || []).join(", ")}
              </p>
            )}

            <ul className="list-disc list-inside space-y-1 text-gray-200 text-sm">
              {(session.exercises || []).map((ex, i) => (
                <li key={i}>
                  <span className="font-medium">{ex.name}</span>{" "}
                  {ex.muscle_group && (
                    <span className="text-gray-400">
                      ({ex.muscle_group})
                    </span>
                  )}
                  {ex.sets && ex.reps && (
                    <span className="ml-2 text-emerald-300">
                      {ex.sets} x {ex.reps}
                    </span>
                  )}
                  {ex.notes && (
                    <span className="ml-2 text-gray-400">– {ex.notes}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <details className="mt-4">
        <summary className="text-sm text-gray-400 cursor-pointer">
          Xem JSON plan (debug)
        </summary>
        <pre className="mt-2 bg-slate-900 p-3 rounded text-xs overflow-x-auto">
          {JSON.stringify(plan, null, 2)}
        </pre>
      </details>
    </div>
  );
}
