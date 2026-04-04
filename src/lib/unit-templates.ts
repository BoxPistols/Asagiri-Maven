// ========== MAVEN COMMAND: Enemy Unit Templates ==========

import type { UnitType } from "@/lib/game-types";

export interface UnitTemplate {
  type: UnitType;
  namePrefix: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

/** 偵察ドローン — 低耐久・高速・低火力 */
export const SCOUT_DRONE: UnitTemplate = {
  type: "drone",
  namePrefix: "偵察ドローン",
  hp: 20,
  attack: 10,
  defense: 10,
  speed: 3,
};

/** 攻撃ドローン — 中耐久・中速・中火力 */
export const COMBAT_DRONE: UnitTemplate = {
  type: "drone",
  namePrefix: "攻撃ドローン",
  hp: 35,
  attack: 20,
  defense: 15,
  speed: 2,
};

/** 哨戒艦 — 高耐久・低速・中火力・高防御 */
export const PATROL_SHIP: UnitTemplate = {
  type: "ship",
  namePrefix: "哨戒艦",
  hp: 60,
  attack: 25,
  defense: 40,
  speed: 1,
};

/** 強襲揚陸艦 — 高耐久・低速・高火力・高防御 */
export const ASSAULT_SHIP: UnitTemplate = {
  type: "ship",
  namePrefix: "強襲艦",
  hp: 80,
  attack: 35,
  defense: 45,
  speed: 1,
};

/** 敵司令艦 (ボス) — 最大耐久・低速・最高火力・最高防御 */
export const COMMAND_SHIP: UnitTemplate = {
  type: "ship",
  namePrefix: "敵司令艦",
  hp: 150,
  attack: 40,
  defense: 50,
  speed: 1,
};

/** サイバー戦ユニット — 低耐久・高速（仮想移動）・特殊攻撃・低防御 */
export const CYBER_UNIT: UnitTemplate = {
  type: "cyber",
  namePrefix: "電子戦ユニット",
  hp: 25,
  attack: 15,
  defense: 8,
  speed: 4,
};

/** 地上車両 — 中耐久・中速・中火力・中防御 */
export const GROUND_VEHICLE: UnitTemplate = {
  type: "vehicle",
  namePrefix: "装甲車両",
  hp: 50,
  attack: 22,
  defense: 30,
  speed: 2,
};

/** 精鋭車両 — 高耐久・中速・高火力・高防御 */
export const ELITE_VEHICLE: UnitTemplate = {
  type: "vehicle",
  namePrefix: "精鋭戦闘車両",
  hp: 70,
  attack: 30,
  defense: 38,
  speed: 2,
};

/** 全テンプレート一覧 */
export const ALL_TEMPLATES: Record<string, UnitTemplate> = {
  scout_drone: SCOUT_DRONE,
  combat_drone: COMBAT_DRONE,
  patrol_ship: PATROL_SHIP,
  assault_ship: ASSAULT_SHIP,
  command_ship: COMMAND_SHIP,
  cyber_unit: CYBER_UNIT,
  ground_vehicle: GROUND_VEHICLE,
  elite_vehicle: ELITE_VEHICLE,
};
