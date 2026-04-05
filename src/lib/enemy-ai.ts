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

    // Use movePoints × stepDistance if available, else fall back to speed
    const moveRange = (enemy.movePoints !== undefined && enemy.stepDistance !== undefined)
      ? enemy.movePoints * enemy.stepDistance
      : enemy.speed;

    // Move toward target — stop when in range
    const step = Math.min(moveRange, d - enemyRange * 0.8); // Approach to just inside range
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
//    (kept for backward compatibility)
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

// ---------------------------------------------------------------------------
// 4. Process full enemy turn — move + attack in one pass (turn-based engine)
// ---------------------------------------------------------------------------

export interface EnemyTurnResult {
  units: GameUnit[];
  playerUnits: GameUnit[];
  log: string[];
}

/**
 * Compute the maximum movement range for an enemy unit, prioritising
 * WC4-style movePoints × stepDistance, else falling back to legacy speed.
 */
function getMoveRange(unit: GameUnit): number {
  if (unit.movePoints !== undefined && unit.stepDistance !== undefined) {
    return unit.movePoints * unit.stepDistance;
  }
  return unit.speed;
}

/**
 * Process the entire enemy phase: each enemy ALWAYS acts (attack or move).
 * - Prioritises low-HP player units (focus fire)
 * - Groups up on shared targets
 * - Retreats if HP < 20% and no targets in range
 * - Boss (COMMAND_SHIP) hides in the center of its escort cluster
 * Returns updated enemy units, updated player units (from enemy attacks), and log messages.
 */
export function processEnemyTurn(state: GameState): EnemyTurnResult {
  const livingPlayerUnits = state.playerUnits.filter(
    (u) => u.status !== "destroyed",
  );
  const playerFacilities = livingPlayerUnits.filter((u) =>
    u.id.startsWith("base-"),
  );

  const playerMap = new Map(state.playerUnits.map((u) => [u.id, { ...u }]));
  const enemyResults: GameUnit[] = [];
  const log: string[] = [];

  // Pre-compute: count how many enemies are "near" each player unit for focus-fire targeting
  const threatCount = new Map<string, number>();
  for (const target of livingPlayerUnits) {
    let count = 0;
    for (const e of state.enemyUnits) {
      if (e.status === "destroyed") continue;
      const r = e.range ?? getAttackRange(e.type);
      if (distance(e, target) <= r + getMoveRange(e)) count++;
    }
    threatCount.set(target.id, count);
  }

  for (const enemy of state.enemyUnits) {
    if (enemy.status === "destroyed") {
      enemyResults.push(enemy);
      continue;
    }

    const updatedEnemy = { ...enemy };
    const enemyRange = enemy.range ?? getAttackRange(enemy.type);
    const enemyMoveRange = getMoveRange(enemy);
    const lowHp = enemy.hp / enemy.maxHp < 0.2;
    const isBoss = enemy.name.includes("司令艦");

    // --- Smart targeting: prefer low-HP units + group fire ---
    let bestTarget: GameUnit | undefined;
    let bestScore = -Infinity;

    for (const [, target] of playerMap) {
      if (target.status === "destroyed") continue;
      const d = distance(enemy, target);
      const typeAdv = getTypeAdvantage(enemy.type, target.type);
      const hpRatio = target.hp / target.maxHp;

      let score = typeAdv * 80;
      // Proximity — closer is much better
      score += Math.max(0, 30 - d * 6);
      // AGGRESSIVELY favor low HP (focus fire on weakened units)
      score += (1 - hpRatio) * 80;
      // Critical wound bonus — finish them off
      if (hpRatio < 0.3) score += 40;
      // Group-fire bonus: prefer targets already under threat
      const threats = threatCount.get(target.id) ?? 0;
      if (threats >= 2) score += 25;
      // Facility priority (always worth attacking)
      if (target.id.startsWith("base-")) score += 20;

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

    // If there are no valid targets at all, unit still MUST act — mark waited and log
    if (!bestTarget) {
      log.push(`敵${updatedEnemy.name}が待機`);
      enemyResults.push(updatedEnemy);
      continue;
    }

    const d = distance(enemy, bestTarget);

    // --- Retreat behavior: low-HP and target not in range → flee ---
    if (lowHp && d > enemyRange && enemyMoveRange > 0) {
      // Move AWAY from nearest player unit
      let nearestPlayer: GameUnit | undefined;
      let nearestDist = Infinity;
      for (const [, p] of playerMap) {
        if (p.status === "destroyed") continue;
        const pd = distance(enemy, p);
        if (pd < nearestDist) {
          nearestDist = pd;
          nearestPlayer = p;
        }
      }
      if (nearestPlayer && nearestDist > 0) {
        const ratio = enemyMoveRange / nearestDist;
        // Move in opposite direction
        updatedEnemy.lat = enemy.lat - (nearestPlayer.lat - enemy.lat) * ratio;
        updatedEnemy.lng = enemy.lng - (nearestPlayer.lng - enemy.lng) * ratio;
        updatedEnemy.status = "moving";
        updatedEnemy.targetId = undefined;
        log.push(`敵${updatedEnemy.name}が退却 (HP${Math.round((enemy.hp / enemy.maxHp) * 100)}%)`);
        enemyResults.push(updatedEnemy);
        continue;
      }
    }

    // --- Boss self-protection: move to centroid of living escorts ---
    if (isBoss && d > enemyRange && enemyMoveRange > 0) {
      const escorts = state.enemyUnits.filter(
        (e) => e.id !== enemy.id && e.status !== "destroyed" && !e.name.includes("司令艦"),
      );
      if (escorts.length >= 2) {
        const cLat = escorts.reduce((s, e) => s + e.lat, 0) / escorts.length;
        const cLng = escorts.reduce((s, e) => s + e.lng, 0) / escorts.length;
        const centroidDist = distance(enemy, { lat: cLat, lng: cLng });
        if (centroidDist > enemyMoveRange * 0.3) {
          const step = Math.min(enemyMoveRange, centroidDist);
          const ratio = step / centroidDist;
          updatedEnemy.lat = enemy.lat + (cLat - enemy.lat) * ratio;
          updatedEnemy.lng = enemy.lng + (cLng - enemy.lng) * ratio;
          updatedEnemy.status = "moving";
          updatedEnemy.targetId = bestTarget.id;
          log.push(`敵${updatedEnemy.name}が護衛艦隊の中央へ移動`);
          enemyResults.push(updatedEnemy);
          continue;
        }
      }
    }

    // --- Attack if target is in range ---
    if (d <= enemyRange) {
      updatedEnemy.status = "engaging";
      updatedEnemy.targetId = bestTarget.id;

      // Get the mutable reference to the target
      const mutableTarget = playerMap.get(bestTarget.id);
      if (mutableTarget && mutableTarget.status !== "destroyed") {
        const nearFacility = isNearFriendlyFacility(
          mutableTarget,
          Array.from(playerMap.values()),
        );
        // Enemies deal 2x damage vs bases
        const isBaseTarget = mutableTarget.id.startsWith("base-");
        const result = calculateDamage(updatedEnemy, mutableTarget, nearFacility);
        const finalDamage = isBaseTarget ? Math.floor(result.damage * 2) : result.damage;
        mutableTarget.hp = Math.max(0, mutableTarget.hp - finalDamage);

        const destroyed = mutableTarget.hp <= 0;
        if (destroyed) {
          mutableTarget.status = "destroyed";
        } else {
          mutableTarget.status = "damaged";
        }

        log.push(
          `敵${updatedEnemy.name}が攻撃 — ` +
          formatCombatLog({
            attackerName: updatedEnemy.name,
            defenderName: mutableTarget.name,
            damage: finalDamage,
            advantage: result.advantage,
            critical: result.critical,
            defenderDestroyed: destroyed,
          }),
        );

        if (isBaseTarget) {
          log.push(`  └ 拠点攻撃ボーナス（×2ダメージ）`);
        }
        if (result.advantage === "strong") {
          log.push(`  └ 有利な戦闘（${updatedEnemy.type} → ${mutableTarget.type}）`);
        } else if (result.advantage === "weak") {
          log.push(`  └ 不利な戦闘（${updatedEnemy.type} → ${mutableTarget.type}）`);
        }
        if (result.critical && !destroyed) {
          log.push(`  └ クリティカルヒット！`);
        }
        if (nearFacility) {
          log.push(`  └ 施設防御ボーナス適用（被ダメ-20%）`);
        }

        // Counter-attack
        if (!destroyed && mutableTarget.status !== "destroyed") {
          const playerRange = mutableTarget.range ?? getAttackRange(mutableTarget.type);
          const counterDist = distance(mutableTarget, updatedEnemy);
          if (counterDist <= playerRange && !mutableTarget.id.startsWith("base-")) {
            const counterResult = calculateDamage(mutableTarget, updatedEnemy, false);
            updatedEnemy.hp = Math.max(0, updatedEnemy.hp - counterResult.damage);
            const enemyDestroyed = updatedEnemy.hp <= 0;
            if (enemyDestroyed) {
              updatedEnemy.status = "destroyed";
            }
            log.push(
              formatCombatLog({
                attackerName: mutableTarget.name,
                defenderName: updatedEnemy.name,
                damage: counterResult.damage,
                advantage: counterResult.advantage,
                critical: counterResult.critical,
                defenderDestroyed: enemyDestroyed,
              }),
            );
            if (counterResult.advantage === "strong") {
              log.push(`  └ 反撃有利（${mutableTarget.type} → ${updatedEnemy.type}）`);
            }
          }
        }
      }
    } else {
      // --- Move toward target (every enemy MUST act) ---
      if (enemyMoveRange > 0) {
        const step = Math.min(enemyMoveRange, d - enemyRange * 0.7);
        if (step > 0) {
          const ratio = step / d;
          updatedEnemy.lat = enemy.lat + (bestTarget.lat - enemy.lat) * ratio;
          updatedEnemy.lng = enemy.lng + (bestTarget.lng - enemy.lng) * ratio;
          updatedEnemy.status = "moving";
          updatedEnemy.targetId = bestTarget.id;
          log.push(`敵${updatedEnemy.name}が移動 — ${bestTarget.name}へ接近`);
        } else {
          updatedEnemy.status = "engaging";
          updatedEnemy.targetId = bestTarget.id;
          log.push(`敵${updatedEnemy.name}が戦闘準備`);
        }
      } else {
        // Static enemy (cyber unit) — engage anyway if in range, else just hold
        updatedEnemy.status = "engaging";
        updatedEnemy.targetId = bestTarget.id;
        log.push(`敵${updatedEnemy.name}が戦術待機 (静的ユニット)`);
      }
    }

    enemyResults.push(updatedEnemy);
  }

  return {
    units: enemyResults,
    playerUnits: Array.from(playerMap.values()),
    log,
  };
}
