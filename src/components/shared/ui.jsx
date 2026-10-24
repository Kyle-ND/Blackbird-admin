import React from "react";
import { X, CheckCircle2, AlertCircle, Info, Inbox } from "lucide-react";

// Shared style tokens. Visual language lives in src/index.css (@layer components)
// so every screen stays consistent; these just name the combinations.
export const S = {
  card: "bb-card",
  statCard: "bb-card stat-card",
  input: "bb-input",
  inlineInput: "bb-input !py-2.5 !px-3",
  label: "bb-kicker block mb-2",
  btnPrimary: "bb-btn-primary flex-1 py-3",
  btnSecondary: "bb-btn-secondary flex-1 py-3",
  btnSmall: "bb-btn px-3 py-1.5 text-xs border",
  btnSmallPurple: "bg-plum/[0.07] hover:bg-plum/15 border-plum/15 text-plum",
  btnSmallGold: "bg-gold/10 hover:bg-gold/20 border-gold/30 text-bark",
  btnSmallRed: "bg-berry/10 hover:bg-berry/15 border-berry/25 text-berry",
  btnSmallGreen: "bg-plum/10 hover:bg-plum/15 border-plum/20 text-plum",
  btnTop: "bb-btn-primary px-5 py-2.5",
  sectionTitle: "bb-kicker",
};

// Kept for backwards compatibility: fonts and base styles now load globally.
export const GlobalStyle = () => null;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ title, subtitle, onClose, children, width = "max-w-md", testId }) {
  const boxRef = React.useRef(null);
  const titleId = React.useId();
  React.useEffect(() => {
    const previous = document.activeElement;
    const box = boxRef.current;
    // Move focus into the dialog (first field, else the close button)
    const first = box?.querySelector('input:not([type="hidden"]), select, textarea') || box?.querySelector(FOCUSABLE);
    first?.focus?.();
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== "Tab" || !box) return;
      const items = [...box.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstEl = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; previous?.focus?.(); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[130] p-0 sm:p-4" data-testid={testId} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={boxRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`bg-white border border-gold/25 rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 w-full ${width} shadow-float max-h-[94vh] overflow-y-auto animate-rise`}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 id={titleId} className="serif text-2xl text-plum">{title}</h3>
            {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -mr-2 -mt-2 rounded-xl hover:bg-cream text-bark transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ on, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className={`toggle-pill ${on ? "on" : "off"}`} aria-label={label} aria-pressed={on}>
      <span className="knob" />
    </button>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  const tone =
    toast.type === "success" ? "bg-plum/10 border-plum/20 text-plum"
      : toast.type === "error" ? "bg-berry/10 border-berry/25 text-berry"
      : "bg-plum/10 border-plum/20 text-plum";
  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
  return (
    <div role="status" data-testid="toast" className={`fixed bottom-5 right-4 sm:right-8 left-4 sm:left-auto px-4 py-3.5 rounded-2xl shadow-float z-[140] text-sm font-medium border flex items-center gap-3 animate-rise ${tone}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button onClick={onClose} aria-label="Dismiss"><X className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = React.useState(null);
  const timer = React.useRef(null);
  const show = React.useCallback((type, message) => {
    clearTimeout(timer.current);
    setToast({ type, message });
    timer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  return [toast, show, () => setToast(null)];
}

export function Skeleton({ className = "" }) {
  return <div className={`bb-skeleton ${className}`} aria-hidden="true" />;
}

export function ListSkeleton({ rows = 3, height = "h-20" }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className={`${height} w-full`} />)}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-plum/[0.06] border border-plum/10 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-plum" />
      </div>
      <p className="serif text-xl text-plum">{title}</p>
      {hint && <p className="text-sm text-muted mt-1 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export const STATUS_LABEL = { pending: "Pending", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", no_show: "No-show", late_cancel: "Late cancel" };
export const STATUS_TONE = {
  confirmed: "bg-plum text-white",
  pending: "bg-gold/25 text-bronze border border-gold/50",
  completed: "bg-plum/10 text-plum border border-plum/20",
  cancelled: "bg-berry/10 text-berry border border-berry/25",
  late_cancel: "bg-berry/10 text-berry border border-berry/25",
  no_show: "bg-ink/5 text-ink/70 border border-ink/10",
};

export function StatusChip({ status }) {
  return <span className={`bb-chip uppercase tracking-wide ${STATUS_TONE[status] || "bg-cream text-bark"}`}>{STATUS_LABEL[status] || status}</span>;
}

export function groupByCategory(services) {
  return services.reduce((acc, s) => {
    const key = s.category || "Uncategorised";
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});
}

export function formatRange(start, end) {
  return start === end || !end ? start : `${start} → ${end}`;
}
