// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar";
import Home from "./pages/Home";
import BodyScan from "./pages/BodyScan";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import WorkoutPlan from "./pages/WorkoutPlan";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto pt-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scan" element={<BodyScan />} />
          <Route path="/exercises" element={<ExerciseLibrary />} />
          <Route path="/plan" element={<WorkoutPlan />} />
        </Routes>
      </div>
    </div>
  );
}
