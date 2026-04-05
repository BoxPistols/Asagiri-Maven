// ========== MAVEN COMMAND: Enemy Unit Templates ==========

import type { UnitType } from "@/lib/game-types";

export interface UnitTemplate {
  type: UnitType;
  namePrefix: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  movePoints: number;   // WC4-style step count per turn
  stepDistance: number; // distance per step (degrees)
  description: string;
}

/** 偵察ドローン — 低耐久・高速・低火力 */
export const SCOUT_DRONE: UnitTemplate = {
  type: "drone",
  namePrefix: "偵察ドローン",
  hp: 30,
  attack: 15,
  defense: 12,
  speed: 1.5,
  movePoints: 3,
  stepDistance: 0.5,
  description: "高速偵察。対歩兵有利、対艦不利 (歩数3×0.5)",
};

/** 攻撃ドローン — 中耐久・中速・中火力 */
export const COMBAT_DRONE: UnitTemplate = {
  type: "drone",
  namePrefix: "攻撃ドローン",
  hp: 45,
  attack: 25,
  defense: 18,
  speed: 1.0,
  movePoints: 2,
  stepDistance: 0.5,
  description: "攻撃型無人機。対歩兵有利、対艦不利 (歩数2×0.5)",
};

/** 哨戒艦 — 高耐久・低速・中火力・高防御 */
export const PATROL_SHIP: UnitTemplate = {
  type: "ship",
  namePrefix: "哨戒艦",
  hp: 60,
  attack: 25,
  defense: 40,
  speed: 0.6,
  movePoints: 2,
  stepDistance: 0.3,
  description: "哨戒・防空艦。対ドローン有利、対車両不利 (歩数2×0.3)",
};

/** 強襲揚陸艦 — 高耐久・低速・高火力・高防御 */
export const ASSAULT_SHIP: UnitTemplate = {
  type: "ship",
  namePrefix: "強襲艦",
  hp: 80,
  attack: 35,
  defense: 45,
  speed: 0.4,
  movePoints: 1,
  stepDistance: 0.4,
  description: "強襲揚陸艦。対ドローン有利、対車両不利 (歩数1×0.4)",
};

/** 敵司令艦 (ボス) — 最大耐久・低速・最高火力・最高防御 */
export const COMMAND_SHIP: UnitTemplate = {
  type: "ship",
  namePrefix: "敵司令艦",
  hp: 150,
  attack: 40,
  defense: 50,
  speed: 0.3,
  movePoints: 1,
  stepDistance: 0.3,
  description: "敵艦隊旗艦。重装甲・高火力。車両部隊で攻めろ (歩数1×0.3)",
};

/** サイバー戦ユニット — 静的・射程無制限 */
export const CYBER_UNIT: UnitTemplate = {
  type: "cyber",
  namePrefix: "電子戦ユニット",
  hp: 25,
  attack: 15,
  defense: 8,
  speed: 0,
  movePoints: 0,
  stepDistance: 0,
  description: "電子戦特化。対ドローン有利、対歩兵不利。射程無制限・移動不可",
};

/** 地上車両 — 中耐久・中速・中火力・中防御 */
export const GROUND_VEHICLE: UnitTemplate = {
  type: "vehicle",
  namePrefix: "装甲車両",
  hp: 50,
  attack: 22,
  defense: 30,
  speed: 0.8,
  movePoints: 2,
  stepDistance: 0.4,
  description: "汎用装甲車両。対艦有利、対ドローン不利 (歩数2×0.4)",
};

/** 精鋭車両 — 高耐久・中速・高火力・高防御 */
export const ELITE_VEHICLE: UnitTemplate = {
  type: "vehicle",
  namePrefix: "精鋭戦闘車両",
  hp: 70,
  attack: 30,
  defense: 38,
  speed: 0.8,
  movePoints: 2,
  stepDistance: 0.4,
  description: "精鋭機甲部隊。対艦有利、対ドローン不利 (歩数2×0.4)",
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
