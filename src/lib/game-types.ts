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
  speed: number;       // map units per turn
  status: "idle" | "moving" | "engaging" | "damaged" | "destroyed";
  targetId?: string;   // mission or enemy id
  detail: string;
  range?: number;      // override default attack range from type
}

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

export interface WaveConfig {
  wave: number;
  name: string;
  description: string;
  turns: number;       // how many turns this wave lasts
  events: Omit<GameEvent, "id" | "turn" | "resolved">[];
  spawnUnits: Omit<GameUnit, "id" | "status">[];
  briefing: string;    // AI chat message at wave start
  intel: string[];     // periodic intel messages
}

export interface GameState {
  phase: GamePhase;
  wave: number;        // 1-5
  turn: number;
  maxTurns: number;    // total turns across all waves
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
  | { type: "NEXT_TURN" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "DISPATCH_UNIT"; unitId: string; eventId: string }
  | { type: "APPROVE_MISSION"; missionId: string }
  | { type: "ASSIGN_TARGET"; unitId: string; targetUnitId: string }
  | { type: "SELECT_UNIT"; unitId: string | null }
  | { type: "SELECT_EVENT"; eventId: string | null };
