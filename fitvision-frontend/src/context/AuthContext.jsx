// src/context/AuthContext.jsx
import React from "react";
import { logoutUser, fetchProfile, verifyToken, setOnAuthError } from "../api/client";

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [profile, setProfile] = React.useState(null);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [profileOwnerId, setProfileOwnerId] = React.useState(null);

  // Setup callback cho axios interceptor
  React.useEffect(() => {
    setOnAuthError(() => {
      setUser(null);
      setProfile(null);
      setProfileOwnerId(null);
    });
  }, []);

  // Khi app load, verify token với backend
  React.useEffect(() => {
    async function validateAuth() {
      setAuthLoading(true);
      try {
        const raw = localStorage.getItem("fitvision_user");
        const token = localStorage.getItem("fitvision_token");
        
        if (!token || !raw) {
          setAuthLoading(false);
          return;
        }

        // Verify token với backend
        const result = await verifyToken();
        
        if (result.valid) {
          try {
            const parsed = JSON.parse(raw);
            setUser(parsed);
            if (parsed.profile) {
              setProfile(parsed.profile);
              setProfileOwnerId(parsed.id || parsed._id || null);
            }
          } catch (e) {
            console.error("Cannot parse fitvision_user:", e);
            logoutUser();
          }
        } else {
          // Token invalid, clear auth
          logoutUser();
        }
      } catch (error) {
        console.error("Token validation error:", error);
        logoutUser();
      } finally {
        setAuthLoading(false);
      }
    }

    validateAuth();
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
    // Clear all state before logout
    setUser(null);
    setProfile(null);
    setProfileOwnerId(null);
    
    // Clear auth (this will also clear localStorage cache)
    logoutUser();
    
    // Force reload to clear any component state
    // This ensures no cached data from previous user remains
    window.location.href = "/";
  }

  const value = {
    user,
    setUser,
    logout: handleLogout,
    isAuthenticated: !!user,
    authLoading,
    profile,
    profileLoading,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return React.useContext(AuthContext);
}
