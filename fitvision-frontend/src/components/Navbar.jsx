// src/components/Navbar.jsx
import { Link, NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home" },
  { to: "/scan", label: "AI Scan" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/plan", label: "Workout Plan" },
  { to: "/history", label: "History" },
  { to: "/coach", label: "AI Coach" },
  { to: "/exercises", label: "Exercises" },
  { to: "/3d-lab", label: "3D Lab" },
];

const linkBase =
  "px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200";

export default function Navbar() {
  return (
    <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      <Link to="/" className="font-bold text-xl text-emerald-400 tracking-tight">
        FitVision
      </Link>

      <div className="hidden lg:flex items-center gap-2 text-gray-300">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `${linkBase} ${
                isActive
                  ? "bg-emerald-500/20 text-white border border-emerald-500/40"
                  : "hover:text-white hover:bg-slate-800"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <NavLink
          to="/auth"
          className={({ isActive }) =>
            `${linkBase} hidden sm:inline-flex ${
              isActive ? "text-white" : "text-gray-300"
            }`
          }
        >
          Đăng nhập
        </NavLink>
        <Link
          to="/scan"
          className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-900 text-sm font-semibold shadow shadow-emerald-500/20"
        >
          Bắt đầu scan
        </Link>
      </div>
    </nav>
  );
}
