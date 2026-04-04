// ========== MAVEN COMMAND: Enemy AI ==========

import type {
  GameState,
  GameEvent,
  GameUnit,
  WaveConfig,
} from "@/lib/game-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Haversine-ish flat-Earth distance in "map units" (good enough for Japan). */
function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dlat = a.lat - b.lat;
  const dlng = (a.lng - b.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

/** Random float in [min, max). */
function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function uid(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// 1. Generate events for the current turn based on wave config
// ---------------------------------------------------------------------------

export function generateEnemyActions(
  state: GameState,
  waveConfig: WaveConfig,
): GameEvent[] {
  const turnsIntoWave = state.turn % waveConfig.turns;
  const newEvents: GameEvent[] = [];

  for (const template of waveConfig.events) {
    // Spread events across the wave — each template fires once per wave
    // at a roughly even cadence.  Index-based hash keeps it deterministic-ish.
    const idx = waveConfig.events.indexOf(template);
    const spawnTurn = Math.floor((idx / waveConfig.events.length) * waveConfig.turns);

    if (turnsIntoWave === spawnTurn) {
      newEvents.push({
        ...template,
        id: `evt-${state.wave}-${state.turn}-${uid().slice(0, 8)}`,
        turn: state.turn,
        resolved: false,
      });
    }
  }

  return newEvents;
}

// ---------------------------------------------------------------------------
// 2. Move enemy units toward nearest player facility / engaging unit
// ---------------------------------------------------------------------------

export function moveEnemyUnits(state: GameState): GameUnit[] {
  const playerFacilities = state.playerUnits.filter(
    (u) => u.status !== "destroyed" && u.type !== "drone",
  );

  return state.enemyUnits.map((enemy) => {
    if (enemy.status === "destroyed") return enemy;

    // If a player unit is engaging this enemy, stand and fight
    const engager = state.playerUnits.find(
      (p) => p.targetId === enemy.id && p.status === "engaging",
    );

    if (engager) {
      return { ...enemy, status: "engaging" as const, targetId: engager.id };
    }

    // Otherwise pick the nearest player facility
    let closest: GameUnit | undefined;
    let closestDist = Infinity;

    for (const fac of playerFacilities) {
      const d = distance(enemy, fac);
      if (d < closestDist) {
        closestDist = d;
        closest = fac;
      }
    }

    if (!closest) return enemy;

    // Move toward it
    const d = closestDist;
    const step = Math.min(enemy.speed, d);

    if (d < 0.05) {
      // Close enough to engage
      return { ...enemy, status: "engaging" as const, targetId: closest.id };
    }

    const ratio = step / d;
    const newLat = enemy.lat + (closest.lat - enemy.lat) * ratio;
    const newLng = enemy.lng + (closest.lng - enemy.lng) * ratio;

    return {
      ...enemy,
      lat: newLat,
      lng: newLng,
      status: "moving" as const,
      targetId: closest.id,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. Resolve combat engagements
// ---------------------------------------------------------------------------

export interface EngagementResult {
  updatedPlayer: GameUnit[];
  updatedEnemy: GameUnit[];
  combatLog: string[];
}

export function resolveEngagements(state: GameState): EngagementResult {
  const playerMap = new Map(state.playerUnits.map((u) => [u.id, { ...u }]));
  const enemyMap = new Map(state.enemyUnits.map((u) => [u.id, { ...u }]));
  const combatLog: string[] = [];

  const ENGAGE_RANGE = 0.15; // ~15 km on the flat-Earth approx

  // --- Player units attacking enemy units ---
  for (const [, player] of playerMap) {
    if (player.status === "destroyed") continue;
    if (!player.targetId) continue;

    const target = enemyMap.get(player.targetId);
    if (!target || target.status === "destroyed") continue;

    const d = distance(player, target);
    if (d > ENGAGE_RANGE) continue;

    // Player attacks enemy
    const dmg = calcDamage(player, target);
    target.hp = Math.max(0, target.hp - dmg);
    combatLog.push(
      `${player.name} が ${target.name} に ${dmg} ダメージ（残HP ${target.hp}）`,
    );

    if (target.hp <= 0) {
      target.status = "destroyed";
      combatLog.push(`>>> ${target.name} 撃破！`);
    } else {
      target.status = "engaging";
      player.status = "engaging";
    }
  }

  // --- Enemy units attacking player units / facilities ---
  for (const [, enemy] of enemyMap) {
    if (enemy.status === "destroyed") continue;
    if (!enemy.targetId) continue;

    const target = playerMap.get(enemy.targetId);
    if (!target || target.status === "destroyed") continue;

    const d = distance(enemy, target);
    if (d > ENGAGE_RANGE) continue;

    const dmg = calcDamage(enemy, target);
    target.hp = Math.max(0, target.hp - dmg);
    combatLog.push(
      `${enemy.name} が ${target.name} に ${dmg} ダメージ（残HP ${target.hp}）`,
    );

    if (target.hp <= 0) {
      target.status = "destroyed";
      combatLog.push(`>>> ${target.name} が破壊された！`);
    } else {
      target.status = "damaged";
      enemy.status = "engaging";
    }
  }

  return {
    updatedPlayer: Array.from(playerMap.values()),
    updatedEnemy: Array.from(enemyMap.values()),
    combatLog,
  };
}

// ---------------------------------------------------------------------------
// Combat formula
// ---------------------------------------------------------------------------

function calcDamage(attacker: GameUnit, defender: GameUnit): number {
  const base = attacker.attack * (1 - defender.defense / 200);
  const noise = randFloat(-5, 5);
  return Math.max(1, Math.round(base + noise));
}
