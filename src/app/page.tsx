"use client";

import { useCallback, useState, useMemo } from "react";
import { ThemeContext, useThemeProvider } from "@/hooks/useTheme";
import { GameContext, useGameProvider } from "@/hooks/useGameEngine";
import StatusHeader from "@/components/StatusHeader";
import HudKpi from "@/components/HudKpi";
import TacticalMap from "@/components/TacticalMap";
import AiTriage from "@/components/AiTriage";
import WorkflowKanban from "@/components/WorkflowKanban";
import ChatInterface from "@/components/ChatInterface";
import GameOverlay from "@/components/GameOverlay";
import GameControls from "@/components/GameControls";
import type {
  GameEvent,
  GameUnit,
  GameKpis,
  Mission,
  GameLogEntry,
} from "@/lib/game-types";
import type { AlertItem, MapMarker, KpiData, WorkflowCard, ChatMessage, SeverityLevel } from "@/lib/mock-data";

// ========== Adapter functions: game state -> component props ==========

function gameEventsToAlerts(events: GameEvent[]): AlertItem[] {
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.type === "attack" ? "攻撃"
      : e.type === "cyber" ? "サイバー"
      : e.type === "supply_cut" ? "補給"
      : e.type === "recon" ? "偵察"
      : e.type === "sabotage" ? "破壊工作"
      : "ボス",
    severity: e.severity as SeverityLevel,
    score: e.score,
    timestamp: `T${e.turn}`,
    location: e.location,
    description: e.description,
    suggestedAction: e.suggestedAction,
    markerId: e.id,
  }));
}

function gameMissionsToWorkflow(missions: Mission[]): WorkflowCard[] {
  const stageMap: Record<Mission["stage"], WorkflowCard["stage"]> = {
    detected: "detected",
    dispatched: "reviewing",
    engaging: "approved",
    resolved: "executed",
  };
  return missions.map((m) => ({
    id: m.id,
    title: m.title,
    stage: stageMap[m.stage],
    severity: m.severity as SeverityLevel,
    assignee: m.assignedUnitIds.length > 0 ? `部隊x${m.assignedUnitIds.length}` : "未割当",
    eta: m.eta,
    source: `イベント ${m.eventId}`,
  }));
}

function gameUnitsToMarkers(units: GameUnit[]): MapMarker[] {
  const typeMap: Record<GameUnit["type"], MapMarker["type"]> = {
    infantry: "personnel",
    vehicle: "vehicle",
    drone: "drone",
    ship: "vehicle",
    cyber: "alert",
  };
  const statusMap = (hp: number, maxHp: number, status: GameUnit["status"]): SeverityLevel => {
    if (status === "destroyed") return "critical";
    if (status === "damaged" || hp < maxHp * 0.3) return "critical";
    if (status === "engaging" || hp < maxHp * 0.6) return "warning";
    return "normal";
  };
  return units
    .filter((u) => u.status !== "destroyed")
    .map((u) => ({
      id: u.id,
      lat: u.lat,
      lng: u.lng,
      type: typeMap[u.type],
      label: u.name,
      status: statusMap(u.hp, u.maxHp, u.status),
      detail: `HP ${u.hp}/${u.maxHp} | ATK ${u.attack} | DEF ${u.defense} | ${
        u.status === "idle" ? "待機中"
        : u.status === "moving" ? "移動中"
        : u.status === "engaging" ? "交戦中"
        : u.status === "damaged" ? "損傷"
        : "壊滅"
      }`,
    }));
}

function gameKpisToHudData(kpis: GameKpis): KpiData[] {
  const kpiConfig: {
    key: keyof GameKpis;
    label: string;
    unit: string;
  }[] = [
    { key: "combat", label: "戦力", unit: "pt" },
    { key: "supply", label: "物資", unit: "pt" },
    { key: "morale", label: "士気", unit: "pt" },
    { key: "intel", label: "情報", unit: "pt" },
  ];

  return kpiConfig.map((cfg) => {
    const val = kpis[cfg.key];
    const severity: SeverityLevel =
      val <= 20 ? "critical" : val <= 50 ? "warning" : val <= 75 ? "info" : "normal";
    const trend: KpiData["trend"] =
      val <= 30 ? "down" : val >= 80 ? "up" : "stable";
    return {
      label: cfg.label,
      value: String(val),
      unit: cfg.unit,
      trend,
      trendValue: `${val}%`,
      severity,
    };
  });
}

function gameLogToChat(log: GameLogEntry[]): ChatMessage[] {
  const roleMap: Record<GameLogEntry["role"], ChatMessage["role"]> = {
    system: "system",
    intel: "ai",
    player: "user",
    combat: "system",
  };
  return log.map((entry) => ({
    id: entry.id,
    role: roleMap[entry.role],
    content: entry.content,
    timestamp: entry.timestamp,
  }));
}

// ========== Main page component ==========

export default function Dashboard() {
  const themeValue = useThemeProvider();
  const gameValue = useGameProvider();
  const { state, dispatch } = gameValue;
  const [, setSelectedMarker] = useState<string | null>(null);

  const handleSelectMarker = useCallback((id: string | null) => {
    setSelectedMarker(id);
    if (id) dispatch({ type: "SELECT_UNIT", unitId: id });
  }, [dispatch]);

  // Adapt game state to component props
  const hudData = useMemo(() => gameKpisToHudData(state.kpis), [state.kpis]);
  const alerts = useMemo(() => gameEventsToAlerts(state.events), [state.events]);
  const workflowCards = useMemo(() => gameMissionsToWorkflow(state.missions), [state.missions]);
  const chatMessages = useMemo(() => gameLogToChat(state.log), [state.log]);
  const playerMarkers = useMemo(() => gameUnitsToMarkers(state.playerUnits), [state.playerUnits]);

  // Handlers
  const handleNextTurn = useCallback(() => dispatch({ type: "NEXT_TURN" }), [dispatch]);
  const handlePause = useCallback(() => dispatch({ type: "PAUSE" }), [dispatch]);
  const handleResume = useCallback(() => dispatch({ type: "RESUME" }), [dispatch]);
  const handleStart = useCallback(() => dispatch({ type: "START_GAME" }), [dispatch]);
  const handleRestart = useCallback(() => dispatch({ type: "START_GAME" }), [dispatch]);
  const handleDispatch = useCallback((eventId: string) => {
    // Dispatch first idle player unit to this event
    const idleUnit = state.playerUnits.find((u) => u.status === "idle");
    if (idleUnit) {
      dispatch({ type: "DISPATCH_UNIT", unitId: idleUnit.id, eventId });
    }
  }, [dispatch, state.playerUnits]);
  const handleAdvanceMission = useCallback((id: string) => {
    dispatch({ type: "APPROVE_MISSION", missionId: id });
  }, [dispatch]);

  // Wave config for overlay
  const waveConfig = useMemo(() => {
    // The game engine should provide this; for now we derive a simple one
    return {
      name: `第${state.wave}波`,
      description: "新たな脅威が接近中。防衛線を維持せよ。",
      briefing: `Wave ${state.wave} 開始。全部隊に警戒態勢を命ずる。\n敵の動向を監視し、適切なタイミングで部隊を派遣せよ。`,
    };
  }, [state.wave]);

  return (
    <ThemeContext value={themeValue}>
      <GameContext value={gameValue}>
        <div className="h-screen flex flex-col overflow-hidden bg-bg-deep">
          <StatusHeader
            gameWave={state.wave}
            gameTurn={state.turn}
            gamePhase={state.phase}
          />

          <div className="flex-1 flex overflow-hidden min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="border-b border-border-subtle bg-bg-primary/60 px-5 py-2 shrink-0">
                <HudKpi data={hudData} />
              </div>
              <div className="flex-1 min-h-0">
                <TacticalMap
                  onSelectMarker={handleSelectMarker}
                  markers={playerMarkers}
                  enemyUnits={state.enemyUnits}
                  playerUnits={state.playerUnits}
                >
                  {state.phase === "playing" || state.phase === "paused" ? (
                    <GameControls
                      turn={state.turn}
                      maxTurns={state.maxTurns}
                      wave={state.wave}
                      phase={state.phase}
                      onNextTurn={handleNextTurn}
                      onPause={handlePause}
                      onResume={handleResume}
                    />
                  ) : null}
                </TacticalMap>
              </div>
            </div>

            <div className="w-[380px] shrink-0 flex flex-col border-l border-border-subtle">
              <div className="flex-[3] border-b border-border-subtle min-h-0 overflow-hidden">
                <AiTriage
                  onSelectMarker={handleSelectMarker}
                  alerts={alerts}
                  onDispatch={handleDispatch}
                />
              </div>
              <div className="flex-[2] border-b border-border-subtle min-h-0 overflow-hidden">
                <WorkflowKanban
                  cards={workflowCards}
                  onAdvance={handleAdvanceMission}
                />
              </div>
              <div className="flex-[2] min-h-0 overflow-hidden">
                <ChatInterface messages={chatMessages} />
              </div>
            </div>
          </div>

          <div className="h-7 border-t border-border-subtle bg-bg-primary/80 backdrop-blur-sm flex items-center px-5 justify-between shrink-0">
            <div className="readout text-xs text-text-dim flex items-center gap-5">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-alert-success" />
                部隊数 <span className="text-text-secondary">{state.playerUnits.filter(u => u.status !== "destroyed").length}</span>
              </span>
              <span>敵勢力 <span className="text-alert-critical">{state.enemyUnits.filter(u => u.status !== "destroyed").length}</span></span>
            </div>
            <div className="readout text-xs text-text-dim flex items-center gap-5">
              <span>MAVEN COMMAND v1.0</span>
            </div>
          </div>

          {/* Game overlay for briefing / victory / defeat */}
          <GameOverlay
            phase={state.phase}
            wave={state.wave}
            waveConfig={waveConfig}
            kpis={state.kpis}
            onStart={handleStart}
            onRestart={handleRestart}
          />
        </div>
      </GameContext>
    </ThemeContext>
  );
}
