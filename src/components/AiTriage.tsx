"use client";

import { useState } from "react";
import { ALERT_ITEMS, type AlertItem, type SeverityLevel } from "@/lib/mock-data";
import { AlertTriangle, AlertCircle, Info, ChevronDown, Zap, MapPin, ArrowRight } from "lucide-react";

function sevConfig(s: SeverityLevel) {
  switch (s) {
    case "critical": return { icon: AlertTriangle, color: "text-alert-critical", bg: "bg-alert-critical/6", border: "border-alert-critical/15", dot: "bg-alert-critical" };
    case "warning": return { icon: AlertCircle, color: "text-alert-warning", bg: "bg-alert-warning/5", border: "border-alert-warning/12", dot: "bg-alert-warning" };
    default: return { icon: Info, color: "text-accent-cyan", bg: "bg-accent-cyan/3", border: "border-accent-cyan/10", dot: "bg-accent-cyan" };
  }
}

function scoreColor(score: number) {
  if (score >= 80) return "var(--alert-critical)";
  if (score >= 60) return "var(--alert-warning)";
  return "var(--accent-cyan)";
}

function AlertCard({ alert, isExpanded, onToggle, onSelectMarker }: {
  alert: AlertItem;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectMarker?: (id: string) => void;
}) {
  const cfg = sevConfig(alert.severity);
  const Icon = cfg.icon;

  return (
    <div
      className="border-b border-border-subtle px-4 py-3 cursor-pointer transition-colors hover:bg-bg-elevated/30"
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-4 h-4 ${cfg.color} shrink-0 mt-0.5 ${alert.severity === "critical" ? "animate-blink" : ""}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-[13px] text-text-primary font-medium leading-snug">{alert.title}</span>
            <span className="readout text-sm font-bold shrink-0" style={{ color: scoreColor(alert.score) }}>
              {alert.score}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-dim readout">
            <span>{alert.category}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{alert.location}</span>
            <span className="ml-auto">{alert.timestamp}</span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-dim shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
      </div>

      {isExpanded && (
        <div className="mt-3 ml-7 animate-slide-up">
          <p className="text-xs text-text-secondary leading-relaxed mb-3">{alert.description}</p>
          <div className={`flex items-start gap-2.5 p-3 rounded-lg ${cfg.bg} border ${cfg.border}`}>
            <Zap className={`w-4 h-4 ${cfg.color} shrink-0`} />
            <div>
              <div className="readout text-xs text-text-dim uppercase tracking-wider mb-1">推奨アクション</div>
              <p className="text-xs text-text-primary leading-relaxed">{alert.suggestedAction}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn-approve flex-1 justify-center">
              <ArrowRight className="w-3.5 h-3.5" /> 承認・実行
            </button>
            {alert.markerId && (
              <button
                className="btn-tactical"
                onClick={e => { e.stopPropagation(); onSelectMarker?.(alert.markerId!); }}
              >
                <MapPin className="w-3.5 h-3.5" /> 地図
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AiTriage({ onSelectMarker }: { onSelectMarker?: (id: string) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>("alt-1");
  const sorted = [...ALERT_ITEMS].sort((a, b) => b.score - a.score);

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        AI検知
        <span className="ml-auto readout text-xs text-text-secondary">
          {ALERT_ITEMS.length} 件
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map(alert => (
          <AlertCard
            key={alert.id}
            alert={alert}
            isExpanded={expandedId === alert.id}
            onToggle={() => setExpandedId(prev => prev === alert.id ? null : alert.id)}
            onSelectMarker={onSelectMarker}
          />
        ))}
      </div>
    </div>
  );
}
