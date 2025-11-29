// src/pages/Exercises.jsx
import React from "react";
import { fetchExercises } from "../api/services/exerciseService.js";
import { Link } from "react-router-dom";


const MUSCLE_OPTIONS = [
  { value: "", label: "Tất cả nhóm cơ" },
  { value: "chest", label: "Ngực" },
  { value: "back", label: "Lưng" },
  { value: "legs", label: "Chân" },
  { value: "core", label: "Core" },
  { value: "shoulders", label: "Vai" },
];

const LEVEL_OPTIONS = [
  { value: "", label: "Mọi level" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function Exercises() {
  const [exercises, setExercises] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [muscle, setMuscle] = React.useState("");
  const [level, setLevel] = React.useState("");

  React.useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises(opts = {}) {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchExercises(opts);
      setExercises(data || []);
    } catch (e) {
      console.error(e);
      setError("Không tải được danh sách bài tập.");
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(newMuscle, newLevel) {
    setMuscle(newMuscle);
    setLevel(newLevel);
    loadExercises({ muscle: newMuscle, level: newLevel });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Thư viện bài tập</h2>
        <p className="text-gray-300">
          Danh sách các bài tập gợi ý theo tư thế, nhóm cơ và mục tiêu của bạn.
          Sau này có thể gắn 3D/Video demo từng động tác.
        </p>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-wrap gap-4 bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Nhóm cơ
          </label>
          <select
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            value={muscle}
            onChange={(e) => handleFilterChange(e.target.value, level)}
          >
            {MUSCLE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Level
          </label>
          <select
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            value={level}
            onChange={(e) => handleFilterChange(muscle, e.target.value)}
          >
            {LEVEL_OPTIONS.map((lv) => (
              <option key={lv.value} value={lv.value}>
                {lv.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Nội dung */}
      {loading && (
        <p className="text-sm text-gray-400">Đang tải danh sách bài tập...</p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && exercises.length === 0 && (
        <p className="text-sm text-gray-400">
          Không tìm thấy bài tập phù hợp với filter hiện tại.
        </p>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {exercises.map((ex) => (
          <ExerciseCard key={ex._id || ex.slug} ex={ex} />
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({ ex }) {
  return (
    <Link
      to={`/exercises/${ex.slug}`}
      className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col hover:border-emerald-500/70 transition-colors"
    >
      {ex.thumbnail_url && (
        <div className="h-40 bg-slate-900 overflow-hidden">
          <img
            src={ex.thumbnail_url}
            alt={ex.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold mb-1">{ex.name}</h3>
        <div className="text-xs text-gray-400 mb-2">
          Nhóm cơ: <span className="text-emerald-300">{ex.muscle_group}</span> ·
          Level: <span className="text-sky-300">{ex.level}</span> ·{" "}
          {ex.equipment}
        </div>

        <p className="text-sm text-gray-300 flex-1">
          {ex.description ||
            "Bài tập này giúp bạn cải thiện sức mạnh và tư thế."}
        </p>

        {ex.cues && ex.cues.length > 0 && (
          <ul className="mt-2 text-xs text-gray-400 list-disc list-inside space-y-1">
            {ex.cues.slice(0, 2).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}

        <div className="mt-3 text-xs text-emerald-400">
          Xem chi tiết & 3D →
        </div>
      </div>
    </Link>
  );
}
