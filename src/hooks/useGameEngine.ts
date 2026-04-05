"use client";

import { createContext, useContext, useReducer } from "react";
import type {
  GameState,
  GameAction,
  GameEvent,
  GameUnit,
  GameLogEntry,
  Mission,
  GameKpis,
} from "@/lib/game-types";
import { createInitialGameState, WAVE_CONFIGS } from "@/lib/game-init";
import {
  generateEnemyActions,
  moveEnemyUnits,
  resolveEngagements,
} from "@/lib/enemy-ai";
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
// Sub-reducers for NEXT_TURN
// ---------------------------------------------------------------------------

/** 1. Spawn wave events */
function spawnEvents(state: GameState): { events: GameEvent[]; log: GameLogEntry[] } {
  const waveConfig = getWaveConfig(state.wave);
  const newEvents = generateEnemyActions(state, waveConfig);
  const log = newEvents.map((e) =>
    makeLog("intel", `[新規脅威] ${e.title} — ${e.location}. ${pickIntelMessage("event_detected", state.wave)}`, state.turn),
  );
  return { events: [...state.events, ...newEvents], log };
}

/** 2. Spawn enemy units for current wave + move existing */
function processEnemyUnits(state: GameState): {
  enemyUnits: GameUnit[];
  log: GameLogEntry[];
} {
  const waveConfig = getWaveConfig(state.wave);
  const turnInWave = state.turn - turnStartForWave(state.wave);
  const log: GameLogEntry[] = [];

  // Spawn wave units on first turn of the wave
  let units = [...state.enemyUnits];
  if (turnInWave === 0) {
    const spawned: GameUnit[] = waveConfig.spawnUnits.map((tmpl, i) => ({
      ...tmpl,
      id: `enemy-w${state.wave}-${i}-${uid().slice(0, 6)}`,
      status: "moving" as const,
    }));
    units = [...units, ...spawned];
    for (const u of spawned) {
      log.push(makeLog("intel", `敵部隊出現: ${u.name}`, state.turn));
    }
  }

  // Move all living enemies
  const stateWithEnemies: GameState = { ...state, enemyUnits: units };
  const moved = moveEnemyUnits(stateWithEnemies);

  return { enemyUnits: moved, log };
}

/** 3. Progress missions based on proximity */
function progressMissions(state: GameState): {
  missions: Mission[];
  playerUnits: GameUnit[];
  log: GameLogEntry[];
} {
  const missions = state.missions.map((m) => ({ ...m }));
  const playerUnits = state.playerUnits.map((u) => ({ ...u }));
  const log: GameLogEntry[] = [];

  const ENGAGE_RANGE = 0.15;

  for (const mission of missions) {
    if (mission.stage === "resolved") continue;

    const event = state.events.find((e) => e.id === mission.eventId);
    if (!event) continue;

    const assignedUnits = playerUnits.filter((u) =>
      mission.assignedUnitIds.includes(u.id),
    );

    if (assignedUnits.length === 0) continue;

    if (mission.stage === "detected" || mission.stage === "dispatched") {
      // Move units toward event location
      let anyClose = false;
      for (const unit of assignedUnits) {
        if (unit.status === "destroyed") continue;
        const d = distance(unit, event);
        if (d < ENGAGE_RANGE) {
          anyClose = true;
          unit.status = "engaging";
        } else {
          // Move toward event
          const step = Math.min(unit.speed, d);
          const ratio = step / d;
          unit.lat += (event.lat - unit.lat) * ratio;
          unit.lng += (event.lng - unit.lng) * ratio;
          unit.status = "moving";
        }
      }

      if (anyClose && mission.stage !== "dispatched") {
        mission.stage = "dispatched";
        log.push(makeLog("system", `ミッション「${mission.title}」部隊到着`, state.turn));
      }
      if (anyClose) {
        mission.stage = "engaging";
        log.push(
          makeLog("combat", `ミッション「${mission.title}」交戦開始`, state.turn),
        );
      }
    }

    if (mission.stage === "engaging") {
      // Check if all linked enemy units are destroyed
      const linkedEnemies = state.enemyUnits.filter((u) =>
        event.linkedUnitIds.includes(u.id),
      );
      const allDead =
        linkedEnemies.length === 0 ||
        linkedEnemies.every((u) => u.status === "destroyed");

      if (allDead) {
        mission.stage = "resolved";
        mission.outcome = "success";
        log.push(
          makeLog("system", `ミッション「${mission.title}」成功！`, state.turn),
        );
      }
    }
  }

  return { missions, playerUnits, log };
}

/** 4. Apply KPI drain from unresolved events */
function applyKpiDrain(state: GameState): GameKpis {
  const kpis = { ...state.kpis };

  for (const event of state.events) {
    if (event.resolved) continue;

    const drain = event.severity === "critical" ? 5 : event.severity === "warning" ? 2 : 0;
    if (drain === 0) continue;

    // Distribute drain across KPIs based on event type
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

/** 5. Mark events as resolved when all linked enemies destroyed or mission complete */
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

/** 6. Check win/lose */
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

/** 7. Auto-advance wave */
function shouldAdvanceWave(state: GameState): boolean {
  const waveConfig = getWaveConfig(state.wave);
  const waveStart = turnStartForWave(state.wave);
  const turnsIntoWave = state.turn - waveStart;

  // Must have completed the required turns for this wave
  if (turnsIntoWave < waveConfig.turns - 1) return false;

  // All events for this wave should be resolved
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
        log: [
          ...initial.log,
          makeLog("system", `=== 第${waveConfig.wave}波: ${waveConfig.name} ===`, 1),
          makeLog("intel", waveConfig.briefing, 1),
        ],
      };
    }

    // ===== NEXT_TURN =====
    case "NEXT_TURN": {
      if (state.phase !== "playing") return state;

      const nextTurn = state.turn + 1;
      let s: GameState = { ...state, turn: nextTurn };
      const allLogs: GameLogEntry[] = [
        makeLog("system", `--- ターン ${nextTurn} ---`, nextTurn),
      ];

      // 1. Spawn wave events
      const { events: eventsAfterSpawn, log: spawnLog } = spawnEvents(s);
      s = { ...s, events: eventsAfterSpawn };
      allLogs.push(...spawnLog);

      // 2. Enemy AI
      const { enemyUnits, log: enemyLog } = processEnemyUnits(s);
      s = { ...s, enemyUnits };
      allLogs.push(...enemyLog);

      // 3. Progress missions
      const { missions, playerUnits: unitsAfterMissions, log: missionLog } =
        progressMissions(s);
      s = { ...s, missions, playerUnits: unitsAfterMissions };
      allLogs.push(...missionLog);

      // 4. Resolve combat
      const { updatedPlayer, updatedEnemy, combatLog } = resolveEngagements(s);
      s = { ...s, playerUnits: updatedPlayer, enemyUnits: updatedEnemy };
      for (const msg of combatLog) {
        allLogs.push(makeLog("combat", msg, nextTurn));
      }
      if (combatLog.length > 0) {
        allLogs.push(makeLog("intel", pickIntelMessage("combat_result", s.wave), nextTurn));
      }

      // 5. Resolve events
      const resolvedEvents = resolveEvents(s);
      s = { ...s, events: resolvedEvents };

      // 6. KPI drain
      const kpis = applyKpiDrain(s);
      s = { ...s, kpis };

      // KPI warning
      for (const [key, val] of Object.entries(kpis)) {
        if (val <= 30 && val > 0) {
          allLogs.push(makeLog("intel", pickIntelMessage("kpi_warning", s.wave), nextTurn));
          break;
        }
      }

      // 7. Win/lose check
      const endResult = checkEndConditions(s);
      if (endResult) {
        const msg = pickIntelMessage(endResult === "victory" ? "victory" : "defeat", s.wave);
        allLogs.push(makeLog("system", msg, nextTurn));
        return {
          ...s,
          phase: endResult,
          log: [...s.log, ...allLogs],
        };
      }

      // 8. Auto-advance wave
      if (shouldAdvanceWave(s)) {
        const nextWave = s.wave + 1;
        const waveConfig = getWaveConfig(nextWave);
        allLogs.push(
          makeLog("system", `=== 第${nextWave}波: ${waveConfig.name} ===`, nextTurn),
          makeLog("intel", waveConfig.briefing, nextTurn),
        );
        s = { ...s, wave: nextWave };
      }

      // Periodic intel messages
      const waveConfig = getWaveConfig(s.wave);
      const turnInWave = s.turn - turnStartForWave(s.wave);
      if (waveConfig.intel.length > 0 && turnInWave > 0) {
        const intelIdx = turnInWave % waveConfig.intel.length;
        allLogs.push(makeLog("intel", waveConfig.intel[intelIdx], nextTurn));
      }

      return { ...s, log: [...s.log, ...allLogs] };
    }

    // ===== DISPATCH_UNIT =====
    case "DISPATCH_UNIT": {
      const { unitId, eventId } = action;
      const unit = state.playerUnits.find((u) => u.id === unitId);
      const event = state.events.find((e) => e.id === eventId);
      if (!unit || !event) return state;
      if (unit.status === "destroyed") return state;

      // Update the unit
      const updatedUnits = state.playerUnits.map((u) =>
        u.id === unitId
          ? { ...u, status: "moving" as const, targetId: eventId }
          : u,
      );

      // Find or create mission for this event
      let missions = [...state.missions];
      const existing = missions.find((m) => m.eventId === eventId);

      if (existing) {
        missions = missions.map((m) =>
          m.id === existing.id
            ? {
                ...m,
                assignedUnitIds: [...m.assignedUnitIds, unitId],
                stage: "dispatched" as const,
              }
            : m,
        );
      } else {
        const newMission: Mission = {
          id: `mission-${uid().slice(0, 8)}`,
          title: event.title,
          stage: "dispatched",
          severity: event.severity,
          assignedUnitIds: [unitId],
          eventId: event.id,
          eta: "進行中",
        };
        missions = [...missions, newMission];
      }

      // Link the enemy units near the event to the event
      const LINK_RANGE = 0.5;
      const nearbyEnemies = state.enemyUnits.filter(
        (e) =>
          e.status !== "destroyed" &&
          distance(e, event) < LINK_RANGE &&
          !event.linkedUnitIds.includes(e.id),
      );
      const updatedEvents = state.events.map((e) =>
        e.id === eventId
          ? {
              ...e,
              linkedUnitIds: [
                ...e.linkedUnitIds,
                ...nearbyEnemies.map((u) => u.id),
              ],
            }
          : e,
      );

      // Also set enemy targetId so player units know who to fight
      const updatedEnemies = state.enemyUnits.map((e) => {
        if (nearbyEnemies.some((ne) => ne.id === e.id)) {
          return { ...e, targetId: unitId };
        }
        return e;
      });

      return {
        ...state,
        playerUnits: updatedUnits,
        enemyUnits: updatedEnemies,
        missions,
        events: updatedEvents,
        log: [
          ...state.log,
          makeLog(
            "player",
            `${unit.name} を「${event.title}」に派遣`,
            state.turn,
          ),
        ],
      };
    }

    // ===== APPROVE_MISSION =====
    case "APPROVE_MISSION": {
      const { missionId } = action;
      return {
        ...state,
        missions: state.missions.map((m) =>
          m.id === missionId && m.stage === "detected"
            ? { ...m, stage: "dispatched" as const }
            : m,
        ),
        log: [
          ...state.log,
          makeLog("player", `ミッション承認: ${missionId}`, state.turn),
        ],
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
          ? { ...u, status: "moving" as const, targetId: targetUnitId }
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
