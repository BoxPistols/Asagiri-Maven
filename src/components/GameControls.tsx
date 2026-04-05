"use client";

import { useState, useCallback } from "react";
import { Move, Swords, Wrench, Clock, Flag, ChevronRight, Pause, Play, SkipForward, Loader } from "lucide-react";
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
  turn,
  maxTurns,
  wave,
  phase,
  turnPhase,
  supply,
  selectedUnit,
  unactedCount,
  canRepair,
  onMove,
  onAttack,
  onRepair,
  onWait,
  onEndPlayerPhase,
  onProcessEnemy,
  onProcessResolution,
  onPause,
  onResume,
}: GameControlsProps) {
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const isPaused = phase === "paused";
  const isPlaying = phase === "playing";

  if (phase !== "playing" && phase !== "paused") return null;

  const turnProgress = maxTurns > 0 ? (turn / maxTurns) * 100 : 0;

  // Can act: unit is selected, is player, hasn't acted, not destroyed, has speed > 0
  const canAct = selectedUnit
    && selectedUnit.faction === "player"
    && !selectedUnit.actedThisTurn
    && selectedUnit.status !== "destroyed"
    && selectedUnit.speed > 0
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
    <div className="game-controls">
      {/* Turn progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-bg-deep/50">
        <div
          className="h-full bg-gradient-to-r from-accent-cyan to-accent-indigo transition-all duration-500"
          style={{ width: `${turnProgress}%` }}
        />
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Wave + Turn + Supply */}
        <div className="flex items-center gap-2 readout shrink-0">
          <div className="flex items-center gap-1 text-xs">
            <Swords className="w-3.5 h-3.5 text-accent-cyan" />
            <span className="text-accent-cyan font-bold">W{wave}</span>
          </div>
          <div className="h-4 w-px bg-border-subtle" />
          <div className="flex items-center gap-1 text-xs">
            <Clock className="w-3.5 h-3.5 text-text-dim" />
            <span className="text-text-primary font-bold">{turn}</span>
            <span className="text-text-dim">/{maxTurns}</span>
          </div>
          <div className="h-4 w-px bg-border-subtle" />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-alert-warning">補給:</span>
            <span className="text-text-primary font-bold">{supply}</span>
          </div>
        </div>

        <div className="h-4 w-px bg-border-subtle" />

        {/* ===== PLAYER PHASE ===== */}
        {turnPhase === "player" && (
          <>
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={onMove}
                disabled={!canAct}
                className="btn-tactical py-1.5 px-2.5 gap-1 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                title="移動"
              >
                <Move className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">移動</span>
              </button>

              <button
                onClick={onAttack}
                disabled={!canAct}
                className="btn-tactical py-1.5 px-2.5 gap-1 text-xs !border-alert-critical/30 !text-alert-critical hover:!bg-alert-critical/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:!border-border-subtle disabled:!text-text-dim"
                title="攻撃"
              >
                <Swords className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">攻撃</span>
              </button>

              <button
                onClick={onRepair}
                disabled={!canAct || !canRepair}
                className="btn-tactical py-1.5 px-2.5 gap-1 text-xs !border-alert-success/30 !text-alert-success hover:!bg-alert-success/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:!border-border-subtle disabled:!text-text-dim"
                title="修理"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">修理</span>
              </button>

              <button
                onClick={onWait}
                disabled={!canAct}
                className="btn-tactical py-1.5 px-2.5 gap-1 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                title="待機"
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">待機</span>
              </button>
            </div>

            <div className="flex-1" />

            {/* Unacted count */}
            <div className="readout text-xs text-text-dim shrink-0">
              残り <span className="text-accent-cyan font-bold">{unactedCount}</span> 部隊未行動
            </div>

            <div className="h-4 w-px bg-border-subtle" />

            {/* Pause */}
            <button
              onClick={isPaused ? onResume : onPause}
              className="btn-tactical py-1.5 px-2"
              aria-label={isPaused ? "再開" : "一時停止"}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            {/* End turn */}
            {!showEndConfirm ? (
              <button
                onClick={handleEndPhase}
                className="btn-approve py-1.5 px-4 gap-1.5 text-xs"
              >
                <Flag className="w-3.5 h-3.5" />
                ターン終了
              </button>
            ) : (
              <div className="flex items-center gap-1.5 animate-slide-up">
                <span className="readout text-xs text-alert-warning">
                  未行動部隊あり
                </span>
                <button
                  onClick={handleEndPhase}
                  className="btn-approve py-1.5 px-3 gap-1 text-xs !bg-alert-warning/20 !border-alert-warning/40 !text-alert-warning"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  確認
                </button>
                <button
                  onClick={handleCancelEnd}
                  className="btn-tactical py-1.5 px-2.5 text-xs"
                >
                  戻る
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== ENEMY PHASE ===== */}
        {turnPhase === "enemy" && (
          <>
            <div className="flex-1 flex items-center justify-center gap-2">
              <Loader className="w-4 h-4 text-alert-critical animate-spin" />
              <span className="readout text-sm text-alert-critical tracking-wider">
                敵フェーズ実行中
              </span>
            </div>
            <button
              onClick={onProcessEnemy}
              className="btn-tactical py-1.5 px-4 gap-1.5 text-xs !border-alert-critical/30 !text-alert-critical"
            >
              <SkipForward className="w-3.5 h-3.5" />
              スキップ
            </button>
          </>
        )}

        {/* ===== RESOLUTION PHASE ===== */}
        {turnPhase === "resolution" && (
          <div className="flex-1 flex items-center justify-center gap-2">
            <Loader className="w-4 h-4 text-accent-indigo animate-spin" />
            <span className="readout text-sm text-accent-indigo tracking-wider">
              結果処理中
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
