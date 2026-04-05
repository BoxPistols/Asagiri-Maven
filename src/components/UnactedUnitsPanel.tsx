"use client";

import { CheckCircle2, ChevronRight, Swords, Navigation, Truck, Ship, User } from "lucide-react";
import type { GameUnit } from "@/lib/game-types";

interface UnactedUnitsPanelProps {
  units: GameUnit[];            // ALL player mobile units
  selectedId: string | null;
  onSelectUnit: (unit: GameUnit) => void;
}

function typeIcon(type: GameUnit["type"]) {
  switch (type) {
    case "drone":   return Navigation;
    case "vehicle": return Truck;
    case "ship":    return Ship;
    case "cyber":   return User;
    default:        return User;
  }
}

export default function UnactedUnitsPanel({
  units,
  selectedId,
  onSelectUnit,
}: UnactedUnitsPanelProps) {
  // Filter only mobile (acting-capable) units
  const mobile = units.filter(u =>
    u.status !== "destroyed"
    && ((u.movePoints ?? 0) > 0 || u.speed > 0)
  );
  const unacted = mobile.filter(u => !u.actedThisTurn);
  const total = mobile.length;
  const actedCount = total - unacted.length;
  const allActed = unacted.length === 0 && total > 0;
  const progressPct = total > 0 ? (actedCount / total) * 100 : 0;

  return (
    <div className="absolute top-20 right-3 z-[950] w-56 bg-bg-surface/95 backdrop-blur-md border border-border-active rounded-lg overflow-hidden shadow-xl pointer-events-auto">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border-subtle bg-bg-primary/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="readout text-xs text-accent-cyan uppercase tracking-wider font-bold">
            行動状況
          </span>
          <span className="readout text-xs text-text-secondary">
            <span className="text-accent-cyan font-bold">{actedCount}</span>
            <span className="text-text-dim">/{total}</span>
          </span>
        </div>
        <div className="h-1 bg-bg-deep/60 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${allActed ? "bg-alert-success" : "bg-accent-cyan"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Unit list */}
      <div className="max-h-[40vh] overflow-y-auto">
        {unacted.length > 0 ? (
          unacted.map(unit => {
            const Icon = typeIcon(unit.type);
            const isSelected = unit.id === selectedId;
            const hpRatio = unit.hp / unit.maxHp;
            const hpColor = hpRatio > 0.6 ? "text-alert-success" : hpRatio > 0.3 ? "text-alert-warning" : "text-alert-critical";
            return (
              <button
                key={unit.id}
                onClick={() => onSelectUnit(unit)}
                className={`w-full flex items-center gap-2 px-3 py-2 border-b border-border-subtle transition-colors text-left ${
                  isSelected ? "bg-accent-cyan/15" : "hover:bg-bg-elevated/40"
                }`}
              >
                <Icon className="w-4 h-4 text-accent-cyan shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-primary truncate font-medium">{unit.name}</div>
                  <div className={`readout text-xs ${hpColor}`}>HP {unit.hp}/{unit.maxHp}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-text-dim shrink-0" />
              </button>
            );
          })
        ) : (
          <div className="px-3 py-4 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-alert-success" />
            <div className="readout text-xs text-alert-success font-bold uppercase tracking-wider animate-pulse-dot">
              全部隊行動完了
            </div>
            <div className="text-xs text-text-secondary text-center leading-relaxed">
              <kbd className="readout text-xs bg-bg-deep px-1.5 py-0.5 rounded border border-border-subtle">Space</kbd>
              <br />
              でターン終了
            </div>
          </div>
        )}
      </div>

      {/* Footer help */}
      {!allActed && (
        <div className="px-3 py-1.5 border-t border-border-subtle bg-bg-primary/40">
          <div className="flex items-center gap-1.5 text-xs text-text-dim">
            <Swords className="w-3 h-3" />
            <span>部隊名をクリックで選択</span>
          </div>
        </div>
      )}
    </div>
  );
}
