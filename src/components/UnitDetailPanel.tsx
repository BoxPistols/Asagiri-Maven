"use client";

import { Target, Crosshair, Shield, Swords, Zap, X, Heart, Gauge } from "lucide-react";
import type { GameUnit } from "@/lib/game-types";

// ---------- helpers ----------

function unitTypeIcon(type: GameUnit["type"]) {
  switch (type) {
    case "infantry":  return "歩兵";
    case "vehicle":   return "車両";
    case "drone":     return "ドローン";
    case "ship":      return "艦船";
    case "cyber":     return "サイバー";
  }
}

function statusLabel(status: GameUnit["status"]): string {
  switch (status) {
    case "idle":      return "待機";
    case "moving":    return "移動中";
    case "engaging":  return "交戦中";
    case "damaged":   return "損傷";
    case "destroyed": return "撃破";
  }
}

function statusColor(status: GameUnit["status"]): string {
  switch (status) {
    case "idle":      return "var(--accent-cyan)";
    case "moving":    return "var(--accent-blue)";
    case "engaging":  return "var(--alert-warning)";
    case "damaged":   return "var(--alert-critical)";
    case "destroyed": return "var(--text-dim)";
  }
}

function hpBarColor(ratio: number): string {
  if (ratio > 0.6) return "var(--alert-success)";
  if (ratio > 0.3) return "var(--alert-warning)";
  return "var(--alert-critical)";
}

function threatLevel(unit: GameUnit): { label: string; color: string } {
  const power = unit.attack + unit.defense + unit.hp;
  if (power >= 40) return { label: "高", color: "var(--alert-critical)" };
  if (power >= 25) return { label: "中", color: "var(--alert-warning)" };
  return { label: "低", color: "var(--accent-cyan)" };
}

// ---------- component ----------

export interface UnitDetailPanelProps {
  unit: GameUnit | null;
  onAssignTarget: (unitId: string) => void;
  onClose: () => void;
  /** Optional: the name of the current engagement target */
  targetName?: string;
}

export default function UnitDetailPanel({
  unit,
  onAssignTarget,
  onClose,
  targetName,
}: UnitDetailPanelProps) {
  if (!unit) return null;

  const hpRatio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
  const sColor = statusColor(unit.status);
  const isPlayer = unit.faction === "player";
  const isIdle = unit.status === "idle";
  const isEngaging = unit.status === "engaging";
  const threat = !isPlayer ? threatLevel(unit) : null;

  return (
    <div
      className="absolute top-3 left-3 z-[1100] w-[240px] bg-bg-surface border border-border-active rounded-md overflow-hidden animate-slide-up"
      style={{
        boxShadow:
          "0 0 20px rgba(34,211,238,0.06), 0 8px 32px rgba(0,0,0,0.25)",
      }}
    >
      {/* Header */}
      <div className="panel-header !py-2 !px-3 flex items-center gap-2">
        <span className="flex-1 truncate">{unit.name}</span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-bg-elevated transition-colors"
          aria-label="閉じる"
        >
          <X className="w-3.5 h-3.5 text-text-dim hover:text-text-primary" />
        </button>
      </div>

      <div className="px-3 py-2.5 space-y-2.5">
        {/* Type + Faction badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="readout text-xs px-1.5 py-0.5 rounded"
            style={{
              color: "var(--accent-cyan)",
              background: "var(--accent-cyan-glow)",
              border: "1px solid var(--border-active)",
            }}
          >
            {unitTypeIcon(unit.type)}
          </span>
          <span
            className="readout text-xs px-1.5 py-0.5 rounded font-bold"
            style={{
              color: isPlayer ? "var(--alert-success)" : "var(--alert-critical)",
              background: isPlayer
                ? "rgba(52,211,153,0.1)"
                : "rgba(248,113,113,0.1)",
              border: `1px solid ${isPlayer ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
            }}
          >
            {isPlayer ? "味方" : "敵"}
          </span>
          <span
            className="readout text-xs px-1.5 py-0.5 rounded"
            style={{
              color: sColor,
              background: `color-mix(in srgb, ${sColor} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${sColor} 30%, transparent)`,
            }}
          >
            {statusLabel(unit.status)}
          </span>
        </div>

        {/* HP bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="readout text-xs text-text-dim flex items-center gap-1">
              <Heart className="w-3 h-3" /> HP
            </span>
            <span className="readout text-xs text-text-secondary">
              {unit.hp}/{unit.maxHp}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(hpRatio * 100, 0)}%`,
                background: hpBarColor(hpRatio),
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="flex flex-col items-center py-1.5 rounded bg-bg-elevated/60">
            <Swords className="w-3 h-3 text-alert-critical mb-0.5" />
            <span className="readout text-xs text-text-dim">攻撃力</span>
            <span className="readout text-sm text-text-primary font-bold">
              {unit.attack}
            </span>
          </div>
          <div className="flex flex-col items-center py-1.5 rounded bg-bg-elevated/60">
            <Shield className="w-3 h-3 text-accent-blue mb-0.5" />
            <span className="readout text-xs text-text-dim">防御力</span>
            <span className="readout text-sm text-text-primary font-bold">
              {unit.defense}
            </span>
          </div>
          <div className="flex flex-col items-center py-1.5 rounded bg-bg-elevated/60">
            <Gauge className="w-3 h-3 text-alert-success mb-0.5" />
            <span className="readout text-xs text-text-dim">速度</span>
            <span className="readout text-sm text-text-primary font-bold">
              {unit.speed}
            </span>
          </div>
        </div>

        {/* Contextual section */}
        {isPlayer && isIdle && (
          <button
            className="btn-tactical w-full justify-center !border-accent-indigo/40 !text-accent-indigo hover:!bg-accent-indigo/10"
            onClick={() => onAssignTarget(unit.id)}
          >
            <Target className="w-3.5 h-3.5" />
            目標指定
          </button>
        )}

        {isPlayer && isEngaging && targetName && (
          <div className="flex items-center gap-2 text-xs readout px-2 py-1.5 rounded bg-alert-warning/8 border border-alert-warning/20 text-alert-warning">
            <Crosshair className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">交戦中: {targetName}</span>
          </div>
        )}

        {isPlayer && unit.status === "moving" && targetName && (
          <div className="flex items-center gap-2 text-xs readout px-2 py-1.5 rounded bg-accent-blue/8 border border-accent-blue/20 text-accent-blue">
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">目標: {targetName}</span>
          </div>
        )}

        {!isPlayer && threat && (
          <div
            className="flex items-center gap-2 text-xs readout px-2 py-1.5 rounded"
            style={{
              color: threat.color,
              background: `color-mix(in srgb, ${threat.color} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${threat.color} 20%, transparent)`,
            }}
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            脅威レベル: {threat.label}
          </div>
        )}

        {/* Coordinates */}
        <div className="text-xs readout text-text-dim pt-1 border-t border-border-subtle">
          {unit.lat.toFixed(4)}, {unit.lng.toFixed(4)}
        </div>
      </div>
    </div>
  );
}
