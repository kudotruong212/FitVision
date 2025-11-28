// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar";

import Home from "./pages/Home";
import BodyScan from "./pages/BodyScan";
import WorkoutPlan from "./pages/WorkoutPlan";
import Exercises from "./pages/Exercises";
import History from "./pages/History";
import CoachChat from "./pages/CoachChat";
import Auth from "./pages/Auth";

import RequireAuth from "./components/RequireAuth"; // 👈 thêm dòng này

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto pt-6">
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />

          {/* PROTECTED ROUTES – bắt buộc login */}
          <Route
            path="/scan"
            element={
              <RequireAuth>
                <BodyScan />
              </RequireAuth>
            }
          />
          <Route
            path="/exercises"
            element={
              <RequireAuth>
                <Exercises />
              </RequireAuth>
            }
          />
          <Route
            path="/plan"
            element={
              <RequireAuth>
                <WorkoutPlan />
              </RequireAuth>
            }
          />
          <Route
            path="/history"
            element={
              <RequireAuth>
                <History />
              </RequireAuth>
            }
          />
          <Route
            path="/coach"
            element={
              <RequireAuth>
                <CoachChat />
              </RequireAuth>
            }
          />
        </Routes>
      </div>
    </div>
  );
}
