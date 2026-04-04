"use client";

import { useState, useEffect, useMemo } from "react";
import { MAP_MARKERS, VEHICLE_ROUTES, type MapMarker, type SeverityLevel } from "@/lib/mock-data";
import { Layers, Crosshair, Clock, Warehouse, Truck, AlertTriangle, User, Navigation } from "lucide-react";
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
      <div className="text-sm font-semibold mb-1" style={{ color: "#f1f5f9" }}>{marker.label}</div>
      <div className="text-xs" style={{ color: "#94a3b8" }}>{marker.detail}</div>
      <div className="text-xs mt-1.5 pt-1.5 readout" style={{ color: "#64748b", borderTop: "1px solid #1e293b" }}>
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

export default function TacticalMap({ onSelectMarker }: { onSelectMarker?: (id: string | null) => void }) {
  const [mounted, setMounted] = useState(false);
  const [timeValue, setTimeValue] = useState(100);
  const [layers, setLayers] = useState<Record<LayerType, boolean>>({
    facility: true, vehicle: true, drone: true, alert: true, personnel: true,
  });
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const filteredMarkers = useMemo(
    () => MAP_MARKERS.filter(m => layers[m.type]),
    [layers]
  );

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
              .leaflet-container { background: #060a14; height: 100%; width: 100%; }
              .leaflet-popup-content-wrapper { background: #0f1629; border: 1px solid rgba(0,229,255,0.2); border-radius: 4px; box-shadow: 0 0 20px rgba(0,229,255,0.1); }
              .leaflet-popup-tip { background: #0f1629; border-right: 1px solid rgba(0,229,255,0.2); border-bottom: 1px solid rgba(0,229,255,0.2); }
              .leaflet-popup-content { margin: 8px 10px; }
              .leaflet-popup-close-button { color: #8892a8 !important; }
              .leaflet-popup-close-button:hover { color: #00e5ff !important; }
              .leaflet-control-zoom { border: 1px solid rgba(0,229,255,0.15) !important; }
              .leaflet-control-zoom a { background: #0f1629 !important; color: #00e5ff !important; border-bottom: 1px solid rgba(0,229,255,0.1) !important; }
              .leaflet-control-zoom a:hover { background: #151d33 !important; }
              .leaflet-control-attribution { background: rgba(6,10,20,0.8) !important; color: #4a5568 !important; font-size: 12px !important; }
              .leaflet-control-attribution a { color: #4a5568 !important; }
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
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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
            const count = MAP_MARKERS.filter(m => m.type === cfg.key).length;
            const critCount = MAP_MARKERS.filter(m => m.type === cfg.key && m.status === "critical").length;
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
        </div>
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
