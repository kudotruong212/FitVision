import React from "react";
import { exercises } from "../data/exercises";

export default function Exercises() {
  const [filter, setFilter] = React.useState("all");

  const muscles = [
    "all",
    "upper back",
    "posture",
    "core",
    "core stability",
    "legs"
  ];

  const filtered =
    filter === "all"
      ? exercises
      : exercises.filter((ex) => ex.muscle === filter);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">Exercise Library</h2>
      <p className="text-gray-300 mb-6">
        Danh sách bài tập Gym/Yoga có thể dùng trong kế hoạch tập luyện của bạn.
      </p>

      {/* Bộ lọc nhóm cơ */}
      <div className="flex flex-wrap gap-3 mb-6">
        {muscles.map((m) => (
          <button
            key={m}
            onClick={() => setFilter(m)}
            className={`px-4 py-2 rounded ${
              filter === m
                ? "bg-emerald-500 text-white"
                : "bg-slate-700 text-gray-300"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Danh sách bài tập */}
      <div className="grid md:grid-cols-3 gap-6">
        {filtered.map((ex) => (
          <div
            key={ex.id}
            className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-500 transition"
          >
            <img src={ex.image} alt={ex.name} className="w-full h-44 object-cover" />

            <div className="p-4">
              <h3 className="text-lg font-semibold">{ex.name}</h3>
              <p className="text-sm text-gray-400">{ex.muscle}</p>
              <p className="mt-3 text-sm text-emerald-400 font-semibold">
                {ex.sets}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
