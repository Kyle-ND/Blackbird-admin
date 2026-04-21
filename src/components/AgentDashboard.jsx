import React, { useState, useEffect } from "react";
import { LogOut, X, CalendarDays, ChevronDown } from "lucide-react";

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fixDecimalResponse = (text) => {
  try { return JSON.parse(text); }
  catch {
    const fixed = text
      .replace(/Decimal\('([\d.]+)'\)/g, '"$1"')
      .replace(/Decimal\("([\d.]+)"\)/g, '"$1"');
    return JSON.parse(fixed);
  }
};

// ── TIMEZONE HELPER: get SAST hour integer from UTC string ──
const getSASTHour = (utcString) => {
  return parseInt(
    new Date(utcString).toLocaleString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Johannesburg",
    }),
    10
  );
};

// ── TIMEZONE HELPER: format UTC string as SAST time display ──
const toSASTTime = (utcString) => {
  return new Date(utcString).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg",
  });
};

export default function AgentDashboard({ user, onLogout }) {
  const [bookings, setBookings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ── FIX: use SAST today key, not UTC ──
  const todayKey = new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Johannesburg",
  });

  const hours = Array.from({ length: 12 }, (_, i) => i + 9);

  useEffect(() => {
    const fetchBookings = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) { setError("Authentication required."); setLoading(false); return; }
      try {
        const res = await fetch("/proxy-api/agents/me/bookings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load appointments");
        const text = await res.text();
        const data = fixDecimalResponse(text);
        const grouped = data.reduce((acc, b) => {
          // ── FIX: group by SAST date, not UTC date ──
          const dateKey = new Date(b.start_time).toLocaleDateString("en-CA", {
            timeZone: "Africa/Johannesburg",
          });
          if (!acc[dateKey]) acc[dateKey] = [];
          const price = typeof b.total_price === "string" ? parseFloat(b.total_price) : b.total_price || 0;
          acc[dateKey].push({
            id: b.id,
            // ── FIX: display time in SAST ──
            time: toSASTTime(b.start_time),
            // ── FIX: hour in SAST for schedule grouping ──
            hour: getSASTHour(b.start_time),
            client: b.client.name,
            services: b.services.map(s => s.name),
            totalPrice: price,
            totalDuration: b.services.reduce((sum, s) => sum + s.duration_minutes, 0),
            status: b.status,
          });
          return acc;
        }, {});
        setBookings(grouped);
      } catch (err) {
        setError(err.message || "Failed to connect");
        setToast({ type: "error", message: err.message || "Failed to load appointments" });
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const todayBookings = (bookings[todayKey] || []).sort((a, b) => a.time.localeCompare(b.time));

  if (loading) return (
    <div className="min-h-screen bg-[#F8F6F2] flex items-center justify-center">
      <p className="text-xl text-[#985f99]/50">Loading...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F8F6F2] flex items-center justify-center">
      <p className="text-red-500 bg-white px-8 py-5 rounded-2xl shadow">{error}</p>
    </div>
  );

  const confirmedCount = todayBookings.filter(b => b.status === "confirmed").length;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        body { background: #F8F6F2; }
        .stat-card { background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,246,242,0.8) 100%); }
        * { font-family: 'DM Sans', sans-serif; }
        .serif { font-family: 'DM Serif Display', serif; }
      `}</style>

      <div className="min-h-screen bg-[#F8F6F2] text-[#2d1f2d]">

        {/* ── NAV ── */}
        <header className="fixed top-0 left-0 right-0 z-[100]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
            <div className="flex items-center justify-between bg-white/90 backdrop-blur-2xl border border-[#D4AF87]/20 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-lg">

              {/* Logo */}
              <div className="flex items-center gap-2 sm:gap-3">
                <h1 className="serif text-xl sm:text-2xl text-[#985f99] tracking-tight">blackbird</h1>
                <span className="hidden sm:block text-[10px] tracking-[4px] text-[#6B5E50] uppercase font-medium mt-0.5">Spa</span>
              </div>

              {/* Active nav pill */}
              <nav className="hidden md:flex items-center gap-1">
                <button className="px-4 py-2 rounded-xl text-sm font-medium bg-[#985f99]/15 text-[#985f99] border border-[#985f99]/20 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> Appointments
                </button>
              </nav>

              {/* Right side */}
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-sm text-[#6B5E50]/60 hidden lg:block">{user?.name}</span>

                {/* Mobile label */}
                <div className="relative md:hidden">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#985f99]/5 border border-[#D4AF87]/30 rounded-xl text-[#985f99] text-sm hover:bg-[#985f99]/10 transition-colors">
                    <CalendarDays className="w-4 h-4" />
                    <span>Menu</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-[#D4AF87]/20 rounded-2xl shadow-2xl overflow-hidden z-50">
                      <div className="px-5 py-3.5 flex items-center gap-3 text-sm bg-[#985f99]/10 text-[#985f99]">
                        <CalendarDays className="w-4 h-4" /> Appointments
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={onLogout}
                  className="p-2 rounded-xl bg-[#985f99]/5 hover:bg-red-50 border border-[#D4AF87]/30 text-[#6B5E50] hover:text-red-500 transition-all">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main className="pt-24 sm:pt-28 px-4 sm:px-6 pb-12">
          <div className="max-w-7xl mx-auto">

            {/* Page header */}
            <div className="mb-8">
              <p className="text-xs tracking-[4px] uppercase text-[#6B5E50]/60 mb-2">
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" })}
              </p>
              <h2 className="serif text-3xl sm:text-4xl text-[#985f99]">
                Hi, {user?.name}
              </h2>
            </div>

            {/* Stats row */}
            <div className="mb-8">
              <div className="stat-card border border-[#D4AF87]/20 rounded-2xl p-5 sm:p-7 shadow-sm inline-block">
                <p className="text-xs tracking-widest uppercase text-[#6B5E50]/50 mb-4">Today's Appointments</p>
                <p className="serif text-4xl sm:text-5xl text-[#985f99]">{confirmedCount}</p>
              </div>
            </div>

            {/* Schedule */}
            <div className="stat-card border border-[#D4AF87]/20 rounded-2xl shadow-sm overflow-hidden">
              {todayBookings.filter(b => b.status !== "cancelled").length === 0 ? (
                <div className="p-16 text-center text-[#6B5E50]/40 text-sm">
                  A quiet day in the sanctuary
                </div>
              ) : (
                <div className="divide-y divide-[#D4AF87]/10">
                  {hours.map(hour => {
                    const hourBookings = todayBookings.filter(b => b.hour === hour && b.status !== "cancelled");
                    if (hourBookings.length === 0) return null;
                    return (
                      <div key={hour} className="p-4 sm:p-5">
                        <p className="text-xs font-semibold tracking-widest uppercase text-[#6B5E50]/40 mb-3">
                          {hour.toString().padStart(2, "0")}:00
                        </p>
                        <div className="space-y-3">
                          {hourBookings.map(booking => (
                            <div key={booking.id}
                              className={`rounded-xl p-4 sm:p-5 border-l-4 bg-gradient-to-r from-white to-[#F8F6F2] shadow-sm ${
                                booking.status === "confirmed"
                                  ? "border-[#985f99]"
                                  : booking.status === "completed"
                                  ? "border-[#D4AF87] opacity-70"
                                  : "border-red-300 opacity-50"
                              }`}>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-3 mb-1">
                                    <span className="serif text-lg text-[#985f99]">{booking.time}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      booking.status === "confirmed" ? "bg-[#985f99]/10 text-[#985f99]"
                                      : booking.status === "completed" ? "bg-[#D4AF87]/20 text-[#6B5E50]"
                                      : "bg-red-50 text-red-400"
                                    }`}>
                                      {booking.status}
                                    </span>
                                  </div>
                                  <p className="font-medium text-[#985f99] truncate">{booking.client}</p>
                                  <p className="text-sm text-[#6B5E50]/60 mt-0.5 truncate">{booking.services.join(" · ")}</p>
                                </div>
                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0">
                                  <p className="font-semibold text-[#D4AF87]">R{booking.totalPrice.toFixed(2)}</p>
                                  <p className="text-xs text-[#6B5E50]/40">{booking.totalDuration} min</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </main>

        {/* ── TOAST ── */}
        {toast && (
          <div className={`fixed bottom-6 right-4 sm:right-8 px-5 py-3.5 rounded-2xl shadow-2xl z-[120] text-sm font-medium border flex items-center gap-3 ${
            toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : toast.type === "error" ? "bg-red-50 border-red-200 text-red-700"
            : "bg-[#985f99]/10 border-[#985f99]/20 text-[#985f99]"
          }`}>
            {toast.message}
            <button onClick={() => setToast(null)}><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
          </div>
        )}

      </div>
    </>
  );
}
