// src/components/LoginPage.jsx
import React, { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { API_BASE } from "../lib/api";

/** Left panel: the salon's own nail-art line drawing (public/assets/nail-art.png) on the plum wall. */
function Wall({ className = "", compact = false }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#a673a7] via-plum to-[#6f4374] ${className}`} aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,.14),transparent_60%)]" />
      {compact ? (
        // Small screens: a wide band cropped onto the nails, drawing pinned to the right
        <img src="/assets/nail-art.png" alt="" className="absolute right-[-6%] sm:right-[8%] md:right-[14%] top-[-8%] h-[150%] sm:h-[145%] w-auto max-w-none drop-shadow-[0_12px_20px_rgba(26,17,32,.25)]" />
      ) : (
        <img src="/assets/nail-art.png" alt="" className="absolute inset-0 w-full h-full object-contain object-center p-[6%] drop-shadow-[0_18px_30px_rgba(26,17,32,.25)]" />
      )}
      <p className={`absolute serif italic text-white/85 tracking-wide ${compact ? "left-5 bottom-4 text-base" : "bottom-6 left-0 right-0 text-center text-lg"}`}>Black Bird Beauty Spa</p>
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [help, setHelp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.target);
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: String(formData.get("username") || "").trim(), password: String(formData.get("password") || "") }).toString(),
      });
      let data = null;
      try { data = await response.json(); } catch { data = null; }
      if (!response.ok) {
        const message = Array.isArray(data?.detail) ? data.detail.map((d) => d.msg).join(", ") : data?.detail || (response.status === 429 ? "Too many attempts. Please wait a few minutes." : "Sign-in failed");
        throw new Error(message);
      }
      localStorage.setItem("access_token", data.access_token);
      onLogin({ id: data.agent_id, role: data.role, name: data.name, email: formData.get("username") });
    } catch (err) {
      setError(err.message || "Network error – is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-white">
      <Wall className="hidden lg:block" />

      <main className="flex flex-col" id="main">
        <Wall compact className="lg:hidden h-48 sm:h-56 w-full shrink-0" />
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 py-10">
        <div className="w-full max-w-md mx-auto animate-rise">
          <img src="/assets/logo-mark.png" alt="Black Bird Beauty Spa" className="h-14 w-auto mb-10" width={118} height={56} />

          <p className="bb-kicker mb-2">Staff sign-in</p>
          <h1 className="serif text-4xl text-ink mb-2">Welcome back</h1>
          <p className="text-muted mb-8">Front desk, manager and technician dashboards.</p>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form" noValidate>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="login-email">Email</label>
              <input id="login-email" name="username" type="email" autoComplete="username" required disabled={loading}
                className="bb-input !py-3.5 bg-cream" placeholder="you@blackbirdspa.co.za" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="login-password">Password</label>
              <div className="relative">
                <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required disabled={loading}
                  className="bb-input !py-3.5 bg-cream pr-12" placeholder="Your password" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted hover:text-plum hover:bg-plum/5">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="bg-berry/10 text-berry p-3.5 rounded-xl text-sm font-medium border border-berry/25 animate-rise">{error}</div>
            )}

            <button type="submit" disabled={loading} className="bb-btn-primary w-full py-3.5 text-base">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-sm">
            <button type="button" onClick={() => setHelp((v) => !v)} aria-expanded={help} className="text-plum hover:underline font-medium">Forgot your password?</button>
            {help && (
              <p className="mt-2 text-muted animate-rise" role="status">
                Ask the manager or front desk to reset it from <strong>Technicians → Password</strong>. You'll get a temporary password you can change from your dashboard.
              </p>
            )}
          </div>

          <p className="mt-12 text-xs text-muted">Staff use only. Sessions sign out automatically after 12 hours.</p>
        </div>
        </div>
      </main>
    </div>
  );
}
