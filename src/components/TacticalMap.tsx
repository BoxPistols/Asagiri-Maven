"use client";

import { useState, useEffect, useMemo } from "react";
import { MAP_MARKERS, VEHICLE_ROUTES, type MapMarker, type SeverityLevel } from "@/lib/mock-data";
import { Layers, Crosshair, Clock, Warehouse, Truck, AlertTriangle, User, Navigation, Swords } from "lucide-react";
import type { GameUnit } from "@/lib/game-types";
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

function statusColor(s: SeverityLevel): string {
  switch (s) {
    case "critical": return "#f87171";
    case "warning": return "#fbbf24";
    case "info": return "#22d3ee";
    default: return "#34d399";
  }
}

function typeIcon(type: MapMarker["type"]) {
  switch (type) {
    case "facility": return Warehouse;
    case "vehicle": return Truck;
    case "alert": return AlertTriangle;
    case "personnel": return User;
    case "drone": return Navigation;
  }
}

function MarkerIcon({ marker }: { marker: MapMarker }) {
  const color = statusColor(marker.status);
  const Icon = typeIcon(marker.type);
  const isAlert = marker.status === "critical" || marker.status === "warning";

  return (
    <div className="relative flex items-center justify-center">
      {isAlert && (
        <span
          className="absolute w-8 h-8 rounded-full animate-pulse-ring"
          style={{ backgroundColor: color, opacity: 0.25 }}
        />
      )}
      <span
        className="relative flex items-center justify-center w-6 h-6 rounded-full border-2"
        style={{ backgroundColor: `${color}20`, borderColor: color }}
      >
        <Icon className="w-3 h-3" style={{ color }} />
      </span>
    </div>
  );
}

function MarkerPopupContent({ marker }: { marker: MapMarker }) {
  const color = statusColor(marker.status);
  return (
    <div className="min-w-[200px] p-0 text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="readout text-xs uppercase px-1.5 py-0.5 rounded font-bold"
          style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}40` }}
        >
          {marker.type === "facility" ? "施設" : marker.type === "vehicle" ? "車両" : marker.type === "alert" ? "検知" : marker.type === "drone" ? "ドローン" : "人員"}
        </span>
        <span
          className="readout text-xs uppercase px-1.5 py-0.5 rounded"
          style={{ color, backgroundColor: `${color}10` }}
        >
          {marker.status}
        </span>
      </div>
      <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{marker.label}</div>
      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{marker.detail}</div>
      <div className="text-xs mt-1.5 pt-1.5 readout" style={{ color: "var(--text-dim)", borderTop: "1px solid var(--border-subtle)" }}>
        {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
      </div>
    </div>
  );
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

interface TacticalMapProps {
  onSelectMarker?: (id: string | null) => void;
  markers?: MapMarker[];
  enemyUnits?: GameUnit[];
  playerUnits?: GameUnit[];
  children?: React.ReactNode;
}

export default function TacticalMap({ onSelectMarker, markers, enemyUnits, playerUnits, children }: TacticalMapProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [timeValue, setTimeValue] = useState(100);
  const [layers, setLayers] = useState<Record<LayerType, boolean>>({
    facility: true, vehicle: true, drone: true, alert: true, personnel: true,
  });
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const baseMarkers = markers ?? MAP_MARKERS;

  const filteredMarkers = useMemo(
    () => baseMarkers.filter(m => layers[m.type]),
    [baseMarkers, layers]
  );

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

  // Create divIcon for enemy units
  const createEnemyIcon = (unit: GameUnit) => {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    const isEngaging = unit.status === "engaging";
    const isDamaged = unit.status === "damaged";
    const typeChar = "E";
    const color = "#f87171";
    const pulseClass = isEngaging || isDamaged ? "enemy-pulse-anim" : "";

    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;" class="${pulseClass}">
          <span style="position:absolute;width:36px;height:36px;border-radius:50%;background:${color};opacity:0.15;animation:enemy-pulse 1.8s ease-out infinite;"></span>
          <span style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:rgba(248,113,113,0.2);border:2px solid ${color};font-family:var(--font-mono);font-size:11px;font-weight:bold;color:${color};">
            ${typeChar}
          </span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });
  };

  const toggleLayer = (key: LayerType) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Create custom divIcon for each marker (leaflet needs this)
  const createIcon = (marker: MapMarker) => {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    const color = statusColor(marker.status);
    const isAlert = marker.status === "critical" || marker.status === "warning";
    const typeChar = marker.type === "facility" ? "F" : marker.type === "vehicle" ? "V" : marker.type === "drone" ? "D" : marker.type === "alert" ? "!" : "P";

    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          ${isAlert ? `<span style="position:absolute;width:32px;height:32px;border-radius:50%;background:${color};opacity:0.2;animation:pulse-ring 2s ease-out infinite;"></span>` : ""}
          <span style="position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${color}20;border:2px solid ${color};font-family:var(--font-mono);font-size:12px;font-weight:bold;color:${color};">
            ${typeChar}
          </span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

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
      <div className="flex-1 relative overflow-hidden">
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
            `}</style>
            <MapContainer
              center={[36.5, 137.5] as [number, number]}
              zoom={6}
              zoomControl={true}
              attributionControl={true}
              style={{ height: "100%", width: "100%" }}
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

              {/* Markers */}
              {filteredMarkers.map(m => (
                <Marker
                  key={m.id}
                  position={[m.lat, m.lng] as [number, number]}
                  icon={createIcon(m)}
                  eventHandlers={{
                    click: () => onSelectMarker?.(m.id),
                  }}
                >
                  <Popup>
                    <MarkerPopupContent marker={m} />
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

              {/* Enemy unit markers */}
              {enemyUnits?.filter(u => u.status !== "destroyed").map(unit => (
                <Marker
                  key={`enemy-${unit.id}`}
                  position={[unit.lat, unit.lng] as [number, number]}
                  icon={createEnemyIcon(unit)}
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
