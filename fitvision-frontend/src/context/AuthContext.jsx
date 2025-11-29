// src/context/AuthContext.jsx
import React from "react";
import { logoutUser, fetchProfile } from "../api/client";

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [profile, setProfile] = React.useState(null);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileOwnerId, setProfileOwnerId] = React.useState(null);

  // Khi app load, lấy user từ localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("fitvision_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        if (parsed.profile) {
          setProfile(parsed.profile);
          setProfileOwnerId(parsed.id || parsed._id || null);
        }
      }
    } catch (e) {
      console.error("Cannot parse fitvision_user:", e);
    }
  }, []);

  const refreshProfile = React.useCallback(async () => {
    if (!user?.id) return null;
    setProfileLoading(true);
    try {
      const data = await fetchProfile();
      setProfile(data);
      setProfileOwnerId(user.id);
      setUser((prev) => (prev ? { ...prev, profile: data } : prev));
      try {
        const storedRaw = localStorage.getItem("fitvision_user");
        if (storedRaw) {
          const stored = JSON.parse(storedRaw);
          stored.profile = data;
          localStorage.setItem("fitvision_user", JSON.stringify(stored));
        }
      } catch (storageErr) {
        console.error("Cannot persist profile:", storageErr);
      }
      return data;
    } catch (err) {
      console.error("Cannot load profile:", err);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      setProfileOwnerId(null);
      return;
    }
    if (profileOwnerId === user.id) return;
    refreshProfile();
  }, [user?.id, profileOwnerId, refreshProfile]);

  function handleLogout() {
    logoutUser();
    setUser(null);
    setProfile(null);
    setProfileOwnerId(null);
  }

  const value = {
    user,
    setUser,
    logout: handleLogout,
    isAuthenticated: !!user,
    profile,
    profileLoading,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
