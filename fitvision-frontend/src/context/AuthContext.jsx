// src/context/AuthContext.jsx
import React from "react";
import { logoutUser } from "../api/client";

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);

  // Khi app load, lấy user từ localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("fitvision_user");
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Cannot parse fitvision_user:", e);
    }
  }, []);

  function handleLogout() {
    logoutUser();
    setUser(null);
  }

  const value = {
    user,
    setUser,
    logout: handleLogout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
