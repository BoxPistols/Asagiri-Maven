"use client";

import { SkipForward, Pause, Play, Swords, Clock } from "lucide-react";
import type { GamePhase } from "@/lib/game-types";

interface GameControlsProps {
  turn: number;
  maxTurns: number;
  wave: number;
  phase: GamePhase;
  onNextTurn: () => void;
  onPause: () => void;
  onResume: () => void;
}

export default function GameControls({
  turn,
  maxTurns,
  wave,
  phase,
  onNextTurn,
  onPause,
  onResume,
}: GameControlsProps) {
  if (phase !== "playing" && phase !== "paused") return null;

  const isPaused = phase === "paused";
  const turnProgress = maxTurns > 0 ? (turn / maxTurns) * 100 : 0;

  return (
    <div className="game-controls">
      {/* Turn progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-bg-deep/50">
        <div
          className="h-full bg-accent-cyan transition-all duration-300"
          style={{ width: `${turnProgress}%` }}
        />
      </div>

      <div className="flex items-center gap-4 px-4 py-2.5">
        {/* Wave indicator */}
        <div className="flex items-center gap-1.5 readout text-xs">
          <Swords className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-accent-cyan font-bold">WAVE {wave}</span>
        </div>

        <div className="h-5 w-px bg-border-subtle" />

        {/* Turn display */}
        <div className="flex items-center gap-1.5 readout text-xs">
          <Clock className="w-3.5 h-3.5 text-text-dim" />
          <span className="text-text-secondary">
            TURN <span className="text-text-primary font-bold">{turn}</span>
            <span className="text-text-dim">/{maxTurns}</span>
          </span>
        </div>

        <div className="flex-1" />

        {/* Pause/Resume button */}
        <button
          onClick={isPaused ? onResume : onPause}
          className="btn-tactical py-1.5 px-3"
          aria-label={isPaused ? "再開" : "一時停止"}
        >
          {isPaused ? (
            <>
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">再開</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">一時停止</span>
            </>
          )}
        </button>

        {/* Next Turn button (primary action) */}
        <button
          onClick={onNextTurn}
          disabled={isPaused}
          className="btn-approve py-1.5 px-4 gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SkipForward className="w-4 h-4" />
          次のターン
        </button>
      </div>
    </div>
  );
}
