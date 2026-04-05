"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MAP_MARKERS, VEHICLE_ROUTES, type MapMarker, type SeverityLevel } from "@/lib/mock-data";
import { Layers, Crosshair, Clock, Warehouse, Truck, AlertTriangle, User, Navigation, Swords } from "lucide-react";
import type { GameUnit, TurnPhase } from "@/lib/game-types";
import { getAttackRange } from "@/lib/combat-rules";
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
  children,
}: TacticalMapProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [timeValue, setTimeValue] = useState(100);
  const [layers, setLayers] = useState<Record<LayerType, boolean>>({
    facility: true, vehicle: true, drone: true, alert: true, personnel: true,
  });
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [mousePos, setMousePos] = useState<{ lat: number; lng: number } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ lat: number; lng: number } | null>(null);
  const moveTargetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

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

  // Range visualisation data
  const rangeData = useMemo(() => {
    if (!selectedPlayerUnit) return null;
    if (selectedPlayerUnit.status === "destroyed") return null;
    if (actedSet.has(selectedPlayerUnit.id)) return null;
    if (turnPhase !== "player") return null;

    const moveRange = selectedPlayerUnit.speed;
    const attackRange = getAttackRange(selectedPlayerUnit.type);
    return {
      center: [selectedPlayerUnit.lat, selectedPlayerUnit.lng] as [number, number],
      moveRadiusM: degreesToMeters(moveRange),
      attackRadiusM: degreesToMeters(attackRange),
      moveRangeDeg: moveRange,
    };
  }, [selectedPlayerUnit, actedSet, turnPhase]);

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

  // Create divIcon for player unit markers with HP bar
  const createPlayerIcon = useCallback((unit: GameUnit) => {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    const isSelected = unit.id === selectedUnitId;
    const acted = actedSet.has(unit.id);
    const hpRatio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
    const hpPercent = Math.max(0, Math.round(hpRatio * 100));
    const hpCol = hpColor(hpRatio);
    const opacity = acted ? "opacity:0.5;" : "";

    const typeChar = unit.type === "vehicle" ? "V"
      : unit.type === "drone" ? "D"
      : unit.type === "ship" ? "S"
      : unit.type === "infantry" ? "I"
      : unit.type === "cyber" ? "C"
      : "?";

    // Determine marker color based on whether it's a facility or mobile
    const isFacility = unit.id.startsWith("base-");
    const color = isFacility ? "#34d399" : "#22d3ee";

    const selectedRing = isSelected
      ? `<span style="position:absolute;width:38px;height:38px;border-radius:50%;border:2px solid #818cf8;opacity:0.9;animation:glow-pulse 2s ease-in-out infinite;"></span>`
      : "";

    const actedCheck = acted
      ? `<span style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:50%;background:#34d399;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;line-height:1;">&#10003;</span>`
      : "";

    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;${opacity}">
          ${selectedRing}
          ${actedCheck}
          <span style="position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${color}20;border:2px solid ${color};font-family:var(--font-mono);font-size:11px;font-weight:bold;color:${color};">
            ${typeChar}
          </span>
          <div style="width:24px;height:3px;background:#333;margin-top:2px;border-radius:1px;overflow:hidden;">
            <div style="width:${hpPercent}%;height:100%;background:${hpCol};border-radius:1px;"></div>
          </div>
        </div>
      `,
      iconSize: [38, 42],
      iconAnchor: [19, 21],
      popupAnchor: [0, -21],
    });
  }, [selectedUnitId, actedSet]);

  // Create divIcon for enemy units with HP bar
  const createEnemyIcon = useCallback((unit: GameUnit) => {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    const isEngaging = unit.status === "engaging";
    const isDamaged = unit.status === "damaged";
    const hpRatio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
    const hpPercent = Math.max(0, Math.round(hpRatio * 100));
    const hpCol = hpColor(hpRatio);

    const typeChar = unit.type === "vehicle" ? "V"
      : unit.type === "drone" ? "D"
      : unit.type === "ship" ? "S"
      : unit.type === "infantry" ? "I"
      : unit.type === "cyber" ? "C"
      : "E";

    const color = "#f87171";
    const pulseClass = isEngaging || isDamaged ? "enemy-pulse-anim" : "";
    const targetGlow = targetingMode
      ? "box-shadow:0 0 12px rgba(248,113,113,0.5),0 0 24px rgba(248,113,113,0.2);animation:targeting-enemy-glow 1.5s ease-in-out infinite;"
      : "";
    const targetCursor = targetingMode ? "cursor:crosshair;" : "";

    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;${targetCursor}" class="${pulseClass}">
          <span style="position:absolute;width:36px;height:36px;border-radius:50%;background:${color};opacity:0.15;animation:enemy-pulse 1.8s ease-out infinite;"></span>
          ${targetingMode ? `<span style="position:absolute;width:42px;height:42px;border-radius:50%;border:2px dashed ${color};opacity:0.7;${targetGlow}"></span>` : ""}
          <span style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:rgba(248,113,113,0.2);border:2px solid ${color};font-family:var(--font-mono);font-size:11px;font-weight:bold;color:${color};">
            ${typeChar}
          </span>
          <div style="width:24px;height:3px;background:#333;margin-top:2px;border-radius:1px;overflow:hidden;">
            <div style="width:${hpPercent}%;height:100%;background:${hpCol};border-radius:1px;"></div>
          </div>
        </div>
      `,
      iconSize: [42, 46],
      iconAnchor: [21, 23],
      popupAnchor: [0, -23],
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

  // Handle map click (for movement)
  const handleMapContainerClick = useCallback((e: unknown) => {
    // e is a Leaflet MouseEvent with latlng
    const le = e as { latlng?: { lat: number; lng: number } };
    if (!le.latlng) return;
    const { lat, lng } = le.latlng;

    if (selectedPlayerUnit && !actedSet.has(selectedPlayerUnit.id) && turnPhase === "player") {
      const dist = distanceDeg(selectedPlayerUnit, { lat, lng });
      if (dist <= selectedPlayerUnit.speed) {
        setMoveTarget({ lat, lng });
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
                const mi = mapInstance as { target?: { on?: (event: string, handler: (e: unknown) => void) => void } };
                if (mi.target?.on) {
                  mi.target.on("click", handleMapContainerClick);
                  mi.target.on("mousemove", handleMapMouseMove);
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

              {/* === Range circles (when player unit selected, hasn't acted, player phase) === */}
              {rangeData && (
                <>
                  {/* Movement range: dashed cyan */}
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
                  {/* Attack range: dotted red */}
                  <Circle
                    center={rangeData.center}
                    radius={rangeData.attackRadiusM}
                    pathOptions={{
                      color: "#f87171",
                      weight: 1.5,
                      opacity: 0.3,
                      fillColor: "#f87171",
                      fillOpacity: 0.03,
                      dashArray: "4 4",
                    }}
                  />
                </>
              )}

              {/* === Movement path preview (dashed line from unit to cursor) === */}
              {pathPreview && (
                <Polyline
                  positions={[pathPreview.from, pathPreview.to]}
                  pathOptions={{
                    color: pathPreview.color,
                    weight: 2,
                    opacity: 0.6,
                    dashArray: "6 4",
                  }}
                />
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
                  <Popup>
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

              {/* === Player unit markers with HP bars === */}
              {playerUnits?.filter(u => u.status !== "destroyed").map(unit => (
                <Marker
                  key={`player-${unit.id}`}
                  position={[unit.lat, unit.lng] as [number, number]}
                  icon={createPlayerIcon(unit)}
                  eventHandlers={{
                    click: (e: unknown) => {
                      const le = e as { originalEvent?: Event };
                      le.originalEvent?.stopPropagation?.();
                      onMarkerClick?.(unit.id);
                      onSelectMarker?.(unit.id);
                    },
                  }}
                >
                  <Popup>
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

              {/* === Enemy unit markers with HP bars === */}
              {enemyUnits?.filter(u => u.status !== "destroyed").map(unit => (
                <Marker
                  key={`enemy-${unit.id}`}
                  position={[unit.lat, unit.lng] as [number, number]}
                  icon={createEnemyIcon(unit)}
                  eventHandlers={{
                    click: (e: unknown) => {
                      const le = e as { originalEvent?: Event };
                      le.originalEvent?.stopPropagation?.();
                      onMarkerClick?.(unit.id);
                      onSelectMarker?.(unit.id);
                    },
                  }}
                >
                  <Popup>
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
              {enemyUnits?.filter(u => u.status !== "destroyed").map(unit => (
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
            </MapContainer>
          </>
        )}

        {/* Layer toggle panel */}
        <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1">
          <button
            className={`btn-tactical p-1.5 ${showLayerPanel ? "glow-cyan" : ""}`}
            onClick={() => setShowLayerPanel(p => !p)}
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
