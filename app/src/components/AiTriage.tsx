"use client";

import { useState } from "react";
import { ALERT_ITEMS, type AlertItem, type SeverityLevel } from "@/lib/mock-data";
import { AlertTriangle, AlertCircle, Info, ChevronRight, Zap, MapPin, ArrowRight } from "lucide-react";

function severityConfig(s: SeverityLevel) {
  switch (s) {
    case "critical": return {
      icon: AlertTriangle,
      color: "text-alert-critical",
      bg: "bg-alert-critical/8",
      border: "border-alert-critical/25",
      badge: "bg-alert-critical/15 text-alert-critical",
      barColor: "bg-alert-critical",
      label: "CRITICAL",
    };
    case "warning": return {
      icon: AlertCircle,
      color: "text-alert-warning",
      bg: "bg-alert-warning/8",
      border: "border-alert-warning/20",
      badge: "bg-alert-warning/15 text-alert-warning",
      barColor: "bg-alert-warning",
      label: "WARNING",
    };
    default: return {
      icon: Info,
      color: "text-accent-cyan",
      bg: "bg-accent-cyan/5",
      border: "border-accent-cyan/15",
      badge: "bg-accent-cyan/10 text-accent-cyan",
      barColor: "bg-accent-cyan",
      label: "INFO",
    };
  }
}

function AlertCard({ alert, index, isExpanded, onToggle, onSelectMarker }: {
  alert: AlertItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectMarker?: (id: string) => void;
}) {
  const cfg = severityConfig(alert.severity);
  const Icon = cfg.icon;

  return (
    <div
      className={`${cfg.bg} border ${cfg.border} rounded mx-2 mb-1.5 overflow-hidden transition-all animate-slide-up cursor-pointer`}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
      onClick={onToggle}
    >
      {/* Score bar */}
      <div className="h-0.5 bg-bg-elevated">
        <div className={`h-full ${cfg.barColor} transition-all`} style={{ width: `${alert.score}%` }} />
      </div>

      <div className="px-3 py-2">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <Icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0 mt-0.5 ${alert.severity === "critical" ? "animate-blink" : ""}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`readout text-[9px] ${cfg.badge} px-1.5 py-0.5 rounded`}>
                {cfg.label}
              </span>
              <span className="readout text-[9px] text-text-dim">{alert.category}</span>
              <span className="readout text-[9px] text-text-dim ml-auto">{alert.timestamp}</span>
            </div>
            <p className="text-xs text-text-primary mt-1 leading-tight">{alert.title}</p>
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-2.5 h-2.5 text-text-dim" />
              <span className="readout text-[9px] text-text-dim">{alert.location}</span>
              <span className="ml-auto readout text-[10px] font-bold" style={{ color: cfg.color.includes("critical") ? "#ff1744" : cfg.color.includes("warning") ? "#ff9100" : "#00e5ff" }}>
                {alert.score}
              </span>
            </div>
          </div>
          <ChevronRight className={`w-3 h-3 text-text-dim shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-border-subtle animate-slide-up">
            <p className="text-[11px] text-text-secondary leading-relaxed">{alert.description}</p>
            <div className={`mt-2 flex items-start gap-2 p-2 rounded ${cfg.bg} border ${cfg.border}`}>
              <Zap className={`w-3 h-3 ${cfg.color} shrink-0 mt-0.5`} />
              <div>
                <div className="readout text-[9px] text-text-dim mb-0.5">AI推奨アクション</div>
                <p className="text-[11px] text-text-primary leading-snug">{alert.suggestedAction}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button className="btn-approve flex-1 flex items-center justify-center gap-1 text-[10px]">
                <ArrowRight className="w-3 h-3" /> 承認・実行
              </button>
              {alert.markerId && (
                <button
                  className="btn-tactical text-[10px]"
                  onClick={e => { e.stopPropagation(); onSelectMarker?.(alert.markerId!); }}
                >
                  <MapPin className="w-3 h-3" /> 地図表示
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiTriage({ onSelectMarker }: { onSelectMarker?: (id: string) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>("alt-1");

  const sorted = [...ALERT_ITEMS].sort((a, b) => b.score - a.score);

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        AI検知・トリアージ
        <span className="ml-auto flex items-center gap-1.5">
          <span className="readout text-[9px] text-alert-critical">{ALERT_ITEMS.filter(a => a.severity === "critical").length} CRIT</span>
          <span className="readout text-[9px] text-alert-warning">{ALERT_ITEMS.filter(a => a.severity === "warning").length} WARN</span>
          <span className="readout text-[9px] text-accent-cyan">{ALERT_ITEMS.filter(a => a.severity === "info").length} INFO</span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-1.5">
        {sorted.map((alert, i) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            index={i}
            isExpanded={expandedId === alert.id}
            onToggle={() => setExpandedId(prev => prev === alert.id ? null : alert.id)}
            onSelectMarker={onSelectMarker}
          />
        ))}
      </div>
    </div>
  );
}
