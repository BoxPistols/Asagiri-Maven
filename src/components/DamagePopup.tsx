"use client";

import { useEffect, useState } from "react";
import type { CombatEffect } from "@/hooks/useCombatEffects";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DamageEvent {
  id: string;
  lat: number;
  lng: number;
  amount: number;
  type: "damage" | "heal" | "destroy";
  timestamp: number;
}

interface DamagePopupProps {
  damages: DamageEvent[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders floating damage numbers as a fixed overlay anchored to the
 * bottom-left area of the map panel. Each item floats upward and fades out
 * over 1.5s via CSS animation, then auto-removes itself.
 *
 * Rendered as a sibling overlay so TacticalMap.tsx is NOT modified.
 * Uses z-index between map (base) and game-controls (z-1000).
 */
export default function DamagePopup({ damages }: DamagePopupProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || damages.length === 0) return null;

  return (
    <div
      className="damage-popup-container"
      style={{
        position: "absolute",
        bottom: 56,
        left: 16,
        zIndex: 900,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column-reverse",
        gap: 4,
        maxHeight: 200,
        overflow: "hidden",
      }}
    >
      {damages.map((d) => (
        <DamageItem key={d.id} damage={d} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single damage item
// ---------------------------------------------------------------------------

function DamageItem({ damage }: { damage: DamageEvent }) {
  if (damage.type === "destroy") {
    return (
      <div
        className="animate-damage-float damage-popup-text"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          fontFamily: "var(--font-mono)",
          fontSize: 15,
          fontWeight: 900,
          color: "#f87171",
          textShadow:
            "0 0 8px rgba(248,113,113,0.7), 0 2px 4px rgba(0,0,0,0.5)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span
          className="animate-explosion"
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(248,113,113,0.6), rgba(248,113,113,0) 70%)",
          }}
        />
        撃破
      </div>
    );
  }

  if (damage.type === "heal") {
    return (
      <div
        className="animate-damage-float damage-popup-text"
        style={{
          pointerEvents: "none",
          whiteSpace: "nowrap",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          fontWeight: 700,
          color: "#34d399",
          textShadow:
            "0 0 6px rgba(52,211,153,0.5), 0 2px 4px rgba(0,0,0,0.4)",
        }}
      >
        +{damage.amount}
      </div>
    );
  }

  // damage
  return (
    <div
      className="animate-damage-float damage-popup-text"
      style={{
        pointerEvents: "none",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        fontWeight: 700,
        color: "#f87171",
        textShadow:
          "0 0 6px rgba(248,113,113,0.5), 0 2px 4px rgba(0,0,0,0.4)",
      }}
    >
      -{damage.amount}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Adapter: CombatEffect[] -> DamageEvent[]
// ---------------------------------------------------------------------------

export function combatEffectsToDamageEvents(
  effects: CombatEffect[],
): DamageEvent[] {
  return effects.map((e) => ({
    id: e.id,
    lat: e.lat,
    lng: e.lng,
    amount: e.amount,
    type:
      e.type === "destroy" ? "destroy" : e.type === "heal" ? "heal" : "damage",
    timestamp: e.timestamp,
  }));
}
