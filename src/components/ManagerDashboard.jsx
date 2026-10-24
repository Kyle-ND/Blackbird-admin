import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, TrendingUp, Star, UserCog, Scissors, Users, Search as SearchIcon, CalendarX2, Wallet, Percent, CalendarRange, Trophy } from "lucide-react";
import { api, money, sastDateKeyOf, sastLongDate, shiftDateKey, toSastDateKey } from "../lib/api";
import { S, Modal, Toast, useToast, ListSkeleton, EmptyState, STATUS_LABEL } from "./shared/ui";
import TopBar from "./shared/TopBar";
import PageHeader from "./shared/PageHeader";
import BookingCard from "./shared/BookingCard";
import StatTile from "./shared/StatTile";
import ServicesManager from "./shared/ServicesManager";
import TechniciansManager from "./shared/TechniciansManager";
import BookingModal from "./shared/BookingModal";
import ClientsPanel, { ClientCard } from "./shared/ClientsPanel";
import Avatar from "./shared/Avatar";

const INACTIVE = ["cancelled", "late_cancel"];
const SUBTITLES = {
  overview: "How the day and the month are going.",
  revenue: "Booked revenue: confirmed and completed appointments.",
  analytics: "Who keeps the sanctuary busy.",
  clients: "Profiles, notes, history and every booking.",
  technicians: "Staff accounts, services, working hours and leave.",
  services: "Menu, prices, categories and promotions shown on the website.",
};

export default function ManagerDashboard({ user, onLogout, onSwitchView }) {
  const [viewMode, setViewMode] = useState("overview");
  const [scheduleSubView, setScheduleSubView] = useState("daily");
  const [dateKey, setDateKey] = useState(() => toSastDateKey());
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [me, setMe] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [dailyStats, setDailyStats] = useState(null);
  const [monthlyCounts, setMonthlyCounts] = useState({});
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [topClients, setTopClients] = useState({ week: null, month: null });
  const [topTechs, setTopTechs] = useState([]);
  const [topService, setTopService] = useState(null);
  const [selectedTech, setSelectedTech] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, showToast, clearToast] = useToast();
  const [bookingModal, setBookingModal] = useState(null);
  const [clientCardId, setClientCardId] = useState(null);
  const todayKey = toSastDateKey();

  const navItems = [
    { mode: "overview", label: "Overview", icon: BarChart3 },
    { mode: "schedule", label: "Schedule", icon: CalendarDays },
    { mode: "revenue", label: "Revenue", icon: TrendingUp },
    { mode: "analytics", label: "Analytics", icon: Star },
    { mode: "clients", label: "Clients", icon: Users },
    { mode: "technicians", label: "Technicians", icon: UserCog },
    { mode: "services", label: "Services", icon: Scissors },
  ];

  const loadCore = useCallback(async () => {
    try {
      const [a, s, c, m] = await Promise.all([api("/agents/"), api("/services/"), api("/clients/"), api("/agents/me")]);
      setStaff(a); setServices(s); setClients(c); setMe(m);
    } catch (err) { showToast("error", err.message); }
  }, [showToast]);
  const loadDaily = useCallback(async (key) => { try { setDailyStats(await api(`/manager/stats/daily?date=${key}`)); } catch (err) { showToast("error", err.message); } }, [showToast]);
  const loadBookings = useCallback(async (key) => {
    setLoadingBookings(true);
    try { setBookings(await api(`/bookings/by-date?date=${key}`)); } catch (err) { setBookings([]); showToast("error", err.message); } finally { setLoadingBookings(false); }
  }, [showToast]);

  useEffect(() => { (async () => { setLoading(true); await loadCore(); setLoading(false); })(); }, [loadCore]);
  useEffect(() => { loadDaily(dateKey); }, [dateKey, loadDaily]);
  useEffect(() => { if (viewMode === "schedule" || viewMode === "overview") loadBookings(dateKey); }, [dateKey, viewMode, loadBookings]);
  useEffect(() => {
    if (viewMode === "schedule" && scheduleSubView === "monthly") api(`/bookings/counts?month=${dateKey.slice(0, 7)}`).then(setMonthlyCounts).catch(() => {});
  }, [dateKey, viewMode, scheduleSubView]);
  useEffect(() => {
    if (viewMode === "revenue" || viewMode === "overview") {
      api("/manager/revenue/weekly").then(setWeekly).catch(() => {});
      api("/manager/revenue/monthly").then(setMonthly).catch(() => {});
    }
    if (viewMode === "analytics" || viewMode === "overview") {
      Promise.all([api("/manager/top-clients?period=week&limit=1"), api("/manager/top-clients?period=month&limit=1"), api("/manager/top-technicians?period=month&limit=5")])
        .then(([w, m, t]) => { setTopClients({ week: w[0] || null, month: m[0] || null }); setTopTechs(t); }).catch(() => {});
      api("/manager/stats/top-service").then(setTopService).catch(() => setTopService(null));
    }
  }, [viewMode]);

  const filtered = useMemo(
    () => bookings.filter((b) => !selectedTech || b.agent?.id === selectedTech).filter((b) => !searchQuery || b.client?.name?.toLowerCase().includes(searchQuery.toLowerCase())),
    [bookings, selectedTech, searchQuery]
  );
  const activeToday = useMemo(() => bookings.filter((b) => !INACTIVE.includes(b.status)).sort((a, b) => a.start_time.localeCompare(b.start_time)), [bookings]);

  const stepDate = (delta) => {
    if (viewMode === "schedule" && scheduleSubView === "monthly") {
      const [y, m] = dateKey.split("-").map(Number);
      setDateKey(new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 10));
    } else setDateKey(shiftDateKey(dateKey, delta));
  };

  const setStatus = async (b, status) => {
    try {
      await api(`/bookings/${b.id}`, { method: "PATCH", body: { status } });
      showToast("success", `Marked as ${STATUS_LABEL[status].toLowerCase()}`);
      loadBookings(dateKey); loadDaily(dateKey);
    } catch (err) { showToast("error", err.message); }
  };

  const renderMonthlyCalendar = () => {
    const [y, m] = dateKey.split("-").map(Number);
    const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return (
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2 bb-kicker text-plum">{d}</div>)}
        {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const key = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const count = monthlyCounts.counts?.[day] || 0;
          return (
            <button key={day} onClick={() => { setDateKey(key); setScheduleSubView("daily"); }}
              className={`p-2 sm:p-3 rounded-xl min-h-[56px] sm:min-h-[72px] border transition-all ${count > 0 ? "bg-plum/[0.07] border-plum/20 hover:bg-plum/10" : "bg-white/60 border-gold/15 hover:bg-plum/5"} ${key === todayKey ? "ring-2 ring-plum/40" : ""}`}>
              <span className={`block text-sm font-medium ${count ? "text-plum" : "text-muted"}`}>{day}</span>
              {count > 0 && <span className="bb-chip bg-plum text-white !px-1.5 !text-[10px] mt-1">{count}</span>}
            </button>
          );
        })}
      </div>
    );
  };

  const scheduleControls = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-0.5 p-1 rounded-xl bg-white border border-gold/25 shadow-sm">
        {["daily", "monthly"].map((v) => (
          <button key={v} onClick={() => setScheduleSubView(v)} className={`px-3 h-9 rounded-lg text-sm font-medium capitalize ${scheduleSubView === v ? "bg-plum/10 text-plum" : "text-bark hover:text-plum"}`}>{v}</button>
        ))}
      </div>
      {scheduleSubView === "daily" && (
        <>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search client…" className="bb-input !py-2.5 pl-9 !w-44 bg-white shadow-sm" />
          </div>
          <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} aria-label="Filter by technician" className="bb-input !w-auto !py-2.5 pr-9 bg-white shadow-sm">
            <option value="">All technicians</option>
            {staff.filter((t) => t.active_status && (t.role === "agent" || t.service_ids?.length)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen text-ink">
      <TopBar area="Manager" navItems={navItems} viewMode={viewMode} onNavigate={setViewMode} user={user} photoUrl={me?.photo_url}
        onLogout={onLogout} onNewBooking={() => setBookingModal({})} onSwitchView={onSwitchView} switchLabel="Front desk" />

      <main className="pt-24 sm:pt-28 px-4 sm:px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title={navItems.find((n) => n.mode === viewMode)?.label}
            subtitle={SUBTITLES[viewMode]}
            dateKey={viewMode === "overview" || viewMode === "schedule" ? dateKey : null}
            onDateChange={setDateKey}
            onStep={stepDate}
            stepLabel={viewMode === "schedule" && scheduleSubView === "monthly" ? "month" : "day"}
            right={viewMode === "schedule" ? scheduleControls : null}
          />

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div className="bb-skeleton h-36" /><div className="bb-skeleton h-36" /><div className="bb-skeleton h-36" /><div className="bb-skeleton h-36" /></div>
          ) : (
            <>
              {viewMode === "overview" && (
                <div className="space-y-6 animate-rise">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="overview-stats">
                    <StatTile label="Revenue (booked)" value={`R${money(dailyStats?.revenue)}`} sub="Confirmed + completed" icon={Wallet} />
                    <StatTile label="Bookings" value={dailyStats?.bookings_count ?? 0} sub={`${dailyStats?.cancelled_bookings ?? 0} cancelled · ${dailyStats?.no_shows ?? 0} no-show`} icon={CalendarDays} />
                    <StatTile label="Occupancy" value={`${dailyStats?.occupancy_rate ?? 0}%`} sub="Of technicians' opening hours" icon={Percent} />
                    <StatTile label="This month" value={`R${money(monthly?.revenue)}`} sub={monthly ? `${monthly.bookings_count} bookings · best day ${monthly.top_day ? sastLongDate(monthly.top_day).split(",")[1]?.trim() : "—"}` : ""} icon={CalendarRange} accent />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className={`${S.statCard} p-5 lg:col-span-2`}>
                      <div className="flex items-center justify-between mb-4">
                        <p className="bb-kicker">Today's appointments</p>
                        <button onClick={() => setViewMode("schedule")} className="text-xs text-plum hover:underline">Open schedule →</button>
                      </div>
                      {loadingBookings ? <ListSkeleton rows={2} height="h-16" /> : activeToday.length === 0 ? (
                        <EmptyState icon={CalendarX2} title="Nothing booked" hint="No appointments on this day yet." />
                      ) : (
                        <div className="space-y-2">{activeToday.slice(0, 5).map((b) => <BookingCard key={b.id} b={b} onEdit={(bk) => setBookingModal({ booking: bk })} onStatus={setStatus} compact />)}
                          {activeToday.length > 5 && <p className="text-xs text-muted text-center pt-1">+{activeToday.length - 5} more on the schedule</p>}
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className={`${S.statCard} p-5`}>
                        <p className="bb-kicker mb-3 flex items-center gap-2"><Trophy className="w-3.5 h-3.5 text-bronze" /> Top technicians · month</p>
                        {topTechs.length ? topTechs.slice(0, 3).map((t, i) => (
                          <div key={t.id} className="flex items-center justify-between py-2 border-b border-gold/15 last:border-0">
                            <span className="text-sm text-ink flex items-center gap-2"><span className="serif text-bronze w-4">{i + 1}</span><Avatar name={t.name} src={staff.find((s) => s.id === t.id)?.photo_url} size={24} rounded="rounded-full" />{t.name}</span>
                            <span className="text-xs text-muted">{t.bookings} · R{money(t.revenue)}</span>
                          </div>
                        )) : <p className="text-sm text-muted">No data yet</p>}
                      </div>
                      <div className={`${S.statCard} p-5`}>
                        <p className="bb-kicker mb-2">Most booked service · month</p>
                        {topService ? <><p className="serif text-xl text-plum">{topService.service_name}</p><p className="text-xs text-muted mt-1">{topService.total_bookings} bookings · R{money(topService.revenue)}</p></> : <p className="text-sm text-muted">No data yet</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewMode === "schedule" && (
                scheduleSubView === "daily" ? (
                  <div className={`${S.statCard} p-3 sm:p-4 animate-rise`} data-testid="manager-schedule">
                    {loadingBookings ? <ListSkeleton rows={3} height="h-24" /> : filtered.length === 0 ? (
                      <EmptyState icon={CalendarX2} title="No bookings for this day" hint={searchQuery || selectedTech ? "Try clearing the search or technician filter." : undefined} />
                    ) : (
                      <div className="space-y-2">{filtered.map((b) => <BookingCard key={b.id} b={b} onInfo={(bk) => setClientCardId(bk.client?.id)} onEdit={(bk) => setBookingModal({ booking: bk })} onStatus={setStatus} />)}</div>
                    )}
                  </div>
                ) : (
                  <div className={`${S.statCard} p-3 sm:p-5 animate-rise`}>{renderMonthlyCalendar()}</div>
                )
              )}

              {viewMode === "revenue" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-rise">
                  <StatTile label={dateKey === todayKey ? "Today" : sastLongDate(dateKey)} value={`R${money(dailyStats?.revenue)}`} sub={`${dailyStats?.bookings_count ?? 0} bookings · ${dailyStats?.occupancy_rate ?? 0}% occupancy`} icon={Wallet} />
                  <StatTile label="This week" value={`R${money(weekly?.revenue)}`} sub={weekly ? `${weekly.bookings_count} bookings · ${weekly.week_start} → ${weekly.week_end}` : ""} icon={CalendarDays} />
                  <StatTile label="This month" value={`R${money(monthly?.revenue)}`} sub={monthly ? `${monthly.bookings_count} bookings · best day ${monthly.top_day || "—"} (R${money(monthly.top_day_revenue)})` : ""} icon={CalendarRange} accent />
                </div>
              )}

              {viewMode === "analytics" && (
                <div className="space-y-4 animate-rise">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[["Top client this week", topClients.week], ["Top client this month", topClients.month]].map(([label, c]) => (
                      <div key={label} className={`${S.statCard} p-6`}>
                        <p className="bb-kicker mb-4">{label}</p>
                        {c ? (
                          <div className="flex items-center gap-4">
                            <Avatar name={c.name} size={48} rounded="rounded-full" />
                            <div><p className="serif text-2xl text-plum">{c.name}</p><p className="text-sm text-muted">{c.visits} visits · R{money(c.revenue)}</p></div>
                          </div>
                        ) : <p className="text-muted text-sm">No data available</p>}
                      </div>
                    ))}
                  </div>
                  <div className={`${S.statCard} p-6`}>
                    <p className="bb-kicker mb-5">Top technicians this month</p>
                    {topTechs.length ? topTechs.map((t, i) => (
                      <div key={t.id} className="flex items-center justify-between py-3 border-b border-gold/15 last:border-0">
                        <div className="flex items-center gap-4"><span className="serif text-2xl text-bronze w-6">{i + 1}</span><Avatar name={t.name} src={staff.find((s) => s.id === t.id)?.photo_url} size={36} rounded="rounded-full" /><div><p className="font-medium text-ink">{t.name}</p><p className="text-xs text-muted">{t.bookings} bookings</p></div></div>
                        <p className="text-sm font-semibold text-bronze">R{money(t.revenue)}</p>
                      </div>
                    )) : <p className="text-muted text-sm">No data available</p>}
                  </div>
                </div>
              )}

              {viewMode === "clients" && <ClientsPanel showToast={showToast} onBook={(c) => setBookingModal({ client: c })} onOpenBooking={(b) => setBookingModal({ booking: b })} />}
              {viewMode === "technicians" && <TechniciansManager showToast={showToast} isAdmin={user.role === "admin"} currentUserId={user.id} onChanged={setStaff} />}
              {viewMode === "services" && <ServicesManager showToast={showToast} onChanged={(active) => setServices(active)} />}
            </>
          )}
        </div>
      </main>

      <Toast toast={toast} onClose={clearToast} />

      {bookingModal && (
        <BookingModal booking={bookingModal.booking || null} initialClient={bookingModal.client || null} dateKey={dateKey} services={services} staff={staff} clients={clients}
          onClientAdded={(c) => setClients((p) => [...p, c])} onClose={() => setBookingModal(null)} showToast={showToast}
          onSaved={(saved) => { setBookingModal(null); const k = sastDateKeyOf(saved.start_time); setDateKey(k); setViewMode("schedule"); setScheduleSubView("daily"); loadBookings(k); loadDaily(k); }} />
      )}
      {clientCardId && <ClientCard clientId={clientCardId} onClose={() => setClientCardId(null)} showToast={showToast} onBook={(c) => { setClientCardId(null); setBookingModal({ client: c }); }} />}
    </div>
  );
}
