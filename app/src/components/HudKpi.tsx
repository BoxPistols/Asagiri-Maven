"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { KPI_DATA, type KpiData, type SeverityLevel } from "@/lib/mock-data";

function severityColor(s: SeverityLevel) {
  switch (s) {
    case "critical": return { text: "text-alert-critical", border: "border-alert-critical/30", bg: "bg-alert-critical/5", glow: "glow-red" };
    case "warning": return { text: "text-alert-warning", border: "border-alert-warning/30", bg: "bg-alert-warning/5", glow: "glow-amber" };
    case "info": return { text: "text-accent-cyan", border: "border-accent-cyan/20", bg: "bg-accent-cyan/5", glow: "glow-cyan" };
    default: return { text: "text-text-secondary", border: "border-border-subtle", bg: "bg-bg-surface", glow: "" };
  }
}

function TrendIcon({ trend }: { trend: KpiData["trend"] }) {
  switch (trend) {
    case "up": return <TrendingUp className="w-3 h-3" />;
    case "down": return <TrendingDown className="w-3 h-3" />;
    default: return <Minus className="w-3 h-3" />;
  }
}

function KpiCard({ data, index }: { data: KpiData; index: number }) {
  const c = severityColor(data.severity);
  return (
    <div
      className={`${c.bg} ${c.glow} border ${c.border} rounded px-3 py-2 min-w-[120px] animate-slide-up`}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <div className="readout text-[10px] text-text-dim uppercase tracking-wider mb-1">
        {data.label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`readout text-xl font-bold ${c.text}`}>{data.value}</span>
        <span className="readout text-xs text-text-dim">{data.unit}</span>
      </div>
      <div className={`flex items-center gap-1 mt-0.5 text-[10px] readout ${
        data.trend === "up" && data.severity !== "normal" ? "text-alert-warning" :
        data.trend === "down" && data.severity !== "normal" ? "text-alert-critical" :
        "text-text-dim"
      }`}>
        <TrendIcon trend={data.trend} />
        <span>{data.trendValue}</span>
      </div>
    </div>
  );
}

export default function HudKpi() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 px-1">
      {KPI_DATA.map((d, i) => (
        <KpiCard key={d.label} data={d} index={i} />
      ))}
    </div>
  );
}
