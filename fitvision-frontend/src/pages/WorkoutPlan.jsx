// src/pages/WorkoutPlan.jsx
import React from "react";

export default function WorkoutPlan() {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    const raw = localStorage.getItem("fitvision_last_analysis");
    if (raw) {
      try {
        setData(JSON.parse(raw));
      } catch (e) {
        console.error("Cannot parse stored plan", e);
      }
    }
  }, []);

  if (!data) {
    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold mb-2">Workout Plan</h2>
        <p className="text-gray-300">
          Chưa có kế hoạch nào. Hãy vào mục <span className="font-semibold">AI Scan</span>,
          tải lên ảnh cơ thể và để AI phân tích trước nhé.
        </p>
      </div>
    );
  }

  const { analysis, plan } = data;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Workout Plan cá nhân</h2>
        <p className="text-gray-300">
          Kế hoạch được sinh tự động dựa trên kết quả AI Body Scan gần nhất.
        </p>
      </div>

      {/* Thông tin tổng quan */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 grid md:grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-gray-400">Level</div>
          <div className="text-xl font-semibold capitalize">
            {plan.level}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400">Buổi/tuần</div>
          <div className="text-xl font-semibold">
            {plan.sessions_per_week}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400">Focus chính</div>
          <div className="text-sm text-gray-200">
            {plan.focus_areas && plan.focus_areas.length > 0
              ? plan.focus_areas.join(", ")
              : "Full body"}
          </div>
        </div>
      </div>

      {/* Danh sách buổi tập */}
      <div className="space-y-4">
        {plan.sessions.map((s, idx) => (
          <div
            key={idx}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">
                {s.day} – {s.focus}
              </h3>
            </div>
            <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
              {s.exercises.map((ex, i) => (
                <li key={i}>
                  <span className="font-semibold">{ex.name}</span>
                  {ex.sets && (
                    <span className="ml-1">
                      – {ex.sets}
                      {ex.reps && ` x ${ex.reps}`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Thêm block nhỏ hiển thị lại tư thế */}
      <details className="mt-4">
        <summary className="text-sm text-gray-400 cursor-pointer">
          Xem lại kết quả AI Body Scan
        </summary>
        <pre className="mt-2 bg-slate-900 p-3 rounded text-xs overflow-x-auto">
          {JSON.stringify(analysis, null, 2)}
        </pre>
      </details>
    </div>
  );
}
