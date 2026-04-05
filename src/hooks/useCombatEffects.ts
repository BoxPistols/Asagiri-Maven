"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GameUnit, GameLogEntry } from "@/lib/game-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CombatEffect {
  id: string;
  type: "damage" | "destroy" | "heal";
  lat: number;
  lng: number;
  amount: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Log parsing helpers
// ---------------------------------------------------------------------------

/** Extract damage from a combat log line like "AAAがBBBに 12 ダメージ（残HP 88）" */
function parseDamageLog(
  content: string,
): { targetName: string; amount: number } | null {
  // Pattern: Xが Y に Z ダメージ
  const m = content.match(/が\s*(.+?)\s*に\s*(\d+)\s*ダメージ/);
  if (m) return { targetName: m[1], amount: parseInt(m[2], 10) };
  return null;
}

/** Check if a log line signals destruction */
function parseDestroyLog(content: string): { targetName: string } | null {
  // ">>> XXX 撃破！" or ">>> XXX が破壊された！"
  const m1 = content.match(/>>>\s*(.+?)\s*撃破/);
  if (m1) return { targetName: m1[1] };
  const m2 = content.match(/>>>\s*(.+?)\s*が破壊された/);
  if (m2) return { targetName: m2[1] };
  return null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Watches the game log for combat entries and produces visual effect events
 * positioned at the relevant unit locations on the map.
 *
 * Active effects are pruned after 2 seconds.
 */
export function useCombatEffects(
  log: GameLogEntry[],
  turn: number,
  playerUnits: GameUnit[],
  enemyUnits: GameUnit[],
): CombatEffect[] {
  const [effects, setEffects] = useState<CombatEffect[]>([]);
  const prevLogLength = useRef(log.length);
  const prevTurn = useRef(turn);

  // Build a lookup table: unit name -> position
  const unitLookup = useCallback(
    (name: string): { lat: number; lng: number } | null => {
      const all = [...playerUnits, ...enemyUnits];
      const unit = all.find((u) => u.name === name);
      if (unit) return { lat: unit.lat, lng: unit.lng };
      return null;
    },
    [playerUnits, enemyUnits],
  );

  // When log grows, parse new entries for combat effects
  useEffect(() => {
    if (log.length <= prevLogLength.current && turn === prevTurn.current) {
      prevLogLength.current = log.length;
      prevTurn.current = turn;
      return;
    }

    const newEntries = log.slice(prevLogLength.current);
    prevLogLength.current = log.length;
    prevTurn.current = turn;

    const newEffects: CombatEffect[] = [];
    const now = Date.now();

    for (const entry of newEntries) {
      if (entry.role !== "combat") continue;

      // Check for destroy first (more specific)
      const destroy = parseDestroyLog(entry.content);
      if (destroy) {
        const pos = unitLookup(destroy.targetName);
        if (pos) {
          newEffects.push({
            id: `fx-${entry.id}-destroy`,
            type: "destroy",
            lat: pos.lat,
            lng: pos.lng,
            amount: 0,
            timestamp: now,
          });
        }
        continue;
      }

      // Check for damage
      const dmg = parseDamageLog(entry.content);
      if (dmg) {
        const pos = unitLookup(dmg.targetName);
        if (pos) {
          newEffects.push({
            id: `fx-${entry.id}-dmg`,
            type: "damage",
            lat: pos.lat,
            lng: pos.lng,
            amount: dmg.amount,
            timestamp: now,
          });
        }
      }
    }

    if (newEffects.length > 0) {
      setEffects((prev) => [...prev, ...newEffects]);
    }
  }, [log, turn, unitLookup]);

  // Prune expired effects (older than 2 seconds)
  useEffect(() => {
    if (effects.length === 0) return;

    const timer = setInterval(() => {
      const cutoff = Date.now() - 2000;
      setEffects((prev) => {
        const filtered = prev.filter((e) => e.timestamp > cutoff);
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 300);

    return () => clearInterval(timer);
  }, [effects.length]);

  return effects;
}
