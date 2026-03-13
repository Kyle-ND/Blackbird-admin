// src/components/ManagerDashboard.jsx
import React, { useState, useEffect } from "react";
import {
  LogOut,
  CalendarDays,
  Scissors,
  Plus,
  Edit3,
  UserX,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  UserCog,
  Star,
  Search as SearchIcon,
  ChevronDown,
} from "lucide-react";

export default function ManagerDashboard({ user, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("overview");
  const [scheduleSubView, setScheduleSubView] = useState("daily");
  const [selectedTech, setSelectedTech] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [services, setServices] = useState([]);
  const [dailyStats, setDailyStats] = useState({});
  const [bookings, setBookings] = useState([]);
  const [monthlyCounts, setMonthlyCounts] = useState({});
  const [weeklyRevenue, setWeeklyRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientHistory, setClientHistory] = useState(null);
  const [showEditTechModal, setShowEditTechModal] = useState(false);
  const [editingTech, setEditingTech] = useState(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [availabilityTech, setAvailabilityTech] = useState(null);
  const [availability, setAvailability] = useState({});
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: "", category: "", duration_minutes: "", price: "", description: "",
  });
  const [topWeeklyClient, setTopWeeklyClient] = useState(null);
  const [topMonthlyClient, setTopMonthlyClient] = useState(null);
  const [topTechnicians, setTopTechnicians] = useState([]);
  const token = localStorage.getItem("access_token");
  const selectedDateKey = selectedDate.toISOString().split("T")[0];

  const navItems = [
    { mode: "overview", label: "Overview", icon: BarChart3 },
    { mode: "schedule", label: "Schedule", icon: CalendarDays },
    { mode: "revenue", label: "Revenue", icon: TrendingUp },
    { mode: "analytics", label: "Analytics", icon: Star },
    { mode: "technicians", label: "Technicians", icon: UserCog },
    { mode: "services", label: "Services", icon: Scissors },
  ];

  useEffect(() => {
    if (showEditServiceModal) {
      if (editingService) {
        setServiceForm({
          name: editingService.name || "",
          category: editingService.category || "",
          duration_minutes: editingService.duration_minutes.toString() || "",
          price: editingService.price.toString() || "",
          description: editingService.description || "",
        });
      } else {
        setServiceForm({ name: "", category: "", duration_minutes: "", price: "", description: "" });
      }
    }
  }, [showEditServiceModal, editingService]);

  useEffect(() => {
    const fetchCoreData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [techRes, servRes, dailyRes] = await Promise.all([
          fetch("/proxy-api/agents/", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/proxy-api/services/", { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/proxy-api/manager/stats/daily?date=${selectedDateKey}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (techRes.ok) setTechnicians((await techRes.json()).map(t => ({ ...t, active_status: t.active_status ?? true })));
        if (servRes.ok) setServices((await servRes.json()).map(s => ({ ...s, price: parseFloat(s.price) })));
        if (dailyRes.ok) setDailyStats(await dailyRes.json());
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchCoreData();
  }, [token, selectedDateKey]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (viewMode !== "schedule" || !token) return;
      try {
        const res = await fetch(`/proxy-api/bookings/by-date?date=${selectedDateKey}`, { headers: { Authorization: `Bearer ${token}` } });
        setBookings(res.ok ? await res.json() : []);
      } catch { setBookings([]); }
    };
    fetchBookings();
  }, [selectedDateKey, viewMode, token]);

  useEffect(() => {
    if (viewMode === "schedule" && scheduleSubView === "monthly" && token) {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, "0")}`;
      fetch(`/proxy-api/bookings/counts?month=${monthKey}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null).then(d => d && setMonthlyCounts(d)).catch(() => {});
    }
  }, [selectedDate, viewMode, scheduleSubView, token]);

  useEffect(() => {
    if (viewMode === "revenue" && !weeklyRevenue && token) {
      fetch("/proxy-api/manager/revenue/weekly", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null).then(d => d && setWeeklyRevenue(d)).catch(() => {});
    }
  }, [viewMode, token, weeklyRevenue]);

  useEffect(() => {
    if (viewMode === "analytics" && token) {
      Promise.all([
        fetch("/proxy-api/manager/top-clients?period=week&limit=1", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/proxy-api/manager/top-clients?period=month&limit=1", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/proxy-api/manager/top-technicians?period=month&limit=5", { headers: { Authorization: `Bearer ${token}` } }),
      ]).then(async ([w, m, t]) => {
        if (w.ok) { const d = await w.json(); setTopWeeklyClient(d[0] || null); }
        if (m.ok) { const d = await m.json(); setTopMonthlyClient(d[0] || null); }
        if (t.ok) setTopTechnicians(await t.json());
      }).catch(() => {});
    }
  }, [viewMode, token]);

  const filteredBookings = bookings
    .filter(b => !selectedTech || b.agent?.name === selectedTech)
    .filter(b => !searchQuery || b.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  const changeDate = (delta) => {
    const newDate = new Date(selectedDate);
    scheduleSubView === "daily" ? newDate.setDate(newDate.getDate() + delta) : newDate.setMonth(newDate.getMonth() + delta);
    setSelectedDate(newDate);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    const trimmedName = serviceForm.name.trim();
    const trimmedCategory = serviceForm.category.trim();
    if (!trimmedName) { showToast("error", "Name is required"); return; }
    if (!trimmedCategory) { showToast("error", "Category is required"); return; }
    const duration = parseInt(serviceForm.duration_minutes, 10);
    if (isNaN(duration) || duration <= 0) { showToast("error", "Duration must be a positive integer"); return; }
    const priceValue = parseFloat(serviceForm.price);
    if (isNaN(priceValue) || priceValue <= 0) { showToast("error", "Price must be a positive number"); return; }
    const payload = { name: trimmedName, category: trimmedCategory, duration_minutes: duration, price: priceValue };
    const trimmedDesc = serviceForm.description?.trim();
    if (trimmedDesc) payload.description = trimmedDesc;
    try {
      const res = editingService
        ? await fetch(`/proxy-api/services/${editingService.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
        : await fetch(`/proxy-api/services/`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!res.ok) { showToast("error", editingService ? "Failed to update service" : "Failed to create service"); return; }
      const updated = await res.json();
      if (editingService) {
        setServices(prev => prev.map(s => s.id === updated.id ? { ...updated, price: parseFloat(updated.price) } : s));
        showToast("success", "Service updated");
      } else {
        setServices(prev => [...prev, { ...updated, price: parseFloat(updated.price) }]);
        showToast("success", "Service created");
      }
      setShowEditServiceModal(false);
      setEditingService(null);
    } catch { showToast("error", "Failed to save service"); }
  };

  const handleSaveTech = async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = { name: form.name.value, specialization: form.specialization.value || null, email: form.email.value };
    if (!editingTech) { payload.password = form.password.value; payload.active_status = true; }
    try {
      const res = editingTech
        ? await fetch(`/proxy-api/agents/${editingTech.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
        : await fetch(`/proxy-api/agents/create`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!res.ok) { showToast("error", editingTech ? "Failed to update" : "Failed to create"); return; }
      const updated = await res.json();
      editingTech ? setTechnicians(prev => prev.map(t => t.id === updated.id ? updated : t)) : setTechnicians(prev => [...prev, updated]);
      showToast("success", editingTech ? "Technician updated" : "Technician created");
      setShowEditTechModal(false);
    } catch { showToast("error", "Failed to save technician"); }
  };

  const toggleTechStatus = async (tech) => {
    try {
      const res = await fetch(`/proxy-api/agents/${tech.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ active_status: !tech.active_status }) });
      if (!res.ok) { showToast("error", "Failed to update status"); return; }
      const updated = await res.json();
      setTechnicians(prev => prev.map(t => t.id === updated.id ? updated : t));
      showToast("success", `Technician ${updated.active_status ? "activated" : "deactivated"}`);
    } catch { showToast("error", "Failed to update status"); }
  };

  const openAvailability = async (tech) => {
    try {
      const res = await fetch(`/proxy-api/agents/${tech.id}/availability`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { showToast("error", "Failed to load availability"); return; }
      const data = await res.json();
      const availMap = {};
      data.availability.forEach(d => { availMap[d.day.toLowerCase()] = { start: d.start_time, end: d.end_time, available: d.is_available }; });
      setAvailability(availMap);
      setAvailabilityTech(tech);
      setShowAvailabilityModal(true);
    } catch { showToast("error", "Failed to load availability"); }
  };

  const saveAvailability = async () => {
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const payload = { availability: daysOrder.map(day => { const d = availability[day.toLowerCase()] || { available: false }; return { day, start_time: d.available ? d.start || "09:00" : null, end_time: d.available ? d.end || "17:00" : null, is_available: d.available }; }) };
    try {
      const res = await fetch(`/proxy-api/agents/${availabilityTech.id}/availability`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!res.ok) { showToast("error", "Failed to save availability"); return; }
      showToast("success", "Availability updated");
      setShowAvailabilityModal(false);
    } catch { showToast("error", "Failed to save availability"); }
  };

  const openClientHistory = async (clientId) => {
    try {
      const res = await fetch(`/proxy-api/clients/${clientId}/history`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { showToast("error", "Failed to load client history"); return; }
      const data = await res.json();
      setClientHistory(data);
      setSelectedClient({ id: clientId });
    } catch { showToast("error", "Failed to load client history"); }
  };

  const renderMonthlyCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const offset = (firstWeekday + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return (
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div key={d} className="py-3 text-xs font-semibold tracking-widest text-[#985f99]/60 uppercase">{d}</div>
        ))}
        {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const count = monthlyCounts.counts?.[day] || 0;
          return (
            <div key={day} className={`p-2 sm:p-3 rounded-xl transition-all cursor-pointer ${count > 0 ? "bg-[#985f99]/10 border border-[#985f99]/20" : "bg-[#F8F6F2] border border-[#D4AF87]/10"} hover:bg-[#985f99]/10`}>
              <span className="block text-sm font-medium text-[#6B5E50]">{day}</span>
              {count > 0 && <span className="text-xs text-[#985f99] font-semibold">{count}</span>}
            </div>
          );
        })}
      </div>
    );
  };

  // Modal base style
  const modalOverlay = "fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[130] p-4";
  const modalBox = "bg-white border border-[#D4AF87]/20 rounded-3xl p-8 max-w-md w-full shadow-2xl";
  const inputClass = "w-full mb-4 px-4 py-3 rounded-xl bg-[#F8F6F2] border border-[#D4AF87]/30 text-[#2d1f2d] placeholder-[#6B5E50]/40 focus:outline-none focus:border-[#985f99]/40 transition-colors text-sm";
  const btnPrimary = "flex-1 py-3 bg-[#985f99] hover:bg-[#985f99]/90 text-white rounded-xl font-medium transition-colors text-sm";
  const btnSecondary = "flex-1 py-3 bg-[#F8F6F2] hover:bg-[#f0ebe3] border border-[#D4AF87]/30 text-[#6B5E50] rounded-xl font-medium transition-colors text-sm";

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
          <div className="max-w-7xl mx-auto px-6 pt-5 pb-3">
            <div className="flex items-center justify-between bg-white/90 backdrop-blur-2xl border border-[#D4AF87]/20 rounded-2xl px-6 py-4 shadow-lg">

              {/* Logo */}
              <div className="flex items-center gap-3">
                <h1 className="serif text-2xl text-[#985f99] tracking-tight">blackbird</h1>
                <span className="text-[10px] tracking-[4px] text-[#6B5E50] uppercase font-medium mt-0.5">Spa</span>
              </div>

              {/* Nav Pills */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map(({ mode, label }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${viewMode === mode ? "bg-[#985f99]/15 text-[#985f99] border border-[#985f99]/20" : "text-[#6B5E50] hover:text-[#985f99] hover:bg-[#985f99]/5"}`}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {/* Right side */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#6B5E50]/60 hidden lg:block">
                  {user?.name || "Manager"}
                </span>

                {/* Mobile menu */}
                <div className="relative md:hidden">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 px-3 py-2 bg-[#985f99]/5 border border-[#D4AF87]/30 rounded-xl text-[#985f99] text-sm hover:bg-[#985f99]/10 transition-colors">
                    Menu <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-[#D4AF87]/20 rounded-2xl shadow-2xl overflow-hidden z-50">
                      {navItems.map(({ mode, label, icon: Icon }) => (
                        <button key={mode} onClick={() => { setViewMode(mode); setIsMenuOpen(false); }} className={`w-full text-left px-5 py-3.5 flex items-center gap-3 text-sm transition-colors ${viewMode === mode ? "bg-[#985f99]/10 text-[#985f99]" : "text-[#6B5E50] hover:bg-[#985f99]/5 hover:text-[#985f99]"}`}>
                          <Icon className="w-4 h-4" /> {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={onLogout} className="p-2 rounded-xl bg-[#985f99]/5 hover:bg-red-50 border border-[#D4AF87]/30 text-[#6B5E50] hover:text-red-500 transition-all">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="pt-28 px-6 pb-12">
          <div className="max-w-7xl mx-auto">

            {/* Page header */}
            <div className="mb-10">
              <p className="text-xs tracking-[4px] uppercase text-[#6B5E50]/60 mb-2">
                {selectedDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h2 className="serif text-4xl text-[#985f99]">
                {navItems.find(n => n.mode === viewMode)?.label}
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-[#6B5E50]/40 text-lg">Loading...</div>
              </div>
            ) : (
              <>
                {/* ─ OVERVIEW ─ */}
                {viewMode === "overview" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[
                      { label: "Today's Revenue", value: `R${formatCurrency(dailyStats.revenue)}` },
                      { label: "Bookings Today", value: dailyStats.bookings_count || 0 },
                      { label: "Occupancy Rate", value: `${dailyStats.occupancy_rate || 0}%` },
                    ].map((stat) => (
                      <div key={stat.label} className="stat-card border border-[#D4AF87]/20 rounded-2xl p-8 hover:border-[#985f99]/20 hover:shadow-lg transition-all shadow-sm">
                        <p className="text-xs tracking-widest uppercase text-[#6B5E50]/50 mb-5">{stat.label}</p>
                        <p className="serif text-5xl text-[#985f99]">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ─ SCHEDULE ─ */}
                {viewMode === "schedule" && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-2 bg-white border border-[#D4AF87]/20 rounded-xl p-1 shadow-sm">
                        {["daily", "monthly"].map(v => (
                          <button key={v} onClick={() => setScheduleSubView(v)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${scheduleSubView === v ? "bg-[#985f99]/15 text-[#985f99]" : "text-[#6B5E50]/60 hover:text-[#985f99]"}`}>
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => changeDate(-1)} className="p-2 bg-white border border-[#D4AF87]/20 rounded-xl hover:bg-[#985f99]/5 shadow-sm transition-colors">
                          <ChevronLeft className="w-5 h-5 text-[#985f99]" />
                        </button>
                        <span className="text-[#985f99] font-medium min-w-[120px] text-center text-sm">
                          {scheduleSubView === "daily"
                            ? selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                            : selectedDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                        </span>
                        <button onClick={() => changeDate(1)} className="p-2 bg-white border border-[#D4AF87]/20 rounded-xl hover:bg-[#985f99]/5 shadow-sm transition-colors">
                          <ChevronRight className="w-5 h-5 text-[#985f99]" />
                        </button>
                      </div>
                    </div>

                    {scheduleSubView === "daily" && (
                      <>
                        <div className="flex flex-wrap gap-3 mb-6">
                          <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5E50]/40" />
                            <input type="text" placeholder="Search client..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2.5 bg-white border border-[#D4AF87]/20 rounded-xl text-sm text-[#2d1f2d] placeholder-[#6B5E50]/40 focus:outline-none focus:border-[#985f99]/40 shadow-sm transition-colors" />
                          </div>
                          <select value={selectedTech} onChange={e => setSelectedTech(e.target.value)} className="px-4 py-2.5 bg-white border border-[#D4AF87]/20 rounded-xl text-sm text-[#6B5E50] focus:outline-none focus:border-[#985f99]/40 shadow-sm transition-colors appearance-none">
                            <option value="">All Technicians</option>
                            {technicians.filter(t => t.active_status).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-3">
                          {filteredBookings.length === 0 ? (
                            <div className="stat-card border border-[#D4AF87]/20 rounded-2xl p-16 text-center text-[#6B5E50]/40 shadow-sm">No bookings for this day</div>
                          ) : filteredBookings.map(booking => (
                            <div key={booking.id} className={`stat-card border rounded-2xl p-5 flex justify-between items-start gap-4 hover:shadow-md transition-all shadow-sm ${booking.status === "confirmed" ? "border-[#985f99]/20" : "border-orange-300/40"}`}>
                              <div className="flex gap-4 items-start min-w-0">
                                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${booking.status === "confirmed" ? "bg-[#985f99]" : "bg-orange-400"}`} />
                                <div className="min-w-0">
                                  <p className="serif text-xl text-[#985f99] mb-1">{booking.start_time?.slice(11, 16)}</p>
                                  <p className="text-sm font-medium text-[#985f99] cursor-pointer hover:underline mb-1 truncate" onClick={() => openClientHistory(booking.client.id)}>
                                    {booking.client.name}
                                  </p>
                                  <p className="text-sm text-[#6B5E50]/70 truncate">{booking.services.map(s => s.name).join(" · ")}</p>
                                  <p className="text-xs text-[#6B5E50]/40 mt-1">with {booking.agent?.name} · {booking.status}</p>
                                </div>
                              </div>
                              <p className="text-base font-semibold text-[#D4AF87] whitespace-nowrap flex-shrink-0">R{formatCurrency(booking.total_price)}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {scheduleSubView === "monthly" && (
                      <div className="stat-card border border-[#D4AF87]/20 rounded-2xl p-4 sm:p-6 shadow-sm">
                        {renderMonthlyCalendar()}
                      </div>
                    )}
                  </div>
                )}

                {/* ─ REVENUE ─ */}
                {viewMode === "revenue" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="stat-card border border-[#D4AF87]/20 rounded-2xl p-8 hover:shadow-lg transition-all shadow-sm">
                      <p className="text-xs tracking-widest uppercase text-[#6B5E50]/50 mb-2">Today</p>
                      <p className="serif text-5xl text-[#985f99] mb-4">R{formatCurrency(dailyStats.revenue)}</p>
                      <p className="text-sm text-[#6B5E50]/50">{dailyStats.bookings_count || 0} bookings · {dailyStats.occupancy_rate || 0}% occupancy</p>
                    </div>
                    {weeklyRevenue && (
                      <div className="stat-card border border-[#D4AF87]/20 rounded-2xl p-8 hover:shadow-lg transition-all shadow-sm">
                        <p className="text-xs tracking-widest uppercase text-[#6B5E50]/50 mb-2">This Week</p>
                        <p className="serif text-5xl text-[#985f99] mb-4">R{formatCurrency(weeklyRevenue.revenue)}</p>
                        <p className="text-sm text-[#6B5E50]/50">{weeklyRevenue.bookings_count} bookings</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ─ ANALYTICS ─ */}
                {viewMode === "analytics" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {[
                        { label: "Top Client This Week", client: topWeeklyClient },
                        { label: "Top Client This Month", client: topMonthlyClient },
                      ].map(({ label, client }) => (
                        <div key={label} className="stat-card border border-[#D4AF87]/20 rounded-2xl p-8 hover:shadow-lg transition-all shadow-sm">
                          <p className="text-xs tracking-widest uppercase text-[#6B5E50]/50 mb-4">{label}</p>
                          {client ? (
                            <>
                              <p className="serif text-3xl text-[#985f99] mb-2">{client.name}</p>
                              <p className="text-sm text-[#6B5E50]/50">{client.visits} visits</p>
                            </>
                          ) : <p className="text-[#6B5E50]/40 text-sm">No data available</p>}
                        </div>
                      ))}
                    </div>
                    <div className="stat-card border border-[#D4AF87]/20 rounded-2xl p-8 shadow-sm">
                      <p className="text-xs tracking-widest uppercase text-[#6B5E50]/50 mb-6">Top Technicians This Month</p>
                      {topTechnicians.length > 0 ? (
                        <div className="space-y-2">
                          {topTechnicians.map((tech, idx) => (
                            <div key={tech.id} className="flex items-center justify-between py-4 border-b border-[#D4AF87]/10 last:border-0">
                              <div className="flex items-center gap-5">
                                <span className="serif text-2xl text-[#D4AF87]/60 w-8">{idx + 1}</span>
                                <div>
                                  <p className="font-medium text-[#985f99]">{tech.name}</p>
                                  <p className="text-xs text-[#6B5E50]/50">{tech.bookings} bookings</p>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-[#D4AF87]">R{formatCurrency(tech.revenue)}</p>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-[#6B5E50]/40 text-sm">No data available</p>}
                    </div>
                  </div>
                )}

                {/* ─ TECHNICIANS ─ */}
                {viewMode === "technicians" && (
                  <div>
                    <div className="flex justify-end mb-6">
                      <button onClick={() => { setEditingTech(null); setShowEditTechModal(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-[#985f99] hover:bg-[#985f99]/90 text-white rounded-xl text-sm font-medium shadow-sm transition-all">
                        <Plus className="w-4 h-4" /> Add Technician
                      </button>
                    </div>
                    <div className="space-y-3">
                      {technicians.map(tech => (
                        <div key={tech.id} className="stat-card border border-[#D4AF87]/20 rounded-2xl p-5 hover:shadow-md transition-all shadow-sm">
                          {/* Top row: status dot + name/email */}
                          <div className="flex items-start gap-3 mb-4">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 glow-dot ${tech.active_status ? "bg-emerald-500 text-emerald-500" : "bg-red-400 text-red-400"}`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[#985f99] leading-tight">{tech.name}</p>
                              <p className="text-xs text-[#6B5E50]/60 mt-0.5 truncate">{tech.email}</p>
                              <p className="text-xs text-[#6B5E50]/40 mt-0.5">{tech.specialization || "General"}</p>
                            </div>
                          </div>
                          {/* Bottom row: action buttons */}
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => { setEditingTech(tech); setShowEditTechModal(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-[#985f99]/8 border border-[#985f99]/15 rounded-xl hover:bg-[#985f99]/15 transition-colors text-xs font-medium text-[#985f99]">
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button onClick={() => toggleTechStatus(tech)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors text-xs font-medium border ${tech.active_status ? "bg-red-50 border-red-200/60 text-red-500 hover:bg-red-100" : "bg-emerald-50 border-emerald-200/60 text-emerald-600 hover:bg-emerald-100"}`}>
                              {tech.active_status ? <><UserX className="w-3.5 h-3.5" /> Deactivate</> : <><Check className="w-3.5 h-3.5" /> Activate</>}
                            </button>
                            <button onClick={() => openAvailability(tech)} className="flex items-center gap-1.5 px-3 py-2 bg-[#D4AF87]/10 border border-[#D4AF87]/30 rounded-xl text-[#6B5E50] hover:bg-[#D4AF87]/20 transition-colors text-xs font-medium">
                              Availability
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─ SERVICES ─ */}
                {viewMode === "services" && (
                  <div>
                    <div className="flex justify-end mb-6">
                      <button onClick={() => { setEditingService(null); setShowEditServiceModal(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-[#985f99] hover:bg-[#985f99]/90 text-white rounded-xl text-sm font-medium shadow-sm transition-all">
                        <Plus className="w-4 h-4" /> Add Service
                      </button>
                    </div>
                    {Object.entries(services.reduce((acc, s) => {
                      const cat = s.category || "General";
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(s);
                      return acc;
                    }, {})).map(([category, items]) => (
                      <div key={category} className="mb-8">
                        <p className="text-xs tracking-widest uppercase text-[#6B5E50]/40 mb-4">{category}</p>
                        <div className="space-y-3">
                          {items.map(service => (
                            <div key={service.id} className="stat-card border border-[#D4AF87]/20 rounded-2xl p-5 flex items-center justify-between hover:shadow-md transition-all shadow-sm">
                              <div>
                                <p className="font-medium text-[#985f99] mb-1">{service.name}</p>
                                <p className="text-xs text-[#6B5E50]/50">R{formatCurrency(service.price)} · {service.duration_minutes} min</p>
                              </div>
                              <button onClick={() => { setEditingService(service); setShowEditServiceModal(true); }} className="p-2.5 bg-[#985f99]/8 border border-[#985f99]/15 rounded-xl hover:bg-[#985f99]/15 transition-colors flex-shrink-0">
                                <Edit3 className="w-4 h-4 text-[#985f99]" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* ── TOAST ── */}
        {toast && (
          <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[120] text-sm font-medium border transition-all ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : toast.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-[#985f99]/10 border-[#985f99]/20 text-[#985f99]"}`}>
            {toast.message}
          </div>
        )}

        {/* ── CLIENT HISTORY MODAL ── */}
        {selectedClient && clientHistory && (
          <div className={modalOverlay}>
            <div className={modalBox}>
              <h3 className="serif text-2xl text-[#985f99] mb-6">{clientHistory.client_name}</h3>
              <div className="space-y-4">
                {[
                  { label: "Total Spent", value: `R${formatCurrency(clientHistory.total_spent)}` },
                  { label: "Visits", value: clientHistory.visits_count },
                  { label: "Favorite Service", value: clientHistory.favorite_service },
                  { label: "Last Visit", value: new Date(clientHistory.last_visit).toLocaleDateString() },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-3 border-b border-[#D4AF87]/10 last:border-0">
                    <span className="text-sm text-[#6B5E50]/60">{label}</span>
                    <span className="text-sm font-medium text-[#985f99]">{value}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setSelectedClient(null); setClientHistory(null); }} className={`mt-8 w-full py-3 ${btnPrimary}`}>Close</button>
            </div>
          </div>
        )}

        {/* ── EDIT TECH MODAL ── */}
        {showEditTechModal && (
          <div className={modalOverlay}>
            <div className={modalBox}>
              <h3 className="serif text-2xl text-[#985f99] mb-6">{editingTech ? "Edit" : "Add"} Technician</h3>
              <form onSubmit={handleSaveTech}>
                <input name="name" defaultValue={editingTech?.name || ""} required className={inputClass} placeholder="Full name" />
                <input name="email" type="email" defaultValue={editingTech?.email || ""} required className={inputClass} placeholder="Email address" />
                <input name="specialization" defaultValue={editingTech?.specialization || ""} className={inputClass} placeholder="Specialization (optional)" />
                {!editingTech && <input name="password" type="password" required className={inputClass} placeholder="Password" />}
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setShowEditTechModal(false)} className={btnSecondary}>Cancel</button>
                  <button type="submit" className={btnPrimary}>Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── EDIT SERVICE MODAL ── */}
        {showEditServiceModal && (
          <div className={modalOverlay}>
            <div className={modalBox}>
              <h3 className="serif text-2xl text-[#985f99] mb-6">{editingService ? "Edit" : "Add"} Service</h3>
              <form onSubmit={handleSaveService}>
                <input value={serviceForm.name} onChange={e => setServiceForm(p => ({ ...p, name: e.target.value }))} required className={inputClass} placeholder="Service name" />
                <input value={serviceForm.category} onChange={e => setServiceForm(p => ({ ...p, category: e.target.value }))} required className={inputClass} placeholder="Category" />
                <input type="number" value={serviceForm.duration_minutes} onChange={e => setServiceForm(p => ({ ...p, duration_minutes: e.target.value }))} required className={inputClass} placeholder="Duration (minutes)" />
                <input type="number" step="0.01" value={serviceForm.price} onChange={e => setServiceForm(p => ({ ...p, price: e.target.value }))} required className={inputClass} placeholder="Price (R)" />
                <textarea value={serviceForm.description} onChange={e => setServiceForm(p => ({ ...p, description: e.target.value }))} className={`${inputClass} resize-none h-20`} placeholder="Description (optional)" />
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setShowEditServiceModal(false)} className={btnSecondary}>Cancel</button>
                  <button type="submit" className={btnPrimary}>Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── AVAILABILITY MODAL ── */}
        {showAvailabilityModal && availabilityTech && (
          <div className={modalOverlay}>
            <div className="bg-white border border-[#D4AF87]/20 rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto">
              <h3 className="serif text-2xl text-[#985f99] mb-6">{availabilityTech.name} — Availability</h3>
              <div className="space-y-3">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                  const key = day.toLowerCase();
                  const dayData = availability[key] || { available: true, start: "09:00", end: "17:00" };
                  return (
                    <div key={day} className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${dayData.available ? "bg-[#F8F6F2]" : "bg-[#F8F6F2]/50 opacity-60"}`}>
                      <button onClick={() => setAvailability(p => ({ ...p, [key]: { ...p[key], available: !dayData.available } }))} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${dayData.available ? "border-[#985f99] bg-[#985f99]/15" : "border-[#D4AF87]/40"}`}>
                        {dayData.available && <Check className="w-3 h-3 text-[#985f99]" />}
                      </button>
                      <span className="w-24 text-sm font-medium text-[#6B5E50]">{day}</span>
                      {dayData.available ? (
                        <div className="flex items-center gap-2 text-sm text-[#6B5E50]/60">
                          <input type="time" value={dayData.start || "09:00"} onChange={e => setAvailability(p => ({ ...p, [key]: { ...p[key], start: e.target.value } }))} className="bg-white border border-[#D4AF87]/30 rounded-lg px-3 py-1.5 text-[#2d1f2d] text-sm focus:outline-none focus:border-[#985f99]/40" />
                          <span>–</span>
                          <input type="time" value={dayData.end || "17:00"} onChange={e => setAvailability(p => ({ ...p, [key]: { ...p[key], end: e.target.value } }))} className="bg-white border border-[#D4AF87]/30 rounded-lg px-3 py-1.5 text-[#2d1f2d] text-sm focus:outline-none focus:border-[#985f99]/40" />
                        </div>
                      ) : <span className="text-xs text-[#6B5E50]/30">Off</span>}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowAvailabilityModal(false)} className={btnSecondary}>Cancel</button>
                <button onClick={saveAvailability} className={btnPrimary}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
