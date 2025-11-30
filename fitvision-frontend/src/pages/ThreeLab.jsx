// src/pages/ThreeLab.jsx
// 3D Lab demo page showcasing all 3D viewers

import React from "react";
import ExerciseViewer3D from "../components/3d/ExerciseViewer3D";
import BodyScanViewer3D from "../components/3d/BodyScanViewer3D";
import WorkoutPlanViewer3D from "../components/3d/WorkoutPlanViewer3D";
import SimpleGLBViewer from "../components/3d/SimpleGLBViewer";
import { MUSCLE_GROUPS } from "../data/muscleData.js";

export default function ThreeLab() {
  const [activeTab, setActiveTab] = React.useState("exercise");
  const [muscle, setMuscle] = React.useState("chest");
  const [exerciseSlug, setExerciseSlug] = React.useState("squat");

  // Mock scan data for demo
  const mockScanData = {
    score: 75,
    weak_muscles: ["back", "core"],
    fat_area: "abdomen",
    pose_confidence: 0.85,
    pose_symmetry: 0.78,
  };

  // Mock workout plan for demo
  const mockPlan = {
    level: "intermediate",
    sessions_per_week: 4,
    focus_areas: ["back", "core", "legs"],
    sessions: [
      {
        title: "Upper Body Focus",
        focus: ["back", "shoulders"],
        exercises: [
          { name: "Seated Row", slug: "seated-row", sets: "3", reps: "10-12" },
          { name: "Face Pull", slug: "face-pull", sets: "3", reps: "12-15" },
        ],
      },
      {
        title: "Core & Legs",
        focus: ["core", "legs"],
        exercises: [
          { name: "Plank", slug: "plank", sets: "3", reps: "30-45s" },
          { name: "Goblet Squat", slug: "goblet-squat", sets: "3", reps: "10-12" },
        ],
      },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-emerald-300 mb-1">
          3D Visualization Lab
        </p>
        <h2 className="text-3xl font-bold mb-2">3D Exercise Lab</h2>
        <p className="text-gray-300 text-sm">
          Demo tích hợp Three.js / React Three Fiber. Test các tính năng 3D visualization:
          exercise animation, body scan highlighting, và workout plan visualization.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab("exercise")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "exercise"
              ? "border-emerald-500 text-emerald-300"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
        >
          Exercise Viewer
        </button>
        <button
          onClick={() => setActiveTab("bodyscan")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "bodyscan"
              ? "border-emerald-500 text-emerald-300"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
        >
          Body Scan Viewer
        </button>
        <button
          onClick={() => setActiveTab("workout")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "workout"
              ? "border-emerald-500 text-emerald-300"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
        >
          Workout Plan Viewer
        </button>
        <button
          onClick={() => setActiveTab("simple")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "simple"
              ? "border-emerald-500 text-emerald-300"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
        >
          Simple GLB Viewer (Test)
        </button>
      </div>

      {/* Exercise Viewer Tab */}
      {activeTab === "exercise" && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold mb-3">Exercise Animation Demo</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">
                Chọn nhóm cơ:
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(MUSCLE_GROUPS)
                  .filter(([key]) => key !== "default")
                  .map(([key, group]) => (
                    <button
                      key={key}
                      onClick={() => setMuscle(key)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        muscle === key
                          ? "bg-emerald-500 border-emerald-400 text-white"
                          : "bg-slate-900 border-slate-600 text-gray-200 hover:border-emerald-500/40"
                      }`}
                    >
                      {group.name}
                    </button>
                  ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">
                Chọn bài tập (demo):
              </label>
              <select
                value={exerciseSlug}
                onChange={(e) => setExerciseSlug(e.target.value)}
                className="w-full md:w-auto bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="squat">Squat</option>
                <option value="push-up">Push-up</option>
                <option value="plank">Plank</option>
              </select>
            </div>
          </div>

          <ExerciseViewer3D
            exerciseSlug={exerciseSlug}
            muscle_group={muscle}
            modelUrl={exerciseSlug === "squat" ? "/models/exercises/squat.glb" : null}
            height="80"
            showControls={true}
            autoPlay={false}
            stepByStep={false}
          />

          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-sm text-gray-300">
            <p className="font-semibold mb-2">Tính năng:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Animation động tác bài tập (play/pause/reset)</li>
              <li>Điều chỉnh tốc độ animation</li>
              <li>Highlight nhóm cơ được target</li>
              <li>Hỗ trợ GLTF models hoặc primitive shapes</li>
            </ul>
          </div>
        </div>
      )}

      {/* Body Scan Viewer Tab */}
      {activeTab === "bodyscan" && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold mb-3">Body Scan Visualization Demo</h3>
            <p className="text-sm text-gray-300">
              Hiển thị kết quả body scan với highlight vùng cơ yếu và vùng mỡ.
            </p>
          </div>

          <BodyScanViewer3D
            scanData={mockScanData}
            height="80"
            showComparison={false}
          />

          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-sm text-gray-300">
            <p className="font-semibold mb-2">Tính năng:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Highlight vùng cơ yếu với pulse animation</li>
              <li>Highlight vùng mỡ thừa</li>
              <li>Hiển thị score, pose confidence, và symmetry</li>
              <li>So sánh trước/sau (side-by-side mode)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Workout Plan Viewer Tab */}
      {activeTab === "workout" && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold mb-3">Workout Plan Visualization Demo</h3>
            <p className="text-sm text-gray-300">
              Hiển thị các nhóm cơ trong workout plan với color coding theo intensity.
            </p>
          </div>

          <WorkoutPlanViewer3D
            plan={mockPlan}
            height="80"
            selectedMuscleGroup={null}
          />

          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-sm text-gray-300">
            <p className="font-semibold mb-2">Tính năng:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Visualize focus areas và muscle groups</li>
              <li>Color coding theo intensity/priority</li>
              <li>Interactive: click muscle group để filter exercises</li>
              <li>Hiển thị plan level và sessions per week</li>
            </ul>
          </div>
        </div>
      )}

      {/* Simple GLB Viewer Tab - Chỉ để test hiển thị model */}
      {activeTab === "simple" && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-lg font-semibold mb-3">Simple GLB Viewer (Test Only)</h3>
            <p className="text-sm text-gray-300">
              Component đơn giản nhất để test hiển thị GLB file. Không có logic phức tạp.
            </p>
          </div>

          <SimpleGLBViewer modelUrl="/models/exercises/squat.glb" />

          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-sm text-gray-300">
            <p className="font-semibold mb-2">Component này:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Chỉ load và hiển thị GLB file</li>
              <li>Không có animation logic</li>
              <li>Không có controller phức tạp</li>
              <li>Chỉ để test xem model có hiển thị được không</li>
            </ul>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-xs text-gray-400">
        <p className="font-semibold text-gray-300 mb-2">Lưu ý:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Các model 3D hiện tại sử dụng primitive shapes. Để sử dụng GLTF models thật, thêm
            file .glb/.gltf vào thư mục <code className="bg-slate-900 px-1 rounded">public/models/</code> và
            truyền <code className="bg-slate-900 px-1 rounded">modelUrl</code> prop.
          </li>
          <li>
            Performance: Các component tự động optimize với LOD và culling. Trên mobile, một số
            effects có thể được giảm tự động.
          </li>
          <li>
            Controls: Click và drag để rotate, scroll để zoom, right-click để pan (nếu enabled).
          </li>
        </ul>
      </div>
    </div>
  );
}
