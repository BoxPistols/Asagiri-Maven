"use client";

import { createContext, useContext, useReducer } from "react";
import type {
  GameState,
  GameAction,
  GameEvent,
  GameUnit,
  GameLogEntry,
  GameKpis,
} from "@/lib/game-types";
import { createInitialGameState, WAVE_CONFIGS } from "@/lib/game-init";
import {
  generateEnemyActions,
  processEnemyTurn,
} from "@/lib/enemy-ai";
import {
  calculateDamage,
  isInRange,
  isNearFriendlyFacility,
  getAttackRange,
} from "@/lib/combat-rules";
import { formatCombatLog } from "@/lib/combat-log-formatter";
import { pickIntelMessage } from "@/lib/intel-scripts";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameContext");
  return ctx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function makeLog(
  role: GameLogEntry["role"],
  content: string,
  turn: number,
): GameLogEntry {
  return { id: `log-${uid().slice(0, 8)}`, role, content, timestamp: now(), turn };
}

function clampKpi(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Distance helper (flat-Earth, good enough for Japan). */
function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dlat = a.lat - b.lat;
  const dlng = (a.lng - b.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

// ---------------------------------------------------------------------------
// Wave helpers
// ---------------------------------------------------------------------------

function getWaveConfig(wave: number) {
  return WAVE_CONFIGS[wave - 1] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1];
}

function turnStartForWave(wave: number): number {
  let t = 0;
  for (let i = 0; i < wave - 1; i++) {
    t += WAVE_CONFIGS[i].turns;
  }
  return t;
}

// ---------------------------------------------------------------------------
// Resolution sub-helpers
// ---------------------------------------------------------------------------

/** Spawn wave events */
function spawnEvents(state: GameState): { events: GameEvent[]; log: GameLogEntry[] } {
  const waveConfig = getWaveConfig(state.wave);
  const newEvents = generateEnemyActions(state, waveConfig);
  const log = newEvents.map((e) =>
    makeLog("intel", `[新規脅威] ${e.title} — ${e.location}. ${pickIntelMessage("event_detected", state.wave)}`, state.turn),
  );
  return { events: [...state.events, ...newEvents], log };
}

/** Spawn enemy units for current wave */
function spawnEnemyUnits(state: GameState): {
  enemyUnits: GameUnit[];
  log: GameLogEntry[];
} {
  const waveConfig = getWaveConfig(state.wave);
  const turnInWave = state.turn - turnStartForWave(state.wave);
  const log: GameLogEntry[] = [];

  let units = [...state.enemyUnits];
  if (turnInWave === 0) {
    const spawned: GameUnit[] = waveConfig.spawnUnits.map((tmpl, i) => ({
      ...tmpl,
      id: `enemy-w${state.wave}-${i}-${uid().slice(0, 6)}`,
      status: "moving" as const,
      actedThisTurn: false,
    }));
    units = [...units, ...spawned];
    for (const u of spawned) {
      log.push(makeLog("intel", `敵部隊出現: ${u.name}`, state.turn));
    }
  }

  return { enemyUnits: units, log };
}

/** Apply KPI drain from unresolved events */
function applyKpiDrain(state: GameState): GameKpis {
  const kpis = { ...state.kpis };

  for (const event of state.events) {
    if (event.resolved) continue;

    const drain = event.severity === "critical" ? 5 : event.severity === "warning" ? 2 : 0;
    if (drain === 0) continue;

    switch (event.type) {
      case "attack":
        kpis.combat = clampKpi(kpis.combat - drain);
        kpis.morale = clampKpi(kpis.morale - Math.floor(drain / 2));
        break;
      case "cyber":
        kpis.intel = clampKpi(kpis.intel - drain);
        kpis.combat = clampKpi(kpis.combat - Math.floor(drain / 2));
        break;
      case "supply_cut":
        kpis.supply = clampKpi(kpis.supply - drain);
        break;
      case "sabotage":
        kpis.supply = clampKpi(kpis.supply - Math.floor(drain / 2));
        kpis.morale = clampKpi(kpis.morale - drain);
        break;
      case "recon":
        kpis.intel = clampKpi(kpis.intel - drain);
        break;
      case "boss":
        kpis.combat = clampKpi(kpis.combat - drain);
        kpis.morale = clampKpi(kpis.morale - drain);
        kpis.supply = clampKpi(kpis.supply - Math.floor(drain / 2));
        break;
    }
  }

  return kpis;
}

/** Mark events as resolved when all linked enemies destroyed */
function resolveEvents(state: GameState): GameEvent[] {
  return state.events.map((event) => {
    if (event.resolved) return event;

    // An event is resolved if a mission targeting it has succeeded
    const mission = state.missions.find(
      (m) => m.eventId === event.id && m.stage === "resolved" && m.outcome === "success",
    );
    if (mission) return { ...event, resolved: true };

    // Also resolve if all linked enemies are destroyed
    if (event.linkedUnitIds.length > 0) {
      const allDead = event.linkedUnitIds.every((id) => {
        const unit = state.enemyUnits.find((u) => u.id === id);
        return !unit || unit.status === "destroyed";
      });
      if (allDead) return { ...event, resolved: true };
    }

    return event;
  });
}

/** Check win/lose */
function checkEndConditions(state: GameState): "victory" | "defeat" | null {
  // Defeat: any KPI at 0
  const kpiValues = Object.values(state.kpis) as number[];
  if (kpiValues.some((v) => v <= 0)) return "defeat";

  // Defeat: any facility destroyed
  const facilityDestroyed = state.playerUnits.some(
    (u) => u.id.startsWith("base-") && u.status === "destroyed",
  );
  if (facilityDestroyed) return "defeat";

  // Victory: wave 5 complete and boss event resolved
  if (state.wave >= 5) {
    const bossEvents = state.events.filter((e) => e.type === "boss");
    const allBossResolved = bossEvents.length > 0 && bossEvents.every((e) => e.resolved);
    if (allBossResolved) return "victory";
  }

  return null;
}

/** Auto-advance wave */
function shouldAdvanceWave(state: GameState): boolean {
  const waveConfig = getWaveConfig(state.wave);
  const waveStart = turnStartForWave(state.wave);
  const turnsIntoWave = state.turn - waveStart;

  if (turnsIntoWave < waveConfig.turns - 1) return false;

  const waveEvents = state.events.filter(
    (e) => e.turn >= waveStart && e.turn < waveStart + waveConfig.turns,
  );
  const allResolved = waveEvents.length > 0 && waveEvents.every((e) => e.resolved);

  return allResolved && state.wave < 5;
}

// ---------------------------------------------------------------------------
// Main reducer
// ---------------------------------------------------------------------------

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // ===== START_GAME =====
    case "START_GAME": {
      const initial = createInitialGameState();
      const waveConfig = getWaveConfig(1);
      return {
        ...initial,
        phase: "playing",
        turn: 1,
        turnPhase: "player" as const,
        supply: 200,
        playerUnits: initial.playerUnits.map((u) => ({
          ...u,
          actedThisTurn: false,
        })),
        log: [
          ...initial.log,
          makeLog("system", `=== 第${waveConfig.wave}波: ${waveConfig.name} ===`, 1),
          makeLog("intel", waveConfig.briefing, 1),
          makeLog("system", "--- プレイヤーフェーズ ---", 1),
        ],
      };
    }

    // ===== MOVE_UNIT =====
    case "MOVE_UNIT": {
      if (state.phase !== "playing" || state.turnPhase !== "player") return state;
      const { unitId, lat, lng } = action;
      const unit = state.playerUnits.find((u) => u.id === unitId);
      if (!unit) return state;
      if (unit.status === "destroyed") return state;
      if (unit.actedThisTurn) return state;

      // Check destination is within speed range
      const dest = { lat, lng };
      const d = distance(unit, dest);
      if (d > unit.speed) return state;

      const updatedUnits = state.playerUnits.map((u) =>
        u.id === unitId
          ? { ...u, lat, lng, actedThisTurn: true, status: "idle" as const }
          : u,
      );

      return {
        ...state,
        playerUnits: updatedUnits,
        log: [
          ...state.log,
          makeLog("player", `${unit.name} が [${lat.toFixed(2)}, ${lng.toFixed(2)}] へ移動`, state.turn),
        ],
      };
    }

    // ===== ATTACK_UNIT =====
    case "ATTACK_UNIT": {
      if (state.phase !== "playing" || state.turnPhase !== "player") return state;
      const { unitId, targetId } = action;
      const unit = state.playerUnits.find((u) => u.id === unitId);
      const target = state.enemyUnits.find((u) => u.id === targetId);
      if (!unit || !target) return state;
      if (unit.status === "destroyed" || target.status === "destroyed") return state;
      if (unit.actedThisTurn) return state;

      // Range check
      if (!isInRange(unit, target)) return state;

      const allLogs: GameLogEntry[] = [];

      // --- Attacker hits defender ---
      const nearFacility = false; // enemies don't have facilities
      const result = calculateDamage(unit, target, nearFacility);
      const updatedTarget = { ...target };
      updatedTarget.hp = Math.max(0, updatedTarget.hp - result.damage);
      const targetDestroyed = updatedTarget.hp <= 0;
      if (targetDestroyed) {
        updatedTarget.status = "destroyed";
      } else {
        updatedTarget.status = "engaging";
      }

      allLogs.push(makeLog("combat",
        formatCombatLog({
          attackerName: unit.name,
          defenderName: target.name,
          damage: result.damage,
          advantage: result.advantage,
          critical: result.critical,
          defenderDestroyed: targetDestroyed,
        }),
        state.turn,
      ));

      if (result.advantage === "strong") {
        allLogs.push(makeLog("combat", `  └ 有利な戦闘（${unit.type} → ${target.type}）`, state.turn));
      } else if (result.advantage === "weak") {
        allLogs.push(makeLog("combat", `  └ 不利な戦闘（${unit.type} → ${target.type}）`, state.turn));
      }
      if (result.critical && !targetDestroyed) {
        allLogs.push(makeLog("combat", `  └ クリティカルヒット！`, state.turn));
      }

      // --- Defender counter-attacks if in range and alive ---
      const updatedAttacker: GameUnit = { ...unit, actedThisTurn: true, status: "engaging" as const, targetId: targetId };
      if (!targetDestroyed) {
        const counterRange = updatedTarget.range ?? getAttackRange(updatedTarget.type);
        const counterDist = distance(updatedTarget, unit);
        if (counterDist <= counterRange) {
          const counterResult = calculateDamage(updatedTarget, updatedAttacker, false);
          updatedAttacker.hp = Math.max(0, updatedAttacker.hp - counterResult.damage);
          const attackerDestroyed = updatedAttacker.hp <= 0;
          if (attackerDestroyed) {
            updatedAttacker.status = "destroyed";
          }

          allLogs.push(makeLog("combat",
            formatCombatLog({
              attackerName: updatedTarget.name,
              defenderName: updatedAttacker.name,
              damage: counterResult.damage,
              advantage: counterResult.advantage,
              critical: counterResult.critical,
              defenderDestroyed: attackerDestroyed,
            }),
            state.turn,
          ));
          if (counterResult.advantage === "strong") {
            allLogs.push(makeLog("combat", `  └ 反撃有利（${updatedTarget.type} → ${updatedAttacker.type}）`, state.turn));
          }
        }
      }

      if (targetDestroyed) {
        allLogs.push(makeLog("combat", `${target.name} 撃破`, state.turn));
      }

      const updatedPlayerUnits = state.playerUnits.map((u) =>
        u.id === unitId ? updatedAttacker : u,
      );
      const updatedEnemyUnits = state.enemyUnits.map((u) =>
        u.id === targetId ? updatedTarget : u,
      );

      return {
        ...state,
        playerUnits: updatedPlayerUnits,
        enemyUnits: updatedEnemyUnits,
        log: [...state.log, ...allLogs],
      };
    }

    // ===== REPAIR_UNIT =====
    case "REPAIR_UNIT": {
      if (state.phase !== "playing" || state.turnPhase !== "player") return state;
      const { unitId } = action;
      const unit = state.playerUnits.find((u) => u.id === unitId);
      if (!unit) return state;
      if (unit.status === "destroyed") return state;
      if (unit.actedThisTurn) return state;
      if (unit.hp >= unit.maxHp) return state;
      if (state.supply < 10) return state;

      // Check near a friendly facility (within 0.5 degrees of a base-* unit)
      const nearBase = state.playerUnits.some(
        (other) =>
          other.id !== unit.id &&
          other.id.startsWith("base-") &&
          other.status !== "destroyed" &&
          distance(unit, other) <= 0.5,
      );
      if (!nearBase) return state;

      const healedHp = Math.min(unit.maxHp, unit.hp + 30);
      const actualHeal = healedHp - unit.hp;
      const updatedUnits = state.playerUnits.map((u) =>
        u.id === unitId
          ? { ...u, hp: healedHp, actedThisTurn: true }
          : u,
      );

      return {
        ...state,
        playerUnits: updatedUnits,
        supply: state.supply - 10,
        log: [
          ...state.log,
          makeLog("player", `${unit.name} 修理完了 (HP +${actualHeal})`, state.turn),
        ],
      };
    }

    // ===== WAIT_UNIT =====
    case "WAIT_UNIT": {
      if (state.phase !== "playing" || state.turnPhase !== "player") return state;
      const { unitId } = action;
      const unit = state.playerUnits.find((u) => u.id === unitId);
      if (!unit) return state;
      if (unit.status === "destroyed") return state;
      if (unit.actedThisTurn) return state;

      const updatedUnits = state.playerUnits.map((u) =>
        u.id === unitId
          ? { ...u, actedThisTurn: true }
          : u,
      );

      return {
        ...state,
        playerUnits: updatedUnits,
        log: [
          ...state.log,
          makeLog("player", `${unit.name} 待機`, state.turn),
        ],
      };
    }

    // ===== END_PLAYER_PHASE =====
    case "END_PLAYER_PHASE": {
      if (state.phase !== "playing" || state.turnPhase !== "player") return state;

      // Mark any units that haven't acted as "waited"
      const allLogs: GameLogEntry[] = [];
      const updatedUnits = state.playerUnits.map((u) => {
        if (u.status === "destroyed") return u;
        if (!u.actedThisTurn) {
          allLogs.push(makeLog("player", `${u.name} 待機（自動）`, state.turn));
          return { ...u, actedThisTurn: true };
        }
        return u;
      });

      allLogs.push(makeLog("system", "--- 敵フェーズ ---", state.turn));

      return {
        ...state,
        playerUnits: updatedUnits,
        turnPhase: "enemy" as const,
        log: [...state.log, ...allLogs],
      };
    }

    // ===== PROCESS_ENEMY_PHASE =====
    case "PROCESS_ENEMY_PHASE": {
      if (state.phase !== "playing" || state.turnPhase !== "enemy") return state;

      const { units: updatedEnemies, playerUnits: updatedPlayers, log: enemyLog } =
        processEnemyTurn(state);

      const allLogs: GameLogEntry[] = enemyLog.map((msg) =>
        makeLog("combat", msg, state.turn),
      );

      if (enemyLog.length > 0) {
        allLogs.push(makeLog("intel", pickIntelMessage("combat_result", state.wave), state.turn));
      }

      allLogs.push(makeLog("system", "--- 解決フェーズ ---", state.turn));

      return {
        ...state,
        enemyUnits: updatedEnemies,
        playerUnits: updatedPlayers,
        turnPhase: "resolution" as const,
        log: [...state.log, ...allLogs],
      };
    }

    // ===== PROCESS_RESOLUTION =====
    case "PROCESS_RESOLUTION": {
      if (state.phase !== "playing" || state.turnPhase !== "resolution") return state;

      const allLogs: GameLogEntry[] = [];
      let s: GameState = { ...state };

      // 1. Spawn wave events
      const { events: eventsAfterSpawn, log: spawnLog } = spawnEvents(s);
      s = { ...s, events: eventsAfterSpawn };
      allLogs.push(...spawnLog);

      // 2. Spawn new enemy units if wave turn matches
      const { enemyUnits: enemiesAfterSpawn, log: enemySpawnLog } = spawnEnemyUnits(s);
      s = { ...s, enemyUnits: enemiesAfterSpawn };
      allLogs.push(...enemySpawnLog);

      // 3. Resolve events (check if linked enemies are destroyed)
      const resolvedEvents = resolveEvents(s);
      s = { ...s, events: resolvedEvents };

      // 4. KPI drain from unresolved events
      const kpis = applyKpiDrain(s);
      s = { ...s, kpis };

      // 5. Supply logistics: -3 per turn cost, +5 per surviving facility
      const survivingFacilities = s.playerUnits.filter(
        (u) => u.id.startsWith("base-") && u.status !== "destroyed",
      ).length;
      const supplyDelta = survivingFacilities * 5 - 3;
      const newSupply = Math.max(0, s.supply + supplyDelta);
      s = { ...s, supply: newSupply };
      allLogs.push(
        makeLog("system", `補給: ${supplyDelta >= 0 ? "+" : ""}${supplyDelta} (施設×${survivingFacilities}) → 残 ${newSupply}`, s.turn),
      );

      // KPI warning
      for (const [, val] of Object.entries(kpis)) {
        if ((val as number) <= 30 && (val as number) > 0) {
          allLogs.push(makeLog("intel", pickIntelMessage("kpi_warning", s.wave), s.turn));
          break;
        }
      }

      // 6. Win/lose check
      const endResult = checkEndConditions(s);
      if (endResult) {
        const msg = pickIntelMessage(endResult === "victory" ? "victory" : "defeat", s.wave);
        allLogs.push(makeLog("system", msg, s.turn));
        return {
          ...s,
          phase: endResult,
          log: [...s.log, ...allLogs],
        };
      }

      // 7. Auto-advance wave
      if (shouldAdvanceWave(s)) {
        const clearedWaveConfig = getWaveConfig(s.wave);
        const bonus = clearedWaveConfig.supplyBonus ?? 30;
        const nextWave = s.wave + 1;
        const nextWaveConfig = getWaveConfig(nextWave);
        const clearSupply = s.supply + bonus;
        allLogs.push(
          makeLog("system", `フェーズクリアボーナス: 補給 +${bonus} → ${clearSupply}`, s.turn),
          makeLog("system", `=== 第${nextWave}波: ${nextWaveConfig.name} ===`, s.turn),
          makeLog("intel", nextWaveConfig.briefing, s.turn),
        );
        s = { ...s, wave: nextWave, supply: clearSupply };
      }

      // Periodic intel messages
      const waveConfig = getWaveConfig(s.wave);
      const turnInWave = s.turn - turnStartForWave(s.wave);
      if (waveConfig.intel.length > 0 && turnInWave > 0) {
        const intelIdx = turnInWave % waveConfig.intel.length;
        allLogs.push(makeLog("intel", waveConfig.intel[intelIdx], s.turn));
      }

      // 8. Reset all units' actedThisTurn, increment turn, set phase to player
      const nextTurn = s.turn + 1;
      const resetPlayerUnits = s.playerUnits.map((u) => ({
        ...u,
        actedThisTurn: false,
        // Reset engaging/moving status to idle for living units
        status: (u.status === "destroyed" ? "destroyed" : u.status === "damaged" ? "damaged" : "idle") as GameUnit["status"],
      }));
      const resetEnemyUnits = s.enemyUnits.map((u) => ({
        ...u,
        actedThisTurn: false,
      }));

      allLogs.push(makeLog("system", `--- ターン ${nextTurn}: プレイヤーフェーズ ---`, nextTurn));

      return {
        ...s,
        turn: nextTurn,
        turnPhase: "player" as const,
        playerUnits: resetPlayerUnits,
        enemyUnits: resetEnemyUnits,
        log: [...s.log, ...allLogs],
      };
    }

    // ===== PAUSE / RESUME =====
    case "PAUSE":
      return state.phase === "playing" ? { ...state, phase: "paused" } : state;

    case "RESUME":
      return state.phase === "paused" ? { ...state, phase: "playing" } : state;

    // ===== ASSIGN_TARGET =====
    case "ASSIGN_TARGET": {
      const { unitId, targetUnitId } = action;
      const unit = state.playerUnits.find((u) => u.id === unitId);
      const target = state.enemyUnits.find((u) => u.id === targetUnitId);
      if (!unit || !target) return state;
      if (unit.status === "destroyed" || target.status === "destroyed") return state;

      const updatedUnits = state.playerUnits.map((u) =>
        u.id === unitId
          ? { ...u, targetId: targetUnitId }
          : u,
      );

      return {
        ...state,
        playerUnits: updatedUnits,
        log: [
          ...state.log,
          makeLog(
            "player",
            `${unit.name} → 敵 ${target.name} に目標指定`,
            state.turn,
          ),
        ],
      };
    }

    // ===== SELECT =====
    case "SELECT_UNIT":
      return { ...state, selectedUnitId: action.unitId };

    case "SELECT_EVENT":
      return { ...state, selectedEventId: action.eventId };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Provider hook (mirrors useThemeProvider pattern)
// ---------------------------------------------------------------------------

export function useGameProvider(): GameContextValue {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
  return { state, dispatch };
}
