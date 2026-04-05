"use client";

import { Crosshair, Shield, Swords, Zap, X, Heart, Gauge, Wrench, CheckCircle } from "lucide-react";
import type { GameUnit } from "@/lib/game-types";
import { getAttackRange, getTypeAdvantage } from "@/lib/combat-rules";

// ---------- helpers ----------

function unitTypeLabel(type: GameUnit["type"]) {
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

/** Build type advantage hints for a player unit */
function typeAdvantageHints(type: GameUnit["type"]): { strong: string[]; weak: string[] } {
  const allTypes: GameUnit["type"][] = ["infantry", "vehicle", "drone", "ship", "cyber"];
  const typeLabels: Record<GameUnit["type"], string> = {
    infantry: "歩兵", vehicle: "車両", drone: "ドローン", ship: "艦船", cyber: "サイバー",
  };
  const strong: string[] = [];
  const weak: string[] = [];
  for (const t of allTypes) {
    if (t === type) continue;
    const adv = getTypeAdvantage(type, t);
    if (adv >= 1.5) strong.push(typeLabels[t]);
    else if (adv <= 0.6) weak.push(typeLabels[t]);
  }
  return { strong, weak };
}

// ---------- component ----------

export interface UnitDetailPanelProps {
  unit: GameUnit | null;
  onClose: () => void;
  /** Whether the unit is near a friendly facility and can be repaired */
  canRepair?: boolean;
  /** Optional: the name of the current engagement target */
  targetName?: string;
}

export default function UnitDetailPanel({
  unit,
  onClose,
  canRepair = false,
  targetName,
}: UnitDetailPanelProps) {
  if (!unit) return null;

  const hpRatio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
  const sColor = statusColor(unit.status);
  const isPlayer = unit.faction === "player";
  const isEngaging = unit.status === "engaging";
  const threat = !isPlayer ? threatLevel(unit) : null;
  const attackRange = getAttackRange(unit.type);
  const hints = isPlayer ? typeAdvantageHints(unit.type) : null;

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
        {/* Type + Faction + Status + Action badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="readout text-xs px-1.5 py-0.5 rounded"
            style={{
              color: "var(--accent-cyan)",
              background: "var(--accent-cyan-glow)",
              border: "1px solid var(--border-active)",
            }}
          >
            {unitTypeLabel(unit.type)}
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

        {/* Action status badge */}
        {isPlayer && unit.speed > 0 && (
          <div className={`flex items-center gap-1.5 readout text-xs px-2 py-1.5 rounded ${
            unit.actedThisTurn
              ? "bg-alert-success/8 border border-alert-success/20 text-alert-success"
              : "bg-accent-cyan/8 border border-accent-cyan/20 text-accent-cyan"
          }`}>
            {unit.actedThisTurn ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                行動済み
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                行動可能
              </>
            )}
          </div>
        )}

        {/* Repair badge */}
        {isPlayer && canRepair && (
          <div className="flex items-center gap-1.5 readout text-xs px-2 py-1.5 rounded bg-alert-warning/8 border border-alert-warning/20 text-alert-warning">
            <Wrench className="w-3.5 h-3.5" />
            修理可能
          </div>
        )}

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
        <div className="grid grid-cols-4 gap-1">
          <div className="flex flex-col items-center py-1.5 rounded bg-bg-elevated/60">
            <Swords className="w-3 h-3 text-alert-critical mb-0.5" />
            <span className="readout text-[10px] text-text-dim">攻撃</span>
            <span className="readout text-xs text-text-primary font-bold">
              {unit.attack}
            </span>
          </div>
          <div className="flex flex-col items-center py-1.5 rounded bg-bg-elevated/60">
            <Shield className="w-3 h-3 text-accent-blue mb-0.5" />
            <span className="readout text-[10px] text-text-dim">防御</span>
            <span className="readout text-xs text-text-primary font-bold">
              {unit.defense}
            </span>
          </div>
          <div className="flex flex-col items-center py-1.5 rounded bg-bg-elevated/60">
            <Gauge className="w-3 h-3 text-alert-success mb-0.5" />
            <span className="readout text-[10px] text-text-dim">速度</span>
            <span className="readout text-xs text-text-primary font-bold">
              {unit.speed}
            </span>
          </div>
          <div className="flex flex-col items-center py-1.5 rounded bg-bg-elevated/60">
            <Crosshair className="w-3 h-3 text-alert-warning mb-0.5" />
            <span className="readout text-[10px] text-text-dim">射程</span>
            <span className="readout text-xs text-text-primary font-bold">
              {attackRange.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Type advantage hints (player units only) */}
        {isPlayer && hints && (hints.strong.length > 0 || hints.weak.length > 0) && (
          <div className="space-y-1">
            {hints.strong.length > 0 && (
              <div className="readout text-xs text-alert-success flex items-center gap-1">
                <span className="shrink-0">有利:</span>
                <span className="text-text-secondary">対{hints.strong.join("・")}</span>
              </div>
            )}
            {hints.weak.length > 0 && (
              <div className="readout text-xs text-alert-critical flex items-center gap-1">
                <span className="shrink-0">不利:</span>
                <span className="text-text-secondary">対{hints.weak.join("・")}</span>
              </div>
            )}
          </div>
        )}

        {/* Contextual section */}
        {isPlayer && isEngaging && targetName && (
          <div className="flex items-center gap-2 text-xs readout px-2 py-1.5 rounded bg-alert-warning/8 border border-alert-warning/20 text-alert-warning">
            <Crosshair className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">交戦中: {targetName}</span>
          </div>
        )}

        {isPlayer && unit.status === "moving" && targetName && (
          <div className="flex items-center gap-2 text-xs readout px-2 py-1.5 rounded bg-accent-blue/8 border border-accent-blue/20 text-accent-blue">
            <Crosshair className="w-3.5 h-3.5 shrink-0" />
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
