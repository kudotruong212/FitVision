// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import RequireAuth from "./components/RequireAuth.jsx";
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
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";



export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto pt-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/scan"
            element={
              <RequireAuth>
                <BodyScan />
              </RequireAuth>
            }
          />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/exercises/:slug" element={<ExerciseDetail />} />
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
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            }
          />
          <Route path="/3d-lab" element={<ThreeLab />} />
        </Routes>
      </div>
    </div>
  );
}
