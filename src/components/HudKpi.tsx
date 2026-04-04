"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { KPI_DATA, type KpiData, type SeverityLevel } from "@/lib/mock-data";

function severityColor(s: SeverityLevel) {
  switch (s) {
    case "critical": return { text: "text-alert-critical", border: "border-alert-critical/20", bg: "bg-alert-critical/5" };
    case "warning": return { text: "text-alert-warning", border: "border-alert-warning/15", bg: "bg-alert-warning/4" };
    case "info": return { text: "text-accent-cyan", border: "border-accent-cyan/12", bg: "bg-accent-cyan/3" };
    default: return { text: "text-text-primary", border: "border-border-subtle", bg: "bg-transparent" };
  }
}

function TrendIcon({ trend }: { trend: KpiData["trend"] }) {
  switch (trend) {
    case "up": return <TrendingUp className="w-3 h-3" />;
    case "down": return <TrendingDown className="w-3 h-3" />;
    default: return <Minus className="w-3 h-3" />;
  }
}

function KpiCard({ data }: { data: KpiData }) {
  const c = severityColor(data.severity);
  return (
    <div className={`flex items-center gap-3 ${c.bg} border ${c.border} rounded-lg px-4 py-2`}>
      <div>
        <div className="readout text-xs text-text-dim uppercase tracking-wider">{data.label}</div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className={`readout text-lg font-bold ${c.text}`}>{data.value}</span>
          <span className="readout text-xs text-text-dim">{data.unit}</span>
        </div>
      </div>
      <div className={`flex items-center gap-0.5 text-xs readout ${
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

interface HudKpiProps {
  data?: KpiData[];
}

export default function HudKpi({ data }: HudKpiProps = {}) {
  const items = data ?? KPI_DATA;
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {items.map(d => (
        <KpiCard key={d.label} data={d} />
      ))}
    </div>
  );
}
