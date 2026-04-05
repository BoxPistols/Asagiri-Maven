"use client";

import { Sun, Moon, Pause, Play, Swords, Package, Crosshair, Heart, Shield, Box } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { GameKpis, GamePhase, TurnPhase } from "@/lib/game-types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GameHudProps {
  wave: number;
  turn: number;
  maxTurns: number;
  mapView?: "2d" | "3d";
  onToggleView?: () => void;
  kpis: GameKpis;
  supply: number;
  facilityCount: number;
  phase: GamePhase;
  turnPhase: TurnPhase;
  onPause?: () => void;
  onResume?: () => void;
  settingsSlot?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kpiColor(value: number): string {
  if (value > 60) return "var(--alert-success)";
  if (value > 30) return "var(--alert-warning)";
  return "var(--alert-critical)";
}

function kpiTextClass(value: number): string {
  if (value > 60) return "text-alert-success";
  if (value > 30) return "text-alert-warning";
  return "text-alert-critical";
}

function KpiMini({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const color = kpiColor(value);
  const pulseClass = value <= 30 ? "animate-blink" : "";

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={kpiTextClass(value)} style={{ display: "flex", alignItems: "center" }}>
        {icon}
      </span>
      <span className="readout text-[11px] text-text-dim hidden md:inline">{label}</span>
      <span className={`readout text-[13px] font-bold ${kpiTextClass(value)} ${pulseClass}`}>
        {value}
      </span>
      {/* Inline thin progress bar */}
      <div className="w-10 h-[3px] rounded-full bg-bg-elevated overflow-hidden hidden sm:block">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(value, 2)}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameHud({
  wave,
  turn,
  maxTurns,
  kpis,
  supply,
  facilityCount,
  phase,
  turnPhase,
  onPause,
  onResume,
  mapView = "2d",
  onToggleView,
  settingsSlot,
}: GameHudProps) {
  const { theme, toggle } = useTheme();
  const isPaused = phase === "paused";

  const supplyColor = supply < 30 ? "text-alert-critical" : supply < 60 ? "text-alert-warning" : "text-accent-cyan";
  const supplyPulse = supply < 30 ? "animate-blink" : "";

  return (
    <header className="game-hud">
      {/* Left: Title + Wave/Turn */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Logo diamond */}
        <div className="relative w-6 h-6 flex items-center justify-center">
          <div className="absolute inset-0 border-[1.5px] border-accent-cyan/50 rotate-45 scale-[0.6] rounded-sm" />
          <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse-dot" />
        </div>
        <span className="readout text-sm text-accent-cyan font-bold tracking-[0.2em]">MAVEN</span>
        <span className="readout text-[10px] text-text-dim tracking-wider hidden sm:inline">COMMAND</span>

        <div className="h-4 w-px bg-border-subtle" />

        {/* Wave / Turn */}
        <div className="flex items-center gap-1.5 readout text-xs">
          <Swords className="w-3 h-3 text-accent-cyan" />
          <span className="text-accent-cyan font-bold">W{wave}/5</span>
        </div>
        <div className="flex items-center gap-1 readout text-xs text-text-secondary">
          <span>T</span>
          <span className="text-text-primary font-bold">{turn}</span>
          <span className="text-text-dim">/{maxTurns}</span>
        </div>
      </div>

      {/* Center: KPI readouts */}
      <div className="flex items-center gap-3 mx-4 overflow-hidden">
        <div className="h-4 w-px bg-border-subtle shrink-0" />
        <KpiMini icon={<Swords className="w-3 h-3" />} label="戦力" value={kpis.combat} />
        <KpiMini icon={<Package className="w-3 h-3" />} label="物資" value={kpis.supply} />
        <KpiMini icon={<Crosshair className="w-3 h-3" />} label="情報" value={kpis.intel} />
        <KpiMini icon={<Heart className="w-3 h-3" />} label="士気" value={kpis.morale} />
        <div className="h-4 w-px bg-border-subtle shrink-0" />

        {/* Supply */}
        <div className="flex items-center gap-1.5">
          <Shield className={`w-3 h-3 ${supplyColor}`} />
          <span className="readout text-[11px] text-text-dim hidden md:inline">補給</span>
          <span className={`readout text-[13px] font-bold ${supplyColor} ${supplyPulse}`}>
            {supply}
          </span>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {isPaused && (
          <span className="readout text-[10px] text-alert-warning animate-blink tracking-wider mr-1">
            PAUSED
          </span>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="p-1 rounded border border-border-subtle hover:border-border-active transition-colors text-text-secondary hover:text-accent-cyan"
          aria-label={theme === "dark" ? "ライトモードに切替" : "ダークモードに切替"}
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Pause / Resume */}
        <button
          onClick={isPaused ? onResume : onPause}
          className="p-1 rounded border border-border-subtle hover:border-border-active transition-colors text-text-secondary hover:text-accent-cyan"
          aria-label={isPaused ? "再開" : "一時停止"}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>

        {/* Settings slot */}
        {settingsSlot}

        {/* 2D/3D toggle */}
        {onToggleView && (
          <button
            onClick={onToggleView}
            className={`px-2 py-1 rounded border transition-colors text-xs readout font-bold ${
              mapView === "3d"
                ? "border-accent-purple/60 bg-accent-purple/10 text-accent-purple"
                : "border-border-subtle hover:border-accent-purple/40 text-text-secondary hover:text-accent-purple"
            }`}
            aria-label="2D/3D切替"
            title={`${mapView === "3d" ? "2Dに切替" : "3Dに切替"} (PLATEAU)`}
          >
            <span className="flex items-center gap-1">
              <Box className="w-3 h-3" />
              {mapView === "3d" ? "3D" : "2D"}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
