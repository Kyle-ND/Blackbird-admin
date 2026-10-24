import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Plus, LayoutDashboard } from "lucide-react";
import Avatar from "./Avatar";

/**
 * Floating top bar shared by every dashboard.
 *  navItems   [{ mode, label, icon }]
 *  area       small label next to the logo ("Front desk", "Manager", "Technician")
 */
export default function TopBar({ area, navItems = [], viewMode, onNavigate, user, photoUrl, onLogout, onNewBooking, onSwitchView, switchLabel, extra }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-5 pb-2">
        <div className="flex items-center justify-between gap-3 bg-white/85 backdrop-blur-2xl border border-gold/25 rounded-2xl pl-4 pr-2 sm:px-5 py-2.5 shadow-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/assets/logo-mark.png" alt="Black Bird Beauty Spa" className="h-8 w-auto" width={60} height={32} />
            {area && <span className={`${navItems.length > 5 ? "hidden xl:inline" : "hidden sm:inline"} bb-chip bg-gold/15 text-bark tracking-[0.14em] uppercase text-[10px]`}>{area}</span>}
          </div>

          {navItems.length > 0 && (
            <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-xl bg-cream/80 border border-gold/20 overflow-x-auto max-w-[52vw]" data-testid="nav" aria-label="Sections">
              {navItems.map(({ mode, label }) => (
                <button key={mode} onClick={() => onNavigate(mode)} data-testid={`nav-${mode}`} aria-current={viewMode === mode ? "page" : undefined}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${viewMode === mode ? "bg-white text-plum shadow-sm" : "text-bark hover:text-plum"}`}>
                  {label}
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2">
            {extra}
            {onSwitchView && (
              <button onClick={onSwitchView} data-testid="switch-view" title={switchLabel}
                className="hidden lg:inline-flex bb-btn-secondary px-3 py-2 text-xs whitespace-nowrap">
                <LayoutDashboard className="w-3.5 h-3.5" /> <span className="hidden xl:inline">{switchLabel}</span>
              </button>
            )}
            {onNewBooking && (
              <button onClick={onNewBooking} data-testid="new-booking" className="bb-btn-primary px-3 sm:px-4 py-2 whitespace-nowrap">
                <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Booking</span>
              </button>
            )}
            <div className="hidden md:flex items-center gap-2 pl-2 ml-1 border-l border-gold/25">
              <Avatar name={user?.name} src={photoUrl} size={32} rounded="rounded-full" />
              <span className="hidden 2xl:block text-sm text-muted max-w-[140px] truncate">{user?.name}</span>
            </div>
            <div className="relative md:hidden" ref={menuRef}>
              <button onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} className="bb-btn-secondary px-3 py-2 text-sm">
                Menu <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div role="menu" className="absolute right-0 mt-2 w-56 bg-white border border-gold/25 rounded-2xl shadow-float overflow-hidden z-50 animate-rise">
                  <div className="px-4 py-3 flex items-center gap-3 border-b border-gold/15">
                    <Avatar name={user?.name} src={photoUrl} size={32} rounded="rounded-full" />
                    <div className="min-w-0"><p className="text-sm font-medium text-ink truncate">{user?.name}</p><p className="text-[11px] text-muted uppercase tracking-wide">{area}</p></div>
                  </div>
                  {navItems.map(({ mode, label, icon: Icon }) => (
                    <button key={mode} role="menuitem" onClick={() => { onNavigate(mode); setOpen(false); }}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm ${viewMode === mode ? "bg-plum/10 text-plum" : "text-bark hover:bg-plum/5"}`}>
                      {Icon && <Icon className="w-4 h-4" />} {label}
                    </button>
                  ))}
                  {onSwitchView && <button role="menuitem" onClick={() => { onSwitchView(); setOpen(false); }} className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-bark hover:bg-plum/5"><LayoutDashboard className="w-4 h-4" /> {switchLabel}</button>}
                  <button role="menuitem" onClick={onLogout} className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-berry hover:bg-berry/10 border-t border-gold/15"><LogOut className="w-4 h-4" /> Sign out</button>
                </div>
              )}
            </div>
            <button onClick={onLogout} title="Sign out" aria-label="Sign out" className="hidden md:inline-flex bb-icon-btn text-bark hover:text-berry hover:bg-berry/10 hover:border-berry/30">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
