// ========== MAVEN COMMAND: Enemy AI ==========

import type {
  GameState,
  GameEvent,
  GameUnit,
  WaveConfig,
} from "@/lib/game-types";
import {
  calculateDamage,
  isInRange,
  getAttackRange,
  getTypeAdvantage,
  isNearFriendlyFacility,
} from "@/lib/combat-rules";
import { formatCombatLog } from "@/lib/combat-log-formatter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Haversine-ish flat-Earth distance in "map units" (good enough for Japan). */
function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dlat = a.lat - b.lat;
  const dlng = (a.lng - b.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(dlat * dlat + dlng * dlng);
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
//    — Now uses attack range and type advantage targeting
// ---------------------------------------------------------------------------

export function moveEnemyUnits(state: GameState): GameUnit[] {
  const livingPlayerUnits = state.playerUnits.filter(
    (u) => u.status !== "destroyed",
  );
  const playerFacilities = livingPlayerUnits.filter((u) =>
    u.id.startsWith("base-"),
  );

  return state.enemyUnits.map((enemy) => {
    if (enemy.status === "destroyed") return enemy;

    const enemyRange = enemy.range ?? getAttackRange(enemy.type);

    // If a player unit is engaging this enemy, stand and fight
    const engager = state.playerUnits.find(
      (p) => p.targetId === enemy.id && p.status === "engaging",
    );

    if (engager) {
      return { ...enemy, status: "engaging" as const, targetId: engager.id };
    }

    // --- Smart targeting: prefer units we have type advantage against ---
    // Score each potential target: advantage bonus + proximity bonus + low-HP bonus
    let bestTarget: GameUnit | undefined;
    let bestScore = -Infinity;

    for (const target of livingPlayerUnits) {
      const d = distance(enemy, target);
      const typeAdv = getTypeAdvantage(enemy.type, target.type);

      // Score components:
      // - Type advantage bonus (strongly preferred)
      let score = typeAdv * 100;
      // - Proximity bonus (closer is better, normalized)
      score += Math.max(0, 20 - d * 5);
      // - Low HP bonus (finish off wounded units)
      score += (1 - target.hp / target.maxHp) * 30;
      // - Facility priority (always worth attacking)
      if (target.id.startsWith("base-")) score += 15;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = target;
      }
    }

    if (!bestTarget) {
      // Fallback: pick nearest facility
      let closest: GameUnit | undefined;
      let closestDist = Infinity;
      for (const fac of playerFacilities) {
        const d = distance(enemy, fac);
        if (d < closestDist) {
          closestDist = d;
          closest = fac;
        }
      }
      bestTarget = closest;
    }

    if (!bestTarget) return enemy;

    const d = distance(enemy, bestTarget);

    // If target is in attack range, engage
    if (d <= enemyRange) {
      return { ...enemy, status: "engaging" as const, targetId: bestTarget.id };
    }

    // Move toward target — stop when in range
    const step = Math.min(enemy.speed, d - enemyRange * 0.8); // Approach to just inside range
    if (step <= 0) {
      return { ...enemy, status: "engaging" as const, targetId: bestTarget.id };
    }

    const ratio = step / d;
    const newLat = enemy.lat + (bestTarget.lat - enemy.lat) * ratio;
    const newLng = enemy.lng + (bestTarget.lng - enemy.lng) * ratio;

    return {
      ...enemy,
      lat: newLat,
      lng: newLng,
      status: "moving" as const,
      targetId: bestTarget.id,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. Resolve combat engagements — using combat-rules system
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

  // --- Player units attacking enemy units ---
  for (const [, player] of playerMap) {
    if (player.status === "destroyed") continue;
    if (!player.targetId) continue;

    const target = enemyMap.get(player.targetId);
    if (!target || target.status === "destroyed") continue;

    // Range check using new system
    if (!isInRange(player, target)) continue;

    // Facility defense — enemy near its own "facility" doesn't apply (enemies have none)
    const nearFacility = false;

    const result = calculateDamage(player, target, nearFacility);
    target.hp = Math.max(0, target.hp - result.damage);

    const destroyed = target.hp <= 0;
    if (destroyed) {
      target.status = "destroyed";
    } else {
      target.status = "engaging";
      player.status = "engaging";
    }

    // Format combat log
    combatLog.push(
      formatCombatLog({
        attackerName: player.name,
        defenderName: target.name,
        damage: result.damage,
        advantage: result.advantage,
        critical: result.critical,
        defenderDestroyed: destroyed,
      }),
    );

    // Advantage/critical supplementary messages
    if (result.advantage === "strong") {
      combatLog.push(`  └ 有利な戦闘（${player.type} → ${target.type}）`);
    } else if (result.advantage === "weak") {
      combatLog.push(`  └ 不利な戦闘（${player.type} → ${target.type}）`);
    }
    if (result.critical && !destroyed) {
      combatLog.push(`  └ クリティカルヒット！`);
    }
  }

  // --- Enemy units attacking player units / facilities ---
  for (const [, enemy] of enemyMap) {
    if (enemy.status === "destroyed") continue;
    if (!enemy.targetId) continue;

    const target = playerMap.get(enemy.targetId);
    if (!target || target.status === "destroyed") continue;

    // Range check
    if (!isInRange(enemy, target)) continue;

    // Facility defense bonus — player unit near friendly facility
    const nearFacility = isNearFriendlyFacility(
      target,
      Array.from(playerMap.values()),
    );

    const result = calculateDamage(enemy, target, nearFacility);
    target.hp = Math.max(0, target.hp - result.damage);

    const destroyed = target.hp <= 0;
    if (destroyed) {
      target.status = "destroyed";
    } else {
      target.status = "damaged";
      enemy.status = "engaging";
    }

    // Format combat log
    combatLog.push(
      formatCombatLog({
        attackerName: enemy.name,
        defenderName: target.name,
        damage: result.damage,
        advantage: result.advantage,
        critical: result.critical,
        defenderDestroyed: destroyed,
      }),
    );

    if (result.advantage === "strong") {
      combatLog.push(`  └ 有利な戦闘（${enemy.type} → ${target.type}）`);
    } else if (result.advantage === "weak") {
      combatLog.push(`  └ 不利な戦闘（${enemy.type} → ${target.type}）`);
    }
    if (result.critical && !destroyed) {
      combatLog.push(`  └ クリティカルヒット！`);
    }

    // Facility defense indicator
    if (nearFacility) {
      combatLog.push(`  └ 施設防御ボーナス適用（被ダメ-20%）`);
    }
  }

  return {
    updatedPlayer: Array.from(playerMap.values()),
    updatedEnemy: Array.from(enemyMap.values()),
    combatLog,
  };
}
