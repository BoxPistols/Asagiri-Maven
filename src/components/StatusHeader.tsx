"use client";

import { useEffect, useState } from "react";
import { Wifi, Cpu, Clock, Sun, Moon, Swords, Shield } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { GamePhase } from "@/lib/game-types";

interface StatusHeaderProps {
  gameWave?: number;
  gameTurn?: number;
  gamePhase?: GamePhase;
}

export default function StatusHeader({ gameWave, gameTurn, gamePhase }: StatusHeaderProps = {}) {
  const [time, setTime] = useState("");
  const { theme, toggle } = useTheme();
  const isGameMode = !!gamePhase;

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-12 border-b border-border-subtle bg-bg-primary/90 backdrop-blur-sm flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-7 h-7 flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-accent-cyan/40 rotate-45 scale-[0.65] rounded-sm" />
            <div className="w-2.5 h-2.5 bg-accent-cyan rounded-full animate-pulse-dot" />
          </div>
          <div>
            <span className="readout text-base text-accent-cyan font-bold tracking-[0.25em]">MAVEN</span>
            <span className="text-xs text-text-dim ml-2 tracking-wide">
              {isGameMode ? "COMMAND" : "Smart System"}
            </span>
          </div>
        </div>
        <div className="h-5 w-px bg-border-subtle" />
        {isGameMode ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 readout text-xs text-accent-cyan">
              <Swords className="w-3.5 h-3.5" />
              <span className="font-bold">WAVE {gameWave}/5</span>
            </div>
            <div className="h-4 w-px bg-border-subtle" />
            <div className="flex items-center gap-1.5 readout text-xs text-text-secondary">
              <Shield className="w-3.5 h-3.5 text-accent-indigo" />
              <span>TURN <span className="text-text-primary font-bold">{gameTurn}</span></span>
            </div>
            {gamePhase === "paused" && (
              <>
                <div className="h-4 w-px bg-border-subtle" />
                <span className="readout text-xs text-alert-warning animate-blink">PAUSED</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs readout text-alert-success">
            <div className="w-2 h-2 rounded-full bg-alert-success animate-pulse-dot" />
            全システム稼働中
          </div>
        )}
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-4 text-xs readout text-text-secondary">
          <span className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-alert-success" /></span>
          <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-accent-cyan" /> AI稼働</span>
        </div>
        <div className="h-5 w-px bg-border-subtle" />
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="p-1.5 rounded-md border border-border-subtle hover:border-border-active transition-colors text-text-secondary hover:text-accent-cyan"
          aria-label={theme === "dark" ? "ライトモードに切替" : "ダークモードに切替"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <div className="h-5 w-px bg-border-subtle" />
        <div className="flex items-center gap-2 readout text-base text-text-primary tabular-nums">
          <Clock className="w-4 h-4 text-text-dim" />
          {time}
        </div>
      </div>
    </header>
  );
}
