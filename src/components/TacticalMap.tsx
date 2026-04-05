"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MAP_MARKERS, VEHICLE_ROUTES, type MapMarker, type SeverityLevel } from "@/lib/mock-data";
import { Layers, Crosshair, Clock, Warehouse, Truck, AlertTriangle, User, Navigation, Swords } from "lucide-react";
import type { GameUnit, TurnPhase, GameLogEntry } from "@/lib/game-types";
import { getAttackRange } from "@/lib/combat-rules";
import { getUnitIconSvg } from "@/lib/unit-icons";
import { useTheme } from "@/hooks/useTheme";
import dynamic from "next/dynamic";

// Lazy load map to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then(m => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then(m => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then(m => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then(m => m.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then(m => m.Polyline),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then(m => m.CircleMarker),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then(m => m.Circle),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(s: SeverityLevel): string {
  switch (s) {
    case "critical": return "#f87171";
    case "warning": return "#fbbf24";
    case "info": return "#22d3ee";
    default: return "#34d399";
  }
}

/** Convert "map degrees" to approximate meters for Leaflet Circle radius.
 *  At ~36N latitude, 1 degree lat ~ 111km, 1 degree lng ~ 90km.
 *  We use the average (~100km) for a rough circle. */
function degreesToMeters(degrees: number): number {
  return degrees * 100_000;
}

/** Flat-Earth distance in degrees (same as combat-rules) */
function distanceDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dlat = a.lat - b.lat;
  const dlng = (a.lng - b.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

function hpColor(ratio: number): string {
  if (ratio > 0.6) return "#34d399";
  if (ratio > 0.3) return "#fbbf24";
  return "#f87171";
}

// Layer toggle types
type LayerType = "facility" | "vehicle" | "alert" | "personnel" | "drone";
const LAYER_CONFIG: { key: LayerType; label: string; icon: typeof Warehouse }[] = [
  { key: "facility", label: "施設", icon: Warehouse },
  { key: "vehicle", label: "車両", icon: Truck },
  { key: "drone", label: "ドローン", icon: Navigation },
  { key: "alert", label: "検知", icon: AlertTriangle },
  { key: "personnel", label: "人員", icon: User },
];

const TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

// ---------------------------------------------------------------------------
// Map event handler component (listens for click/mousemove on map)
// ---------------------------------------------------------------------------

function MapEventHandler({ onMapClick, onMouseMove }: {
  onMapClick?: (lat: number, lng: number) => void;
  onMouseMove?: (lat: number, lng: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // We use useMapEvents from react-leaflet inside a dynamic component
    // This is handled by the parent MapContainer click events instead
  }, [loaded]);

  return null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Attack animation types
// ---------------------------------------------------------------------------

interface AttackLine {
  id: string;
  from: [number, number];
  to: [number, number];
  timestamp: number;
}

interface TacticalMapProps {
  onSelectMarker?: (id: string | null) => void;
  onMarkerClick?: (id: string) => void;
  markers?: MapMarker[];
  enemyUnits?: GameUnit[];
  playerUnits?: GameUnit[];
  selectedUnitId?: string | null;
  targetingMode?: boolean;
  turnPhase?: TurnPhase;
  onMapClick?: (lat: number, lng: number) => void;
  actedUnitIds?: string[];
  combatLog?: GameLogEntry[];
  currentTurn?: number;
  focusTarget?: { lat: number; lng: number; key: string } | null;
  tooltipAutoCloseMs?: number; // 0 = manual mode
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TacticalMap({
  onSelectMarker,
  onMarkerClick,
  markers,
  enemyUnits,
  playerUnits,
  selectedUnitId,
  targetingMode,
  turnPhase,
  onMapClick,
  actedUnitIds = [],
  combatLog,
  currentTurn,
  focusTarget,
  tooltipAutoCloseMs = 2500,
  children,
}: TacticalMapProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const mapInstanceRef = useRef<{ flyTo?: (latlng: [number, number], zoom?: number, options?: { duration?: number }) => void; getZoom?: () => number } | null>(null);
  const [timeValue, setTimeValue] = useState(100);
  const [layers, setLayers] = useState<Record<LayerType, boolean>>({
    facility: true, vehicle: true, drone: true, alert: true, personnel: true,
  });
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [mousePos, setMousePos] = useState<{ lat: number; lng: number } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ lat: number; lng: number } | null>(null);
  const moveTargetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track previous unit positions for smooth movement animation
  const prevPositionsRef = useRef<Map<string, [number, number]>>(new Map());
  const markerRefsMap = useRef<Map<string, unknown>>(new Map());

  // Attack animation state
  const [attackLines, setAttackLines] = useState<AttackLine[]>([]);
  const processedLogRef = useRef<Set<string>>(new Set());

  useEffect(() => { setMounted(true); }, []);

  // Fly to focus target with animation when it changes
  const lastFlyKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusTarget || !mapInstanceRef.current) return;
    // Don't re-fly if the key hasn't actually changed (guard against React StrictMode double-invoke)
    if (lastFlyKeyRef.current === focusTarget.key) return;
    lastFlyKeyRef.current = focusTarget.key;

    const map = mapInstanceRef.current;
    if (typeof map.flyTo === "function") {
      const currentZoom = typeof map.getZoom === "function" ? map.getZoom() ?? 8 : 8;
      const targetZoom = Math.max(currentZoom, 7);
      map.flyTo([focusTarget.lat, focusTarget.lng], targetZoom, { duration: 0.8 });
    }
  }, [focusTarget]);

  // Clear move target after 1.5s
  useEffect(() => {
    if (moveTarget) {
      if (moveTargetTimerRef.current) clearTimeout(moveTargetTimerRef.current);
      moveTargetTimerRef.current = setTimeout(() => setMoveTarget(null), 1500);
    }
    return () => {
      if (moveTargetTimerRef.current) clearTimeout(moveTargetTimerRef.current);
    };
  }, [moveTarget]);

  // ---------------------------------------------------------------------------
  // Smooth movement: detect position changes and animate markers via Leaflet
  // ---------------------------------------------------------------------------
  const allGameUnits = useMemo(() => {
    const units: GameUnit[] = [];
    if (playerUnits) units.push(...playerUnits);
    if (enemyUnits) units.push(...enemyUnits);
    return units;
  }, [playerUnits, enemyUnits]);

  useEffect(() => {
    for (const unit of allGameUnits) {
      if (unit.status === "destroyed") continue;
      const prev = prevPositionsRef.current.get(unit.id);
      const curr: [number, number] = [unit.lat, unit.lng];

      if (prev && (prev[0] !== curr[0] || prev[1] !== curr[1])) {
        // Position changed — animate the marker if we have a ref
        const markerRef = markerRefsMap.current.get(unit.id) as
          | { setLatLng?: (latlng: [number, number]) => void; slideTo?: (latlng: [number, number], opts: { duration: number }) => void }
          | undefined;
        if (markerRef) {
          // leaflet-drift-marker's slideTo if available, otherwise CSS transition handles it
          if (typeof markerRef.slideTo === "function") {
            markerRef.slideTo(curr, { duration: 600 });
          } else if (typeof markerRef.setLatLng === "function") {
            // CSS transition on . class handles the smooth move
            markerRef.setLatLng(curr);
          }
        }
      }
      prevPositionsRef.current.set(unit.id, curr);
    }
  }, [allGameUnits]);

  // ---------------------------------------------------------------------------
  // Attack animation: detect new combat log entries and show attack lines
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!combatLog || !playerUnits || !enemyUnits) return;

    const allUnits = [...playerUnits, ...enemyUnits];
    const newLines: AttackLine[] = [];

    for (const entry of combatLog) {
      if (entry.role !== "combat") continue;
      if (currentTurn !== undefined && entry.turn !== currentTurn) continue;
      if (processedLogRef.current.has(entry.id)) continue;

      processedLogRef.current.add(entry.id);

      // Try to find attacker and defender from log content
      // Combat log format typically: "UnitName attacks TargetName..."
      // We match any two units mentioned in the content
      const mentionedUnits = allUnits.filter(
        u => u.status !== "destroyed" && entry.content.includes(u.name)
      );

      if (mentionedUnits.length >= 2) {
        const attacker = mentionedUnits[0];
        const defender = mentionedUnits[1];
        newLines.push({
          id: entry.id,
          from: [attacker.lat, attacker.lng],
          to: [defender.lat, defender.lng],
          timestamp: Date.now(),
        });
      }
    }

    if (newLines.length > 0) {
      setAttackLines(prev => [...prev, ...newLines]);
    }
  }, [combatLog, currentTurn, playerUnits, enemyUnits]);

  // Auto-remove attack lines after 1 second
  useEffect(() => {
    if (attackLines.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setAttackLines(prev => prev.filter(l => now - l.timestamp < 1000));
    }, 1000);
    return () => clearTimeout(timer);
  }, [attackLines]);

  const baseMarkers = markers ?? MAP_MARKERS;

  const filteredMarkers = useMemo(
    () => baseMarkers.filter(m => layers[m.type]),
    [baseMarkers, layers]
  );

  // Find the currently selected player unit
  const selectedPlayerUnit = useMemo(() => {
    if (!selectedUnitId || !playerUnits) return null;
    return playerUnits.find(u => u.id === selectedUnitId && u.faction === "player") ?? null;
  }, [selectedUnitId, playerUnits]);

  const actedSet = useMemo(() => new Set(actedUnitIds), [actedUnitIds]);

  // Build engagement lines: player unit engaging enemy unit
  const engagementLines = useMemo(() => {
    if (!playerUnits || !enemyUnits) return [];
    const lines: { from: [number, number]; to: [number, number]; id: string }[] = [];
    for (const pu of playerUnits) {
      if (pu.status === "engaging" && pu.targetId) {
        const target = enemyUnits.find(e => e.id === pu.targetId);
        if (target) {
          lines.push({
            id: `engage-${pu.id}-${target.id}`,
            from: [pu.lat, pu.lng],
            to: [target.lat, target.lng],
          });
        }
      }
    }
    return lines;
  }, [playerUnits, enemyUnits]);

  // Range visualisation data (WC4-style: movePoints × stepDistance)
  const rangeData = useMemo(() => {
    if (!selectedPlayerUnit) return null;
    if (selectedPlayerUnit.status === "destroyed") return null;
    if (actedSet.has(selectedPlayerUnit.id)) return null;
    if (turnPhase !== "player") return null;

    // Use movePoints × stepDistance if available, fallback to speed
    const movePoints = selectedPlayerUnit.movePoints;
    const stepDistance = selectedPlayerUnit.stepDistance;
    const hasSteps = movePoints !== undefined && stepDistance !== undefined && movePoints > 0;
    const moveRange = hasSteps
      ? movePoints * stepDistance
      : selectedPlayerUnit.speed;
    const attackRange = getAttackRange(selectedPlayerUnit.type);

    // Build step markers: one circle per step-count
    const stepCircles: { radiusM: number; step: number }[] = [];
    if (hasSteps) {
      for (let i = 1; i <= movePoints; i++) {
        stepCircles.push({
          radiusM: degreesToMeters(i * stepDistance),
          step: i,
        });
      }
    }

    return {
      center: [selectedPlayerUnit.lat, selectedPlayerUnit.lng] as [number, number],
      moveRadiusM: degreesToMeters(moveRange),
      attackRadiusM: degreesToMeters(attackRange),
      moveRangeDeg: moveRange,
      stepCircles,
      stepCount: hasSteps ? movePoints : 0,
    };
  }, [selectedPlayerUnit, actedSet, turnPhase]);

  // Enemy danger zones: move + attack range combined
  const dangerZones = useMemo(() => {
    if (!enemyUnits) return [];
    return enemyUnits
      .filter((u) => u.status !== "destroyed")
      .map((enemy) => {
        const attackRange = enemy.range ?? getAttackRange(enemy.type);
        const hasSteps = enemy.movePoints !== undefined && enemy.stepDistance !== undefined;
        const moveRange = hasSteps
          ? (enemy.movePoints ?? 0) * (enemy.stepDistance ?? 0)
          : enemy.speed;
        const totalRange = moveRange + attackRange;
        return {
          id: enemy.id,
          center: [enemy.lat, enemy.lng] as [number, number],
          radiusM: degreesToMeters(totalRange),
        };
      });
  }, [enemyUnits]);

  // Repair zones: 0.5 degree radius around each living base (where units can repair)
  const repairZones = useMemo(() => {
    if (!playerUnits) return [];
    return playerUnits
      .filter(u => u.id.startsWith("base-") && u.status !== "destroyed")
      .map(b => ({
        id: `repair-${b.id}`,
        center: [b.lat, b.lng] as [number, number],
        radiusM: degreesToMeters(0.5),
      }));
  }, [playerUnits]);

  // Supply lines between bases (within ~6 degrees)
  const supplyLines = useMemo(() => {
    if (!playerUnits) return [];
    const bases = playerUnits.filter(
      (u) => u.id.startsWith("base-") && u.status !== "destroyed",
    );
    const lines: { id: string; from: [number, number]; to: [number, number] }[] = [];
    for (let i = 0; i < bases.length; i++) {
      for (let j = i + 1; j < bases.length; j++) {
        const a = bases[i];
        const b = bases[j];
        const d = distanceDeg(a, b);
        if (d <= 6) {
          lines.push({
            id: `supply-${a.id}-${b.id}`,
            from: [a.lat, a.lng],
            to: [b.lat, b.lng],
          });
        }
      }
    }
    return lines;
  }, [playerUnits]);

  // Movement path preview data
  const pathPreview = useMemo(() => {
    if (!rangeData || !mousePos || !selectedPlayerUnit) return null;
    const dist = distanceDeg(selectedPlayerUnit, mousePos);
    const inRange = dist <= rangeData.moveRangeDeg;
    return {
      from: rangeData.center,
      to: [mousePos.lat, mousePos.lng] as [number, number],
      color: inRange ? "#34d399" : "#f87171",
    };
  }, [rangeData, mousePos, selectedPlayerUnit]);

  // Create divIcon for player unit markers with SVG icons
  // Bases render larger with a distinctive ring to stand out from mobile units
  const createPlayerIcon = useCallback((unit: GameUnit) => {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    const isSelected = unit.id === selectedUnitId;
    const acted = actedSet.has(unit.id);
    const hpRatio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
    const hpPercent = Math.max(0, Math.round(hpRatio * 100));
    const isBase = unit.id.startsWith("base-");

    if (isBase) {
      // Supply income per base
      const SUPPLY: Record<string, number> = {
        "base-tokyo": 15, "base-osaka": 10, "base-nagoya": 10,
        "base-fukuoka": 7, "base-sapporo": 7,
      };
      const supplyIn = SUPPLY[unit.id] ?? 5;
      const damaged = hpRatio < 0.5;
      const effective = damaged ? Math.floor(supplyIn / 2) : supplyIn;
      const coreColor = hpPercent > 60 ? "#22d3ee" : hpPercent > 30 ? "#fbbf24" : "#f87171";
      const selectedGlow = isSelected
        ? `box-shadow: 0 0 0 3px rgba(34,211,238,0.7), 0 0 22px rgba(34,211,238,0.45);`
        : `box-shadow: 0 0 0 2px rgba(34,211,238,0.35), 0 0 12px rgba(34,211,238,0.25);`;
      const html = `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:56px;height:56px;">
          <div style="position:absolute;width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border:2px solid ${coreColor};${selectedGlow};display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <span style="font-family:var(--font-mono);font-size:18px;font-weight:900;color:${coreColor};text-shadow:0 0 4px rgba(0,0,0,0.8);line-height:1;">★</span>
            <span style="font-family:var(--font-mono);font-size:9px;font-weight:700;color:${coreColor};margin-top:1px;">+${effective}/T</span>
          </div>
          <div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:${coreColor};color:#0f172a;font-family:var(--font-mono);font-size:9px;font-weight:bold;padding:1px 4px;border-radius:2px;letter-spacing:0.3px;white-space:nowrap;">HQ ${hpPercent}%</div>
        </div>
      `;
      return L.divIcon({
        className: `custom-marker unit-marker unit-marker-base`,
        html,
        iconSize: [56, 64],
        iconAnchor: [28, 28],
        popupAnchor: [0, -30],
      });
    }

    const svg = getUnitIconSvg(unit.type, "player", hpPercent, acted, isSelected);
    const actedClass = acted ? " unit-marker-acted" : "";

    return L.divIcon({
      className: `custom-marker unit-marker unit-marker-player ${actedClass}`,
      html: svg,
      iconSize: [40, 44],
      iconAnchor: [20, 22],
      popupAnchor: [0, -24],
    });
  }, [selectedUnitId, actedSet]);

  // Create divIcon for enemy units with SVG icons
  const createEnemyIcon = useCallback((unit: GameUnit) => {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    const hpRatio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
    const hpPercent = Math.max(0, Math.round(hpRatio * 100));

    const svg = getUnitIconSvg(unit.type, "enemy", hpPercent, false, false);
    const targetCursorClass = targetingMode ? " cursor-crosshair" : "";

    return L.divIcon({
      className: `custom-marker unit-marker unit-marker-enemy ${targetCursorClass}`,
      html: svg,
      iconSize: [40, 44],
      iconAnchor: [20, 22],
      popupAnchor: [0, -24],
    });
  }, [targetingMode]);

  // Create custom divIcon for facility/map markers
  const createIcon = useCallback((marker: MapMarker) => {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    const color = statusColor(marker.status);
    const isAlert = marker.status === "critical" || marker.status === "warning";
    const isSelected = marker.id === selectedUnitId;
    const typeChar = marker.type === "facility" ? "F" : marker.type === "vehicle" ? "V" : marker.type === "drone" ? "D" : marker.type === "alert" ? "!" : "P";
    const selectedRing = isSelected
      ? `<span style="position:absolute;width:38px;height:38px;border-radius:50%;border:2px solid var(--accent-cyan);opacity:0.9;animation:glow-pulse 2s ease-in-out infinite;"></span>`
      : "";

    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          ${selectedRing}
          ${isAlert ? `<span style="position:absolute;width:32px;height:32px;border-radius:50%;background:${color};opacity:0.2;animation:pulse-ring 2s ease-out infinite;"></span>` : ""}
          <span style="position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${color}20;border:2px solid ${color};font-family:var(--font-mono);font-size:12px;font-weight:bold;color:${color};">
            ${typeChar}
          </span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -19],
    });
  }, [selectedUnitId]);

  // Move target icon
  const createMoveTargetIcon = useCallback(() => {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <span style="position:absolute;width:20px;height:20px;border-radius:50%;border:2px dashed #34d399;opacity:0.8;animation:pulse-ring 1s ease-out infinite;"></span>
          <span style="width:6px;height:6px;border-radius:50%;background:#34d399;"></span>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }, []);

  const toggleLayer = useCallback((key: LayerType) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Handle map click (for movement) - uses WC4 movePoints × stepDistance
  const handleMapContainerClick = useCallback((e: unknown) => {
    // e is a Leaflet MouseEvent with latlng
    const le = e as { latlng?: { lat: number; lng: number } };
    if (!le.latlng) return;
    const { lat, lng } = le.latlng;

    if (selectedPlayerUnit && !actedSet.has(selectedPlayerUnit.id) && turnPhase === "player") {
      const movePoints = selectedPlayerUnit.movePoints;
      const stepDistance = selectedPlayerUnit.stepDistance;
      const maxRange = (movePoints !== undefined && stepDistance !== undefined && movePoints > 0)
        ? movePoints * stepDistance
        : selectedPlayerUnit.speed;
      if (maxRange <= 0) return;
      const dist = distanceDeg(selectedPlayerUnit, { lat, lng });
      if (dist <= maxRange) {
        setMoveTarget({ lat, lng });
        onMapClick?.(lat, lng);
      } else {
        // Out of range — dispatch with a flag so page can show toast
        onMapClick?.(lat, lng);
      }
    }
  }, [selectedPlayerUnit, actedSet, turnPhase, onMapClick]);

  // Handle map mouse move (for path preview)
  const handleMapMouseMove = useCallback((e: unknown) => {
    const le = e as { latlng?: { lat: number; lng: number } };
    if (!le.latlng) return;
    setMousePos({ lat: le.latlng.lat, lng: le.latlng.lng });
  }, []);

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        共通状況図 (COP)
        <span className="ml-auto flex items-center gap-3">
          <span className="readout text-xs text-text-dim">
            {filteredMarkers.length} マーカー
          </span>
          <span className="flex items-center gap-1 text-alert-success text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-alert-success animate-pulse-dot" />
            LIVE
          </span>
        </span>
      </div>

      {/* Map */}
      <div className={`flex-1 relative overflow-hidden${targetingMode ? " cursor-crosshair" : ""}`}>
        {mounted && (
          <>
            <link
              rel="stylesheet"
              href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            />
            <style>{`
              .leaflet-container { background: var(--bg-deep); height: 100%; width: 100%; }
              .leaflet-popup-content-wrapper { background: var(--bg-surface); border: 1px solid var(--border-active); border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
              .leaflet-popup-tip { background: var(--bg-surface); border-right: 1px solid var(--border-active); border-bottom: 1px solid var(--border-active); }
              .leaflet-popup-content { margin: 10px 12px; }
              .leaflet-popup-close-button { color: var(--text-dim) !important; font-size: 18px !important; }
              .leaflet-popup-close-button:hover { color: var(--accent-cyan) !important; }
              .leaflet-control-zoom { border: 1px solid var(--border-subtle) !important; border-radius: 6px !important; overflow: hidden; }
              .leaflet-control-zoom a { background: var(--bg-surface) !important; color: var(--accent-cyan) !important; border-bottom: 1px solid var(--border-subtle) !important; }
              .leaflet-control-zoom a:hover { background: var(--bg-elevated) !important; }
              .leaflet-control-attribution { background: var(--bg-primary) !important; color: var(--text-dim) !important; font-size: 12px !important; opacity: 0.8; }
              .leaflet-control-attribution a { color: var(--text-dim) !important; }
              .custom-marker { background: transparent !important; border: none !important; }
              @keyframes targeting-enemy-glow {
                0%, 100% { box-shadow: 0 0 8px rgba(248,113,113,0.3); }
                50% { box-shadow: 0 0 20px rgba(248,113,113,0.6), 0 0 40px rgba(248,113,113,0.2); }
              }
            `}</style>
            <MapContainer
              center={[36.5, 137.5] as [number, number]}
              zoom={6}
              zoomControl={true}
              attributionControl={true}
              style={{ height: "100%", width: "100%" }}
              // @ts-expect-error Leaflet event handlers
              whenReady={(mapInstance: unknown) => {
                const mi = mapInstance as { target?: { on?: (event: string, handler: (e: unknown) => void) => void; flyTo?: (latlng: [number, number], zoom?: number, options?: { duration?: number }) => void; getZoom?: () => number } };
                if (mi.target?.on) {
                  mi.target.on("click", handleMapContainerClick);
                  // Auto-close popups after tooltipAutoCloseMs (0 = manual mode)
                  mi.target.on("popupopen", (e: unknown) => {
                    if (tooltipAutoCloseMs <= 0) return;
                    const evt = e as { popup?: { close?: () => void; _closed?: boolean } };
                    const popup = evt.popup;
                    if (!popup) return;
                    setTimeout(() => {
                      if (!popup._closed && typeof popup.close === "function") {
                        popup.close();
                      }
                    }, tooltipAutoCloseMs);
                  });
                }
                if (mi.target) {
                  mapInstanceRef.current = mi.target;
                }
              }}
            >
              <TileLayer
                key={theme}
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url={theme === "light" ? TILE_LIGHT : TILE_DARK}
              />

              {/* Vehicle routes */}
              {VEHICLE_ROUTES.filter(r => layers.vehicle).map(route => (
                <Polyline
                  key={route.vehicleId}
                  positions={route.points as [number, number][]}
                  pathOptions={{
                    color: statusColor(route.status),
                    weight: 2,
                    opacity: 0.5,
                    dashArray: route.status === "normal" ? undefined : "8 6",
                  }}
                />
              ))}

              {/* === Danger zones: enemy attack+move reach (red tint) === */}
              {dangerZones.map(zone => (
                <Circle
                  key={`danger-${zone.id}`}
                  center={zone.center}
                  radius={zone.radiusM}
                  pathOptions={{
                    color: "#ef4444",
                    weight: 0.8,
                    opacity: 0.15,
                    fillColor: "#ef4444",
                    fillOpacity: 0.035,
                    dashArray: "2 6",
                  }}
                />
              ))}

              {/* === Supply lines between friendly bases (thin cyan) === */}
              {supplyLines.map(line => (
                <Polyline
                  key={line.id}
                  positions={[line.from, line.to]}
                  pathOptions={{
                    color: "#22d3ee",
                    weight: 1,
                    opacity: 0.22,
                    dashArray: "3 8",
                  }}
                />
              ))}

              {/* === Repair zones around bases === */}
              {repairZones.map(zone => (
                <Circle
                  key={zone.id}
                  center={zone.center}
                  radius={zone.radiusM}
                  pathOptions={{
                    color: "#34d399",
                    weight: 1,
                    opacity: 0.25,
                    fillColor: "#34d399",
                    fillOpacity: 0.04,
                    dashArray: "4 6",
                  }}
                />
              ))}

              {/* === Range circles (when player unit selected, hasn't acted, player phase) === */}
              {rangeData && (
                <>
                  {/* Step markers: one circle per movePoint */}
                  {rangeData.stepCircles.map(s => (
                    <Circle
                      key={`step-${s.step}`}
                      center={rangeData.center}
                      radius={s.radiusM}
                      pathOptions={{
                        color: s.step === rangeData.stepCount ? "#22d3ee" : "#22d3ee",
                        weight: s.step === rangeData.stepCount ? 1.8 : 0.8,
                        opacity: s.step === rangeData.stepCount ? 0.6 : 0.3,
                        fillColor: "#22d3ee",
                        fillOpacity: s.step === rangeData.stepCount ? 0.06 : 0,
                        dashArray: s.step === rangeData.stepCount ? "8 6" : "2 6",
                      }}
                    />
                  ))}
                  {/* Fallback: plain move range when no step data (legacy units) */}
                  {rangeData.stepCircles.length === 0 && (
                    <Circle
                      center={rangeData.center}
                      radius={rangeData.moveRadiusM}
                      pathOptions={{
                        color: "#22d3ee",
                        weight: 1.5,
                        opacity: 0.5,
                        fillColor: "#22d3ee",
                        fillOpacity: 0.06,
                        dashArray: "8 6",
                      }}
                    />
                  )}
                  {/* Attack range: dotted red */}
                  <Circle
                    center={rangeData.center}
                    radius={rangeData.attackRadiusM}
                    pathOptions={{
                      color: "#f87171",
                      weight: 1.5,
                      opacity: 0.4,
                      fillColor: "#f87171",
                      fillOpacity: 0.04,
                      dashArray: "4 4",
                    }}
                  />
                </>
              )}

              {/* === Move target marker === */}
              {moveTarget && (
                <Marker
                  position={[moveTarget.lat, moveTarget.lng] as [number, number]}
                  icon={createMoveTargetIcon()}
                />
              )}

              {/* Facility/map markers */}
              {filteredMarkers.map(m => (
                <Marker
                  key={m.id}
                  position={[m.lat, m.lng] as [number, number]}
                  icon={createIcon(m)}
                  eventHandlers={{
                    click: (e: unknown) => {
                      // Stop propagation so map click handler doesn't fire
                      const le = e as { originalEvent?: Event };
                      le.originalEvent?.stopPropagation?.();
                      onMarkerClick?.(m.id);
                      onSelectMarker?.(m.id);
                    },
                  }}
                >
                  <Popup autoClose={true} closeOnClick={true} closeButton={true}>
                    <div className="min-w-[200px] p-0 text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="readout text-xs uppercase px-1.5 py-0.5 rounded font-bold"
                          style={{ color: statusColor(m.status), backgroundColor: `${statusColor(m.status)}15`, border: `1px solid ${statusColor(m.status)}40` }}
                        >
                          {m.type === "facility" ? "施設" : m.type === "vehicle" ? "車両" : m.type === "alert" ? "検知" : m.type === "drone" ? "ドローン" : "人員"}
                        </span>
                        <span
                          className="readout text-xs uppercase px-1.5 py-0.5 rounded"
                          style={{ color: statusColor(m.status), backgroundColor: `${statusColor(m.status)}10` }}
                        >
                          {m.status}
                        </span>
                      </div>
                      <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{m.label}</div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{m.detail}</div>
                      <div className="text-xs mt-1.5 pt-1.5 readout" style={{ color: "var(--text-dim)", borderTop: "1px solid var(--border-subtle)" }}>
                        {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Pulse circles for critical items */}
              {filteredMarkers
                .filter(m => m.status === "critical")
                .map(m => (
                  <CircleMarker
                    key={`ring-${m.id}`}
                    center={[m.lat, m.lng] as [number, number]}
                    radius={20}
                    pathOptions={{
                      color: statusColor(m.status),
                      weight: 1,
                      opacity: 0.15,
                      fillOpacity: 0.05,
                      fillColor: statusColor(m.status),
                    }}
                  />
                ))}

              {/* === Player unit markers with SVG icons === */}
              {playerUnits?.filter(u => {
                if (u.status === "destroyed") return false;
                // Map game unit types to layer types
                const isBase = u.id.startsWith("base-");
                if (isBase) return layers.facility;
                if (u.type === "drone") return layers.drone;
                if (u.type === "ship" || u.type === "vehicle") return layers.vehicle;
                if (u.type === "infantry" || u.type === "cyber") return layers.personnel;
                return true;
              }).map(unit => (
                <Marker
                  key={`player-${unit.id}`}
                  position={[unit.lat, unit.lng] as [number, number]}
                  icon={createPlayerIcon(unit)}
                  ref={(ref: unknown) => {
                    if (ref) {
                      markerRefsMap.current.set(unit.id, ref);
                    }
                  }}
                  eventHandlers={{
                    click: (e: unknown) => {
                      const le = e as { originalEvent?: Event };
                      le.originalEvent?.stopPropagation?.();
                      onMarkerClick?.(unit.id);
                      onSelectMarker?.(unit.id);
                    },
                  }}
                >
                  <Popup autoClose={true} closeOnClick={true} closeButton={true}>
                    <div className="min-w-[200px] p-0 text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="readout text-xs uppercase px-1.5 py-0.5 rounded font-bold"
                          style={{ color: "#22d3ee", backgroundColor: "rgba(34,211,238,0.15)", border: "1px solid rgba(34,211,238,0.4)" }}>
                          味方
                        </span>
                        <span className="readout text-xs uppercase px-1.5 py-0.5 rounded"
                          style={{ color: "#22d3ee", backgroundColor: "rgba(34,211,238,0.1)" }}>
                          {unit.status === "idle" ? "待機" : unit.status === "moving" ? "移動中" : unit.status === "engaging" ? "交戦中" : unit.status === "damaged" ? "損傷" : "壊滅"}
                        </span>
                        {actedSet.has(unit.id) && (
                          <span className="readout text-xs px-1.5 py-0.5 rounded" style={{ color: "#34d399", backgroundColor: "rgba(52,211,153,0.1)" }}>
                            行動済
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{unit.name}</div>
                      <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{unit.detail}</div>
                      <div className="flex items-center gap-3 text-xs readout" style={{ color: "var(--text-dim)" }}>
                        <span>HP {unit.hp}/{unit.maxHp}</span>
                        <span>ATK {unit.attack}</span>
                        <span>DEF {unit.defense}</span>
                      </div>
                      <div className="text-xs mt-1.5 pt-1.5 readout" style={{ color: "var(--text-dim)", borderTop: "1px solid var(--border-subtle)" }}>
                        {unit.lat.toFixed(4)}, {unit.lng.toFixed(4)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* === Enemy unit markers with SVG icons === */}
              {enemyUnits?.filter(u => {
                if (u.status === "destroyed") return false;
                if (!layers.alert) return false; // enemy = "alert" layer
                return true;
              }).map(unit => (
                <Marker
                  key={`enemy-${unit.id}`}
                  position={[unit.lat, unit.lng] as [number, number]}
                  icon={createEnemyIcon(unit)}
                  ref={(ref: unknown) => {
                    if (ref) {
                      markerRefsMap.current.set(unit.id, ref);
                    }
                  }}
                  eventHandlers={{
                    click: (e: unknown) => {
                      const le = e as { originalEvent?: Event };
                      le.originalEvent?.stopPropagation?.();
                      onMarkerClick?.(unit.id);
                      onSelectMarker?.(unit.id);
                    },
                  }}
                >
                  <Popup autoClose={true} closeOnClick={true} closeButton={true}>
                    <div className="min-w-[200px] p-0 text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="readout text-xs uppercase px-1.5 py-0.5 rounded font-bold"
                          style={{ color: "#f87171", backgroundColor: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.4)" }}>
                          敵
                        </span>
                        <span className="readout text-xs uppercase px-1.5 py-0.5 rounded"
                          style={{ color: "#f87171", backgroundColor: "rgba(248,113,113,0.1)" }}>
                          {unit.status}
                        </span>
                      </div>
                      <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{unit.name}</div>
                      <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{unit.detail}</div>
                      <div className="flex items-center gap-3 text-xs readout" style={{ color: "var(--text-dim)" }}>
                        <span>HP {unit.hp}/{unit.maxHp}</span>
                        <span>ATK {unit.attack}</span>
                        <span>DEF {unit.defense}</span>
                      </div>
                      <div className="text-xs mt-1.5 pt-1.5 readout" style={{ color: "var(--text-dim)", borderTop: "1px solid var(--border-subtle)" }}>
                        {unit.lat.toFixed(4)}, {unit.lng.toFixed(4)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Enemy pulse circles */}
              {enemyUnits?.filter(u => u.status !== "destroyed" && layers.alert).map(unit => (
                <CircleMarker
                  key={`ering-${unit.id}`}
                  center={[unit.lat, unit.lng] as [number, number]}
                  radius={22}
                  pathOptions={{
                    color: "#f87171",
                    weight: 1,
                    opacity: 0.12,
                    fillOpacity: 0.04,
                    fillColor: "#f87171",
                  }}
                />
              ))}

              {/* Engagement lines (player -> enemy) */}
              {engagementLines.map(line => (
                <Polyline
                  key={line.id}
                  positions={[line.from, line.to]}
                  pathOptions={{
                    color: "#f87171",
                    weight: 2,
                    opacity: 0.6,
                    dashArray: "6 4",
                  }}
                />
              ))}

              {/* === Attack trajectory (bright glowing line) === */}
              {attackLines.map(line => {
                const age = Date.now() - line.timestamp;
                const opacity = Math.max(0, 0.9 - (age / 1200) * 0.9);
                return (
                  <React.Fragment key={`atk-trail-${line.id}`}>
                    {/* Outer glow */}
                    <Polyline
                      positions={[line.from, line.to]}
                      pathOptions={{
                        color: "#fbbf24",
                        weight: 8,
                        opacity: opacity * 0.3,
                      }}
                    />
                    {/* Main beam */}
                    <Polyline
                      positions={[line.from, line.to]}
                      pathOptions={{
                        color: "#fef3c7",
                        weight: 2.5,
                        opacity,
                      }}
                    />
                  </React.Fragment>
                );
              })}

              {/* === Muzzle flash at attacker === */}
              {attackLines.map(line => {
                const age = Date.now() - line.timestamp;
                if (age > 300) return null;
                const pct = age / 300;
                return (
                  <CircleMarker
                    key={`muzzle-${line.id}`}
                    center={line.from}
                    radius={8 + pct * 6}
                    pathOptions={{
                      color: "#fbbf24",
                      weight: 2,
                      opacity: 1 - pct,
                      fillColor: "#fef3c7",
                      fillOpacity: (1 - pct) * 0.6,
                    }}
                  />
                );
              })}

              {/* === Triple impact rings at defender === */}
              {attackLines.map(line => {
                const age = Date.now() - line.timestamp;
                if (age > 1000) return null;
                const pct = age / 1000;
                return (
                  <React.Fragment key={`impact-${line.id}`}>
                    {/* Inner burst */}
                    <CircleMarker
                      center={line.to}
                      radius={4 + pct * 14}
                      pathOptions={{
                        color: "#ef4444",
                        weight: 0,
                        fillColor: "#fef3c7",
                        fillOpacity: Math.max(0, 0.8 - pct * 0.8),
                      }}
                    />
                    {/* Middle shockwave */}
                    <CircleMarker
                      center={line.to}
                      radius={10 + pct * 30}
                      pathOptions={{
                        color: "#fbbf24",
                        weight: 3,
                        opacity: Math.max(0, 0.8 - pct * 0.8),
                        fillColor: "#f87171",
                        fillOpacity: Math.max(0, 0.15 - pct * 0.15),
                      }}
                    />
                    {/* Outer shockwave */}
                    <CircleMarker
                      center={line.to}
                      radius={18 + pct * 50}
                      pathOptions={{
                        color: "#ef4444",
                        weight: 1.5,
                        opacity: Math.max(0, 0.5 - pct * 0.5),
                        fillOpacity: 0,
                        dashArray: "4 4",
                      }}
                    />
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </>
        )}

        {/* Layer toggle panel */}
        <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1">
          <button
            className={`btn-tactical p-1.5 ${showLayerPanel ? "glow-cyan" : ""}`}
            onClick={() => setShowLayerPanel(p => !p)}
            aria-label="レイヤー切替"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            className="btn-tactical p-1.5"
            onClick={() => {
              if (typeof window !== "undefined") {
                // Reset map view
              }
            }}
            aria-label="マップ位置リセット"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Layer panel */}
        {showLayerPanel && (
          <div className="absolute top-2 right-12 z-[1000] bg-bg-surface/95 border border-border-active rounded p-2 space-y-1 backdrop-blur-sm animate-slide-up">
            <div className="readout text-xs text-text-dim uppercase tracking-wider px-1 pb-1 border-b border-border-subtle mb-1">
              レイヤー
            </div>
            {LAYER_CONFIG.map(cfg => {
              const Icon = cfg.icon;
              return (
                <button
                  key={cfg.key}
                  className={`flex items-center gap-2 w-full px-2 py-1 rounded text-xs readout transition-colors ${
                    layers[cfg.key]
                      ? "text-accent-cyan bg-accent-cyan/8"
                      : "text-text-dim hover:text-text-secondary"
                  }`}
                  onClick={() => toggleLayer(cfg.key)}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                  <span className={`ml-auto w-1.5 h-1.5 rounded-full ${layers[cfg.key] ? "bg-accent-cyan" : "bg-text-dim"}`} />
                </button>
              );
            })}
          </div>
        )}

        {/* Marker count badges */}
        <div className="absolute bottom-2 left-2 z-[1000] flex items-center gap-2">
          {LAYER_CONFIG.map(cfg => {
            const count = baseMarkers.filter(m => m.type === cfg.key).length;
            const critCount = baseMarkers.filter(m => m.type === cfg.key && m.status === "critical").length;
            const Icon = cfg.icon;
            return (
              <div
                key={cfg.key}
                className={`flex items-center gap-1 readout text-xs px-2 py-1 rounded bg-bg-deep/80 border border-border-subtle ${
                  layers[cfg.key] ? "text-text-secondary" : "text-text-dim opacity-50"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{count}</span>
                {critCount > 0 && (
                  <span className="text-alert-critical font-bold">({critCount})</span>
                )}
              </div>
            );
          })}
          {/* Enemy count badge (game mode) */}
          {enemyUnits && enemyUnits.length > 0 && (
            <div className="flex items-center gap-1 readout text-xs px-2 py-1 rounded bg-bg-deep/80 border border-alert-critical/30 text-alert-critical">
              <Swords className="w-3 h-3" />
              <span>{enemyUnits.filter(u => u.status !== "destroyed").length}</span>
            </div>
          )}
        </div>

        {/* Slot for child overlays (e.g. GameControls) */}
        {children}
      </div>

      {/* Timeline slider */}
      <div className="px-3 py-2 border-t border-border-subtle flex items-center gap-3 shrink-0">
        <Clock className="w-3.5 h-3.5 text-accent-cyan-dim shrink-0" />
        <span className="readout text-xs text-text-dim w-12">12:00</span>
        <input
          type="range"
          min={0}
          max={100}
          value={timeValue}
          onChange={e => setTimeValue(Number(e.target.value))}
          className="flex-1 h-1 appearance-none bg-bg-elevated rounded cursor-pointer [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-accent-cyan [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <span className="readout text-xs text-accent-cyan w-12 text-right">
          {timeValue === 100 ? "LIVE" : `${Math.floor(12 + timeValue * 0.024)}:${String(Math.floor((timeValue * 1.44) % 60)).padStart(2, "0")}`}
        </span>
      </div>
    </div>
  );
}
