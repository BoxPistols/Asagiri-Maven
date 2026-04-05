"use client";

import { useCallback, useRef, useState, useMemo, useEffect } from "react";
import { ThemeContext, useThemeProvider } from "@/hooks/useTheme";
import { GameContext, useGameProvider } from "@/hooks/useGameEngine";
import { useCombatEffects } from "@/hooks/useCombatEffects";
import { useGameAudio } from "@/hooks/useGameAudio";
import { useGameSoundEffects } from "@/hooks/useGameSoundEffects";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import GameHud from "@/components/GameHud";
import TacticalMap from "@/components/TacticalMap";
import PhaseIndicator from "@/components/PhaseIndicator";
import IntelDrawer from "@/components/IntelDrawer";
import GameOverlay from "@/components/GameOverlay";
import GameControls from "@/components/GameControls";
import TurnTransition from "@/components/TurnTransition";
import DamagePopup, { combatEffectsToDamageEvents } from "@/components/DamagePopup";
import UnitDetailPanel from "@/components/UnitDetailPanel";
import TargetingOverlay from "@/components/TargetingOverlay";
import CombatToast from "@/components/CombatToast";
import MissionObjectives from "@/components/MissionObjectives";
import { WAVE_CONFIGS } from "@/lib/scenarios";
import { isNearFriendlyFacility } from "@/lib/combat-rules";
import type {
  GameEvent,
  GameUnit,
  Mission,
  GameLogEntry,
} from "@/lib/game-types";
import type { AlertItem, MapMarker, WorkflowCard, ChatMessage, SeverityLevel } from "@/lib/mock-data";

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

  // --- Audio ---
  const audio = useGameAudio();
  useGameSoundEffects(state, audio);

  // --- Turn transition state ---
  const prevTurnRef = useRef(state.turn);
  const prevWaveRef = useRef(state.wave);
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const [transitionMeta, setTransitionMeta] = useState<{
    turn: number;
    wave: number;
    type: "player_phase" | "enemy_phase" | "wave_start" | "resolution";
  }>({
    turn: 1,
    wave: 1,
    type: "player_phase",
  });

  // Show transition when turnPhase changes
  const prevTurnPhaseRef = useRef(state.turnPhase);
  useEffect(() => {
    if (state.phase !== "playing") {
      prevTurnPhaseRef.current = state.turnPhase;
      return;
    }

    if (state.turnPhase !== prevTurnPhaseRef.current) {
      const waveChanged = state.wave !== prevWaveRef.current;
      let type: typeof transitionMeta.type = "player_phase";
      if (waveChanged) {
        type = "wave_start";
      } else if (state.turnPhase === "player") {
        type = "player_phase";
      } else if (state.turnPhase === "enemy") {
        type = "enemy_phase";
      } else if (state.turnPhase === "resolution") {
        type = "resolution";
      }

      setTransitionMeta({ turn: state.turn, wave: state.wave, type });
      setShowTurnTransition(true);

      const duration = type === "wave_start" ? 1600 : 800;
      const timer = setTimeout(() => setShowTurnTransition(false), duration);

      prevTurnPhaseRef.current = state.turnPhase;
      prevTurnRef.current = state.turn;
      prevWaveRef.current = state.wave;
      return () => clearTimeout(timer);
    }

    prevTurnPhaseRef.current = state.turnPhase;
    prevTurnRef.current = state.turn;
    prevWaveRef.current = state.wave;
  }, [state.turnPhase, state.turn, state.wave, state.phase]);

  // --- Combat visual effects ---
  const combatEffects = useCombatEffects(
    state.log,
    state.turn,
    state.playerUnits,
    state.enemyUnits,
  );
  const damageEvents = useMemo(
    () => combatEffectsToDamageEvents(combatEffects),
    [combatEffects],
  );

  // --- Unit selection & interaction modes ---
  const [selectedUnit, setSelectedUnit] = useState<GameUnit | null>(null);
  const [targetingMode, setTargetingMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [attackMode, setAttackMode] = useState(false);

  const handleSelectMarker = useCallback((id: string | null) => {
    setSelectedMarker(id);
    if (id) dispatch({ type: "SELECT_UNIT", unitId: id });
  }, [dispatch]);

  const handleMarkerClick = useCallback((id: string) => {
    const isEnemy = state.enemyUnits.some(u => u.id === id && u.status !== "destroyed");

    // If a player unit is selected and can act, and we click an enemy → ATTACK
    if (selectedUnit
        && selectedUnit.faction === "player"
        && !selectedUnit.actedThisTurn
        && state.turnPhase === "player"
        && isEnemy) {
      audio.playAttack();
      dispatch({ type: "ATTACK_UNIT", unitId: selectedUnit.id, targetId: id });
      setAttackMode(false);
      setMoveMode(false);
      return;
    }

    // Otherwise: select this unit
    const allUnits = [...state.playerUnits, ...state.enemyUnits];
    const unit = allUnits.find(u => u.id === id);
    if (unit) {
      audio.playSelect();
      setSelectedUnit(unit);
      setTargetingMode(false);
      setMoveMode(false);
      setAttackMode(false);
    }
  }, [selectedUnit, state.enemyUnits, state.playerUnits, state.turnPhase, dispatch, audio]);

  // Map click: if a player unit is selected, move it there
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (selectedUnit
        && selectedUnit.faction === "player"
        && !selectedUnit.actedThisTurn
        && state.turnPhase === "player"
        && selectedUnit.speed > 0) {
      audio.playMove();
      dispatch({ type: "MOVE_UNIT", unitId: selectedUnit.id, lat, lng });
      setMoveMode(false);
    }
  }, [selectedUnit, state.turnPhase, dispatch, audio]);

  // Action mode toggles
  const handleEnterMoveMode = useCallback(() => {
    audio.playButton();
    setMoveMode(true);
    setAttackMode(false);
    setTargetingMode(false);
  }, [audio]);

  const handleEnterAttackMode = useCallback(() => {
    audio.playButton();
    setAttackMode(true);
    setMoveMode(false);
    setTargetingMode(true); // use targeting overlay for attack mode
  }, [audio]);

  const handleRepair = useCallback(() => {
    if (selectedUnit) {
      audio.playRepair();
      dispatch({ type: "REPAIR_UNIT", unitId: selectedUnit.id });
    }
  }, [selectedUnit, dispatch, audio]);

  const handleWait = useCallback(() => {
    if (selectedUnit) {
      audio.playButton();
      dispatch({ type: "WAIT_UNIT", unitId: selectedUnit.id });
    }
  }, [selectedUnit, dispatch, audio]);

  const handleCancelTargeting = useCallback(() => {
    setTargetingMode(false);
    setAttackMode(false);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedUnit(null);
    setTargetingMode(false);
    setMoveMode(false);
    setAttackMode(false);
  }, []);

  // Keep selectedUnit data fresh across turns
  useEffect(() => {
    if (!selectedUnit) return;
    const allUnits = [...state.playerUnits, ...state.enemyUnits];
    const fresh = allUnits.find(u => u.id === selectedUnit.id);
    if (fresh) {
      setSelectedUnit(fresh);
    } else {
      // Unit no longer exists (destroyed and removed)
      setSelectedUnit(null);
      setTargetingMode(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turn, state.playerUnits, state.enemyUnits]);

  // Compute the target name for display in UnitDetailPanel
  const selectedTargetName = useMemo(() => {
    if (!selectedUnit?.targetId) return undefined;
    const target = state.enemyUnits.find(u => u.id === selectedUnit.targetId);
    if (target) return target.name;
    const event = state.events.find(e => e.id === selectedUnit.targetId);
    return event?.title;
  }, [selectedUnit, state.enemyUnits, state.events]);

  // Adapt game state to component props
  const alerts = useMemo(() => gameEventsToAlerts(state.events), [state.events]);
  const workflowCards = useMemo(() => gameMissionsToWorkflow(state.missions), [state.missions]);
  const chatMessages = useMemo(() => gameLogToChat(state.log), [state.log]);
  const playerMarkers = useMemo(() => gameUnitsToMarkers(state.playerUnits), [state.playerUnits]);

  // Handlers
  const handleEndPlayerPhase = useCallback(() => {
    audio.playButton();
    dispatch({ type: "END_PLAYER_PHASE" });
  }, [dispatch, audio]);
  const handlePause = useCallback(() => {
    audio.playButton();
    dispatch({ type: "PAUSE" });
  }, [dispatch, audio]);
  const handleResume = useCallback(() => {
    audio.playButton();
    dispatch({ type: "RESUME" });
  }, [dispatch, audio]);
  const handleStart = useCallback(() => {
    audio.playButton();
    dispatch({ type: "START_GAME" });
  }, [dispatch, audio]);
  const handleRestart = useCallback(() => {
    audio.playButton();
    dispatch({ type: "START_GAME" });
  }, [dispatch, audio]);

  // Auto-cycle: when turnPhase is "enemy", process enemy phase after a short delay
  useEffect(() => {
    if (state.phase !== "playing") return;
    if (state.turnPhase === "enemy") {
      const timer = setTimeout(() => {
        dispatch({ type: "PROCESS_ENEMY_PHASE" });
      }, 800);
      return () => clearTimeout(timer);
    }
    if (state.turnPhase === "resolution") {
      const timer = setTimeout(() => {
        dispatch({ type: "PROCESS_RESOLUTION" });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [state.turnPhase, state.phase, dispatch]);

  // Count unacted mobile player units (speed > 0, not destroyed, not yet acted)
  const unactedCount = useMemo(() =>
    state.playerUnits.filter(u =>
      u.status !== "destroyed" && u.speed > 0 && !u.actedThisTurn
    ).length,
    [state.playerUnits],
  );

  // Compute acted unit IDs for TacticalMap dimming
  const actedUnitIds = useMemo(() =>
    state.playerUnits.filter(u => u.actedThisTurn).map(u => u.id),
    [state.playerUnits],
  );

  // Can selected unit be repaired? (near facility, damaged, enough supply)
  const canRepair = useMemo(() => {
    if (!selectedUnit) return false;
    if (selectedUnit.faction !== "player") return false;
    if (selectedUnit.hp >= selectedUnit.maxHp) return false;
    if (selectedUnit.status === "destroyed") return false;
    if (state.supply < 10) return false;
    return isNearFriendlyFacility(selectedUnit, state.playerUnits);
  }, [selectedUnit, state.playerUnits, state.supply]);

  // --- Keyboard shortcut: cycle to next unacted unit ---
  const handleCycleUnit = useCallback(() => {
    const unactedUnits = state.playerUnits.filter(
      u => u.status !== "destroyed" && u.speed > 0 && !u.actedThisTurn,
    );
    if (unactedUnits.length === 0) return;

    const currentIdx = selectedUnit
      ? unactedUnits.findIndex(u => u.id === selectedUnit.id)
      : -1;
    const nextIdx = (currentIdx + 1) % unactedUnits.length;
    const next = unactedUnits[nextIdx];
    audio.playSelect();
    setSelectedUnit(next);
    setTargetingMode(false);
    setMoveMode(false);
    setAttackMode(false);
  }, [state.playerUnits, selectedUnit, audio]);

  // --- Keyboard shortcuts ---
  useKeyboardShortcuts({
    onMove: handleEnterMoveMode,
    onAttack: handleEnterAttackMode,
    onRepair: handleRepair,
    onWait: handleWait,
    onEndTurn: handleEndPlayerPhase,
    onEscape: handleCloseDetail,
    onCycleUnit: handleCycleUnit,
    enabled: state.phase === "playing" && state.turnPhase === "player",
  });

  const waveConfig = useMemo(() => {
    const cfg = WAVE_CONFIGS[state.wave - 1];
    return cfg
      ? { name: cfg.name, description: cfg.description, briefing: cfg.briefing }
      : { name: `第${state.wave}波`, description: "作戦準備中", briefing: "待機せよ。" };
  }, [state.wave]);

  // Facility count for HUD supply display
  const facilityCount = useMemo(() =>
    state.playerUnits.filter(u => u.speed === 0 && u.status !== "destroyed").length,
    [state.playerUnits],
  );

  const isPlaying = state.phase === "playing" || state.phase === "paused";

  return (
    <ThemeContext value={themeValue}>
      <GameContext value={gameValue}>
        <div className="h-screen flex flex-col overflow-hidden bg-bg-deep">
          {/* Top HUD bar -- slim, always visible during gameplay */}
          {isPlaying && (
            <GameHud
              wave={state.wave}
              turn={state.turn}
              maxTurns={state.maxTurns}
              kpis={state.kpis}
              supply={state.supply}
              facilityCount={facilityCount}
              phase={state.phase}
              turnPhase={state.turnPhase}
              onPause={handlePause}
              onResume={handleResume}
            />
          )}

          {/* Full-screen map area with floating overlays */}
          <div className="flex-1 relative min-h-0">
            {/* Map fills entire area */}
            <TacticalMap
              onSelectMarker={handleSelectMarker}
              onMarkerClick={handleMarkerClick}
              markers={playerMarkers}
              enemyUnits={state.enemyUnits}
              playerUnits={state.playerUnits}
              selectedUnitId={selectedUnit?.id ?? null}
              targetingMode={targetingMode || attackMode}
              turnPhase={state.turnPhase}
              onMapClick={handleMapClick}
              actedUnitIds={actedUnitIds}
              combatLog={state.log}
              currentTurn={state.turn}
            />

            {/* Phase indicator -- top center, floating over map */}
            {isPlaying && (
              <PhaseIndicator
                turnPhase={state.turnPhase}
                turn={state.turn}
                unactedCount={unactedCount}
              />
            )}

            {/* Tutorial hint banner */}
            {isPlaying && state.turnPhase === "player" && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[900] pointer-events-none">
                <div className="bg-bg-surface/95 backdrop-blur-sm border border-accent-cyan/40 rounded-lg px-4 py-2 shadow-lg">
                  {!selectedUnit ? (
                    <p className="text-sm text-text-primary">
                      <span className="text-accent-cyan font-bold">青い味方</span>
                      をクリックして選択してください
                    </p>
                  ) : selectedUnit.faction === "player" && !selectedUnit.actedThisTurn && selectedUnit.speed > 0 ? (
                    <p className="text-sm text-text-primary">
                      <span className="text-alert-critical font-bold">赤い敵</span>をクリック→攻撃 / <span className="text-accent-cyan font-bold">地図</span>をクリック→移動
                    </p>
                  ) : selectedUnit.actedThisTurn ? (
                    <p className="text-sm text-text-dim">
                      このユニットは今ターン行動済み。別のユニットを選択してください。
                    </p>
                  ) : selectedUnit.faction === "enemy" ? (
                    <p className="text-sm text-alert-critical">
                      敵ユニット: {selectedUnit.name}
                    </p>
                  ) : (
                    <p className="text-sm text-text-dim">待機中</p>
                  )}
                </div>
              </div>
            )}

            {/* Unit detail panel -- left side, floating */}
            <UnitDetailPanel
              unit={selectedUnit}
              onClose={handleCloseDetail}
              canRepair={canRepair}
              targetName={selectedTargetName}
            />

            {/* Targeting overlay */}
            <TargetingOverlay
              active={targetingMode || attackMode}
              sourceUnit={selectedUnit}
              onSelectTarget={(targetId) => {
                if (selectedUnit) {
                  audio.playAttack();
                  dispatch({ type: "ATTACK_UNIT", unitId: selectedUnit.id, targetId });
                  setTargetingMode(false);
                  setAttackMode(false);
                }
              }}
              onCancel={handleCancelTargeting}
            />

            {/* Intel drawer -- right side, collapsible */}
            {isPlaying && (
              <IntelDrawer
                alerts={alerts}
                missions={workflowCards}
                messages={chatMessages}
                onSelectAlert={(id) => handleSelectMarker(id)}
              />
            )}

            {/* Mission objectives panel - always visible during play */}
            {isPlaying && (
              <MissionObjectives
                state={state}
                waveName={waveConfig?.name ?? ""}
              />
            )}

            {/* Combat result toasts */}
            {isPlaying && (
              <CombatToast log={state.log} currentTurn={state.turn} />
            )}

            {/* Floating damage numbers overlay */}
            <DamagePopup damages={damageEvents} />

            {/* Game controls -- bottom center, floating */}
            {isPlaying ? (
              <GameControls
                turn={state.turn}
                maxTurns={state.maxTurns}
                wave={state.wave}
                phase={state.phase}
                turnPhase={state.turnPhase}
                supply={state.supply}
                selectedUnit={selectedUnit}
                unactedCount={unactedCount}
                canRepair={canRepair}
                onMove={handleEnterMoveMode}
                onAttack={handleEnterAttackMode}
                onRepair={handleRepair}
                onWait={handleWait}
                onEndPlayerPhase={handleEndPlayerPhase}
                onProcessEnemy={() => dispatch({ type: "PROCESS_ENEMY_PHASE" })}
                onProcessResolution={() => dispatch({ type: "PROCESS_RESOLUTION" })}
                onPause={handlePause}
                onResume={handleResume}
              />
            ) : null}
          </div>

          {/* Turn transition flash */}
          <TurnTransition
            turn={transitionMeta.turn}
            wave={transitionMeta.wave}
            show={showTurnTransition}
            type={transitionMeta.type}
          />

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
