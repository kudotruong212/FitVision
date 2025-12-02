// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import RequireAuth from "./components/RequireAuth.jsx";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastProvider from "./components/ToastProvider";
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
import { ROUTES } from "./constants/routes.js";



export default function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900 text-white">
        <ToastProvider />
        <Navbar />
        <div className="max-w-5xl mx-auto pt-6">
          <Routes>
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route path={ROUTES.AUTH} element={<Auth />} />
          <Route path="/verify-email" element={<Auth />} />
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path={ROUTES.SCAN}
            element={
              <RequireAuth>
                <BodyScan />
              </RequireAuth>
            }
          />
          <Route path={ROUTES.EXERCISES} element={<Exercises />} />
          <Route path={ROUTES.EXERCISE_DETAIL} element={<ExerciseDetail />} />
          <Route
            path={ROUTES.PLAN}
            element={
              <RequireAuth>
                <WorkoutPlan />
              </RequireAuth>
            }
          />
          <Route
            path={ROUTES.HISTORY}
            element={
              <RequireAuth>
                <History />
              </RequireAuth>
            }
          />
          <Route
            path={ROUTES.COACH}
            element={
              <RequireAuth>
                <CoachChat />
              </RequireAuth>
            }
          />
          <Route
            path={ROUTES.PROFILE}
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path={ROUTES.ONBOARDING}
            element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            }
          />
          <Route path={ROUTES.THREE_LAB} element={<ThreeLab />} />
          </Routes>
        </div>
      </div>
    </ErrorBoundary>
  );
}
