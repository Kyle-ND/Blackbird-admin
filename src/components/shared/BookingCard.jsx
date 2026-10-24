import React, { useEffect, useRef, useState } from "react";
import { Info, Pencil, Trash2, CheckCircle2, UserX, Undo2, MoreHorizontal, Clock, StickyNote } from "lucide-react";
import { money, toSastTime } from "../../lib/api";
import Avatar from "./Avatar";
import { StatusChip } from "./ui";

const INACTIVE = ["cancelled", "late_cancel"];
const DONE = ["completed", "no_show"];

/**
 * One appointment in a day list. Actions: info · edit · done · no-show · cancel (or restore).
 * Desktop shows labelled buttons on hover/focus; mobile shows a compact ⋯ menu.
 */
export default function BookingCard({ b, onInfo, onEdit, onStatus, compact = false }) {
  const inactive = INACTIVE.includes(b.status);
  const done = DONE.includes(b.status);
  const duration = Math.round((new Date(b.end_time) - new Date(b.start_time)) / 60000);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const bar = inactive ? "bg-berry/60" : b.status === "completed" ? "bg-gold" : b.status === "pending" ? "bg-gold" : b.status === "no_show" ? "bg-bark/40" : "bg-plum";

  const actions = [];
  if (onInfo) actions.push({ key: "info", label: "Details", icon: Info, tone: "text-bark hover:bg-gold/15", onClick: () => onInfo(b) });
  if (!inactive && !done) {
    if (onEdit) actions.push({ key: "edit", label: "Edit", icon: Pencil, tone: "text-plum hover:bg-plum/10", onClick: () => onEdit(b), testId: "booking-edit" });
    actions.push({ key: "done", label: "Done", icon: CheckCircle2, tone: "text-plum hover:bg-plum/10", onClick: () => onStatus(b, "completed") });
    actions.push({ key: "noshow", label: "No-show", icon: UserX, tone: "text-bark hover:bg-gold/15", onClick: () => onStatus(b, "no_show") });
    actions.push({ key: "cancel", label: "Cancel", icon: Trash2, tone: "text-berry hover:bg-berry/10", onClick: () => onStatus(b, "cancelled", { allowUndo: true }), testId: "booking-cancel" });
  }
  if (inactive || done) actions.push({ key: "restore", label: inactive ? "Restore" : "Reopen", icon: Undo2, tone: "text-plum hover:bg-plum/10", onClick: () => onStatus(b, "confirmed") });

  return (
    <article data-testid="booking-card" className={`group relative bb-card-soft bg-white/80 hover:bg-white hover:shadow-card transition-all ${inactive ? "opacity-70" : ""}`}>
      <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${bar}`} aria-hidden="true" />
      <div className={`flex items-start gap-3 sm:gap-4 ${compact ? "p-3 pl-4" : "p-4 pl-5"}`}>
        <div className="w-[84px] sm:w-[104px] flex-shrink-0">
          <p className="serif text-lg sm:text-xl text-plum leading-none whitespace-nowrap">{toSastTime(b.start_time)}<span className="text-plum text-base">–{toSastTime(b.end_time)}</span></p>
          <p className="text-xs text-muted mt-1.5 flex items-center gap-1"><Clock className="w-3 h-3" /> {duration} min</p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-ink truncate">{b.client?.name}</p>
            <StatusChip status={b.status} />
          </div>
          <p className="text-sm text-bark mt-0.5 truncate">{b.services.map((s) => s.name).join(" · ")}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="bb-chip bg-cream text-bark border border-gold/20 pl-0.5">
              <Avatar name={b.agent?.name || "?"} src={b.agent?.photo_url} size={18} rounded="rounded-full" /> {b.agent?.name || "Unassigned"}
            </span>
            {b.client?.phone && <span className="text-xs text-muted">{b.client.phone}</span>}
            {b.notes && <span className="text-xs text-muted italic flex items-center gap-1 min-w-0 truncate"><StickyNote className="w-3 h-3 flex-shrink-0" /> {b.notes}</span>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className="font-semibold text-bronze text-base">R{money(b.total_price)}</p>
          {/* desktop actions */}
          <div className="hidden sm:flex items-center gap-1 opacity-70 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            {actions.map(({ key, label, icon: Icon, tone, onClick, testId }) => (
              <button key={key} onClick={onClick} title={label} aria-label={label} data-testid={testId}
                className={`inline-flex items-center gap-1 px-2 h-8 rounded-lg text-xs font-medium transition-colors ${tone}`}>
                <Icon className="w-3.5 h-3.5" /><span className={key === "edit" || key === "cancel" || key === "restore" ? "" : "hidden lg:inline"}>{label}</span>
              </button>
            ))}
          </div>
          {/* mobile menu */}
          <div className="sm:hidden relative" ref={menuRef}>
            <button onClick={() => setMenu((v) => !v)} aria-label="Actions" aria-haspopup="menu" className="w-9 h-9 rounded-xl bg-cream border border-gold/25 flex items-center justify-center text-bark"><MoreHorizontal className="w-4 h-4" /></button>
            {menu && (
              <div role="menu" className="absolute right-0 mt-1 w-44 bg-white border border-gold/25 rounded-2xl shadow-float overflow-hidden z-20 animate-rise">
                {actions.map(({ key, label, icon: Icon, tone, onClick, testId }) => (
                  <button key={key} role="menuitem" onClick={() => { setMenu(false); onClick(); }} data-testid={testId ? `${testId}-mobile` : undefined} className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm ${tone}`}>
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
