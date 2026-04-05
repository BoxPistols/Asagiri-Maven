"use client";

import { useEffect, useRef, useState } from "react";
import type { GameUnit } from "@/lib/game-types";

/** Triggers screen shake when a base HP decreases */
export function useScreenShake(playerUnits: GameUnit[]): boolean {
  const prevHpRef = useRef<Map<string, number>>(new Map());
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    let baseHit = false;
    for (const unit of playerUnits) {
      if (!unit.id.startsWith("base-")) continue;
      const prev = prevHpRef.current.get(unit.id);
      if (prev !== undefined && unit.hp < prev) {
        baseHit = true;
      }
      prevHpRef.current.set(unit.id, unit.hp);
    }

    if (baseHit) {
      setShaking(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => setShaking(false), 500);
    }
  }, [playerUnits]);

  return shaking;
}
