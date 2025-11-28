// src/components/ExerciseViewer3D.jsx
import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage } from "@react-three/drei";

function MuscleDummy({ color = "hotpink" }) {
  // Một khối box đơn giản tượng trưng cho cơ thể / nhóm cơ
  return (
    <mesh>
      <boxGeometry args={[1, 2, 0.5]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// map nhóm cơ -> màu, sau này có thể thay bằng nhiều model khác nhau
const MUSCLE_COLOR_MAP = {
  chest: "#f97373",
  back: "#60a5fa",
  legs: "#4ade80",
  core: "#fbbf24",
  shoulders: "#a855f7",
  default: "#a3a3a3",
};

export default function ExerciseViewer3D({ muscle_group = "default" }) {
  const color = MUSCLE_COLOR_MAP[muscle_group] || MUSCLE_COLOR_MAP.default;

  return (
    <div className="w-full h-64 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      <Canvas camera={{ position: [3, 3, 3], fov: 45 }}>
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 5, 15]} />

        <Stage environment={null} intensity={0.7}>
          <MuscleDummy color={color} />
        </Stage>

        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}
