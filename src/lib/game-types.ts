// ========== MAVEN COMMAND: Shared Game Types ==========

export type GamePhase = "briefing" | "playing" | "paused" | "victory" | "defeat";

export interface GameKpis {
  combat: number;    // 戦力 0-100
  supply: number;    // 物資 0-100
  morale: number;    // 士気 0-100
  intel: number;     // 情報 0-100
}

export type UnitType = "infantry" | "vehicle" | "drone" | "ship" | "cyber";
export type Faction = "player" | "enemy";

export interface GameUnit {
  id: string;
  faction: Faction;
  type: UnitType;
  name: string;
  lat: number;
  lng: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;       // legacy map units per turn (fallback)
  movePoints?: number; // WC4-style step count per turn (e.g. 2 for drones)
  stepDistance?: number; // how far one step goes in degrees (~0.5 default)
  status: "idle" | "moving" | "engaging" | "damaged" | "destroyed";
  targetId?: string;   // mission or enemy id
  detail: string;
  range?: number;      // override default attack range from type
  actedThisTurn: boolean;  // has this unit used its action this turn?
}

export type TurnPhase = "player" | "enemy" | "resolution";

export interface GameEvent {
  id: string;
  turn: number;
  type: "attack" | "cyber" | "supply_cut" | "recon" | "sabotage" | "boss";
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  score: number;       // threat score 0-100
  location: string;
  lat: number;
  lng: number;
  linkedUnitIds: string[];
  suggestedAction: string;
  resolved: boolean;
}

export interface Mission {
  id: string;
  title: string;
  stage: "detected" | "dispatched" | "engaging" | "resolved";
  severity: "critical" | "warning" | "info";
  assignedUnitIds: string[];
  eventId: string;
  eta: string;
  outcome?: "success" | "failure" | "partial";
}

export interface WaveReinforcement {
  turn: number;  // turn within the wave (0-indexed)
  units: Omit<GameUnit, "id" | "status" | "actedThisTurn">[];
}

export interface WaveConfig {
  wave: number;
  name: string;
  description: string;
  turns: number;       // how many turns this wave lasts
  events: Omit<GameEvent, "id" | "turn" | "resolved">[];
  spawnUnits: Omit<GameUnit, "id" | "status" | "actedThisTurn">[];
  reinforcements?: WaveReinforcement[]; // timed reinforcement waves
  briefing: string;    // AI chat message at wave start
  intel: string[];     // periodic intel messages
  supplyBonus: number; // supply awarded on wave clear
}

export interface GameState {
  phase: GamePhase;
  wave: number;        // 1-5
  turn: number;
  maxTurns: number;    // total turns across all waves
  turnPhase: TurnPhase;
  supply: number;      // resource pool, used for repairs/reinforcements
  supplyIncome?: number; // computed supply generated per turn
  kpis: GameKpis;
  playerUnits: GameUnit[];
  enemyUnits: GameUnit[];
  events: GameEvent[];
  missions: Mission[];
  log: GameLogEntry[];
  selectedUnitId: string | null;
  selectedEventId: string | null;
}

export interface GameLogEntry {
  id: string;
  role: "system" | "intel" | "player" | "combat";
  content: string;
  timestamp: string;
  turn: number;
}

export type GameAction =
  | { type: "START_GAME" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "MOVE_UNIT"; unitId: string; lat: number; lng: number }
  | { type: "ATTACK_UNIT"; unitId: string; targetId: string }
  | { type: "REPAIR_UNIT"; unitId: string }
  | { type: "WAIT_UNIT"; unitId: string }
  | { type: "END_PLAYER_PHASE" }
  | { type: "PROCESS_ENEMY_PHASE" }
  | { type: "PROCESS_RESOLUTION" }
  | { type: "ASSIGN_TARGET"; unitId: string; targetUnitId: string }
  | { type: "SELECT_UNIT"; unitId: string | null }
  | { type: "SELECT_EVENT"; eventId: string | null };
