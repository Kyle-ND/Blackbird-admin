import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Palmtree, KeyRound, Wallet, Sparkles, CalendarX2, Camera, StickyNote, Phone } from "lucide-react";
import { api, money, sastDateKeyOf, sastHourOf, shiftDateKey, toSastDateKey, toSastTime } from "../lib/api";
import { S, Modal, Toast, useToast, ListSkeleton, EmptyState, StatusChip } from "./shared/ui";
import TopBar from "./shared/TopBar";
import PageHeader from "./shared/PageHeader";
import Avatar, { fileToSquareDataUrl } from "./shared/Avatar";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const INACTIVE = ["cancelled", "late_cancel"];

export default function AgentDashboard({ user, onLogout }) {
  const [dateKey, setDateKey] = useState(() => toSastDateKey());
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [timeOff, setTimeOff] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, showToast, clearToast] = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const todayKey = toSastDateKey();

  const loadDay = useCallback(async (key) => {
    setLoading(true); setError("");
    try {
      const data = await api(`/agents/me/bookings?date_from=${key}&date_to=${key}`);
      setBookings(data.filter((b) => sastDateKeyOf(b.start_time) === key).sort((a, b) => a.start_time.localeCompare(b.start_time)));
    } catch (err) { setError(err.message || "Failed to load appointments"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDay(dateKey); }, [dateKey, loadDay]);
  useEffect(() => {
    api("/agents/me").then(setMe).catch(() => {});
    api("/agents/me/availability").then((d) => setAvailability(d.availability || [])).catch(() => {});
    api("/agents/me/time-off").then(setTimeOff).catch(() => {});
  }, []);

  const uploadPhoto = async (file) => {
    if (!file) return;
    try {
      const photo_url = await fileToSquareDataUrl(file);
      setMe(await api("/agents/me", { method: "PATCH", body: { photo_url } }));
      showToast("success", "Photo updated — clients will see it on the website");
    } catch (err) { showToast("error", err.message); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) return showToast("error", "New passwords do not match");
    try {
      await api("/agents/me/password", { method: "PATCH", body: { current_password: pw.current, new_password: pw.next } });
      showToast("success", "Password updated");
      setShowPassword(false); setPw({ current: "", next: "", confirm: "" });
    } catch (err) { showToast("error", err.message); }
  };

  const active = useMemo(() => bookings.filter((b) => !INACTIVE.includes(b.status)), [bookings]);
  const hours = [...new Set(active.map((b) => sastHourOf(b.start_time)))].sort((a, b) => a - b);
  const stats = useMemo(() => {
    const minutes = active.reduce((s, b) => s + Math.round((new Date(b.end_time) - new Date(b.start_time)) / 60000), 0);
    const revenue = active.filter((b) => ["confirmed", "completed"].includes(b.status)).reduce((s, b) => s + parseFloat(b.total_price || 0), 0);
    const next = active.find((b) => new Date(b.start_time) > new Date());
    return { count: active.length, hours: Math.round(minutes / 6) / 10, revenue, next };
  }, [active]);

  const weekday = DAYS[(new Date(`${dateKey}T12:00:00+02:00`).getUTCDay() + 6) % 7];
  const todayHours = availability.find((a) => a.day === weekday);
  const offToday = timeOff.some((t) => t.start_date <= dateKey && t.end_date >= dateKey);

  const extra = (
    <button onClick={() => setShowPassword(true)} title="Change password" aria-label="Change password" className="bb-icon-btn hidden md:inline-flex"><KeyRound className="w-4 h-4" /></button>
  );

  return (
    <div className="min-h-screen text-ink">
      <TopBar area="Technician" navItems={[{ mode: "me", label: "My Appointments", icon: CalendarDays }]} viewMode="me" onNavigate={() => {}} user={user} photoUrl={me?.photo_url} onLogout={onLogout} extra={extra} />

      <main className="pt-24 sm:pt-28 px-4 sm:px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          <PageHeader title={`Hi, ${user?.name?.split(" ")[0]}`} subtitle={offToday ? "You're on leave this day." : todayHours && !todayHours.is_available ? "Your day off." : todayHours ? `Working ${todayHours.start_time}–${todayHours.end_time}` : ""} dateKey={dateKey} onDateChange={setDateKey} onStep={(d) => setDateKey(shiftDateKey(dateKey, d))} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5 animate-rise">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Appointments", value: stats.count, icon: CalendarDays, testId: "agent-count" },
                  { label: "Hours booked", value: `${stats.hours}h`, icon: Clock },
                  { label: "Value", value: `R${money(stats.revenue)}`, icon: Wallet },
                ].map(({ label, value, icon: Icon, testId }) => (
                  <div key={label} className="bb-card-soft px-4 py-3 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-plum/[0.07] hidden sm:flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-plum" /></span>
                    <div className="min-w-0"><p className="bb-kicker">{label}</p><p className="serif text-xl text-plum leading-tight" data-testid={testId}>{value}</p></div>
                  </div>
                ))}
              </div>

              {stats.next && dateKey === todayKey && (
                <div className="bb-card p-4 flex items-center gap-4 border-plum/25 bg-plum/[0.04]">
                  <span className="w-10 h-10 rounded-xl bg-plum text-white flex items-center justify-center flex-shrink-0"><Sparkles className="w-5 h-5" /></span>
                  <div className="min-w-0"><p className="bb-kicker">Up next</p><p className="text-sm text-ink truncate"><strong>{toSastTime(stats.next.start_time)}</strong> · {stats.next.client?.name} · {stats.next.services.map((s) => s.name).join(", ")}</p></div>
                </div>
              )}

              {error && (
                <div role="alert" className="bg-berry/10 border border-berry/25 text-berry rounded-2xl p-4 flex items-center justify-between gap-4 text-sm">
                  <span>{error}</span><button onClick={() => loadDay(dateKey)} className="bb-btn-secondary px-3 py-1.5 text-xs">Retry</button>
                </div>
              )}

              <div className={`${S.statCard} overflow-hidden`}>
                {loading ? <div className="p-4"><ListSkeleton rows={2} height="h-24" /></div> : active.length === 0 ? (
                  <EmptyState icon={CalendarX2} title="A quiet day in the sanctuary" hint="No appointments on this day." />
                ) : (
                  <div className="divide-y divide-gold/15">
                    {hours.map((hour) => (
                      <section key={hour} className="p-3 sm:p-4">
                        <p className="bb-kicker mb-2 pl-1">{String(hour).padStart(2, "0")}:00</p>
                        <div className="space-y-2">
                          {active.filter((b) => sastHourOf(b.start_time) === hour).map((b) => {
                            const duration = Math.round((new Date(b.end_time) - new Date(b.start_time)) / 60000);
                            return (
                              <article key={b.id} data-testid="agent-booking" className="relative bb-card-soft bg-white/80 p-4 pl-5">
                                <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${b.status === "completed" ? "bg-gold" : b.status === "pending" ? "bg-gold" : "bg-plum"}`} />
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className="serif text-lg text-plum whitespace-nowrap">{toSastTime(b.start_time)}–{toSastTime(b.end_time)}</span>
                                      <StatusChip status={b.status} />
                                    </div>
                                    <p className="font-semibold text-ink mt-1 flex items-center gap-2 flex-wrap">{b.client?.name}{b.client?.phone && <span className="text-xs font-normal text-muted flex items-center gap-1"><Phone className="w-3 h-3" /> {b.client.phone}</span>}</p>
                                    <p className="text-sm text-muted mt-0.5">{b.services.map((s) => s.name).join(" · ")}</p>
                                    {b.notes && <p className="text-xs text-muted italic mt-1 flex items-center gap-1"><StickyNote className="w-3 h-3" /> {b.notes}</p>}
                                  </div>
                                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 flex-shrink-0">
                                    <p className="font-semibold text-bronze">R{money(b.total_price)}</p>
                                    <p className="text-xs text-muted flex items-center gap-1"><Clock className="w-3 h-3" />{duration} min</p>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-4 animate-rise">
              <div className={`${S.statCard} p-5 flex items-center gap-4`}>
                <label className="relative cursor-pointer group" title="Change my photo">
                  <Avatar name={user?.name} src={me?.photo_url} size={56} rounded="rounded-full" />
                  <span className="absolute inset-0 rounded-full bg-ink/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"><Camera className="w-4 h-4" /></span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { uploadPhoto(e.target.files?.[0]); e.target.value = ""; }} data-testid="my-photo-file" />
                </label>
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate">{user?.name}</p>
                  <p className="text-xs text-muted truncate">{me?.specialization || "Technician"}</p>
                  <p className="text-[11px] text-plum mt-1">Tap the photo to change it</p>
                </div>
              </div>

              <div className={`${S.statCard} p-5`}>
                <p className="bb-kicker mb-3">My working hours</p>
                <div className="space-y-1">
                  {DAYS.map((day) => {
                    const d = availability.find((a) => a.day === day);
                    const on = d ? d.is_available : true;
                    return (
                      <div key={day} className={`flex justify-between text-sm py-1 rounded-lg px-2 -mx-2 ${day === weekday ? "bg-plum/[0.06]" : ""}`}>
                        <span className="text-bark">{day}</span>
                        <span className={on ? "text-plum tabular-nums" : "text-muted"}>{on ? `${d?.start_time || "08:00"} – ${d?.end_time || "18:00"}` : "Off"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${S.statCard} p-5`}>
                <p className="bb-kicker mb-3 flex items-center gap-2"><Palmtree className="w-3.5 h-3.5 text-bronze" /> Upcoming time off</p>
                {timeOff.length === 0 ? <p className="text-sm text-muted">None scheduled. Ask the front desk to block days for you.</p> : (
                  <ul className="space-y-2 text-sm">
                    {timeOff.map((t) => (
                      <li key={t.id} className="flex justify-between gap-2"><span className="text-bark">{t.start_date}{t.end_date !== t.start_date ? ` → ${t.end_date}` : ""}</span><span className="text-muted truncate">{t.reason || ""}</span></li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={() => setShowPassword(true)} className="bb-btn-secondary w-full py-3 md:hidden"><KeyRound className="w-4 h-4" /> Change password</button>
            </aside>
          </div>
        </div>
      </main>

      {showPassword && (
        <Modal title="Change password" onClose={() => setShowPassword(false)} width="max-w-sm">
          <form onSubmit={changePassword} className="space-y-3">
            {["current", "next", "confirm"].map((k) => (
              <input key={k} type="password" required minLength={6} value={pw[k]} onChange={(e) => setPw((p) => ({ ...p, [k]: e.target.value }))}
                placeholder={k === "current" ? "Current password" : k === "next" ? "New password" : "Confirm new password"} className={S.input} />
            ))}
            <button type="submit" className="bb-btn-primary w-full py-3">Update password</button>
          </form>
        </Modal>
      )}
      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
