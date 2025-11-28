// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import BodyScan from "./pages/BodyScan";
import WorkoutPlan from "./pages/WorkoutPlan";
import Exercises from "./pages/Exercises";
import History from "./pages/History";
import CoachChat from "./pages/CoachChat";
import Auth from "./pages/Auth";
import ThreeLab from "./pages/ThreeLab";
import ExerciseDetail from "./pages/ExerciseDetail";
import Dashboard from "./pages/Dashboard";



export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto pt-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scan" element={<BodyScan />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/exercises/:slug" element={<ExerciseDetail />} />
          <Route path="/plan" element={<WorkoutPlan />} />
          <Route path="/history" element={<History />} />
          <Route path="/coach" element={<CoachChat />} />
          <Route path="/3d-lab" element={<ThreeLab />} />
        </Routes>
      </div>
    </div>
  );
}
