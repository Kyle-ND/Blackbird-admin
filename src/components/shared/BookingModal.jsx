import React, { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Check, Clock, Sparkles, X, Tag } from "lucide-react";
import { api, money, sastDateKeyOf, sastToIso, toSastTime } from "../../lib/api";
import { S, Modal, groupByCategory } from "./ui";
import Avatar from "./Avatar";

/** New / edit booking dialog used by the receptionist and manager dashboards. */
export default function BookingModal({ booking, dateKey, services, staff, clients, onClientAdded, onSaved, onClose, showToast, initialClient = null }) {
  const editing = !!booking;
  const [date, setDate] = useState(booking ? sastDateKeyOf(booking.start_time) : dateKey);
  const [clientId, setClientId] = useState(booking?.client?.id || initialClient?.id || null);
  const [clientLabel, setClientLabel] = useState(booking?.client?.name || initialClient?.name || "");
  const [clientSearch, setClientSearch] = useState("");
  const [selected, setSelected] = useState(booking ? booking.services.map((s) => s.id) : []);
  const [serviceQuery, setServiceQuery] = useState("");
  const [agentId, setAgentId] = useState(booking?.agent?.id || "");
  const [time, setTime] = useState(booking ? toSastTime(booking.start_time) : "");
  const [notes, setNotes] = useState(booking?.notes || "");
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });

  const visibleServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    return services.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.category || "").toLowerCase().includes(q));
  }, [services, serviceQuery]);
  const grouped = useMemo(() => groupByCategory(visibleServices), [visibleServices]);
  const selectedServices = services.filter((s) => selected.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + parseFloat(s.effective_price ?? s.price), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  const eligibleStaff = useMemo(
    () => staff.filter((a) => a.active_status && (a.role === "agent" || (a.service_ids || []).length > 0))
      .filter((a) => !a.service_ids?.length || selected.every((id) => a.service_ids.includes(id))),
    [staff, selected]
  );
  const chosenAgent = staff.find((a) => a.id === agentId);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return [];
    const digits = q.replace(/\D/g, "");
    return clients.filter((c) => c.name.toLowerCase().includes(q) || (digits && (c.phone || "").replace(/\D/g, "").includes(digits))).slice(0, 8);
  }, [clientSearch, clients]);

  useEffect(() => {
    if (!date || selected.length === 0) { setSlots([]); return; }
    let cancelled = false;
    setLoadingSlots(true);
    const params = new URLSearchParams({ date, service_ids: selected.join(",") });
    if (agentId) params.set("agent_id", agentId);
    api(`/public/availability?${params.toString()}`, { auth: false })
      .then((data) => { if (!cancelled) setSlots(data); })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [date, selected, agentId]);

  const toggleService = (id) => setSelected((p) => (p.includes(id) ? p.filter((s) => s !== id) : [...p, id]));

  const addClient = async () => {
    if (!newClient.name.trim() || !newClient.phone.trim()) return showToast("error", "Name and phone are required");
    try {
      const c = await api("/clients/", { method: "POST", body: { name: newClient.name.trim(), phone: newClient.phone.trim(), email: newClient.email.trim() || null } });
      onClientAdded?.(c);
      setClientId(c.id); setClientLabel(c.name); setClientSearch("");
      setShowNewClient(false); setNewClient({ name: "", phone: "", email: "" });
      showToast("success", "Client added");
    } catch (err) { showToast("error", err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!clientId) return showToast("error", "Select a client");
    if (selected.length === 0) return showToast("error", "Select at least one service");
    if (!time) return showToast("error", "Choose a time");
    setSaving(true);
    try {
      const body = { client_id: clientId, agent_id: agentId || null, start_time: sastToIso(date, time), services: selected.map((id) => ({ service_id: id })), notes: notes.trim() || null };
      const saved = editing ? await api(`/bookings/${booking.id}`, { method: "PUT", body }) : await api("/bookings/", { method: "POST", body });
      showToast("success", editing ? "Booking updated — client and technician emailed" : `Booked with ${saved.agent?.name || "technician"} — confirmation emailed`);
      onSaved(saved);
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const slotTimes = new Set(slots.map((s) => s.time));
  const slotAgents = Object.fromEntries(slots.map((s) => [s.time, s.agent_ids?.length || 0]));

  return (
    <Modal title={editing ? "Edit Booking" : "New Booking"} subtitle={editing ? `${booking.client?.name} · originally ${toSastTime(booking.start_time)}` : "Pick the client, services, technician and an open time."} onClose={onClose} width="max-w-3xl" testId="booking-modal">
      <form onSubmit={submit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <label className={S.label} htmlFor="bk-client">Client</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input id="bk-client" type="text" placeholder="Search by name or phone…" className={`${S.input} pl-9 ${clientId ? "border-plum/40 bg-white" : ""}`} autoComplete="off"
                value={clientSearch || clientLabel}
                onChange={(e) => { setClientSearch(e.target.value); setClientLabel(""); setClientId(null); }} />
              {clientId && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-plum" />}
            </div>
            {filteredClients.length > 0 && !clientId && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gold/25 rounded-xl shadow-float max-h-56 overflow-auto animate-rise">
                {filteredClients.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setClientId(c.id); setClientLabel(c.name); setClientSearch(""); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-cream border-b border-gold/10 last:border-0 flex items-center gap-3" data-testid="client-option">
                    <Avatar name={c.name} size={30} rounded="rounded-full" />
                    <span className="min-w-0"><span className="block text-sm font-medium text-ink truncate">{c.name}</span><span className="block text-xs text-muted">{c.phone}</span></span>
                  </button>
                ))}
              </div>
            )}
            {clientSearch && filteredClients.length === 0 && !clientId && <p className="text-xs text-muted mt-1.5">No match — add them below.</p>}
            <button type="button" onClick={() => setShowNewClient((v) => !v)} className="mt-2 flex items-center gap-1.5 text-xs text-plum hover:underline font-medium">
              <UserPlus className="w-3.5 h-3.5" /> Add new client
            </button>
            {showNewClient && (
              <div className="mt-2 p-3 rounded-xl bg-cream border border-gold/20 grid gap-2 animate-rise">
                <input placeholder="Full name" value={newClient.name} onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))} className={S.inlineInput} data-testid="new-client-name" />
                <input placeholder="Phone" value={newClient.phone} onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))} className={S.inlineInput} data-testid="new-client-phone" />
                <input placeholder="Email (optional)" value={newClient.email} onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))} className={S.inlineInput} />
                <button type="button" onClick={addClient} className="bb-btn-primary py-2 text-xs" data-testid="new-client-save">Save client</button>
              </div>
            )}
          </div>
          <div>
            <label className={S.label} htmlFor="bk-date">Date</label>
            <input id="bk-date" type="date" required value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} className={S.input} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className={S.label + " !mb-0"}>Services</label>
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input value={serviceQuery} onChange={(e) => setServiceQuery(e.target.value)} placeholder="Find a service…" className="bb-input !py-1.5 !pl-8 !text-xs" aria-label="Find a service" />
            </div>
          </div>
          {selectedServices.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2" data-testid="selected-services">
              {selectedServices.map((s) => (
                <span key={s.id} className="bb-chip bg-plum text-white pl-2.5">
                  {s.name} <span className="opacity-70">· {s.duration_minutes}m</span>
                  <button type="button" onClick={() => toggleService(s.id)} aria-label={`Remove ${s.name}`} className="ml-0.5 rounded-full hover:bg-white/20 p-0.5"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="rounded-2xl border border-gold/20 bg-cream/60 p-3 max-h-64 overflow-y-auto space-y-4">
            {Object.keys(grouped).length === 0 && <p className="text-sm text-muted text-center py-6">No services match “{serviceQuery}”.</p>}
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p className="bb-kicker mb-1.5 pl-0.5">{category}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {items.map((s) => {
                    const on = selected.includes(s.id);
                    return (
                      <button type="button" key={s.id} onClick={() => toggleService(s.id)} data-testid="booking-service" data-service-name={s.name} aria-pressed={on}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition-all ${on ? "border-plum bg-plum/10" : "border-gold/20 hover:border-plum/30 bg-white"}`}>
                        <span className="min-w-0">
                          <span className={`block text-sm font-medium truncate ${on ? "text-plum" : "text-ink"}`}>{s.name}</span>
                          <span className="block text-[11px] text-muted">R{money(s.effective_price ?? s.price)}{s.is_on_promo && <Tag className="inline w-3 h-3 ml-1 text-plum" />} · {s.duration_minutes} min</span>
                        </span>
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${on ? "border-plum bg-plum" : "border-gold/40"}`}>{on && <Check className="w-2.5 h-2.5 text-white" />}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {totalPrice > 0 && (
            <div className="mt-2 px-3 py-2 bg-plum/[0.06] border border-plum/15 rounded-xl flex justify-between items-center text-sm">
              <span className="text-muted">{selectedServices.length} service{selectedServices.length === 1 ? "" : "s"} · {totalDuration} min</span>
              <span className="font-semibold text-plum">R{money(totalPrice)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={S.label} htmlFor="bk-tech">Technician</label>
            <div className="relative">
              <select id="bk-tech" value={agentId} onChange={(e) => { setAgentId(e.target.value); setTime(""); }} className={`${S.input} ${chosenAgent ? "pl-11" : ""}`} data-testid="booking-technician">
                <option value="">✨ Auto-assign (least busy)</option>
                {eligibleStaff.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {chosenAgent && <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><Avatar name={chosenAgent.name} src={chosenAgent.photo_url} size={24} rounded="rounded-full" /></span>}
            </div>
            {selected.length > 0 && eligibleStaff.length === 0 && <p className="text-xs text-berry mt-1">No technician offers all of these services together.</p>}
          </div>
          <div>
            <label className={S.label} htmlFor="bk-time">Time (SAST)</label>
            <input id="bk-time" type="time" required value={time} step="300" onChange={(e) => setTime(e.target.value)} className={S.input} data-testid="booking-time" />
          </div>
        </div>

        {selected.length > 0 && (
          <div>
            <p className="text-xs text-muted mb-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {loadingSlots ? "Checking availability…" : slots.length ? `Open times on ${date}${chosenAgent ? ` for ${chosenAgent.name.split(" ")[0]}` : ""}` : "No open slots for this selection — try another day or technician"}
            </p>
            <div className="flex flex-wrap gap-1.5" data-testid="slot-list">
              {slots.map((s) => (
                <button type="button" key={s.time} onClick={() => setTime(s.time)} aria-pressed={time === s.time}
                  className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${time === s.time ? "bg-plum text-white border-plum" : "bg-white border-gold/30 text-bark hover:border-plum/40"}`}
                  title={agentId ? "" : `${slotAgents[s.time]} technician(s) free`}>
                  {s.time}
                </button>
              ))}
            </div>
            {time && !slotTimes.has(time) && !editing && !loadingSlots && (
              <p className="text-xs text-bronze mt-2">{time} is not an open slot — the booking will be refused if it clashes.</p>
            )}
          </div>
        )}

        <div>
          <label className={S.label} htmlFor="bk-notes">Notes</label>
          <input id="bk-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={S.input} placeholder="Allergies, preferences…" />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={S.btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={S.btnPrimary} data-testid="booking-submit">
            {saving ? "Saving…" : editing ? "Update Booking" : <span className="flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> Confirm Booking</span>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
