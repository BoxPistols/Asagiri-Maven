"use client";

import { useEffect, useRef } from "react";
import type { GameState } from "@/lib/game-types";
import type { useGameAudio } from "./useGameAudio";

// ---------------------------------------------------------------------------
// useGameSoundEffects — Automatically trigger sounds in response to state
// ---------------------------------------------------------------------------

type AudioApi = ReturnType<typeof useGameAudio>;

/** Minimum ms between same sound type to avoid spam */
const COOLDOWN_MS = 200;

export function useGameSoundEffects(
  state: GameState,
  audio: AudioApi,
): void {
  const prevRef = useRef<{
    turnPhase: string;
    wave: number;
    phase: string;
    logLength: number;
    destroyedIds: Set<string>;
    kpiWarned: boolean;
  } | null>(null);

  const cooldownRef = useRef<Map<string, number>>(new Map());

  // Helper: play with cooldown
  const play = (key: string, fn: () => void) => {
    const now = Date.now();
    const last = cooldownRef.current.get(key) ?? 0;
    if (now - last < COOLDOWN_MS) return;
    cooldownRef.current.set(key, now);
    fn();
  };

  useEffect(() => {
    // Don't play sounds during non-playing phases (briefing, etc.)
    if (state.phase !== "playing" && state.phase !== "victory" && state.phase !== "defeat") {
      // Still track state so we don't fire stale diffs
      prevRef.current = {
        turnPhase: state.turnPhase,
        wave: state.wave,
        phase: state.phase,
        logLength: state.log.length,
        destroyedIds: new Set([
          ...state.playerUnits.filter(u => u.status === "destroyed").map(u => u.id),
          ...state.enemyUnits.filter(u => u.status === "destroyed").map(u => u.id),
        ]),
        kpiWarned: false,
      };
      return;
    }

    const prev = prevRef.current;

    // First run: just record state, no sounds
    if (!prev) {
      prevRef.current = {
        turnPhase: state.turnPhase,
        wave: state.wave,
        phase: state.phase,
        logLength: state.log.length,
        destroyedIds: new Set([
          ...state.playerUnits.filter(u => u.status === "destroyed").map(u => u.id),
          ...state.enemyUnits.filter(u => u.status === "destroyed").map(u => u.id),
        ]),
        kpiWarned: false,
      };
      return;
    }

    // --- Victory / Defeat ---
    if (state.phase === "victory" && prev.phase !== "victory") {
      play("victory", audio.playVictory);
    }
    if (state.phase === "defeat" && prev.phase !== "defeat") {
      play("defeat", audio.playDefeat);
    }

    // --- Wave change ---
    if (state.wave !== prev.wave) {
      play("waveStart", audio.playWaveStart);
    }
    // --- Phase change ---
    else if (state.turnPhase !== prev.turnPhase) {
      play("phaseChange", audio.playPhaseChange);
    }

    // --- New combat log entries ---
    if (state.log.length > prev.logLength) {
      const newEntries = state.log.slice(prev.logLength);
      for (const entry of newEntries) {
        if (entry.role === "combat") {
          // Check for destruction keywords
          if (entry.content.includes("撃破") || entry.content.includes("壊滅")) {
            play("explosion", audio.playExplosion);
          } else if (entry.content.includes("反撃") || entry.content.includes("攻撃")) {
            play("attack", audio.playAttack);
          }
          // Only fire one combat sound per batch to avoid spam
          break;
        }
      }
    }

    // --- Unit destroyed (not caught by log) ---
    const currentDestroyedIds = new Set([
      ...state.playerUnits.filter(u => u.status === "destroyed").map(u => u.id),
      ...state.enemyUnits.filter(u => u.status === "destroyed").map(u => u.id),
    ]);
    for (const id of currentDestroyedIds) {
      if (!prev.destroyedIds.has(id)) {
        play("explosion", audio.playExplosion);
        break; // one explosion sound per tick is enough
      }
    }

    // --- KPI warning (one-shot when any drops below 30) ---
    const kpiValues = [state.kpis.combat, state.kpis.supply, state.kpis.morale, state.kpis.intel];
    const anyLow = kpiValues.some(v => v > 0 && v <= 30);
    if (anyLow && !prev.kpiWarned) {
      play("damage", audio.playDamage);
    }

    // Update prev ref
    prevRef.current = {
      turnPhase: state.turnPhase,
      wave: state.wave,
      phase: state.phase,
      logLength: state.log.length,
      destroyedIds: currentDestroyedIds,
      kpiWarned: anyLow,
    };
  }, [
    state.phase,
    state.turnPhase,
    state.wave,
    state.log,
    state.playerUnits,
    state.enemyUnits,
    state.kpis,
    audio,
  ]);
}
