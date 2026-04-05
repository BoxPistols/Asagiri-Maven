"use client";

import { useEffect, useState, useRef } from "react";
import { AlertTriangle, Swords } from "lucide-react";
import type { GameUnit } from "@/lib/game-types";

interface ReinforcementAlertProps {
  enemyUnits: GameUnit[];
  turn: number;
  turnPhase: string;
}

interface AlertEvent {
  id: string;
  count: number;
  unitNames: string[];
  locations: string[];
  timestamp: number;
}

export default function ReinforcementAlert({ enemyUnits, turn, turnPhase }: ReinforcementAlertProps) {
  const prevCountRef = useRef<number>(enemyUnits.length);
  const prevIdsRef = useRef<Set<string>>(new Set(enemyUnits.map(u => u.id)));
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);

  useEffect(() => {
    const currentIds = new Set(enemyUnits.map(u => u.id));
    const newUnits = enemyUnits.filter(u => !prevIdsRef.current.has(u.id));

    if (newUnits.length > 0 && turn > 1) {
      // Suppress initial wave 1 spawn (turn 1)
      const alert: AlertEvent = {
        id: `reinforcement-${turn}-${Date.now()}`,
        count: newUnits.length,
        unitNames: newUnits.map(u => u.name),
        locations: [...new Set(newUnits.map(u => {
          // Extract location hint from detail (before pipe or first sentence)
          const first = u.detail.split(/[|、]/)[0].trim();
          return first.length > 20 ? first.slice(0, 20) + "..." : first;
        }))],
        timestamp: Date.now(),
      };
      setAlerts(prev => [...prev, alert]);
      // Auto-cleanup
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
      }, 3200);
    }

    prevCountRef.current = enemyUnits.length;
    prevIdsRef.current = currentIds;
  }, [enemyUnits, turn]);

  // Don't show during enemy phase to avoid conflict with other overlays
  if (alerts.length === 0 || turnPhase !== "resolution") {
    // Actually, show in both resolution and player transitions
  }

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1800] pointer-events-none">
      {alerts.map((alert, i) => (
        <div
          key={alert.id}
          className="animate-reinforcement-slam mb-2"
          style={{ animationDelay: `${i * 150}ms` }}
        >
          <div className="bg-alert-critical/95 border-4 border-alert-warning rounded-lg px-6 py-4 shadow-2xl backdrop-blur-sm min-w-[360px]">
            <div className="flex items-center justify-center gap-3 mb-2">
              <AlertTriangle className="w-7 h-7 text-white animate-blink" />
              <span className="readout text-base text-white font-black uppercase tracking-widest">
                敵増援発生
              </span>
              <AlertTriangle className="w-7 h-7 text-white animate-blink" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                新たに <span className="text-alert-warning">{alert.count}体</span> 出現
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2">
                {alert.unitNames.map(name => (
                  <div key={name} className="flex items-center gap-1 readout text-xs text-white/90">
                    <Swords className="w-3 h-3" />
                    {name}
                  </div>
                ))}
              </div>
              {alert.locations.length > 0 && (
                <div className="text-xs text-white/75 mt-2 italic">
                  {alert.locations.slice(0, 3).join(" / ")}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
