// ========== MAVEN COMMAND: Combat Rules Engine ==========
// 戦闘ルールシステム — ユニット相性・射程・施設防御ボーナス

import type { UnitType, GameUnit } from "@/lib/game-types";

// ---------------------------------------------------------------------------
// Type advantage matrix (rock-paper-scissors)
// ---------------------------------------------------------------------------

/**
 * 相性倍率テーブル
 * drone   > infantry (1.5x) — 航空優勢
 * drone   < ship     (0.6x) — 対空防御
 * vehicle > ship     (1.5x) — 沿岸強襲
 * vehicle < drone    (0.6x) — 上空に無防備
 * ship    > drone    (1.5x) — 対空システム
 * ship    < vehicle  (0.6x) — 地上接近に弱い
 * cyber   > drone    (1.5x) — 電子戦
 * cyber   < infantry (0.6x) — 物理的対処
 * infantry> cyber    (1.5x) — 地上制圧
 * infantry< vehicle  (0.6x) — 火力差
 */
const TYPE_ADVANTAGE: Record<UnitType, Record<UnitType, number>> = {
  drone: {
    infantry: 1.5,
    vehicle: 1.0,
    drone: 1.0,
    ship: 0.6,
    cyber: 1.0,
  },
  vehicle: {
    infantry: 1.0,
    vehicle: 1.0,
    drone: 0.6,
    ship: 1.5,
    cyber: 1.0,
  },
  ship: {
    infantry: 1.0,
    vehicle: 0.6,
    drone: 1.5,
    ship: 1.0,
    cyber: 1.0,
  },
  cyber: {
    infantry: 0.6,
    vehicle: 1.0,
    drone: 1.5,
    ship: 1.0,
    cyber: 1.0,
  },
  infantry: {
    infantry: 1.0,
    vehicle: 0.6,
    drone: 1.0,
    ship: 1.0,
    cyber: 1.5,
  },
};

/** 相性倍率を返す（1.0 = 中立, 1.5 = 有利, 0.6 = 不利） */
export function getTypeAdvantage(
  attackerType: UnitType,
  defenderType: UnitType,
): number {
  return TYPE_ADVANTAGE[attackerType]?.[defenderType] ?? 1.0;
}

// ---------------------------------------------------------------------------
// Attack range (in approximate map degrees)
// ---------------------------------------------------------------------------

const ATTACK_RANGES: Record<UnitType, number> = {
  infantry: 0.3,
  vehicle: 0.5,
  drone: 0.8,
  ship: 1.0,
  cyber: 2.0,
};

/** ユニットタイプの攻撃射程を返す（マップ度数単位） */
export function getAttackRange(type: UnitType): number {
  return ATTACK_RANGES[type] ?? 0.3;
}

// ---------------------------------------------------------------------------
// Distance helper
// ---------------------------------------------------------------------------

/** Haversine-ish flat-Earth distance (good enough for Japan). */
function distance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dlat = a.lat - b.lat;
  const dlng =
    (a.lng - b.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

/** 攻撃者が防御者に射程内かどうか判定 */
export function isInRange(attacker: GameUnit, defender: GameUnit): boolean {
  const range = attacker.range ?? getAttackRange(attacker.type);
  return distance(attacker, defender) <= range;
}

// ---------------------------------------------------------------------------
// Facility defense bonus
// ---------------------------------------------------------------------------

const FACILITY_DEFENSE_RANGE = 0.3;

/** 指定ユニットが味方施設の近くにいるかどうか判定 */
export function isNearFriendlyFacility(
  unit: GameUnit,
  alliedUnits: GameUnit[],
): boolean {
  return alliedUnits.some(
    (ally) =>
      ally.id !== unit.id &&
      ally.id.startsWith("base-") &&
      ally.status !== "destroyed" &&
      distance(unit, ally) <= FACILITY_DEFENSE_RANGE,
  );
}

// ---------------------------------------------------------------------------
// Damage calculation
// ---------------------------------------------------------------------------

export interface DamageResult {
  damage: number;
  multiplier: number;
  advantage: "strong" | "neutral" | "weak";
  critical: boolean;
}

/**
 * 最終ダメージを算出
 *
 * baseDamage   = attacker.attack * typeMultiplier * (1 - defender.defense / 200)
 * facilityMod  = nearFriendlyFacility ? 0.8 : 1.0  (防御側の被ダメ軽減)
 * critMult     = isCritical ? 1.5 : 1.0
 * finalDamage  = max(1, floor(baseDamage * facilityMod * critMult + random(-3, 3)))
 */
export function calculateDamage(
  attacker: GameUnit,
  defender: GameUnit,
  nearFacility: boolean,
): DamageResult {
  const typeMultiplier = getTypeAdvantage(attacker.type, defender.type);

  // Determine advantage label
  let advantage: "strong" | "neutral" | "weak";
  if (typeMultiplier >= 1.5) {
    advantage = "strong";
  } else if (typeMultiplier <= 0.6) {
    advantage = "weak";
  } else {
    advantage = "neutral";
  }

  // Critical hit: 10% base, +5% with type advantage
  const critChance = advantage === "strong" ? 0.15 : 0.10;
  const critical = Math.random() < critChance;

  // Base damage
  const defenseReduction = 1 - defender.defense / 200;
  const baseDamage = attacker.attack * typeMultiplier * defenseReduction;

  // Facility defense bonus (defender takes 20% less)
  const facilityMod = nearFacility ? 0.8 : 1.0;

  // Critical multiplier
  const critMultiplier = critical ? 1.5 : 1.0;

  // Noise
  const noise = Math.random() * 6 - 3; // random(-3, 3)

  const finalDamage = Math.max(
    1,
    Math.floor(baseDamage * facilityMod * critMultiplier + noise),
  );

  return {
    damage: finalDamage,
    multiplier: typeMultiplier,
    advantage,
    critical,
  };
}
