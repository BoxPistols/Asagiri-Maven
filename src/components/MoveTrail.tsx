"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { GameUnit } from "@/lib/game-types";

const Polyline = dynamic(() => import("react-leaflet").then(m => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then(m => m.CircleMarker), { ssr: false });

interface MoveEvent {
  id: string;
  from: [number, number];
  to: [number, number];
  faction: "player" | "enemy";
  timestamp: number;
}

interface MoveTrailProps {
  units: GameUnit[];
}

/** Tracks unit positions between renders and draws fade-out trails */
export default function MoveTrail({ units }: MoveTrailProps) {
  const [trails, setTrails] = useState<MoveEvent[]>([]);
  const [prevPositions] = useState(() => new Map<string, [number, number]>());

  useEffect(() => {
    const newTrails: MoveEvent[] = [];
    for (const unit of units) {
      if (unit.status === "destroyed") {
        prevPositions.delete(unit.id);
        continue;
      }
      const curr: [number, number] = [unit.lat, unit.lng];
      const prev = prevPositions.get(unit.id);
      if (prev && (prev[0] !== curr[0] || prev[1] !== curr[1])) {
        newTrails.push({
          id: `${unit.id}-${Date.now()}`,
          from: prev,
          to: curr,
          faction: unit.faction,
          timestamp: Date.now(),
        });
      }
      prevPositions.set(unit.id, curr);
    }
    if (newTrails.length > 0) {
      setTrails(prev => [...prev, ...newTrails]);
    }
  }, [units, prevPositions]);

  // Auto-cleanup trails older than 2 seconds
  useEffect(() => {
    if (trails.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setTrails(prev => prev.filter(t => now - t.timestamp < 2000));
    }, 500);
    return () => clearInterval(interval);
  }, [trails.length]);

  return (
    <>
      {trails.map(trail => {
        const age = Date.now() - trail.timestamp;
        const opacity = Math.max(0, 1 - age / 2000);
        const color = trail.faction === "player" ? "#3b82f6" : "#ef4444";
        return (
          <g key={trail.id}>
            <Polyline
              positions={[trail.from, trail.to]}
              pathOptions={{
                color,
                weight: 3,
                opacity: opacity * 0.7,
                dashArray: "6 4",
              }}
            />
            <CircleMarker
              center={trail.from}
              radius={4}
              pathOptions={{
                color,
                weight: 0,
                fillColor: color,
                fillOpacity: opacity * 0.5,
              }}
            />
          </g>
        );
      })}
    </>
  );
}
