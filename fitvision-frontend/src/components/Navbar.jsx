// src/components/Navbar.jsx
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import React from "react";

const links = [
  { to: "/", label: "Home" },
  { to: "/scan", label: "AI Scan" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/plan", label: "Workout Plan" },
  { to: "/history", label: "History" },
  { to: "/coach", label: "AI Coach" },
  { to: "/exercises", label: "Exercises" },
  { to: "/3d-lab", label: "3D Lab" },
  { to: "/profile", label: "Profile" },
];

const linkBase =
  "px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  function handleLogout() {
    logout();
    navigate("/");
    setMobileMenuOpen(false);
  }

  return (
    <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <Link to="/" className="font-bold text-xl text-emerald-400 tracking-tight">
          FitVision
        </Link>

        {/* Desktop menu */}
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

        {/* Desktop auth section */}
        <div className="hidden lg:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `${linkBase} ${
                    isActive ? "text-white" : "text-gray-300"
                  }`
                }
              >
                {user?.name || user?.email || "Tài khoản"}
              </NavLink>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:bg-slate-800 transition-colors duration-200"
              >
                Đăng xuất
              </button>
              <Link
                to="/scan"
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-900 text-sm font-semibold shadow shadow-emerald-500/20"
              >
                Bắt đầu scan
              </Link>
            </>
          ) : (
            <>
              <NavLink
                to="/auth"
                className={({ isActive }) =>
                  `${linkBase} ${
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
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="lg:hidden flex items-center gap-3">
          <Link
            to="/scan"
            className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-900 text-xs font-semibold"
          >
            Scan
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-4 pb-4 border-t border-slate-800 pt-4">
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `${linkBase} ${
                    isActive
                      ? "bg-emerald-500/20 text-white border border-emerald-500/40"
                      : "text-gray-300 hover:text-white hover:bg-slate-800"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <>
                <div className="border-t border-slate-800 my-2" />
                <NavLink
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `${linkBase} ${
                      isActive ? "text-white" : "text-gray-300"
                    }`
                  }
                >
                  {user?.name || user?.email || "Tài khoản"}
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:bg-slate-800 transition-colors duration-200 text-left"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <div className="border-t border-slate-800 my-2" />
                <NavLink
                  to="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `${linkBase} ${
                      isActive ? "text-white" : "text-gray-300"
                    }`
                  }
                >
                  Đăng nhập
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
