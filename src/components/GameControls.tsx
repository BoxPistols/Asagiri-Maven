"use client";

import { useEffect, useRef, useState } from "react";
import { SkipForward, Pause, Play, Swords, Clock, Zap } from "lucide-react";
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

const SPEED_OPTIONS = [
  { label: "手動", ms: 0 },
  { label: "遅い", ms: 5000 },
  { label: "普通", ms: 3000 },
  { label: "速い", ms: 1500 },
];

export default function GameControls({
  turn,
  maxTurns,
  wave,
  phase,
  onNextTurn,
  onPause,
  onResume,
}: GameControlsProps) {
  const [speedIdx, setSpeedIdx] = useState(2); // default: 普通
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPaused = phase === "paused";
  const isPlaying = phase === "playing";

  // Auto-advance timer
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const ms = SPEED_OPTIONS[speedIdx].ms;
    if (ms > 0 && isPlaying) {
      intervalRef.current = setInterval(onNextTurn, ms);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [speedIdx, isPlaying, onNextTurn]);

  if (phase !== "playing" && phase !== "paused") return null;

  const turnProgress = maxTurns > 0 ? (turn / maxTurns) * 100 : 0;
  const autoMode = SPEED_OPTIONS[speedIdx].ms > 0;

  return (
    <div className="game-controls">
      {/* Turn progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-bg-deep/50">
        <div
          className="h-full bg-gradient-to-r from-accent-cyan to-accent-indigo transition-all duration-500"
          style={{ width: `${turnProgress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Wave + Turn */}
        <div className="flex items-center gap-3 readout">
          <div className="flex items-center gap-1.5 text-sm">
            <Swords className="w-4 h-4 text-accent-cyan" />
            <span className="text-accent-cyan font-bold">WAVE {wave}/5</span>
          </div>
          <div className="h-5 w-px bg-border-subtle" />
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="w-4 h-4 text-text-dim" />
            <span className="text-text-primary font-bold">{turn}</span>
            <span className="text-text-dim">/ {maxTurns}</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Speed selector */}
        <div className="flex items-center gap-1 bg-bg-deep/60 rounded-md p-0.5">
          {SPEED_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => setSpeedIdx(i)}
              className={`readout text-xs px-2.5 py-1 rounded transition-colors ${
                i === speedIdx
                  ? "bg-accent-cyan/15 text-accent-cyan"
                  : "text-text-dim hover:text-text-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border-subtle" />

        {/* Pause/Resume */}
        <button
          onClick={isPaused ? onResume : onPause}
          className="btn-tactical py-2 px-3"
          aria-label={isPaused ? "再開" : "一時停止"}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>

        {/* Next Turn (manual) */}
        <button
          onClick={onNextTurn}
          disabled={isPaused}
          className="btn-approve py-2 px-5 gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {autoMode ? (
            <Zap className="w-4 h-4" />
          ) : (
            <SkipForward className="w-4 h-4" />
          )}
          {autoMode ? "次へ" : "次のターン"}
        </button>
      </div>
    </div>
  );
}
