import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, CalendarDays, LogOut, Search, UserPlus, Trash2, Undo2,
  X, Edit3, UserCog, Check, ChevronLeft, ChevronRight, Calendar,
  Scissors, ChevronDown,
} from "lucide-react";

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

// ── TIMEZONE HELPER: convert SAST date+time input to UTC ISO string ──
// User types times in SAST (UTC+2), backend expects UTC
const sastInputToUTC = (dateStr, timeStr) => {
  // Build a date string treating the input as SAST (UTC+2)
  // by manually subtracting 2 hours
  const sastDateTime = new Date(`${dateStr}T${timeStr}:00`);
  // Subtract 2 hours to get UTC
  const utcDateTime = new Date(sastDateTime.getTime() - (2 * 60 * 60 * 1000));
  return utcDateTime.toISOString();
};

// ─── Shared style tokens (mirror manager) ───────────────────────────────────
const S = {
  card: "bg-white border border-[#D4AF87]/20 rounded-2xl shadow-sm",
  inputClass: "w-full px-4 py-3 rounded-xl bg-[#F8F6F2] border border-[#D4AF87]/30 text-[#2d1f2d] placeholder-[#6B5E50]/40 focus:outline-none focus:border-[#985f99]/40 transition-colors text-sm",
  btnPrimary: "flex-1 py-3 bg-[#985f99] hover:bg-[#985f99]/90 text-white rounded-xl font-medium transition-colors text-sm",
  btnSecondary: "flex-1 py-3 bg-[#F8F6F2] hover:bg-[#f0ebe3] border border-[#D4AF87]/30 text-[#6B5E50] rounded-xl font-medium transition-colors text-sm",
  modalOverlay: "fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[130] p-4",
  modalBox: "bg-white border border-[#D4AF87]/20 rounded-3xl p-8 w-full shadow-2xl max-h-[90vh] overflow-y-auto",
  label: "block text-xs font-semibold tracking-widest uppercase text-[#6B5E50]/50 mb-2",
};

export default function ReceptionistDashboard({ user, onLogout }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTech, setSelectedTech] = useState("");
  const [availableTechs, setAvailableTechs] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [bookings, setBookings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState("schedule");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Modals
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [deletedBooking, setDeletedBooking] = useState(null);
  const [undoTimeout, setUndoTimeout] = useState(null);

  // Form states
  const [clientSearch, setClientSearch] = useState("");
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [newTech, setNewTech] = useState({ name: "", email: "", password: "", specialization: "" });
  const [bookingForm, setBookingForm] = useState({
    clientId: null, clientName: "", selectedServices: [],
    technician: "", time: "", date: formatDateKey(new Date()),
  });
  const [editingBooking, setEditingBooking] = useState(null);

  const navItems = [
    { mode: "schedule", label: "Schedule", icon: CalendarDays },
    { mode: "monthly", label: "Monthly", icon: Calendar },
    { mode: "services", label: "Services", icon: Scissors },
    { mode: "agents", label: "Technicians", icon: UserCog },
  ];

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) { setError("No authentication token."); setLoading(false); return; }
      try {
        const [sRes, aRes, cRes, bRes] = await Promise.all([
          fetch("/proxy-api/services/", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/proxy-api/agents/", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/proxy-api/clients/", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/proxy-api/bookings/", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (sRes.ok) {
          const d = await sRes.json();
          setServices(d.map(s => ({ id: s.id, name: s.name, price: parseFloat(s.price), duration: s.duration_minutes, category: s.category || "General" })));
        }
        if (aRes.ok) {
          const d = await aRes.json();
          setAvailableTechs(d.map(a => ({ ...a, active_status: a.active_status ?? true })));
        }
        if (cRes.ok) setClients(await cRes.json());
        if (bRes.ok) {
          const text = await bRes.text();
          const data = fixDecimalResponse(text);
          if (Array.isArray(data)) {
            const grouped = data.reduce((acc, b) => {
              // Group by SAST date, not UTC date
              const sastDateKey = new Date(b.start_time).toLocaleDateString("en-CA", {
                timeZone: "Africa/Johannesburg",
              });
              if (!acc[sastDateKey]) acc[sastDateKey] = [];
              const price = typeof b.total_price === "string" ? parseFloat(b.total_price) : b.total_price || 0;
              acc[sastDateKey].push({
                id: b.id,
                start_time: b.start_time,
                // Display time in SAST
                time: toSASTTime(b.start_time),
                // Hour in SAST for schedule grouping
                hour: getSASTHour(b.start_time),
                client: b.client.name, clientId: b.client.id,
                services: b.services.map(s => s.name),
                technician: b.agent?.name || "Auto-Assigned",
                technicianId: b.agent?.id,
                totalPrice: price,
                totalDuration: b.services.reduce((sum, s) => sum + s.duration_minutes, 0),
                status: b.status,
              });
              return acc;
            }, {});
            setBookings(grouped);
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return [];
    return clients.filter(c =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.includes(clientSearch)
    );
  }, [clientSearch, clients]);

  const totalPrice = bookingForm.selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = bookingForm.selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const selectedDateKey = formatDateKey(selectedDate);

  const selectedBookings = useMemo(() => {
    return (bookings[selectedDateKey] || [])
      .filter(b => !selectedTech || b.technician === selectedTech)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [bookings, selectedDateKey, selectedTech]);

  const groupedServices = useMemo(() => {
    return services.reduce((acc, s) => {
      const cat = s.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    }, {});
  }, [services]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 9);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const changeDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
    setBookingForm(p => ({ ...p, date: formatDateKey(d) }));
  };

  const resetForm = () => {
    setBookingForm({ clientId: null, clientName: "", selectedServices: [], technician: "", time: "", date: formatDateKey(selectedDate) });
    setEditingBooking(null);
    setClientSearch("");
  };

  const selectClient = (client) => {
    setBookingForm(p => ({ ...p, clientId: client.id, clientName: client.name }));
    setClientSearch("");
  };

  const toggleService = (service) => {
    setBookingForm(p => ({
      ...p,
      selectedServices: p.selectedServices.some(s => s.id === service.id)
        ? p.selectedServices.filter(s => s.id !== service.id)
        : [...p.selectedServices, service],
    }));
  };

  const addClient = async () => {
    if (!newClient.name.trim() || !newClient.phone.trim()) return showToast("error", "Name and phone required");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch("/proxy-api/clients/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newClient.name.trim(), phone: newClient.phone.trim(), email: newClient.email.trim() || null }),
      });
      if (res.ok) {
        const client = await res.json();
        setClients(p => [...p, client]);
        setBookingForm(p => ({ ...p, clientId: client.id, clientName: client.name }));
        setNewClient({ name: "", phone: "", email: "" });
        setShowClientModal(false);
        setClientSearch("");
        showToast("success", "Client added");
      } else {
        const err = await res.json();
        showToast("error", err.detail || "Failed to add client");
      }
    } catch { showToast("error", "Network error"); }
  };

  const addTechnician = async () => {
    const { name, email, password, specialization } = newTech;
    if (!name.trim() || !email.trim() || !password.trim()) return showToast("error", "Name, email and password required");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch("/proxy-api/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, specialization: specialization.trim() || null, active_status: true, role: "agent" }),
      });
      if (!res.ok) { const e = await res.json(); showToast("error", e.detail || "Failed to add technician"); return; }
      const agent = await res.json();
      setAvailableTechs(p => [...p, { ...agent, active_status: true }]);
      setNewTech({ name: "", email: "", password: "", specialization: "" });
      setShowTechModal(false);
      showToast("success", "Technician added");
    } catch { showToast("error", "Network error"); }
  };

  const confirmBooking = async (e) => {
    e.preventDefault();
    if (!bookingForm.clientId || bookingForm.selectedServices.length === 0 || !bookingForm.time) {
      return showToast("error", "Please select client, service(s), and time");
    }
    const token = localStorage.getItem("access_token");

    // ── FIX: User enters time in SAST (UTC+2). Convert to UTC for the backend
    // by subtracting 2 hours. The backend stores and expects UTC.
    // e.g. user picks 12:00 SAST → we send 10:00 UTC → backend stores 10:00 UTC
    //      → toSASTTime() displays it back as 12:00 ✓
    const utcStartTime = sastInputToUTC(bookingForm.date, bookingForm.time);

    const payload = {
      client_id: bookingForm.clientId,
      start_time: utcStartTime,
      services: bookingForm.selectedServices.map(s => ({ service_id: s.id })),
      agent_id: (() => {
        if (!bookingForm.technician || bookingForm.technician === "auto" || bookingForm.technician === "") return null;
        const tech = availableTechs.find(t => t.name === bookingForm.technician);
        return tech ? tech.id : null;
      })(),
    };
    try {
      const res = await fetch("/proxy-api/bookings/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        let errDetail;
        try { const e = fixDecimalResponse(text); errDetail = e.detail || e.message || "Unknown error"; } catch { errDetail = text || "Failed"; }
        if (errDetail.includes("not available")) showToast("error", "Agent not available at this time.");
        else if (errDetail.includes("No agents")) showToast("error", "No agents available. Try a different time.");
        else showToast("error", errDetail);
        return;
      }
      const text = await res.text();
      const data = fixDecimalResponse(text);
      if (!data || !data.id) { showToast("error", "Invalid response"); return; }
      const formatted = {
        id: data.id,
        start_time: data.start_time,
        // Display confirmed booking time in SAST
        time: toSASTTime(data.start_time),
        hour: getSASTHour(data.start_time),
        client: data.client?.name || bookingForm.clientName,
        clientId: data.client?.id || bookingForm.clientId,
        services: data.services ? data.services.map(s => s.name) : bookingForm.selectedServices.map(s => s.name),
        technician: data.agent?.name || "Auto-Assigned",
        technicianId: data.agent?.id,
        totalPrice: typeof data.total_price === "string" ? parseFloat(data.total_price) : data.total_price || 0,
        totalDuration: data.services ? data.services.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) : totalDuration,
        status: data.status || "confirmed",
      };
      // Group new booking under its SAST date
      const sastDateKey = new Date(data.start_time).toLocaleDateString("en-CA", {
        timeZone: "Africa/Johannesburg",
      });
      setBookings(prev => {
        const day = prev[sastDateKey] || [];
        return { ...prev, [sastDateKey]: [...day, formatted].sort((a, b) => a.time.localeCompare(b.time)) };
      });
      setConfirmedBooking({ ...formatted, autoAssigned: !data.agent?.id });
      setShowConfirmation(true);
      setShowBookingModal(false);
      resetForm();
      showToast("success", "Booking confirmed");
    } catch (err) { showToast("error", `Booking failed: ${err.message}`); }
  };

  const deleteBooking = async (booking) => {
    const bookingDateKey = Object.entries(bookings).find(([, list]) => list.some(b => b.id === booking.id))?.[0];
    if (!bookingDateKey) return showToast("error", "Booking not found");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`/proxy-api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
      setDeletedBooking({ booking, dateKey: bookingDateKey });
      setBookings(prev => ({ ...prev, [bookingDateKey]: prev[bookingDateKey].map(b => b.id === booking.id ? { ...b, status: "cancelled" } : b) }));
      clearTimeout(undoTimeout);
      setUndoTimeout(setTimeout(() => setDeletedBooking(null), 5000));
      showToast("info", "Booking cancelled");
    } catch (err) { showToast("error", `Failed: ${err.message}`); }
  };

  const undoDelete = async () => {
    if (!deletedBooking) return;
    const { booking, dateKey } = deletedBooking;
    const token = localStorage.getItem("access_token");
    try {
      await fetch(`/proxy-api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "confirmed" }),
      });
      setBookings(prev => ({ ...prev, [dateKey]: prev[dateKey].map(b => b.id === booking.id ? { ...b, status: "confirmed" } : b) }));
      setDeletedBooking(null);
      showToast("success", "Undo successful");
    } catch { showToast("error", "Failed to undo"); }
  };

  const openEdit = (booking) => {
    const selected = services.filter(s => booking.services.includes(s.name));
    setEditingBooking(booking);
    setBookingForm({
      clientId: booking.clientId, clientName: booking.client,
      selectedServices: selected,
      technician: booking.technician === "Auto-Assigned" ? "auto" : booking.technician,
      // booking.time is already SAST display (e.g. "12:00") — correct for the time input
      time: booking.time.slice(0, 5),
      date: selectedDateKey,
    });
    setShowBookingModal(true);
  };

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

  const viewLabel = navItems.find(n => n.mode === viewMode)?.label;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        body { background: #F8F6F2; }
        .stat-card { background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,246,242,0.8) 100%); }
        .glow-dot { box-shadow: 0 0 8px currentColor; }
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

              {/* Desktop nav pills */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map(({ mode, label }) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${viewMode === mode ? "bg-[#985f99]/15 text-[#985f99] border border-[#985f99]/20" : "text-[#6B5E50] hover:text-[#985f99] hover:bg-[#985f99]/5"}`}>
                    {label}
                  </button>
                ))}
              </nav>

              {/* Right side */}
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-sm text-[#6B5E50]/60 hidden lg:block">{user?.name}</span>

                {/* New booking button */}
                <button onClick={() => setShowBookingModal(true)}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#985f99] text-white rounded-xl text-sm font-medium hover:bg-[#985f99]/90 transition-all shadow-sm">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Booking</span>
                </button>

                {/* Mobile menu */}
                <div className="relative md:hidden">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#985f99]/5 border border-[#D4AF87]/30 rounded-xl text-[#985f99] text-sm hover:bg-[#985f99]/10 transition-colors">
                    Menu <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-[#D4AF87]/20 rounded-2xl shadow-2xl overflow-hidden z-50">
                      {navItems.map(({ mode, label, icon: Icon }) => (
                        <button key={mode} onClick={() => { setViewMode(mode); setIsMenuOpen(false); }}
                          className={`w-full text-left px-5 py-3.5 flex items-center gap-3 text-sm transition-colors ${viewMode === mode ? "bg-[#985f99]/10 text-[#985f99]" : "text-[#6B5E50] hover:bg-[#985f99]/5 hover:text-[#985f99]"}`}>
                          <Icon className="w-4 h-4" /> {label}
                        </button>
                      ))}
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
                {selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <div className="flex items-center justify-between gap-4">
                <h2 className="serif text-3xl sm:text-4xl text-[#985f99]">{viewLabel}</h2>

                {(viewMode === "schedule" || viewMode === "monthly") && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeDate(-1)}
                      className="p-2 bg-white border border-[#D4AF87]/20 rounded-xl hover:bg-[#985f99]/5 shadow-sm transition-colors">
                      <ChevronLeft className="w-5 h-5 text-[#985f99]" />
                    </button>
                    <button onClick={() => setShowDatePicker(true)}
                      className="p-2 bg-white border border-[#D4AF87]/20 rounded-xl hover:bg-[#985f99]/5 shadow-sm transition-colors">
                      <Calendar className="w-5 h-5 text-[#985f99]" />
                    </button>
                    <button onClick={() => changeDate(1)}
                      className="p-2 bg-white border border-[#D4AF87]/20 rounded-xl hover:bg-[#985f99]/5 shadow-sm transition-colors">
                      <ChevronRight className="w-5 h-5 text-[#985f99]" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ─ SCHEDULE ─ */}
            {viewMode === "schedule" && (
              <div>
                <div className="mb-5">
                  <select value={selectedTech} onChange={e => setSelectedTech(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-[#D4AF87]/20 rounded-xl text-sm text-[#6B5E50] focus:outline-none focus:border-[#985f99]/40 shadow-sm transition-colors appearance-none">
                    <option value="">All Technicians</option>
                    {availableTechs.map(t => <option key={t.id} value={t.name}>{t.name} {t.active_status ? "●" : "○"}</option>)}
                  </select>
                </div>

                <div className="stat-card border border-[#D4AF87]/20 rounded-2xl shadow-sm overflow-hidden">
                  {selectedBookings.filter(b => b.status !== "cancelled").length === 0 ? (
                    <div className="p-16 text-center text-[#6B5E50]/40 text-sm">A quiet day in the sanctuary</div>
                  ) : (
                    <div className="divide-y divide-[#D4AF87]/10">
                      {hours.map(hour => {
                        const hourBookings = selectedBookings.filter(b => b.hour === hour && b.status !== "cancelled");
                        if (hourBookings.length === 0) return null;
                        return (
                          <div key={hour} className="p-4 sm:p-5">
                            <p className="text-xs font-semibold tracking-widest uppercase text-[#6B5E50]/40 mb-3">
                              {hour.toString().padStart(2, "0")}:00
                            </p>
                            <div className="space-y-3">
                              {hourBookings.map(booking => (
                                <div key={booking.id}
                                  className={`rounded-xl p-4 sm:p-5 border-l-4 bg-gradient-to-r from-white to-[#F8F6F2] shadow-sm hover:shadow-md transition-all ${booking.status === "confirmed" ? "border-[#985f99]" : "border-[#D4AF87]"}`}>
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-3 mb-1">
                                        <span className="serif text-lg text-[#985f99]">{booking.time}</span>
                                        <span className="text-sm font-medium text-[#985f99] truncate">{booking.client}</span>
                                      </div>
                                      <p className="text-sm text-[#6B5E50]/70 truncate">{booking.services.join(" · ")}</p>
                                      <p className="text-xs text-[#6B5E50]/40 mt-0.5">with {booking.technician}</p>
                                    </div>
                                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 flex-shrink-0">
                                      <p className="font-semibold text-[#D4AF87]">R{booking.totalPrice.toFixed(2)}</p>
                                      <div className="flex gap-2">
                                        <button onClick={() => openEdit(booking)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#985f99]/10 border border-[#985f99]/20 rounded-lg text-xs font-medium text-[#985f99] hover:bg-[#985f99]/20 transition-colors">
                                          <Edit3 className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        <button onClick={() => deleteBooking(booking)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200/60 rounded-lg text-xs font-medium text-red-500 hover:bg-red-100 transition-colors">
                                          <Trash2 className="w-3.5 h-3.5" /> Cancel
                                        </button>
                                      </div>
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
            )}

            {/* ─ MONTHLY ─ */}
            {viewMode === "monthly" && (
              <div className="stat-card border border-[#D4AF87]/20 rounded-2xl shadow-sm p-4 sm:p-6">
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                    <div key={d} className="py-2 text-xs font-semibold tracking-widest text-[#985f99]/60 uppercase">{d}</div>
                  ))}
                  {(() => {
                    const year = selectedDate.getFullYear();
                    const month = selectedDate.getMonth();
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const cells = [];
                    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateKey = formatDateKey(new Date(year, month, d));
                      const dayBookings = (bookings[dateKey] || []).filter(b => b.status !== "cancelled" && (!selectedTech || b.technician === selectedTech));
                      cells.push(
                        <div key={d} onClick={() => { setSelectedDate(new Date(year, month, d)); setViewMode("schedule"); }}
                          className={`p-2 rounded-xl cursor-pointer transition-all min-h-[60px] sm:min-h-[80px] ${dayBookings.length > 0 ? "bg-[#985f99]/10 border border-[#985f99]/20 hover:bg-[#985f99]/15" : "bg-[#F8F6F2] border border-[#D4AF87]/10 hover:bg-[#985f99]/5"}`}>
                          <p className={`text-sm font-medium ${dayBookings.length > 0 ? "text-[#985f99]" : "text-[#6B5E50]/50"}`}>{d}</p>
                          <div className="mt-1 space-y-0.5 overflow-hidden">
                            {dayBookings.slice(0, 2).map(b => (
                              <div key={b.id} className="text-[10px] text-[#985f99]/70 truncate">{b.time} {b.client}</div>
                            ))}
                            {dayBookings.length > 2 && <div className="text-[10px] text-[#6B5E50]/40">+{dayBookings.length - 2} more</div>}
                          </div>
                        </div>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </div>
            )}

            {/* ─ SERVICES ─ */}
            {viewMode === "services" && (
              <div className="space-y-6">
                {Object.entries(groupedServices).map(([category, items]) => (
                  <div key={category}>
                    <p className="text-xs tracking-widest uppercase text-[#6B5E50]/40 mb-3">{category}</p>
                    <div className="space-y-2">
                      {items.map(service => (
                        <div key={service.id} className="stat-card border border-[#D4AF87]/20 rounded-xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
                          <div>
                            <p className="font-medium text-[#985f99]">{service.name}</p>
                            <p className="text-xs text-[#6B5E50]/50 mt-0.5">{service.duration} min</p>
                          </div>
                          <p className="font-semibold text-[#D4AF87]">R{service.price.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─ AGENTS ─ */}
            {viewMode === "agents" && (
              <div>
                <div className="flex justify-end mb-5">
                  <button onClick={() => setShowTechModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#985f99] hover:bg-[#985f99]/90 text-white rounded-xl text-sm font-medium shadow-sm transition-all">
                    <Plus className="w-4 h-4" /> Add Technician
                  </button>
                </div>
                <div className="space-y-3">
                  {availableTechs.map(agent => (
                    <div key={agent.id} className="stat-card border border-[#D4AF87]/20 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-start gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 glow-dot ${agent.active_status ? "bg-emerald-500 text-emerald-500" : "bg-red-400 text-red-400"}`} />
                        <div className="min-w-0">
                          <p className="font-semibold text-[#985f99]">{agent.name}</p>
                          <p className="text-xs text-[#6B5E50]/60 mt-0.5 truncate">{agent.email}</p>
                          <p className="text-xs text-[#6B5E50]/40 mt-0.5">{agent.specialization || "General"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>

        {/* ── TOAST ── */}
        {toast && (
          <div className={`fixed bottom-6 right-4 sm:right-8 px-5 py-3.5 rounded-2xl shadow-2xl z-[120] text-sm font-medium border flex items-center gap-3 ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : toast.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-[#985f99]/10 border-[#985f99]/20 text-[#985f99]"}`}>
            {toast.message}
            <button onClick={() => setToast(null)}><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
          </div>
        )}

        {/* ── UNDO TOAST ── */}
        {deletedBooking && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#985f99] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 z-[120] text-sm font-medium">
            Booking cancelled
            <button onClick={undoDelete} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors">
              <Undo2 className="w-3.5 h-3.5" /> Undo
            </button>
          </div>
        )}

        {/* ── DATE PICKER ── */}
        {showDatePicker && (
          <div className={S.modalOverlay}>
            <div className="bg-white border border-[#D4AF87]/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
              <h3 className="serif text-2xl text-[#985f99] mb-6">Select Date</h3>
              <input type="date" onChange={e => { setSelectedDate(new Date(e.target.value + "T12:00:00")); setShowDatePicker(false); }}
                className={S.inputClass} />
              <button onClick={() => setShowDatePicker(false)} className={`mt-4 w-full ${S.btnSecondary}`}>Close</button>
            </div>
          </div>
        )}

        {/* ── BOOKING MODAL ── */}
        {showBookingModal && (
          <div className={S.modalOverlay}>
            <div className={`${S.modalBox} max-w-2xl`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="serif text-2xl text-[#985f99]">{editingBooking ? "Edit" : "New"} Booking</h3>
                <button onClick={() => { setShowBookingModal(false); resetForm(); }}
                  className="p-2 rounded-xl hover:bg-[#F8F6F2] text-[#6B5E50] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={confirmBooking} className="space-y-5">

                {/* Date + Client */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={S.label}>Date</label>
                    <input type="date" required value={bookingForm.date}
                      onChange={e => setBookingForm(p => ({ ...p, date: e.target.value }))}
                      className={S.inputClass} />
                  </div>
                  <div className="relative">
                    <label className={S.label}>Client</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5E50]/40" />
                      <input type="text" placeholder="Search by name or phone..."
                        className={`${S.inputClass} pl-9`}
                        value={clientSearch || bookingForm.clientName}
                        onChange={e => { setClientSearch(e.target.value); setBookingForm(p => ({ ...p, clientName: e.target.value, clientId: null })); }} />
                    </div>
                    {filteredClients.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-[#D4AF87]/20 rounded-xl shadow-2xl max-h-48 overflow-auto">
                        {filteredClients.map(client => (
                          <button key={client.id} type="button" onClick={() => selectClient(client)}
                            className="w-full text-left px-4 py-3 hover:bg-[#F8F6F2] border-b border-[#D4AF87]/10 last:border-0 transition-colors">
                            <p className="text-sm font-medium text-[#985f99]">{client.name}</p>
                            <p className="text-xs text-[#6B5E50]/50">{client.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => setShowClientModal(true)}
                      className="mt-2 flex items-center gap-1.5 text-xs text-[#D4AF87] hover:text-[#985f99] font-medium transition-colors">
                      <UserPlus className="w-3.5 h-3.5" /> Add New Client
                    </button>
                  </div>
                </div>

                {/* Services */}
                <div>
                  <label className={S.label}>Services</label>
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                    {Object.entries(groupedServices).map(([category, items]) => (
                      <div key={category}>
                        <p className="text-xs font-semibold text-[#6B5E50]/40 tracking-widest uppercase mb-2">{category}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {items.map(service => {
                            const isSelected = bookingForm.selectedServices.some(s => s.id === service.id);
                            return (
                              <label key={service.id} onClick={() => toggleService(service)}
                                className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? "border-[#985f99] bg-[#985f99]/10" : "border-[#D4AF87]/20 hover:border-[#D4AF87]/40 bg-white"}`}>
                                <div>
                                  <p className={`text-sm font-medium ${isSelected ? "text-[#985f99]" : "text-[#2d1f2d]"}`}>{service.name}</p>
                                  <p className="text-xs text-[#6B5E50]/50">R{service.price} · {service.duration}min</p>
                                </div>
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-[#985f99] bg-[#985f99]" : "border-[#D4AF87]/40"}`}>
                                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPrice > 0 && (
                    <div className="mt-3 p-3 bg-[#F8F6F2] border border-[#D4AF87]/20 rounded-xl flex justify-between items-center">
                      <span className="text-sm text-[#6B5E50]/60">Total</span>
                      <span className="font-semibold text-[#985f99]">R{totalPrice.toFixed(2)} · {totalDuration}min</span>
                    </div>
                  )}
                </div>

                {/* Technician + Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={S.label}>Technician</label>
                    <select value={bookingForm.technician}
                      onChange={e => setBookingForm(p => ({ ...p, technician: e.target.value }))}
                      className={S.inputClass}>
                      <option value="">Select technician</option>
                      <option value="auto">Auto-assign</option>
                      {availableTechs.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={S.label}>Time (SAST)</label>
                    <input type="time" required value={bookingForm.time}
                      onChange={e => setBookingForm(p => ({ ...p, time: e.target.value }))}
                      className={S.inputClass} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowBookingModal(false); resetForm(); }} className={S.btnSecondary}>Cancel</button>
                  <button type="submit" className={S.btnPrimary}>{editingBooking ? "Update" : "Confirm"} Booking</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── CLIENT MODAL ── */}
        {showClientModal && (
          <div className={S.modalOverlay}>
            <div className={`${S.modalBox} max-w-md`}>
              <h3 className="serif text-2xl text-[#985f99] mb-6">Add New Client</h3>
              <div className="space-y-3">
                <div><label className={S.label}>Full Name</label>
                  <input type="text" placeholder="Jane Smith" value={newClient.name}
                    onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} className={S.inputClass} /></div>
                <div><label className={S.label}>Phone</label>
                  <input type="tel" placeholder="+27 000 000 0000" value={newClient.phone}
                    onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} className={S.inputClass} /></div>
                <div><label className={S.label}>Email (optional)</label>
                  <input type="email" placeholder="jane@example.com" value={newClient.email}
                    onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} className={S.inputClass} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowClientModal(false)} className={S.btnSecondary}>Cancel</button>
                <button onClick={addClient} className={S.btnPrimary}>Add Client</button>
              </div>
            </div>
          </div>
        )}

        {/* ── TECH MODAL ── */}
        {showTechModal && (
          <div className={S.modalOverlay}>
            <div className={`${S.modalBox} max-w-md`}>
              <h3 className="serif text-2xl text-[#985f99] mb-6">Add Technician</h3>
              <div className="space-y-3">
                <div><label className={S.label}>Name</label>
                  <input type="text" placeholder="Full name" value={newTech.name}
                    onChange={e => setNewTech(p => ({ ...p, name: e.target.value }))} className={S.inputClass} /></div>
                <div><label className={S.label}>Email</label>
                  <input type="email" placeholder="email@blackbird.com" value={newTech.email}
                    onChange={e => setNewTech(p => ({ ...p, email: e.target.value }))} className={S.inputClass} /></div>
                <div><label className={S.label}>Password</label>
                  <input type="password" placeholder="••••••••" value={newTech.password}
                    onChange={e => setNewTech(p => ({ ...p, password: e.target.value }))} className={S.inputClass} /></div>
                <div><label className={S.label}>Specialization (optional)</label>
                  <input type="text" placeholder="e.g. Massage, Nails" value={newTech.specialization}
                    onChange={e => setNewTech(p => ({ ...p, specialization: e.target.value }))} className={S.inputClass} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowTechModal(false); setNewTech({ name: "", email: "", password: "", specialization: "" }); }} className={S.btnSecondary}>Cancel</button>
                <button onClick={addTechnician} className={S.btnPrimary}>Add Technician</button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIRMATION MODAL ── */}
        {showConfirmation && confirmedBooking && (
          <div className={S.modalOverlay}>
            <div className="bg-white border border-[#D4AF87]/20 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-[#985f99]/10 border border-[#985f99]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-[#985f99]" />
              </div>
              <h3 className="serif text-2xl text-[#985f99] mb-6">Booking Confirmed</h3>
              <div className="space-y-3 text-left">
                {[
                  { label: "Client", value: confirmedBooking.client },
                  { label: "Services", value: confirmedBooking.services.join(" · ") },
                  { label: "Time", value: confirmedBooking.time },
                  { label: "Technician", value: confirmedBooking.technician },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-start py-3 border-b border-[#D4AF87]/10 last:border-0">
                    <span className="text-sm text-[#6B5E50]/50">{label}</span>
                    <span className="text-sm font-medium text-[#985f99] text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-[#6B5E50]/50">Total</span>
                  <span className="font-semibold text-[#D4AF87]">R{confirmedBooking.totalPrice.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={() => setShowConfirmation(false)} className={`mt-8 w-full ${S.btnPrimary}`}>Done</button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
