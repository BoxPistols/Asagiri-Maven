"use client";

import { Move, Swords, Wrench, Clock, X } from "lucide-react";
import type { GameUnit } from "@/lib/game-types";
import { calculateDamage, getAttackRange, getTypeAdvantage } from "@/lib/combat-rules";

interface ActionLauncherProps {
  unit: GameUnit | null;
  enemies?: GameUnit[];
  canAct: boolean;
  canRepair: boolean;
  hasNearbyEnemies: boolean;
  onMove: () => void;
  onAttack: () => void;
  onRepair: () => void;
  onWait: () => void;
  onClose: () => void;
}

export default function ActionLauncher({
  unit,
  enemies = [],
  canAct,
  canRepair,
  hasNearbyEnemies,
  onMove,
  onAttack,
  onRepair,
  onWait,
  onClose,
}: ActionLauncherProps) {
  if (!unit || unit.faction !== "player" || !canAct) return null;

  // Find best enemy in range for attack prediction
  const range = unit.range ?? getAttackRange(unit.type);
  const inRangeEnemies = enemies.filter(e => {
    if (e.status === "destroyed") return false;
    const dLat = e.lat - unit.lat;
    const dLng = e.lng - unit.lng;
    return Math.sqrt(dLat * dLat + dLng * dLng) <= range;
  });
  const attackPrediction = inRangeEnemies.length > 0 ? (() => {
    // Find weakest enemy with advantage if possible
    const sorted = [...inRangeEnemies].sort((a, b) => {
      const advA = getTypeAdvantage(unit.type, a.type);
      const advB = getTypeAdvantage(unit.type, b.type);
      if (advA !== advB) return advB - advA;
      return a.hp - b.hp;
    });
    const target = sorted[0];
    const dmg = calculateDamage(unit, target, false);
    return {
      target,
      damage: dmg.damage,
      advantage: dmg.advantage,
      wouldDestroy: target.hp <= dmg.damage,
    };
  })() : null;

  const actions = [
    {
      key: "move",
      label: "移動",
      hint: "↑↓←→ or 地図クリック",
      icon: Move,
      color: "text-accent-cyan",
      bg: "bg-accent-cyan/10 border-accent-cyan/30 hover:bg-accent-cyan/20",
      enabled: (unit.movePoints ?? 0) > 0 || unit.speed > 0,
      shortcut: "Q",
      onClick: onMove,
    },
    {
      key: "attack",
      label: "攻撃",
      hint: attackPrediction
        ? `${attackPrediction.target.name}へ ${attackPrediction.damage}DMG${attackPrediction.wouldDestroy ? " (撃破!)" : ""}${attackPrediction.advantage === "strong" ? " 有利" : attackPrediction.advantage === "weak" ? " 不利" : ""}`
        : "射程内に敵なし",
      icon: Swords,
      color: "text-alert-critical",
      bg: "bg-alert-critical/10 border-alert-critical/30 hover:bg-alert-critical/20",
      enabled: hasNearbyEnemies,
      shortcut: "W",
      onClick: onAttack,
    },
    {
      key: "repair",
      label: "修理",
      hint: canRepair ? "補給10消費・HP+30" : "拠点付近 or 補給不足",
      icon: Wrench,
      color: "text-alert-success",
      bg: "bg-alert-success/10 border-alert-success/30 hover:bg-alert-success/20",
      enabled: canRepair,
      shortcut: "E",
      onClick: onRepair,
    },
    {
      key: "wait",
      label: "待機",
      hint: "行動をスキップ",
      icon: Clock,
      color: "text-text-secondary",
      bg: "bg-bg-elevated/40 border-border-subtle hover:bg-bg-elevated/70",
      enabled: true,
      shortcut: "R",
      onClick: onWait,
    },
  ];

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[1100] bg-bg-surface/95 backdrop-blur-md border-2 border-accent-cyan/40 rounded-xl shadow-2xl animate-slide-up pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse-dot" />
          <span className="text-sm text-text-primary font-medium">{unit.name}</span>
          <span className="readout text-xs text-text-dim">— アクション選択</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-bg-elevated text-text-dim hover:text-text-primary transition-colors"
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions grid */}
      <div className="grid grid-cols-4 gap-2 p-3">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              onClick={action.onClick}
              disabled={!action.enabled}
              className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border transition-all ${action.bg} disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent min-w-[88px]`}
            >
              <Icon className={`w-6 h-6 ${action.color}`} />
              <div className={`readout text-xs font-bold ${action.color}`}>{action.label}</div>
              <div className="text-[11px] text-text-dim text-center leading-tight">{action.hint}</div>
              <div className="readout text-[11px] text-text-dim opacity-60 mt-0.5">[{action.shortcut}]</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
