import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, UserCog, CalendarClock, Palmtree, KeyRound, Check } from "lucide-react";
import { api } from "../../lib/api";
import { S, Modal, Toggle, groupByCategory, formatRange, ListSkeleton } from "./ui";
import Avatar, { fileToSquareDataUrl } from "./Avatar";
import { Camera, Trash2 as TrashIcon } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ROLE_LABEL = { agent: "Technician", receptionist: "Receptionist", admin: "Admin" };

export default function TechniciansManager({ showToast, isAdmin, currentUserId, onChanged }) {
  const callbacks = useRef({ showToast, onChanged });
  callbacks.current = { showToast, onChanged };
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | agent
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [availabilityFor, setAvailabilityFor] = useState(null);
  const [timeOffFor, setTimeOffFor] = useState(null);
  const [resetFor, setResetFor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [agents, svc] = await Promise.all([api("/agents/"), api("/services/")]);
      setStaff(agents);
      setServices(svc);
      callbacks.current.onChanged?.(agents);
    } catch (err) {
      callbacks.current.showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => groupByCategory(services), [services]);
  const serviceName = (id) => services.find((s) => s.id === id)?.name || "";

  const openNew = () => {
    setForm({ name: "", email: "", password: "", specialization: "", photo_url: "", role: "agent", active_status: true, service_ids: [] });
    setEditing("new");
  };
  const openEdit = (a) => {
    setForm({ name: a.name, email: a.email, password: "", specialization: a.specialization || "", photo_url: a.photo_url || "", role: a.role, active_status: a.active_status, service_ids: a.service_ids || [] });
    setEditing(a);
  };

  const toggleService = (id) =>
    setForm((p) => ({ ...p, service_ids: p.service_ids.includes(id) ? p.service_ids.filter((s) => s !== id) : [...p.service_ids, id] }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return showToast("error", "Name and email are required");
    setSaving(true);
    try {
      if (editing === "new") {
        if (!form.password || form.password.length < 6) throw new Error("Password must be at least 6 characters");
        await api("/agents/create", {
          method: "POST",
          body: { name: form.name.trim(), email: form.email.trim(), password: form.password, specialization: form.specialization.trim() || null, photo_url: form.photo_url.trim() || null, role: form.role, active_status: true, service_ids: form.service_ids },
        });
        showToast("success", "Staff member added");
      } else {
        const body = { name: form.name.trim(), email: form.email.trim(), specialization: form.specialization.trim() || null, photo_url: form.photo_url.trim() || null, active_status: form.active_status, service_ids: form.service_ids };
        if (isAdmin && form.role !== editing.role) body.role = form.role;
        await api(`/agents/${editing.id}`, { method: "PATCH", body });
        showToast("success", "Staff member updated");
      }
      setEditing(null);
      await load();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (a) => {
    try {
      await api(`/agents/${a.id}/status`, { method: "PATCH", body: { active_status: !a.active_status } });
      showToast("success", `${a.name} ${a.active_status ? "deactivated" : "activated"}`);
      await load();
    } catch (err) { showToast("error", err.message); }
  };

  const remove = async (a) => {
    try {
      const res = await api(`/agents/${a.id}`, { method: "DELETE" });
      showToast("success", res.deleted ? `${a.name} deleted` : `${a.name} deactivated (has booking history)`);
      setConfirmDelete(null);
      await load();
    } catch (err) { showToast("error", err.message); }
  };

  return (
    <div data-testid="technicians-manager">
      <div className="flex justify-end mb-5">
        <button onClick={openNew} className={S.btnTop} data-testid="add-technician"><Plus className="w-4 h-4" /> Add Technician</button>
      </div>

      {loading ? (
        <div className="pt-2"><ListSkeleton rows={4} height="h-24" /></div>
      ) : (
        <div className="space-y-3">
          {staff.map((a) => (
            <div key={a.id} className={`${S.statCard} rounded-xl p-4 sm:p-5 hover:bg-white/80 transition-all`} data-testid="tech-row" data-tech-name={a.name}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <Avatar name={a.name} src={a.photo_url} size={44} />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${a.active_status ? "bg-plum/100" : "bg-berry"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink flex items-center gap-2">
                      {a.name}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-plum/10 text-plum uppercase tracking-wide">{ROLE_LABEL[a.role] || a.role}</span>
                      {!a.active_status && <span className="text-[10px] px-2 py-0.5 rounded-full bg-berry/10 text-berry">Inactive</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted flex-wrap">
                      <span className="truncate">{a.email}</span>
                      <span className="text-bronze">·</span>
                      <span className="text-plum font-medium">{a.specialization || "General"}</span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {a.service_ids?.length ? `${a.service_ids.length} linked service${a.service_ids.length === 1 ? "" : "s"}: ${a.service_ids.slice(0, 4).map(serviceName).filter(Boolean).join(", ")}${a.service_ids.length > 4 ? "…" : ""}` : a.role === "agent" ? "All services" : "Not bookable (no services linked)"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openEdit(a)} className={`${S.btnSmall} ${S.btnSmallPurple}`} data-testid="tech-edit"><Pencil className="w-3 h-3" /> Edit</button>
                  <button onClick={() => setAvailabilityFor(a)} className={`${S.btnSmall} ${S.btnSmallGold}`} data-testid="tech-availability"><CalendarClock className="w-3 h-3" /> Hours</button>
                  <button onClick={() => setTimeOffFor(a)} className={`${S.btnSmall} ${S.btnSmallGold}`} data-testid="tech-timeoff"><Palmtree className="w-3 h-3" /> Time off</button>
                  {isAdmin && <button onClick={() => setResetFor(a)} className={`${S.btnSmall} ${S.btnSmallGold}`} data-testid="tech-reset-password"><KeyRound className="w-3 h-3" /> Password</button>}
                  {a.id !== currentUserId && (
                    <button onClick={() => toggleStatus(a)} className={`${S.btnSmall} ${a.active_status ? S.btnSmallRed : S.btnSmallGreen}`} data-testid="tech-toggle">
                      {a.active_status ? "Deactivate" : "Activate"}
                    </button>
                  )}
                  {isAdmin && a.id !== currentUserId && (
                    <button onClick={() => setConfirmDelete(a)} className={`${S.btnSmall} ${S.btnSmallRed}`} title="Delete" aria-label={`Delete ${a.name}`} data-testid="tech-delete"><Trash2 className="w-3 h-3" /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <div className="text-center py-20"><UserCog className="w-10 h-10 text-bronze mx-auto mb-3" /><p className="text-muted text-sm">No staff yet</p></div>
          )}
        </div>
      )}

      {editing && form && (
        <Modal title={editing === "new" ? "Add Technician" : `Edit ${editing.name}`} onClose={() => setEditing(null)} width="max-w-2xl" testId="tech-modal">
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={S.label} htmlFor="tech-name">Name</label>
                <input id="tech-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={S.input} placeholder="Full name" /></div>
              <div><label className={S.label} htmlFor="tech-email">Email (login)</label>
                <input id="tech-email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={S.input} placeholder="name@blackbirdspa.co.za" /></div>
              {editing === "new" && (
                <div><label className={S.label} htmlFor="tech-password">Password</label>
                  <input id="tech-password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className={S.input} placeholder="At least 6 characters" /></div>
              )}
              <div><label className={S.label} htmlFor="tech-spec">Specialization (shown to clients)</label>
                <input id="tech-spec" value={form.specialization} onChange={(e) => setForm((p) => ({ ...p, specialization: e.target.value }))} className={S.input} placeholder="e.g. Nail technician" /></div>
              <div className="sm:col-span-2">
                <label className={S.label}>Photo (shown to clients on the website)</label>
                <div className="flex items-center gap-4 p-3 rounded-xl bg-cream border border-gold/20">
                  <Avatar name={form.name || "?"} src={form.photo_url} size={64} rounded="rounded-full" />
                  <div className="flex flex-wrap gap-2">
                    <label className={`${S.btnSmall} ${S.btnSmallPurple} cursor-pointer`}>
                      <Camera className="w-3.5 h-3.5" /> {form.photo_url ? "Change photo" : "Upload photo"}
                      <input type="file" accept="image/*" className="hidden" data-testid="tech-photo-file"
                        onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setForm((p) => ({ ...p, photo_url: "" })); const url = await fileToSquareDataUrl(f); setForm((p) => ({ ...p, photo_url: url })); } catch (err) { showToast("error", err.message); } e.target.value = ""; }} />
                    </label>
                    {form.photo_url && <button type="button" onClick={() => setForm((p) => ({ ...p, photo_url: "" }))} className={`${S.btnSmall} ${S.btnSmallRed}`}><TrashIcon className="w-3.5 h-3.5" /> Remove</button>}
                    <p className="w-full text-[11px] text-muted">Square crop, resized automatically. Without a photo, clients see the technician's initials.</p>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div><label className={S.label} htmlFor="tech-role">Role</label>
                  <select id="tech-role" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className={S.input}>
                    <option value="agent">Technician</option><option value="receptionist">Receptionist</option><option value="admin">Admin</option>
                  </select></div>
              )}
            </div>

            {editing !== "new" && (
              <div className="flex items-center gap-3 p-3 bg-cream rounded-xl">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted">Status</span>
                <Toggle on={form.active_status} onChange={(v) => setForm((p) => ({ ...p, active_status: v }))} label="Active" />
                <span className={`text-xs font-medium ${form.active_status ? "text-plum" : "text-muted"}`}>
                  {form.active_status ? "Active — can log in and take bookings" : "Inactive — cannot log in, hidden from bookings"}
                </span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={S.label}>Services this person performs</label>
                <span className="text-xs text-muted">{form.service_ids.length === 0 ? (form.role === "agent" ? "None selected = all services" : "Select at least one to make bookable") : `${form.service_ids.length} selected`}</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-3 p-3 rounded-xl bg-cream border border-gold/20">
                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between">
                      <p className={S.sectionTitle}>{cat}</p>
                      <button type="button" className="text-[10px] text-plum"
                        onClick={() => setForm((p) => { const ids = items.map((s) => s.id); const all = ids.every((i) => p.service_ids.includes(i)); return { ...p, service_ids: all ? p.service_ids.filter((i) => !ids.includes(i)) : [...new Set([...p.service_ids, ...ids])] }; })}>
                        toggle all
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1.5">
                      {items.map((s) => {
                        const on = form.service_ids.includes(s.id);
                        return (
                          <label key={s.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${on ? "border-plum bg-plum/10 text-plum" : "border-gold/20 bg-white text-ink"}`}>
                            <input type="checkbox" checked={on} onChange={() => toggleService(s.id)} className="accent-plum" data-testid="tech-service-checkbox" data-service-name={s.name} />
                            <span className="truncate">{s.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className={S.btnSecondary}>Cancel</button>
              <button type="submit" disabled={saving} className={S.btnPrimary} data-testid="tech-save">{saving ? "Saving…" : editing === "new" ? "Add Technician" : "Save Changes"}</button>
            </div>
          </form>
        </Modal>
      )}

      {availabilityFor && <AvailabilityModal agent={availabilityFor} onClose={() => setAvailabilityFor(null)} showToast={showToast} />}
      {timeOffFor && <TimeOffModal agent={timeOffFor} onClose={() => setTimeOffFor(null)} showToast={showToast} />}
      {resetFor && <ResetPasswordModal agent={resetFor} onClose={() => setResetFor(null)} showToast={showToast} />}

      {confirmDelete && (
        <Modal title="Delete staff member?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-bark mb-6"><strong>{confirmDelete.name}</strong> will lose access. If they have booking history the account is deactivated instead of deleted.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className={S.btnSecondary}>Cancel</button>
            <button onClick={() => remove(confirmDelete)} className={`${S.btnPrimary} !bg-berry hover:!bg-berry-dark`}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AvailabilityModal({ agent, onClose, showToast }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api(`/agents/${agent.id}/availability`)
      .then((d) => {
        const map = {};
        d.availability.forEach((r) => { map[r.day] = { available: r.is_available, start: r.start_time || "09:00", end: r.end_time || "17:00" }; });
        setRows(DAYS.map((day) => ({ day, ...(map[day] || { available: true, start: "09:00", end: "17:00" }) })));
      })
      .catch((err) => showToast("error", err.message));
  }, [agent.id, showToast]);

  const save = async () => {
    try {
      await api(`/agents/${agent.id}/availability`, {
        method: "PUT",
        body: { availability: rows.map((r) => ({ day: r.day, is_available: r.available, start_time: r.start, end_time: r.end })) },
      });
      showToast("success", "Working hours saved");
      onClose();
    } catch (err) { showToast("error", err.message); }
  };

  const update = (i, patch) => setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <Modal title={`${agent.name} — Working hours`} onClose={onClose} width="max-w-lg" testId="availability-modal">
      {!rows ? <p className="text-sm text-muted">Loading…</p> : (
        <>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.day} className={`flex items-center gap-3 p-3 rounded-xl ${r.available ? "bg-cream" : "bg-cream/50 opacity-70"}`} data-testid="availability-day" data-day={r.day}>
                <button type="button" onClick={() => update(i, { available: !r.available })} aria-label={`${r.day} working`} aria-pressed={r.available}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${r.available ? "border-plum bg-plum/15" : "border-gold/40"}`}>
                  {r.available && <Check className="w-3 h-3 text-plum" />}
                </button>
                <span className="w-24 text-sm font-medium text-bark">{r.day}</span>
                {r.available ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <input type="time" value={r.start} onChange={(e) => update(i, { start: e.target.value })} className="bg-white border border-gold/30 rounded-lg px-2 py-1.5 text-sm" />
                    <span>–</span>
                    <input type="time" value={r.end} onChange={(e) => update(i, { end: e.target.value })} className="bg-white border border-gold/30 rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                ) : <span className="text-xs text-muted">Day off</span>}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className={S.btnSecondary}>Cancel</button>
            <button onClick={save} className={S.btnPrimary} data-testid="availability-save">Save hours</button>
          </div>
        </>
      )}
    </Modal>
  );
}

function TimeOffModal({ agent, onClose, showToast }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ start_date: "", end_date: "", reason: "" });
  const load = useCallback(() => api(`/agents/${agent.id}/time-off?upcoming_only=false`).then(setItems).catch((e) => showToast("error", e.message)), [agent.id, showToast]);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!form.start_date) return showToast("error", "Pick a start date");
    try {
      await api(`/agents/${agent.id}/time-off`, { method: "POST", body: { start_date: form.start_date, end_date: form.end_date || form.start_date, reason: form.reason || null } });
      setForm({ start_date: "", end_date: "", reason: "" });
      showToast("success", "Time off added — no bookings will be offered on those days");
      load();
    } catch (err) { showToast("error", err.message); }
  };

  const remove = async (id) => {
    try { await api(`/agents/${agent.id}/time-off/${id}`, { method: "DELETE" }); load(); } catch (err) { showToast("error", err.message); }
  };

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  return (
    <Modal title={`${agent.name} — Time off`} onClose={onClose} width="max-w-lg" testId="timeoff-modal">
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end mb-5">
        <div><label className={S.label} htmlFor="to-start">From</label><input id="to-start" type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value, end_date: p.end_date || e.target.value }))} className={S.input} /></div>
        <div><label className={S.label} htmlFor="to-end">To</label><input id="to-end" type="date" value={form.end_date} min={form.start_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} className={S.input} /></div>
        <div><label className={S.label} htmlFor="to-reason">Reason</label><input id="to-reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} className={S.input} placeholder="Leave, sick…" /></div>
        <button type="submit" className="px-4 py-3 rounded-xl bg-plum text-white text-sm font-medium" data-testid="timeoff-add">Block</button>
      </form>
      <div className="divide-y divide-[#D4AF87]/10">
        {items.length === 0 && <p className="py-6 text-sm text-muted text-center">No time off recorded</p>}
        {items.map((t) => (
          <div key={t.id} className={`py-3 flex items-center justify-between ${t.end_date < today ? "opacity-50" : ""}`} data-testid="timeoff-row">
            <div><p className="text-sm font-medium text-ink">{formatRange(t.start_date, t.end_date)}</p><p className="text-xs text-muted">{t.reason || "—"}</p></div>
            <button onClick={() => remove(t.id)} className={`${S.btnSmall} ${S.btnSmallRed}`} aria-label="Remove time off"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ agent, onClose, showToast }) {
  const [pw, setPw] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api(`/agents/${agent.id}/reset-password`, { method: "POST", body: { new_password: pw } });
      showToast("success", `Password reset for ${agent.name}`);
      onClose();
    } catch (err) { showToast("error", err.message); }
  };
  return (
    <Modal title={`Reset password — ${agent.name}`} onClose={onClose} testId="reset-password-modal">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-bark">Set a temporary password and share it with {agent.name.split(" ")[0]}. They can change it from their dashboard.</p>
        <input type="text" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required className={S.input} placeholder="New password (min 6 characters)" data-testid="reset-password-input" />
        <div className="flex gap-3"><button type="button" onClick={onClose} className={S.btnSecondary}>Cancel</button><button type="submit" className={S.btnPrimary} data-testid="reset-password-save">Reset password</button></div>
      </form>
    </Modal>
  );
}
