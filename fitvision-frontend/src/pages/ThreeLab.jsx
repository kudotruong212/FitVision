// src/pages/ThreeLab.jsx
import React from "react";
import ExerciseViewer3D from "../components/ExerciseViewer3D";

export default function ThreeLab() {
  const [muscle, setMuscle] = React.useState("chest");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">3D Exercise Lab</h2>
        <p className="text-gray-300">
          Demo tích hợp Three.js / React Three Fiber. Sau này sẽ gắn model 3D từng bài tập
          (Plank, Squat, Face Pull, v.v.) vào đây.
        </p>
      </div>

      {/* Viewer */}
      <ExerciseViewer3D muscle_group={muscle} />

      {/* Controls */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-lg font-semibold mb-3">Chọn nhóm cơ demo</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            { value: "chest", label: "Ngực" },
            { value: "back", label: "Lưng" },
            { value: "legs", label: "Chân" },
            { value: "core", label: "Core" },
            { value: "shoulders", label: "Vai" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMuscle(opt.value)}
              className={
                "px-3 py-1 rounded-full border text-xs " +
                (muscle === opt.value
                  ? "bg-emerald-500 border-emerald-400 text-white"
                  : "bg-slate-900 border-slate-600 text-gray-200")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Màu của khối 3D phía trên thay đổi theo nhóm cơ được chọn. Sau này:
          <br />– thay box bằng model 3D của người thật (GLTF) <br />– highlight
          từng nhóm cơ theo plan của bạn.
        </p>
      </div>
    </div>
  );
}
