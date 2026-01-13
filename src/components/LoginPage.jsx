// src/components/LoginPage.jsx
import React, { useState } from "react";
import LandingPage from "./LandingPage";

const images = ["/assets/spa-img.jpg", "/assets/spaa.jpg", "/assets/spaaa.jpg"];

export default function LoginPage({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: formData.get("username"),
          password: formData.get("password"),
        }).toString(),
      });

      if (!response.ok) {
        const err = await response.json();
        const message =
          Array.isArray(err.detail)
            ? err.detail.map((d) => d.msg).join(", ")
            : err.detail || "Login failed";
        throw new Error(message);
      }

      const data = await response.json();
      const token = data.access_token;
      localStorage.setItem("access_token", token);

      const payload = JSON.parse(atob(token.split(".")[1]));
      const role = payload.role || "agent";
      const name = payload.name || payload.email?.split("@")[0] || "User";

      const formattedName = name
        .split(" ")
        .map((n) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
        .join(" ");

      onLogin(role, formattedName);
    } catch (err) {
      setError(err.message || "Network error – is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Inter:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      <div className="h-screen w-screen flex bg-[#F8F6F2] font-['Inter'] overflow-hidden">

        {/* LEFT SIDE */}
        <div className="w-full md:w-1/2 flex flex-col justify-between items-center px-8 py-6">

          {/* Logo + Welcome */}
          <div className="text-center flex flex-col items-center">
            <img
              src="/assets/logo.png"
              alt="Logo"
              className="w-40 mx-auto mb-4"
            />
            <p className="text-[#8A7D6F] text-lg">Welcome back</p>
          </div>

          {/* FORM */}
          <div className="max-w-md w-full">
            <form onSubmit={handleSubmit} className="space-y-6">

              <div>
                <label className="block text-[#985f99] font-medium mb-3 text-lg">
                  Email
                </label>
                <input
                  name="username"
                  type="email"
                  required
                  disabled={loading}
                  className="w-full px-6 py-5 rounded-2xl border border-[#D4AF87]/30 bg-white/80
                             backdrop-blur-sm focus:outline-none focus:ring-4
                             focus:ring-[#985f99]/30 transition-all text-[#985f99]
                             placeholder-[#8A7D6F]/70 text-lg"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-[#985f99] font-medium mb-3 text-lg">
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  disabled={loading}
                  className="w-full px-6 py-5 rounded-2xl border border-[#D4AF87]/30 bg-white/80
                             backdrop-blur-sm focus:outline-none focus:ring-4
                             focus:ring-[#985f99]/30 transition-all text-[#985f99]
                             placeholder-[#8A7D6F]/70 text-lg"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="bg-red-50/80 backdrop-blur text-red-700 p-5 rounded-2xl text-center font-medium border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-[#985f99] text-white text-xl font-medium rounded-2xl
                           hover:bg-[#7d4f80] transition-all duration-300 shadow-lg hover:shadow-xl
                           disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Enter Sanctuary"}
              </button>
            </form>
          </div>

          {/* FOOTER TEXT */}
          <p className="text-center text-[#8A7D6F] text-sm mb-4">
            A moment of peace awaits you
          </p>

        </div>

        {/* RIGHT SIDE IMAGE CAROUSEL — NO OVERLAY */}
        <div className="hidden md:block w-1/2 relative overflow-hidden">
          <LandingPage images={images} autoplay />
        </div>

      </div>
    </>
  );
}
