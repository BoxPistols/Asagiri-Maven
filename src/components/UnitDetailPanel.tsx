"use client";

import { Crosshair, Shield, Swords, Zap, X, Heart, Gauge, Wrench } from "lucide-react";
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
    <div className="unit-detail-floating">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-10 p-1 rounded hover:bg-bg-elevated/80 transition-colors"
        aria-label="閉じる"
      >
        <X className="w-3.5 h-3.5 text-text-dim hover:text-text-primary" />
      </button>

      {/* Unit icon + Name + Type badge row */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: isPlayer ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
            border: `1.5px solid ${isPlayer ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)"}`,
          }}
        >
          {unit.type === "infantry" && <Shield className="w-5 h-5" style={{ color: isPlayer ? "var(--alert-success)" : "var(--alert-critical)" }} />}
          {unit.type === "vehicle" && <Gauge className="w-5 h-5" style={{ color: isPlayer ? "var(--alert-success)" : "var(--alert-critical)" }} />}
          {unit.type === "drone" && <Crosshair className="w-5 h-5" style={{ color: isPlayer ? "var(--alert-success)" : "var(--alert-critical)" }} />}
          {unit.type === "ship" && <Shield className="w-5 h-5" style={{ color: isPlayer ? "var(--alert-success)" : "var(--alert-critical)" }} />}
          {unit.type === "cyber" && <Zap className="w-5 h-5" style={{ color: isPlayer ? "var(--alert-success)" : "var(--alert-critical)" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-text-primary font-semibold truncate">{unit.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="readout text-[10px] px-1 py-0.5 rounded" style={{ color: "var(--accent-cyan)", background: "var(--accent-cyan-glow)", border: "1px solid var(--border-active)" }}>
              {unitTypeLabel(unit.type)}
            </span>
            <span className="readout text-[10px] px-1 py-0.5 rounded" style={{ color: sColor, background: `color-mix(in srgb, ${sColor} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${sColor} 30%, transparent)` }}>
              {statusLabel(unit.status)}
            </span>
            {isPlayer && unit.speed > 0 && (
              <span className={`readout text-[10px] ${unit.actedThisTurn ? "text-alert-success" : "text-accent-cyan"}`}>
                {unit.actedThisTurn ? "済" : "可"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* HP bar -- prominent */}
      <div className="px-3 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="readout text-[10px] text-text-dim flex items-center gap-1">
            <Heart className="w-3 h-3" /> HP
          </span>
          <span className="readout text-xs text-text-secondary font-bold">
            {unit.hp}/{unit.maxHp}
          </span>
        </div>
        <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.max(hpRatio * 100, 0)}%`,
              background: hpBarColor(hpRatio),
            }}
          />
        </div>
      </div>

      {/* Compact stats row */}
      <div className="flex items-center gap-0.5 px-3 py-1">
        <div className="flex items-center gap-1 flex-1 justify-center py-1 rounded bg-bg-elevated/50">
          <Swords className="w-2.5 h-2.5 text-alert-critical" />
          <span className="readout text-[11px] text-text-primary font-bold">{unit.attack}</span>
        </div>
        <div className="flex items-center gap-1 flex-1 justify-center py-1 rounded bg-bg-elevated/50">
          <Shield className="w-2.5 h-2.5 text-accent-blue" />
          <span className="readout text-[11px] text-text-primary font-bold">{unit.defense}</span>
        </div>
        <div className="flex items-center gap-1 flex-1 justify-center py-1 rounded bg-bg-elevated/50">
          <Gauge className="w-2.5 h-2.5 text-alert-success" />
          <span className="readout text-[11px] text-text-primary font-bold">{unit.speed}</span>
        </div>
        <div className="flex items-center gap-1 flex-1 justify-center py-1 rounded bg-bg-elevated/50">
          <Crosshair className="w-2.5 h-2.5 text-alert-warning" />
          <span className="readout text-[11px] text-text-primary font-bold">{attackRange.toFixed(1)}</span>
        </div>
      </div>

      {/* Repair badge */}
      {isPlayer && canRepair && (
        <div className="mx-3 my-1 flex items-center gap-1.5 readout text-[10px] px-2 py-1 rounded bg-alert-warning/8 border border-alert-warning/20 text-alert-warning">
          <Wrench className="w-3 h-3" />
          修理可能
        </div>
      )}

      {/* Contextual info */}
      {isPlayer && isEngaging && targetName && (
        <div className="mx-3 my-1 flex items-center gap-1.5 text-[10px] readout px-2 py-1 rounded bg-alert-warning/8 border border-alert-warning/20 text-alert-warning">
          <Crosshair className="w-3 h-3 shrink-0" />
          <span className="truncate">交戦: {targetName}</span>
        </div>
      )}

      {!isPlayer && threat && (
        <div
          className="mx-3 my-1 flex items-center gap-1.5 text-[10px] readout px-2 py-1 rounded"
          style={{ color: threat.color, background: `color-mix(in srgb, ${threat.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${threat.color} 20%, transparent)` }}
        >
          <Zap className="w-3 h-3 shrink-0" />
          脅威: {threat.label}
        </div>
      )}

      {/* Type advantage -- tooltip-style */}
      {isPlayer && hints && (hints.strong.length > 0 || hints.weak.length > 0) && (
        <div className="px-3 py-1 flex items-center gap-2 text-[10px] readout">
          {hints.strong.length > 0 && (
            <span className="text-alert-success">+{hints.strong.join("・")}</span>
          )}
          {hints.weak.length > 0 && (
            <span className="text-alert-critical">-{hints.weak.join("・")}</span>
          )}
        </div>
      )}

      {/* Coordinates */}
      <div className="text-[10px] readout text-text-dim px-3 pb-2 pt-1 border-t border-border-subtle/50 mt-1">
        {unit.lat.toFixed(4)}, {unit.lng.toFixed(4)}
      </div>
    </div>
  );
}
