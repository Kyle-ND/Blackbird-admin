import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Calendar, Scissors, UserCog, Users, Undo2, Plus, CalendarX2, Wallet, Clock, Users2 } from "lucide-react";
import { api, money, sastDateKeyOf, sastHourOf, shiftDateKey, toSastDateKey, toSastTime } from "../lib/api";
import { S, Modal, Toast, useToast, ListSkeleton, EmptyState, STATUS_LABEL } from "./shared/ui";
import TopBar from "./shared/TopBar";
import PageHeader from "./shared/PageHeader";
import BookingCard from "./shared/BookingCard";
import ServicesManager from "./shared/ServicesManager";
import TechniciansManager from "./shared/TechniciansManager";
import BookingModal from "./shared/BookingModal";
import ClientsPanel from "./shared/ClientsPanel";
import Avatar from "./shared/Avatar";

const INACTIVE = ["cancelled", "late_cancel"];
const BLOCKING = ["pending", "confirmed", "completed", "no_show"];

const monthRange = (dateKey) => {
  const [y, m] = dateKey.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [first, `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`];
};

const SUBTITLES = {
  clients: "Profiles, notes, history and every booking.",
  services: "Menu, prices, categories and promotions shown on the website.",
  agents: "Staff accounts, the services they perform, working hours and leave.",
};

export default function ReceptionistDashboard({ user, onLogout, onSwitchView }) {
  const [viewMode, setViewMode] = useState("schedule");
  const [dateKey, setDateKey] = useState(() => toSastDateKey());
  const [selectedTech, setSelectedTech] = useState("");
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [bookingsByDay, setBookingsByDay] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [error, setError] = useState("");
  const [toast, showToast, clearToast] = useToast();
  const [bookingModal, setBookingModal] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [undo, setUndo] = useState(null);
  const [me, setMe] = useState(null);

  const todayKey = toSastDateKey();
  const navItems = [
    { mode: "schedule", label: "Schedule", icon: CalendarDays },
    { mode: "monthly", label: "Monthly", icon: Calendar },
    { mode: "clients", label: "Clients", icon: Users },
    { mode: "services", label: "Services", icon: Scissors },
    { mode: "agents", label: "Technicians", icon: UserCog },
  ];

  const loadCore = useCallback(async () => {
    try {
      const [a, s, c, m] = await Promise.all([api("/agents/"), api("/services/"), api("/clients/"), api("/agents/me")]);
      setStaff(a); setServices(s); setClients(c); setMe(m);
      setError("");
    } catch (err) { setError(err.message); }
  }, []);

  const loadMonth = useCallback(async (key) => {
    const [from, to] = monthRange(key);
    setLoadingMonth(true);
    try {
      const data = await api(`/bookings/?date_from=${from}&date_to=${to}&limit=2000`);
      const grouped = {};
      data.forEach((b) => { const k = sastDateKeyOf(b.start_time); (grouped[k] = grouped[k] || []).push(b); });
      Object.values(grouped).forEach((list) => list.sort((a, b) => a.start_time.localeCompare(b.start_time)));
      setBookingsByDay((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => { if (k >= from && k <= to) delete next[k]; });
        return { ...next, ...grouped };
      });
    } catch (err) { showToast("error", err.message); } finally { setLoadingMonth(false); }
  }, [showToast]);

  useEffect(() => {
    (async () => { setLoading(true); await Promise.all([loadCore(), loadMonth(dateKey)]); setLoading(false); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { loadMonth(dateKey); }, [dateKey.slice(0, 7), loadMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshBookings = () => loadMonth(dateKey);

  const dayBookings = useMemo(() => (bookingsByDay[dateKey] || []).filter((b) => !selectedTech || b.agent?.id === selectedTech), [bookingsByDay, dateKey, selectedTech]);
  const activeDay = dayBookings.filter((b) => !INACTIVE.includes(b.status));
  const hours = [...new Set(activeDay.map((b) => sastHourOf(b.start_time)))].sort((a, b) => a - b);
  const daySummary = useMemo(() => {
    const live = activeDay.filter((b) => BLOCKING.includes(b.status));
    const revenue = live.filter((b) => ["confirmed", "completed"].includes(b.status)).reduce((s, b) => s + parseFloat(b.total_price || 0), 0);
    const minutes = live.reduce((s, b) => s + Math.round((new Date(b.end_time) - new Date(b.start_time)) / 60000), 0);
    const techs = new Set(live.map((b) => b.agent?.id).filter(Boolean)).size;
    return { count: live.length, revenue, hours: Math.round(minutes / 6) / 10, techs };
  }, [activeDay]);

  const setStatus = async (booking, status, { allowUndo = false } = {}) => {
    try {
      await api(`/bookings/${booking.id}`, { method: "PATCH", body: { status } });
      await refreshBookings();
      if (allowUndo) {
        setUndo({ booking, previous: booking.status });
        setTimeout(() => setUndo((u) => (u && u.booking.id === booking.id ? null : u)), 6000);
        showToast("info", `Booking ${STATUS_LABEL[status].toLowerCase()} — the client and technician have been emailed`);
      } else {
        showToast("success", `Marked as ${STATUS_LABEL[status].toLowerCase()}`);
      }
    } catch (err) { showToast("error", err.message); }
  };

  const undoCancel = async () => {
    if (!undo) return;
    try {
      await api(`/bookings/${undo.booking.id}`, { method: "PATCH", body: { status: undo.previous || "confirmed" } });
      setUndo(null);
      await refreshBookings();
      showToast("success", "Booking restored");
    } catch (err) { showToast("error", err.message); }
  };

  const stepDate = (delta) => {
    if (viewMode === "monthly") {
      const [y, m] = dateKey.split("-").map(Number);
      setDateKey(new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 10));
    } else setDateKey(shiftDateKey(dateKey, delta));
  };

  const techFilter = (
    <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} data-testid="tech-filter" aria-label="Filter by technician"
      className="bb-input !w-auto !py-2.5 pr-9 bg-white shadow-sm">
      <option value="">All technicians</option>
      {staff.filter((t) => t.role === "agent" || t.service_ids?.length).map((t) => <option key={t.id} value={t.id}>{t.name}{t.active_status ? "" : " (inactive)"}</option>)}
    </select>
  );

  if (loading) {
    return (
      <div className="min-h-screen pt-28 px-6 max-w-7xl mx-auto">
        <div className="bb-skeleton h-14 w-full mb-8" /><div className="bb-skeleton h-10 w-72 mb-6" /><ListSkeleton rows={3} height="h-24" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-ink">
      <TopBar area="Front desk" navItems={navItems} viewMode={viewMode} onNavigate={setViewMode} user={user} photoUrl={me?.photo_url}
        onLogout={onLogout} onNewBooking={() => setBookingModal({})} onSwitchView={onSwitchView} switchLabel="Manager view" />

      <main className="pt-24 sm:pt-28 px-4 sm:px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title={navItems.find((n) => n.mode === viewMode)?.label}
            subtitle={SUBTITLES[viewMode]}
            dateKey={viewMode === "schedule" || viewMode === "monthly" ? dateKey : null}
            onDateChange={setDateKey}
            onStep={stepDate}
            stepLabel={viewMode === "monthly" ? "month" : "day"}
            right={viewMode === "schedule" || viewMode === "monthly" ? techFilter : null}
          />

          {error && <div role="alert" className="mb-6 bg-berry/10 border border-berry/25 text-berry rounded-2xl p-4 text-sm flex justify-between"><span>{error}</span><button onClick={loadCore} className="underline">Retry</button></div>}

          {viewMode === "schedule" && (
            <div className="space-y-5 animate-rise">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="day-summary">
                {[
                  { label: "Appointments", value: daySummary.count, icon: CalendarDays },
                  { label: "Booked revenue", value: `R${money(daySummary.revenue)}`, icon: Wallet },
                  { label: "Hours booked", value: `${daySummary.hours}h`, icon: Clock },
                  { label: "Technicians busy", value: daySummary.techs, icon: Users2 },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bb-card-soft px-4 py-3 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-plum/[0.07] flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-plum" /></span>
                    <div className="min-w-0"><p className="bb-kicker">{label}</p><p className="serif text-xl text-plum leading-tight">{value}</p></div>
                  </div>
                ))}
              </div>

              <div className={`${S.statCard} overflow-hidden`} data-testid="schedule">
                {loadingMonth && activeDay.length === 0 ? (
                  <div className="p-5"><ListSkeleton rows={2} height="h-24" /></div>
                ) : activeDay.length === 0 ? (
                  <EmptyState icon={CalendarX2} title="A quiet day in the sanctuary" hint={selectedTech ? "No appointments for this technician on this day." : "Nothing booked yet for this day."}
                    action={<button onClick={() => setBookingModal({})} className="bb-btn-primary px-5 py-2.5"><Plus className="w-4 h-4" /> New booking</button>} />
                ) : (
                  <div className="divide-y divide-gold/15">
                    {hours.map((hour) => (
                      <section key={hour} className="p-3 sm:p-4">
                        <p className="bb-kicker mb-2 pl-1">{String(hour).padStart(2, "0")}:00</p>
                        <div className="space-y-2">
                          {activeDay.filter((b) => sastHourOf(b.start_time) === hour).map((b) => (
                            <BookingCard key={b.id} b={b} onInfo={setClientDetail} onEdit={(bk) => setBookingModal({ booking: bk })} onStatus={setStatus} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
                {dayBookings.some((b) => INACTIVE.includes(b.status)) && (
                  <details className="border-t border-gold/15 p-3 sm:p-4 group">
                    <summary className="text-xs text-muted cursor-pointer select-none hover:text-plum">Cancelled on this day ({dayBookings.filter((b) => INACTIVE.includes(b.status)).length})</summary>
                    <div className="space-y-2 mt-3">{dayBookings.filter((b) => INACTIVE.includes(b.status)).map((b) => <BookingCard key={b.id} b={b} onInfo={setClientDetail} onStatus={setStatus} compact />)}</div>
                  </details>
                )}
              </div>
            </div>
          )}

          {viewMode === "monthly" && (
            <div className={`${S.statCard} p-3 sm:p-5 animate-rise`}>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2 bb-kicker text-plum">{d}</div>)}
                {(() => {
                  const [y, m] = dateKey.split("-").map(Number);
                  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
                  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
                  const cells = [];
                  for (let i = 0; i < offset; i++) cells.push(<div key={`e-${i}`} />);
                  for (let d = 1; d <= days; d++) {
                    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    const list = (bookingsByDay[key] || []).filter((b) => !INACTIVE.includes(b.status) && (!selectedTech || b.agent?.id === selectedTech));
                    const weekend = ((offset + d - 1) % 7) >= 5;
                    cells.push(
                      <button key={d} onClick={() => { setDateKey(key); setViewMode("schedule"); }}
                        className={`p-2 rounded-xl min-h-[64px] sm:min-h-[92px] text-left transition-all border ${list.length ? "bg-plum/[0.07] border-plum/20 hover:bg-plum/10" : weekend ? "bg-gold/[0.08] border-gold/15 hover:bg-gold/15" : "bg-white/60 border-gold/15 hover:bg-plum/5"} ${key === todayKey ? "ring-2 ring-plum/40" : ""}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${list.length ? "text-plum" : "text-muted"}`}>{d}</span>
                          {list.length > 0 && <span className="bb-chip bg-plum text-white !px-1.5 !text-[10px]">{list.length}</span>}
                        </div>
                        <div className="mt-1 space-y-0.5 overflow-hidden hidden sm:block">
                          {list.slice(0, 2).map((b) => <p key={b.id} className="text-[10px] text-plum truncate">{toSastTime(b.start_time)} {b.client?.name}</p>)}
                          {list.length > 2 && <p className="text-[10px] text-muted">+{list.length - 2} more</p>}
                        </div>
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>
          )}

          {viewMode === "clients" && (
            <ClientsPanel showToast={showToast} onBook={(c) => setBookingModal({ client: c })} onOpenBooking={(b) => setBookingModal({ booking: b })} />
          )}
          {viewMode === "services" && <ServicesManager showToast={showToast} onChanged={(active) => setServices(active)} />}
          {viewMode === "agents" && <TechniciansManager showToast={showToast} isAdmin={user.role === "admin"} currentUserId={user.id} onChanged={setStaff} />}
        </div>
      </main>

      <Toast toast={toast} onClose={clearToast} />

      {undo && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-ink text-white px-5 py-3 rounded-2xl shadow-float flex items-center gap-4 z-[120] text-sm font-medium animate-rise">
          Booking cancelled
          <button onClick={undoCancel} className="bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-xl flex items-center gap-1.5"><Undo2 className="w-3.5 h-3.5" /> Undo</button>
        </div>
      )}

      {bookingModal && (
        <BookingModal booking={bookingModal.booking || null} initialClient={bookingModal.client || null} dateKey={dateKey} services={services} staff={staff} clients={clients}
          onClientAdded={(c) => setClients((p) => [...p, c])} onClose={() => setBookingModal(null)} showToast={showToast}
          onSaved={async (saved) => { setBookingModal(null); const k = sastDateKeyOf(saved.start_time); setDateKey(k); setViewMode("schedule"); await loadMonth(k); }} />
      )}

      {clientDetail && <BookingInfoModal booking={clientDetail} onClose={() => setClientDetail(null)} showToast={showToast} />}
    </div>
  );
}

function BookingInfoModal({ booking, onClose, showToast }) {
  const [link, setLink] = useState("");
  useEffect(() => { api(`/bookings/${booking.id}/manage-link`).then((d) => setLink(d.manage_url)).catch(() => {}); }, [booking.id]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); showToast("success", "Manage link copied — send it to the client"); } catch { showToast("error", "Could not copy"); }
  };
  return (
    <Modal title="Booking details" subtitle={`${toSastTime(booking.start_time)}–${toSastTime(booking.end_time)} · ${booking.services.map((s) => s.name).join(", ")}`} onClose={onClose} width="max-w-md">
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={booking.client?.name} size={44} rounded="rounded-full" />
        <div><p className="font-semibold text-ink">{booking.client?.name}</p><p className="text-xs text-muted">{booking.client?.phone}{booking.client?.email ? ` · ${booking.client.email}` : ""}</p></div>
      </div>
      {[["Technician", booking.agent?.name], ["Status", STATUS_LABEL[booking.status] || booking.status], ["Total", `R${money(booking.total_price)}`], ["Notes", booking.notes]].map(([label, value]) => (
        <div key={label} className="flex justify-between items-start py-2.5 border-b border-gold/15">
          <span className="bb-kicker pt-0.5">{label}</span>
          <span className="text-sm font-medium text-plum text-right max-w-[60%] break-words">{value || "—"}</span>
        </div>
      ))}
      <div className="pt-4">
        <p className="bb-kicker mb-2">Client self-service link</p>
        <p className="text-xs text-muted mb-2">Lets the client reschedule or cancel online. It's in their confirmation email; copy it here to resend.</p>
        <div className="flex gap-2">
          <input readOnly value={link} className={S.inlineInput} data-testid="manage-link-input" />
          <button onClick={copy} disabled={!link} className="bb-btn-secondary px-4 text-xs">Copy</button>
        </div>
      </div>
    </Modal>
  );
}
