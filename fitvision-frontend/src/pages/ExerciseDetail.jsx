// src/pages/ExerciseDetail.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import { fetchExerciseBySlug } from "../api/services/exerciseService.js";
import ExerciseViewer3D from "../components/ExerciseViewer3D";

export default function ExerciseDetail() {
  const { slug } = useParams();
  const [exercise, setExercise] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchExerciseBySlug(slug);
        setExercise(data);
      } catch (e) {
        console.error(e);
        setError("Không tải được chi tiết bài tập.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-400 text-sm">Đang tải chi tiết bài tập...</p>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-red-400 text-sm">{error || "Không có dữ liệu."}</p>
        <Link
          to="/exercises"
          className="text-emerald-400 text-sm underline"
        >
          ← Quay lại danh sách bài tập
        </Link>
      </div>
    );
  }

  const ex = exercise;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-1">{ex.name}</h2>
          <p className="text-sm text-gray-400">
            Nhóm cơ: <span className="text-emerald-300">{ex.muscle_group}</span>{" "}
            · Level: <span className="text-sky-300">{ex.level}</span> ·{" "}
            {ex.equipment}
          </p>
        </div>
        <Link
          to="/exercises"
          className="text-sm text-gray-300 hover:text-white underline"
        >
          ← Quay lại danh sách
        </Link>
      </div>

      {/* Viewer 3D */}
      <ExerciseViewer3D muscle_group={ex.muscle_group} />

      {/* Nội dung chi tiết */}
      <div className="grid md:grid-cols-[2fr,1fr] gap-6">
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">Mô tả</h3>
          <p className="text-gray-200 text-sm leading-relaxed">
            {ex.description ||
              "Bài tập này giúp tăng sức mạnh và cải thiện tư thế cho nhóm cơ liên quan."}
          </p>

          {ex.cues && ex.cues.length > 0 && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">
                Hướng dẫn & lưu ý
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
                {ex.cues.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Thumbnail / info phụ */}
        <div className="space-y-3">
          {ex.thumbnail_url && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <img
                src={ex.thumbnail_url}
                alt={ex.name}
                className="w-full h-40 object-cover"
              />
            </div>
          )}

          {ex.type && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-3 text-sm">
              <div className="text-gray-400">Loại bài tập</div>
              <div className="text-white font-semibold">{ex.type}</div>
            </div>
          )}

          {ex.video_url && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-3 text-sm">
              <div className="text-gray-400 mb-1">Video demo</div>
              <a
                href={ex.video_url}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 underline text-xs"
              >
                Xem video hướng dẫn
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
