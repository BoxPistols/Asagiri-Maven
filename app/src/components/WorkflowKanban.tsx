"use client";

import { useState } from "react";
import { WORKFLOW_CARDS, type WorkflowCard, type SeverityLevel } from "@/lib/mock-data";
import { CheckCircle, Clock, Eye, Zap, ArrowRight, User, Timer } from "lucide-react";

const STAGES = [
  { key: "detected" as const, label: "検知", icon: Zap, color: "text-accent-cyan", borderColor: "border-accent-cyan/20" },
  { key: "reviewing" as const, label: "レビュー中", icon: Eye, color: "text-alert-warning", borderColor: "border-alert-warning/20" },
  { key: "approved" as const, label: "承認済", icon: Clock, color: "text-accent-blue", borderColor: "border-accent-blue/20" },
  { key: "executed" as const, label: "実行完了", icon: CheckCircle, color: "text-alert-success", borderColor: "border-alert-success/20" },
] as const;

function sevBadge(s: SeverityLevel) {
  switch (s) {
    case "critical": return "bg-alert-critical/15 text-alert-critical border-alert-critical/20";
    case "warning": return "bg-alert-warning/15 text-alert-warning border-alert-warning/20";
    default: return "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/15";
  }
}

function WfCard({ card, onApprove }: { card: WorkflowCard; onApprove: (id: string) => void }) {
  const badge = sevBadge(card.severity);
  const isExecuted = card.stage === "executed";

  return (
    <div className={`bg-bg-deep/60 border border-border-subtle rounded px-2.5 py-2 text-[11px] ${isExecuted ? "opacity-60" : ""} animate-slide-up`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`readout text-[8px] ${badge} px-1 py-0.5 rounded border`}>
          {card.severity === "critical" ? "CRIT" : card.severity === "warning" ? "WARN" : "INFO"}
        </span>
      </div>
      <p className="text-text-primary leading-snug mb-1.5 text-[10px] font-medium">{card.title}</p>
      <div className="flex items-center gap-2 text-[9px] readout text-text-dim">
        <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{card.assignee}</span>
        <span className="flex items-center gap-0.5"><Timer className="w-2.5 h-2.5" />{card.eta}</span>
      </div>
      <div className="readout text-[8px] text-text-dim mt-1 opacity-60">{card.source}</div>
      {(card.stage === "detected" || card.stage === "reviewing") && (
        <button
          className="btn-approve w-full mt-2 flex items-center justify-center gap-1 text-[9px] py-1"
          onClick={() => onApprove(card.id)}
        >
          <ArrowRight className="w-2.5 h-2.5" />
          {card.stage === "detected" ? "レビュー開始" : "承認"}
        </button>
      )}
    </div>
  );
}

export default function WorkflowKanban() {
  const [cards, setCards] = useState(WORKFLOW_CARDS);

  const advanceCard = (id: string) => {
    setCards(prev => prev.map(c => {
      if (c.id !== id) return c;
      const next = c.stage === "detected" ? "reviewing" : c.stage === "reviewing" ? "approved" : c.stage === "approved" ? "executed" : c.stage;
      return { ...c, stage: next };
    }));
  };

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        意思決定ワークフロー
        <span className="ml-auto readout text-[9px] text-text-dim">
          {cards.filter(c => c.stage !== "executed").length} アクティブ
        </span>
      </div>
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-0 h-full min-w-0">
          {STAGES.map(stage => {
            const Icon = stage.icon;
            const stageCards = cards.filter(c => c.stage === stage.key);
            return (
              <div key={stage.key} className={`flex-1 min-w-[140px] border-r border-border-subtle last:border-r-0 flex flex-col`}>
                {/* Column header */}
                <div className={`px-2 py-1.5 border-b ${stage.borderColor} flex items-center gap-1.5`}>
                  <Icon className={`w-3 h-3 ${stage.color}`} />
                  <span className={`readout text-[9px] ${stage.color} uppercase tracking-wider`}>{stage.label}</span>
                  <span className="readout text-[9px] text-text-dim ml-auto">{stageCards.length}</span>
                </div>
                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                  {stageCards.map(card => (
                    <WfCard key={card.id} card={card} onApprove={advanceCard} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
