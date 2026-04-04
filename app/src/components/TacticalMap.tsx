"use client";

import { useState, useEffect } from "react";
import { MAP_MARKERS, type MapMarker, type SeverityLevel } from "@/lib/mock-data";
import { Layers, ZoomIn, ZoomOut, Crosshair, Clock } from "lucide-react";

function markerColor(status: SeverityLevel) {
  switch (status) {
    case "critical": return { fill: "#ff1744", ring: "rgba(255,23,68,0.3)" };
    case "warning": return { fill: "#ff9100", ring: "rgba(255,145,0,0.3)" };
    case "info": return { fill: "#00e5ff", ring: "rgba(0,229,255,0.3)" };
    default: return { fill: "#00e676", ring: "rgba(0,230,118,0.2)" };
  }
}

function markerShape(type: MapMarker["type"]) {
  switch (type) {
    case "facility": return "M-6,-6 L6,-6 L6,6 L-6,6 Z";
    case "vehicle": return "M0,-7 L6,4 L-6,4 Z";
    case "alert": return "M0,-7 L7,0 L0,7 L-7,0 Z";
    case "personnel": return "";
    default: return "";
  }
}

function MapMarkerSvg({ marker, isSelected, onClick }: {
  marker: MapMarker;
  isSelected: boolean;
  onClick: () => void;
}) {
  const c = markerColor(marker.status);
  const isPerson = marker.type === "personnel";
  const isAlert = marker.status === "critical" || marker.status === "warning";

  return (
    <g
      transform={`translate(${marker.x * 7.2}, ${marker.y * 4.8})`}
      onClick={onClick}
      className="cursor-pointer"
    >
      {/* Pulse ring for alerts */}
      {isAlert && (
        <circle r="12" fill="none" stroke={c.ring} strokeWidth="1.5" className="animate-pulse-ring" />
      )}
      {/* Selection ring */}
      {isSelected && (
        <>
          <circle r="16" fill="none" stroke={c.fill} strokeWidth="0.5" strokeDasharray="3 2" className="animate-sweep" style={{ transformOrigin: "center" }} />
          <circle r="14" fill="none" stroke={c.fill} strokeWidth="1" opacity="0.5" />
        </>
      )}
      {/* Marker shape */}
      {isPerson ? (
        <circle r="4" fill={c.fill} opacity="0.9" />
      ) : (
        <path d={markerShape(marker.type)} fill={c.fill} opacity="0.85" />
      )}
      {/* Center dot */}
      <circle r="1.5" fill="#fff" opacity="0.9" />
      {/* Label */}
      {isSelected && (
        <g>
          <rect
            x="10" y="-22" width={marker.label.length * 8 + 16} height="34"
            rx="2" fill="rgba(10,14,26,0.92)" stroke={c.fill} strokeWidth="0.5"
          />
          <text x="18" y="-10" fill={c.fill} fontSize="8" fontFamily="var(--font-mono)">
            {marker.label}
          </text>
          <text x="18" y="2" fill="#8892a8" fontSize="7" fontFamily="var(--font-mono)">
            {marker.detail}
          </text>
        </g>
      )}
    </g>
  );
}

export default function TacticalMap({ onSelectMarker }: { onSelectMarker?: (id: string | null) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>("a1");
  const [timeValue, setTimeValue] = useState(100);
  const [zoom] = useState(1);

  useEffect(() => {
    onSelectMarker?.(selectedId);
  }, [selectedId, onSelectMarker]);

  const handleClick = (id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  };

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        共通状況図 (COP)
        <span className="ml-auto flex items-center gap-1 text-alert-success text-[9px]">
          <span className="w-1 h-1 rounded-full bg-alert-success animate-pulse-dot" />
          LIVE
        </span>
      </div>

      {/* Map area */}
      <div className="flex-1 relative overflow-hidden bg-bg-deep/50">
        <svg
          viewBox="0 0 720 480"
          className="w-full h-full"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,229,255,0.06)" strokeWidth="0.5" />
            </pattern>
            <pattern id="gridLarge" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(0,229,255,0.1)" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="mapGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(0,229,255,0.03)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          <rect width="720" height="480" fill="url(#mapGlow)" />
          <rect width="720" height="480" fill="url(#grid)" />
          <rect width="720" height="480" fill="url(#gridLarge)" />

          {/* Japan outline (simplified) */}
          <g opacity="0.15" stroke="rgba(0,229,255,0.6)" strokeWidth="1" fill="rgba(0,229,255,0.03)">
            {/* Honshu main shape */}
            <path d="M140,180 Q160,140 200,120 Q250,100 320,110 Q380,120 420,140 Q480,155 520,130 Q540,140 530,170 Q510,190 480,200 Q440,220 400,240 Q360,260 320,270 Q280,260 240,250 Q200,240 170,220 Q150,200 140,180 Z" />
            {/* Hokkaido */}
            <path d="M440,70 Q470,55 510,60 Q540,70 545,90 Q535,110 510,115 Q480,110 460,95 Q445,80 440,70 Z" />
            {/* Kyushu */}
            <path d="M130,260 Q150,245 175,250 Q190,265 185,285 Q170,300 150,295 Q135,280 130,260 Z" />
            {/* Shikoku */}
            <path d="M210,260 Q235,250 260,255 Q275,265 270,280 Q250,290 230,285 Q210,275 210,260 Z" />
          </g>

          {/* Connection lines between facilities */}
          <g stroke="rgba(0,229,255,0.12)" strokeWidth="0.5" strokeDasharray="4 4">
            <line x1={25*7.2} y1={30*4.8} x2={45*7.2} y2={55*4.8} />
            <line x1={45*7.2} y1={55*4.8} x2={65*7.2} y2={25*4.8} />
            <line x1={25*7.2} y1={30*4.8} x2={65*7.2} y2={25*4.8} />
          </g>

          {/* Vehicle routes */}
          <g stroke="rgba(255,145,0,0.2)" strokeWidth="1" strokeDasharray="6 3" fill="none">
            <path d={`M${35*7.2},${40*4.8} Q${30*7.2},${35*4.8} ${25*7.2},${30*4.8}`} />
            <path d={`M${30*7.2},${50*4.8} Q${35*7.2},${45*4.8} ${25*7.2},${30*4.8}`} />
          </g>

          {/* Markers */}
          {MAP_MARKERS.map(m => (
            <MapMarkerSvg
              key={m.id}
              marker={m}
              isSelected={selectedId === m.id}
              onClick={() => handleClick(m.id)}
            />
          ))}

          {/* Compass */}
          <g transform="translate(680,40)" opacity="0.4">
            <circle r="16" fill="none" stroke="rgba(0,229,255,0.3)" strokeWidth="0.5" />
            <line x1="0" y1="-12" x2="0" y2="-8" stroke="#00e5ff" strokeWidth="1" />
            <text x="0" y="-18" fill="#00e5ff" fontSize="6" textAnchor="middle" fontFamily="var(--font-mono)">N</text>
          </g>

          {/* Scale bar */}
          <g transform="translate(30,455)" opacity="0.4">
            <line x1="0" y1="0" x2="80" y2="0" stroke="#00e5ff" strokeWidth="0.5" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#00e5ff" strokeWidth="0.5" />
            <line x1="80" y1="-3" x2="80" y2="3" stroke="#00e5ff" strokeWidth="0.5" />
            <text x="40" y="10" fill="#00e5ff" fontSize="6" textAnchor="middle" fontFamily="var(--font-mono)">200km</text>
          </g>
        </svg>

        {/* Map controls overlay */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button className="btn-tactical p-1.5"><ZoomIn className="w-3.5 h-3.5" /></button>
          <button className="btn-tactical p-1.5"><ZoomOut className="w-3.5 h-3.5" /></button>
          <button className="btn-tactical p-1.5"><Crosshair className="w-3.5 h-3.5" /></button>
          <button className="btn-tactical p-1.5"><Layers className="w-3.5 h-3.5" /></button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-10 right-2 text-[8px] readout text-text-dim space-y-1 bg-bg-deep/70 p-2 rounded border border-border-subtle">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-alert-critical inline-block" /> 施設</div>
          <div className="flex items-center gap-1.5"><span className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-alert-success inline-block" /> 車両</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-accent-cyan rotate-45 inline-block" /> 検知</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-alert-success rounded-full inline-block" /> 人員</div>
        </div>
      </div>

      {/* Timeline slider */}
      <div className="px-3 py-2 border-t border-border-subtle flex items-center gap-3">
        <Clock className="w-3.5 h-3.5 text-accent-cyan-dim shrink-0" />
        <span className="readout text-[10px] text-text-dim w-12">12:00</span>
        <input
          type="range"
          min={0}
          max={100}
          value={timeValue}
          onChange={e => setTimeValue(Number(e.target.value))}
          className="flex-1 h-1 appearance-none bg-bg-elevated rounded cursor-pointer accent-accent-cyan [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-accent-cyan [&::-webkit-slider-thumb]:rounded-sm"
        />
        <span className="readout text-[10px] text-accent-cyan w-12 text-right">
          {timeValue === 100 ? "LIVE" : `${Math.floor(12 + timeValue * 0.024)}:${String(Math.floor((timeValue * 1.44) % 60)).padStart(2, "0")}`}
        </span>
      </div>
    </div>
  );
}
