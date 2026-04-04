"use client";

import { useState } from "react";
import { WORKFLOW_CARDS, type WorkflowCard } from "@/lib/mock-data";
import { CheckCircle, Clock, Eye, Zap, ArrowRight } from "lucide-react";

const STAGE_MAP = {
  detected: { label: "検知", icon: Zap, color: "text-accent-cyan", dot: "bg-accent-cyan" },
  reviewing: { label: "レビュー中", icon: Eye, color: "text-alert-warning", dot: "bg-alert-warning" },
  approved: { label: "承認済", icon: Clock, color: "text-accent-blue", dot: "bg-accent-blue" },
  executed: { label: "完了", icon: CheckCircle, color: "text-alert-success", dot: "bg-alert-success" },
} as const;

function sevDot(s: string) {
  if (s === "critical") return "bg-alert-critical";
  if (s === "warning") return "bg-alert-warning";
  return "bg-accent-cyan";
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

  const active = cards.filter(c => c.stage !== "executed");
  const done = cards.filter(c => c.stage === "executed");

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        ワークフロー
        <span className="ml-auto readout text-xs text-text-secondary">
          {active.length} アクティブ
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {active.map(card => {
          const stage = STAGE_MAP[card.stage];
          const StageIcon = stage.icon;
          const canAdvance = card.stage === "detected" || card.stage === "reviewing";

          return (
            <div key={card.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle hover:bg-bg-elevated/30 transition-colors group">
              <span className={`w-2 h-2 rounded-full shrink-0 ${sevDot(card.severity)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary truncate">{card.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`flex items-center gap-1 readout text-xs ${stage.color}`}>
                    <StageIcon className="w-3 h-3" />{stage.label}
                  </span>
                  <span className="readout text-xs text-text-dim">{card.assignee} · {card.eta}</span>
                </div>
              </div>
              {canAdvance && (
                <button
                  className="btn-approve py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => advanceCard(card.id)}
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        {done.map(card => (
          <div key={card.id} className="flex items-center gap-3 px-4 py-2 border-b border-border-subtle opacity-35">
            <CheckCircle className="w-3.5 h-3.5 text-alert-success shrink-0" />
            <p className="text-xs text-text-dim truncate flex-1 line-through">{card.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
