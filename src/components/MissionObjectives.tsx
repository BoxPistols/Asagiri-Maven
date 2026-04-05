"use client";

import { Target, Skull, Shield, Trophy, Clock } from "lucide-react";
import type { GameState } from "@/lib/game-types";

interface MissionObjectivesProps {
  state: GameState;
  waveName: string;
}

interface Objective {
  label: string;
  current: number;
  total: number;
  type: "win" | "defend" | "survive";
  complete: boolean;
}

function buildObjectives(state: GameState): Objective[] {
  const objs: Objective[] = [];

  // Primary: defeat all enemies this wave
  const aliveEnemies = state.enemyUnits.filter(u => u.status !== "destroyed").length;
  const totalEnemies = state.enemyUnits.length;
  const defeated = totalEnemies - aliveEnemies;
  objs.push({
    label: "敵部隊を殲滅",
    current: defeated,
    total: totalEnemies || 1,
    type: "win",
    complete: totalEnemies > 0 && aliveEnemies === 0,
  });

  // Secondary: protect all 5 bases
  const facilities = state.playerUnits.filter(u => u.id.startsWith("base-"));
  const aliveBases = facilities.filter(u => u.status !== "destroyed").length;
  objs.push({
    label: "全5拠点を防衛",
    current: aliveBases,
    total: 5,
    type: "defend",
    complete: aliveBases === 5,
  });

  // Tertiary: survive waves
  objs.push({
    label: "最終波まで生存",
    current: state.wave,
    total: 5,
    type: "survive",
    complete: state.wave === 5,
  });

  return objs;
}

export default function MissionObjectives({ state, waveName }: MissionObjectivesProps) {
  const objectives = buildObjectives(state);
  const kpiDanger = Object.entries(state.kpis).find(([, v]) => v <= 30);

  return (
    <div className="absolute bottom-16 right-3 z-[1000] w-64 bg-bg-surface/95 backdrop-blur-md border border-border-active rounded-lg overflow-hidden shadow-xl pointer-events-auto">
      <div className="panel-header !py-2 !text-xs">
        <Target className="w-3.5 h-3.5" />
        任務目標
      </div>
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-border-subtle">
          <Clock className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="readout text-xs text-accent-cyan uppercase tracking-wider">
            WAVE {state.wave}
          </span>
          <span className="text-xs text-text-secondary truncate">{waveName}</span>
        </div>

        <div className="space-y-2">
          {objectives.map((obj, i) => {
            const pct = Math.round((obj.current / obj.total) * 100);
            const Icon = obj.type === "win" ? Skull : obj.type === "defend" ? Shield : Trophy;
            const color = obj.complete
              ? "text-alert-success"
              : obj.type === "defend" && obj.current < obj.total
              ? "text-alert-warning"
              : "text-text-primary";
            const barColor = obj.complete
              ? "bg-alert-success"
              : obj.type === "defend" && obj.current < obj.total - 1
              ? "bg-alert-critical"
              : "bg-accent-cyan";
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className={`flex items-center gap-1.5 ${color}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="font-medium">{obj.label}</span>
                  </div>
                  <span className={`readout ${color} font-bold`}>
                    {obj.current}/{obj.total}
                  </span>
                </div>
                <div className="h-1.5 bg-bg-deep/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Danger warnings */}
        {kpiDanger && (
          <div className="mt-2.5 pt-2.5 border-t border-alert-critical/20 bg-alert-critical/10 -mx-3 -mb-2.5 px-3 py-2 flex items-center gap-2">
            <Skull className="w-4 h-4 text-alert-critical animate-blink" />
            <div className="flex-1">
              <div className="readout text-xs text-alert-critical font-bold uppercase">
                警告: {
                  kpiDanger[0] === "combat" ? "戦力" :
                  kpiDanger[0] === "supply" ? "物資" :
                  kpiDanger[0] === "morale" ? "士気" : "情報"
                } 危機
              </div>
              <div className="text-xs text-text-secondary">
                このKPIが0になると敗北
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
