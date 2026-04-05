"use client";

import type { TurnPhase } from "@/lib/game-types";

interface PhaseIndicatorProps {
  turnPhase: TurnPhase;
  turn: number;
  unactedCount?: number;
}

const PHASE_CONFIG: Record<
  TurnPhase,
  { label: string; sub: string; cssClass: string }
> = {
  player: {
    label: "味方フェーズ",
    sub: "行動してください",
    cssClass: "phase-player",
  },
  enemy: {
    label: "敵フェーズ",
    sub: "処理中...",
    cssClass: "phase-enemy",
  },
  resolution: {
    label: "判定フェーズ",
    sub: "結果処理中...",
    cssClass: "phase-resolution",
  },
};

export default function PhaseIndicator({
  turnPhase,
  turn,
  unactedCount,
}: PhaseIndicatorProps) {
  const config = PHASE_CONFIG[turnPhase];

  return (
    <div
      className={`phase-indicator ${config.cssClass}`}
      role="status"
      aria-live="polite"
    >
      <span className="phase-indicator-diamond">&#x25C6;</span>
      <span className="phase-indicator-label">{config.label}</span>
      <span className="phase-indicator-sep">—</span>
      <span className="phase-indicator-sub">
        {turnPhase === "player" && typeof unactedCount === "number"
          ? `残り ${unactedCount} 部隊`
          : config.sub}
      </span>
      <span className="phase-indicator-diamond">&#x25C6;</span>
      <span className="phase-indicator-turn">T{turn}</span>
    </div>
  );
}
