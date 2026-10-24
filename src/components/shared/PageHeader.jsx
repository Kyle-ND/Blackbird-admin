import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sastLongDate, toSastDateKey } from "../../lib/api";

/** Page title row. Pass `dateKey` + `onDateChange` for date-driven views to get the day navigator. */
export default function PageHeader({ title, subtitle, dateKey, onDateChange, onStep, stepLabel = "day", right }) {
  const todayKey = toSastDateKey();
  const dated = !!dateKey;
  return (
    <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div className="min-w-0">
        <p className="bb-kicker mb-1.5">{dated ? `${sastLongDate(dateKey)}${dateKey === todayKey ? " · Today" : ""}` : subtitle}</p>
        <h2 className="serif text-3xl sm:text-4xl text-plum leading-tight">{title}</h2>
        {dated && subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {right}
        {dated && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-gold/25 shadow-sm">
            <button onClick={() => onStep(-1)} aria-label={`Previous ${stepLabel}`} className="w-9 h-9 rounded-lg hover:bg-plum/5 text-plum flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => onDateChange(todayKey)} className={`px-3 h-9 rounded-lg text-sm font-medium ${dateKey === todayKey ? "bg-plum/10 text-plum" : "text-bark hover:text-plum hover:bg-plum/5"}`}>Today</button>
            <input type="date" value={dateKey} onChange={(e) => e.target.value && onDateChange(e.target.value)} aria-label="Pick a date"
              className="h-9 px-2 rounded-lg bg-transparent text-sm text-bark hover:bg-plum/5 focus:outline-none focus:bg-plum/5 !min-h-0 w-[128px]" />
            <button onClick={() => onStep(1)} aria-label={`Next ${stepLabel}`} className="w-9 h-9 rounded-lg hover:bg-plum/5 text-plum flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
