// src/App.jsx
import React, { useCallback, useEffect, useState } from "react";
import LoginPage from "./components/LoginPage";
import ReceptionistDashboard from "./components/ReceptionistDashboard";
import AgentDashboard from "./components/AgentDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import { api, getToken, isTokenExpired } from "./lib/api";
import ProgressBar from "./components/shared/ProgressBar";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  // Admins can switch between the manager view and the front-desk view.
  const [adminView, setAdminView] = useState(() => localStorage.getItem("bb:adminView") || "manager");

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    setUser(null);
  }, []);

  // Validate the stored token against the API on load (roles / status may have changed).
  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      localStorage.removeItem("access_token");
      setChecking(false);
      return;
    }
    api("/me")
      .then((me) => setUser({ id: me.id, role: me.role, name: me.name, email: me.email }))
      .catch(() => localStorage.removeItem("access_token"))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    window.addEventListener("bb:unauthorized", logout);
    return () => window.removeEventListener("bb:unauthorized", logout);
  }, [logout]);

  const handleLogin = (profile) => setUser(profile);

  const switchAdminView = (view) => {
    localStorage.setItem("bb:adminView", view);
    setAdminView(view);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="serif text-2xl text-plum animate-pulse">blackbird</p>
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  if (user.role === "agent") return <AgentDashboard user={user} onLogout={logout} />;

  if (user.role === "receptionist") return <ReceptionistDashboard user={user} onLogout={logout} />;

  if (user.role === "admin") {
    return adminView === "frontdesk" ? (
      <ReceptionistDashboard user={user} onLogout={logout} onSwitchView={() => switchAdminView("manager")} />
    ) : (
      <ManagerDashboard user={user} onLogout={logout} onSwitchView={() => switchAdminView("frontdesk")} />
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center flex-col gap-4">
      <div className="text-xl text-berry">Unknown role: {user.role}</div>
      <button onClick={logout} className="px-4 py-2 rounded-xl bg-plum text-white">Sign out</button>
    </div>
  );
}
