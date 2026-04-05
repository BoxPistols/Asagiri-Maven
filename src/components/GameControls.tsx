"use client";

import { useState, useCallback } from "react";
import { Move, Swords, Wrench, Clock, Flag, ChevronRight, SkipForward } from "lucide-react";
import type { GamePhase, GameUnit, TurnPhase } from "@/lib/game-types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GameControlsProps {
  turn: number;
  maxTurns: number;
  wave: number;
  phase: GamePhase;
  turnPhase: TurnPhase;
  supply: number;
  selectedUnit: GameUnit | null;
  unactedCount: number;
  canRepair: boolean;
  onMove: () => void;
  onAttack: () => void;
  onRepair: () => void;
  onWait: () => void;
  onEndPlayerPhase: () => void;
  onProcessEnemy: () => void;
  onProcessResolution: () => void;
  onPause: () => void;
  onResume: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameControls({
  turn: _turn,
  maxTurns: _maxTurns,
  wave: _wave,
  phase,
  turnPhase,
  supply: _supply,
  selectedUnit,
  unactedCount,
  canRepair,
  onMove,
  onAttack,
  onRepair,
  onWait,
  onEndPlayerPhase,
  onProcessEnemy,
  onProcessResolution: _onProcessResolution,
  onPause: _onPause,
  onResume: _onResume,
}: GameControlsProps) {
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  if (phase !== "playing" && phase !== "paused") return null;

  // Can act: unit is selected, is player, hasn't acted, not destroyed, has movement
  const canAct = selectedUnit
    && selectedUnit.faction === "player"
    && !selectedUnit.actedThisTurn
    && selectedUnit.status !== "destroyed"
    && (selectedUnit.speed > 0 || (selectedUnit.movePoints ?? 0) > 0)
    && turnPhase === "player";

  const handleEndPhase = useCallback(() => {
    if (unactedCount > 0 && !showEndConfirm) {
      setShowEndConfirm(true);
      return;
    }
    setShowEndConfirm(false);
    onEndPlayerPhase();
  }, [unactedCount, showEndConfirm, onEndPlayerPhase]);

  const handleCancelEnd = useCallback(() => {
    setShowEndConfirm(false);
  }, []);

  return (
    <div className="game-controls-floating">
      {/* ===== PLAYER PHASE ===== */}
      {turnPhase === "player" && (
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Unacted count */}
          <div className="readout text-xs text-text-dim shrink-0">
            未行動 <span className={`font-bold ${unactedCount === 0 ? "text-alert-success" : "text-accent-cyan"}`}>{unactedCount}</span> 部隊
          </div>

          <div className="h-4 w-px bg-border-subtle" />

          {/* End turn → transitions to enemy phase */}
          {!showEndConfirm ? (
            <button
              onClick={handleEndPhase}
              className={`btn-approve py-1.5 px-4 gap-1.5 text-xs ${unactedCount === 0 ? "animate-glow-pulse" : ""}`}
              title="ターン終了 → 敵フェーズへ"
            >
              <Flag className="w-3.5 h-3.5" />
              {unactedCount === 0 ? "ターン終了→敵へ" : "ターン終了"}
              <kbd className="ml-0.5 text-[12px] opacity-40 font-mono">Space</kbd>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 animate-slide-up">
              <span className="readout text-xs text-alert-warning font-bold">
                ⚠ 未行動 {unactedCount}部隊あり
              </span>
              <button
                onClick={handleCancelEnd}
                className="btn-approve py-1.5 px-3 gap-1 text-xs"
                autoFocus
              >
                <ChevronRight className="w-3.5 h-3.5" />
                行動を続ける
              </button>
              <button
                onClick={handleEndPhase}
                className="btn-tactical py-1.5 px-2.5 text-xs !border-alert-critical/40 !text-alert-critical hover:!bg-alert-critical/10"
                title="未行動ユニットを待機扱いにしてターン終了"
              >
                強制終了
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== ENEMY PHASE ===== */}
      {turnPhase === "enemy" && (
        <div className="flex items-center gap-3 px-4 py-2">
          {/* Progress bar */}
          <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div className="h-full bg-alert-critical rounded-full animate-enemy-progress" />
          </div>
          <span className="readout text-xs text-alert-critical tracking-wider shrink-0">
            敵フェーズ
          </span>
          <button
            onClick={onProcessEnemy}
            className="btn-tactical py-1 px-3 gap-1 text-xs !border-alert-critical/30 !text-alert-critical"
          >
            <SkipForward className="w-3 h-3" />
            スキップ
          </button>
        </div>
      )}

      {/* ===== RESOLUTION PHASE ===== */}
      {turnPhase === "resolution" && (
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div className="h-full bg-accent-indigo rounded-full animate-enemy-progress" />
          </div>
          <span className="readout text-xs text-accent-indigo tracking-wider shrink-0">
            結果処理中
          </span>
        </div>
      )}
    </div>
  );
}
