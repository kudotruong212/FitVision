// src/components/Navbar.jsx
import { Link, NavLink } from "react-router-dom";

const linkClass =
  "hover:text-white transition-colors px-2 py-1 rounded-md";

export default function Navbar() {
  return (
    <nav className="bg-slate-800 px-6 py-4 flex items-center justify-between shadow-md">
      <Link to="/" className="font-bold text-xl text-emerald-400">
        FitVision
      </Link>

      <div className="flex gap-4 text-gray-300">
        <NavLink to="/" className={linkClass}>
          Home
        </NavLink>
        <NavLink to="/scan" className={linkClass}>
          AI Scan
        </NavLink>
        <NavLink to="/exercises" className={linkClass}>
          Exercises
        </NavLink>
        <NavLink to="/plan" className={linkClass}>
          Workout Plan
        </NavLink>
      </div>
    </nav>
  );
}
