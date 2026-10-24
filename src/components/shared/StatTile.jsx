import React from "react";

export default function StatTile({ label, value, sub, icon: Icon, accent = false, testId }) {
  return (
    <div data-testid={testId} className={`bb-card stat-card p-5 sm:p-6 hover:shadow-float transition-shadow ${accent ? "border-plum/25" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="bb-kicker">{label}</p>
        {Icon && <span className="w-8 h-8 rounded-lg bg-plum/[0.07] flex items-center justify-center"><Icon className="w-4 h-4 text-plum" /></span>}
      </div>
      <p className="serif text-3xl sm:text-[40px] text-plum mt-3 leading-none tabular-nums">{value}</p>
      {sub && <p className="text-sm text-muted mt-3 leading-snug">{sub}</p>}
    </div>
  );
}
