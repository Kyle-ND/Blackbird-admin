import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Pencil, Plus, Phone, Mail, StickyNote, CalendarDays, Clock, Settings2, Download, MailCheck } from "lucide-react";
import { api, download, money, sastDateKeyOf, toSastTime } from "../../lib/api";
import { S, Modal } from "./ui";
import Avatar from "./Avatar";

const STATUS_LABEL = { pending: "Pending", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", no_show: "No-show", late_cancel: "Late cancel" };
const STATUS_TONE = {
  confirmed: "bg-plum/10 text-plum", pending: "bg-gold/15 text-bronze", completed: "bg-plum/10 text-plum",
  cancelled: "bg-berry/10 text-berry", late_cancel: "bg-berry/10 text-berry", no_show: "bg-bark/10 text-bark",
};
const longDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });

/**
 * Client directory + full client card (profile, notes, stats, every booking).
 * Used by the receptionist and manager dashboards.
 */
export default function ClientsPanel({ showToast, onBook, onOpenBooking, initialClientId = null }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(initialClientId);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [newsletterCount, setNewsletterCount] = useState(null);
  const [exporting, setExporting] = useState("");

  useEffect(() => { api("/clients/newsletter").then((rows) => setNewsletterCount(rows.length)).catch(() => {}); }, []);

  const exportCsv = async (kind) => {
    setExporting(kind);
    try {
      const name = await download(kind === "newsletter" ? "/clients/newsletter.csv" : "/clients/export.csv", `${kind}.csv`);
      showToast("success", `Downloaded ${name}`);
    } catch (err) { showToast("error", err.message); } finally { setExporting(""); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setClients(await api("/clients/")); } catch (err) { showToast("error", err.message); } finally { setLoading(false); }
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return clients.filter((c) => !q || c.name.toLowerCase().includes(q) || (digits && (c.phone || "").replace(/\D/g, "").includes(digits)) || (c.email || "").toLowerCase().includes(q));
  }, [clients, search]);

  const addClient = async (e) => {
    e.preventDefault();
    try {
      const c = await api("/clients/", { method: "POST", body: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || null, notes: form.notes.trim() || null } });
      setClients((p) => [...p, c].sort((a, b) => a.name.localeCompare(b.name)));
      setAdding(false);
      setForm({ name: "", phone: "", email: "", notes: "" });
      showToast("success", "Client added");
      setSelectedId(c.id);
    } catch (err) { showToast("error", err.message); }
  };

  return (
    <div className="space-y-4" data-testid="clients-panel">
      <div className="flex flex-wrap gap-3 justify-between">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or email…" className={`${S.input} pl-9`} data-testid="client-search" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportCsv("newsletter")} disabled={exporting === "newsletter"} className={`${S.btnSmall} ${S.btnSmallGold} px-4 py-2.5`} data-testid="export-newsletter" title="Everyone who ticked the newsletter box on the website">
            <MailCheck className="w-4 h-4" /> Newsletter list{newsletterCount !== null ? ` (${newsletterCount})` : ""} · CSV
          </button>
          <button onClick={() => exportCsv("clients")} disabled={exporting === "clients"} className={`${S.btnSmall} ${S.btnSmallGold} px-4 py-2.5`} data-testid="export-clients">
            <Download className="w-4 h-4" /> All clients · CSV
          </button>
          <button onClick={() => setAdding(true)} className={S.btnTop} data-testid="add-client"><UserPlus className="w-4 h-4" /> Add Client</button>
        </div>
      </div>
      <p className="text-xs text-muted -mt-1">The newsletter CSV only contains people who gave consent on the website and haven't unsubscribed. Every mailing you send must include an unsubscribe link (POPIA s69).</p>

      <div className={`${S.statCard} divide-y divide-[#D4AF87]/10`}>
        {loading ? <p className="p-10 text-center text-sm text-muted">Loading…</p> : list.slice(0, 300).map((c) => (
          <button key={c.id} onClick={() => setSelectedId(c.id)} className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-white/70 transition-colors" data-testid="client-row" data-client-name={c.name}>
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={c.name} size={40} rounded="rounded-full" />
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{c.name}</p>
                <p className="text-xs text-muted truncate">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
              </div>
            </div>
            <span className="text-xs text-plum flex-shrink-0">View →</span>
          </button>
        ))}
        {!loading && list.length === 0 && <p className="p-10 text-center text-sm text-muted">No clients found</p>}
      </div>

      {adding && (
        <Modal title="Add Client" onClose={() => setAdding(false)}>
          <form onSubmit={addClient} className="space-y-3">
            <div><label className={S.label} htmlFor="cl1">Full name</label><input id="cl1" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={S.input} required /></div>
            <div><label className={S.label} htmlFor="cl2">Phone</label><input id="cl2" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={S.input} required /></div>
            <div><label className={S.label} htmlFor="cl3">Email</label><input id="cl3" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={S.input} /></div>
            <div><label className={S.label} htmlFor="cl4">Notes</label><textarea id="cl4" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className={`${S.input} h-20 resize-none`} placeholder="Allergies, preferences…" /></div>
            <div className="flex gap-3 pt-2"><button type="button" onClick={() => setAdding(false)} className={S.btnSecondary}>Cancel</button><button type="submit" className={S.btnPrimary}>Save</button></div>
          </form>
        </Modal>
      )}

      {selectedId && (
        <ClientCard
          clientId={selectedId}
          onClose={() => setSelectedId(null)}
          onBook={onBook}
          onOpenBooking={onOpenBooking}
          showToast={showToast}
          onUpdated={(c) => setClients((p) => p.map((x) => (x.id === c.id ? c : x)))}
        />
      )}
    </div>
  );
}

export function ClientCard({ clientId, onClose, onBook, onOpenBooking, showToast, onUpdated }) {
  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("upcoming");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([api(`/clients/${clientId}`), api(`/clients/${clientId}/bookings`)]);
      setSummary(s); setBookings(b);
    } catch (err) { showToast("error", err.message); }
  }, [clientId, showToast]);
  useEffect(() => { load(); }, [load]);

  const now = Date.now();
  const upcoming = bookings.filter((b) => new Date(b.start_time).getTime() > now && !["cancelled", "late_cancel"].includes(b.status)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const past = bookings.filter((b) => new Date(b.start_time).getTime() <= now && !["cancelled", "late_cancel"].includes(b.status));
  const cancelled = bookings.filter((b) => ["cancelled", "late_cancel"].includes(b.status));
  const shown = tab === "upcoming" ? upcoming : tab === "past" ? past : cancelled;

  const startEdit = () => { setForm({ name: summary.client.name, phone: summary.client.phone, email: summary.client.email || "", notes: summary.client.notes || "" }); setEditing(true); };
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const c = await api(`/clients/${clientId}`, { method: "PATCH", body: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || null, notes: form.notes } });
      onUpdated?.(c);
      setEditing(false);
      showToast("success", "Client updated");
      await load();
    } catch (err) { showToast("error", err.message); } finally { setSaving(false); }
  };

  const copyLink = async (b) => {
    try {
      const { manage_url } = await api(`/bookings/${b.id}/manage-link`);
      await navigator.clipboard.writeText(manage_url);
      showToast("success", "Client manage link copied");
    } catch (err) { showToast("error", err.message); }
  };

  return (
    <Modal title="Client" onClose={onClose} width="max-w-3xl" testId="client-card">
      {!summary ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={summary.client.name} size={64} rounded="rounded-2xl" />
              <div>
                <h4 className="serif text-2xl text-plum" data-testid="client-card-name">{summary.client.name}</h4>
                <p className="text-sm text-muted flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {summary.client.phone}</span>
                  {summary.client.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {summary.client.email}</span>}
                </p>
                <p className="text-xs text-muted mt-1">Client since {summary.client.created_at ? longDate(summary.client.created_at) : "—"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={startEdit} className={`${S.btnSmall} ${S.btnSmallPurple}`} data-testid="client-edit"><Pencil className="w-3 h-3" /> Edit</button>
              {onBook && <button onClick={() => onBook(summary.client)} className={`${S.btnSmall} ${S.btnSmallGreen}`} data-testid="client-book"><Plus className="w-3 h-3" /> New booking</button>}
            </div>
          </div>

          {editing ? (
            <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-cream border border-gold/20">
              <div><label className={S.label} htmlFor="cl5">Full name</label><input id="cl5" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={S.inlineInput} required /></div>
              <div><label className={S.label} htmlFor="cl6">Phone</label><input id="cl6" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={S.inlineInput} required /></div>
              <div className="sm:col-span-2"><label className={S.label} htmlFor="cl7">Email</label><input id="cl7" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={S.inlineInput} /></div>
              <div className="sm:col-span-2"><label className={S.label} htmlFor="cl8">Notes (allergies, preferences, anything useful)</label><textarea id="cl8" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className={`${S.inlineInput} h-24 resize-none`} data-testid="client-notes" /></div>
              <div className="sm:col-span-2 flex gap-3"><button type="button" onClick={() => setEditing(false)} className={S.btnSecondary}>Cancel</button><button type="submit" disabled={saving} className={S.btnPrimary} data-testid="client-save">{saving ? "Saving…" : "Save"}</button></div>
            </form>
          ) : (
            <div className="p-4 rounded-2xl bg-cream border border-gold/20 flex gap-3">
              <StickyNote className="w-4 h-4 text-bronze flex-shrink-0 mt-0.5" />
              <p className="text-sm text-bark whitespace-pre-wrap" data-testid="client-notes-view">{summary.client.notes || <span className="text-muted">No notes yet — add allergies, preferences or anything the team should know.</span>}</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="client-stats">
            {[
              ["Total spent", `R${money(summary.total_spent)}`],
              ["Visits", summary.visits_count],
              ["Upcoming", summary.upcoming_count],
              ["No-shows / cancels", `${summary.no_show_count} / ${summary.cancelled_count}`],
              ["Favourite service", summary.favorite_service || "—"],
              ["Favourite technician", summary.favorite_technician || "—"],
              ["Last visit", summary.last_visit ? longDate(summary.last_visit) : "—"],
              ["Next visit", summary.next_visit ? longDate(summary.next_visit) : "—"],
            ].map(([label, value]) => (
              <div key={label} className="p-3 rounded-xl bg-white border border-gold/15">
                <p className="text-[10px] tracking-widest uppercase text-muted">{label}</p>
                <p className="text-sm font-semibold text-plum mt-1 truncate">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center gap-2 bg-cream border border-gold/20 rounded-xl p-1 w-fit mb-3">
              {[["upcoming", `Upcoming (${upcoming.length})`], ["past", `Past (${past.length})`], ["cancelled", `Cancelled (${cancelled.length})`]].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === key ? "bg-white shadow-sm text-plum" : "text-muted"}`} data-testid={`client-tab-${key}`}>{label}</button>
              ))}
            </div>
            <div className="divide-y divide-[#D4AF87]/10 border border-gold/15 rounded-2xl overflow-hidden" data-testid="client-bookings">
              {shown.length === 0 && <p className="p-8 text-center text-sm text-muted">Nothing here</p>}
              {shown.map((b) => (
                <div key={b.id} className="p-4 flex flex-wrap items-center justify-between gap-3 bg-white" data-testid="client-booking">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-plum" /> {longDate(b.start_time)}
                      <span className="text-muted flex items-center gap-1"><Clock className="w-3 h-3" /> {toSastTime(b.start_time)}–{toSastTime(b.end_time)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_TONE[b.status] || ""}`}>{STATUS_LABEL[b.status] || b.status}</span>
                    </p>
                    <p className="text-xs text-muted mt-1">{b.services.map((s) => s.name).join(" · ")} · with {b.agent?.name || "—"}{b.notes ? ` · “${b.notes}”` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-bronze">R{money(b.total_price)}</span>
                    {onOpenBooking && !["cancelled", "late_cancel", "completed", "no_show"].includes(b.status) && (
                      <button onClick={() => onOpenBooking(b, sastDateKeyOf(b.start_time))} className={`${S.btnSmall} ${S.btnSmallPurple}`}><Pencil className="w-3 h-3" /> Edit</button>
                    )}
                    {!["cancelled", "late_cancel", "completed", "no_show"].includes(b.status) && (
                      <button onClick={() => copyLink(b)} className={`${S.btnSmall} ${S.btnSmallGold}`} title="Copy the client's manage link"><Settings2 className="w-3 h-3" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
