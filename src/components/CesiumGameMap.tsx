"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PLATEAU_CITIES, DEFAULT_VIEW, CAMERA_PRESETS, type CameraPreset } from "@/lib/plateau-cities";
import { CESIUM_UI } from "@/lib/cesium-strings";
import type { GameUnit, TurnPhase } from "@/lib/game-types";

const CESIUM_BASE_URL = "/cesium/";
const CESIUM_ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "";

// Memoization cache for SVG billboards (keyed by state tuple)
const billboardCache = new Map<string, string>();
const MAX_CACHE_SIZE = 200;

// SVG billboards for units
function unitBillboardSvg(type: GameUnit["type"] | "base", faction: "player" | "enemy", hpPercent: number, acted: boolean, selected: boolean): string {
  const isBase = type === "base";
  // Blue shield for player, red triangle for enemy
  if (faction === "player") {
    const color = isBase ? "#22d3ee" : "#3b82f6";
    const hpColor = hpPercent > 60 ? "#34d399" : hpPercent > 30 ? "#fbbf24" : "#f87171";
    const opacity = acted ? 0.5 : 1;
    const ring = selected ? `<rect x="0" y="0" width="52" height="52" rx="6" fill="none" stroke="#818cf8" stroke-width="3"/>` : "";
    const icon = isBase ? `<text x="26" y="34" text-anchor="middle" font-family="monospace" font-size="22" font-weight="900" fill="${color}">★</text>`
      : type === "drone" ? `<circle cx="26" cy="26" r="4" fill="${color}"/><line x1="14" y1="14" x2="38" y2="38" stroke="${color}" stroke-width="2"/><line x1="38" y1="14" x2="14" y2="38" stroke="${color}" stroke-width="2"/><circle cx="14" cy="14" r="3" fill="none" stroke="${color}" stroke-width="1.5"/><circle cx="38" cy="14" r="3" fill="none" stroke="${color}" stroke-width="1.5"/><circle cx="14" cy="38" r="3" fill="none" stroke="${color}" stroke-width="1.5"/><circle cx="38" cy="38" r="3" fill="none" stroke="${color}" stroke-width="1.5"/>`
      : type === "ship" ? `<path d="M10 32 L14 24 L38 24 L42 32 L38 38 L14 38 Z" fill="${color}33" stroke="${color}" stroke-width="2"/><rect x="20" y="16" width="12" height="8" rx="1" fill="${color}"/>`
      : `<rect x="12" y="20" width="28" height="12" rx="2" fill="${color}33" stroke="${color}" stroke-width="2"/><rect x="18" y="14" width="16" height="8" rx="1" fill="${color}"/>`;
    const check = acted ? `<circle cx="44" cy="8" r="5" fill="#34d399"/><path d="M41 8 L43 10 L47 6" fill="none" stroke="#fff" stroke-width="1.5"/>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52" opacity="${opacity}">
      <path d="M 26 2 L 48 8 L 48 30 Q 48 42 26 48 Q 4 42 4 30 L 4 8 Z" fill="rgba(15,23,42,0.92)" stroke="${color}" stroke-width="2"/>
      ${icon}
      <rect x="4" y="42" width="44" height="4" rx="2" fill="rgba(30,30,40,0.8)"/>
      <rect x="4" y="42" width="${Math.round(44 * hpPercent / 100)}" height="4" rx="2" fill="${hpColor}"/>
      ${check}
      ${ring}
    </svg>`;
  } else {
    // Enemy: red warning triangle with pulsing
    const hpColor = hpPercent > 60 ? "#34d399" : hpPercent > 30 ? "#fbbf24" : "#f87171";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
      <path d="M 28 4 L 52 42 L 4 42 Z" fill="#7f0c0c" stroke="#ef4444" stroke-width="3"/>
      <path d="M 28 10 L 46 40 L 10 40 Z" fill="rgba(127,12,12,0.95)" stroke="#fbbf24" stroke-width="1.5"/>
      <rect x="25" y="17" width="6" height="14" rx="1" fill="#fbbf24"/>
      <circle cx="28" cy="35" r="2.5" fill="#fbbf24"/>
      <rect x="8" y="0" width="40" height="9" rx="2" fill="#ef4444"/>
      <text x="28" y="7" text-anchor="middle" font-family="monospace" font-size="7" font-weight="bold" fill="#fff">ENEMY</text>
      <rect x="4" y="46" width="48" height="5" rx="2" fill="rgba(30,30,40,0.9)"/>
      <rect x="4" y="46" width="${Math.round(48 * hpPercent / 100)}" height="5" rx="2" fill="${hpColor}"/>
    </svg>`;
  }
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Memoized SVG data URI — returns cached URI if state unchanged */
function getCachedBillboard(
  type: GameUnit["type"] | "base",
  faction: "player" | "enemy",
  hpPercent: number,
  acted: boolean,
  selected: boolean,
): string {
  // Quantize HP to nearest 5% to reduce cache misses during HP changes
  const hpBucket = Math.round(hpPercent / 5) * 5;
  const key = `${faction}:${type}:${hpBucket}:${acted ? 1 : 0}:${selected ? 1 : 0}`;
  const cached = billboardCache.get(key);
  if (cached) return cached;
  // Evict oldest if cache too large
  if (billboardCache.size >= MAX_CACHE_SIZE) {
    const firstKey = billboardCache.keys().next().value;
    if (firstKey) billboardCache.delete(firstKey);
  }
  const uri = svgToDataUri(unitBillboardSvg(type, faction, hpBucket, acted, selected));
  billboardCache.set(key, uri);
  return uri;
}

type ViewerType = {
  scene: {
    globe: {
      enableLighting: boolean;
      depthTestAgainstTerrain: boolean;
      terrainExaggeration?: number;
    };
    skyAtmosphere: { show: boolean };
    primitives: { add: (tileset: unknown) => unknown };
    canvas: HTMLCanvasElement;
  };
  camera: {
    setView: (opts: Record<string, unknown>) => void;
    flyTo: (opts: Record<string, unknown>) => void;
    pickEllipsoid?: (position: { x: number; y: number }, ellipsoid?: unknown) => unknown;
  };
  cesiumWidget: { creditContainer: { style: { display: string } } };
  entities: {
    add: (opts: Record<string, unknown>) => { id: string; [key: string]: unknown };
    removeById: (id: string) => boolean;
    getById: (id: string) => unknown;
    values: unknown[];
  };
  clock?: { currentTime: unknown };
  screenSpaceEventHandler: unknown;
  destroy: () => void;
};

export interface AttackTrajectory {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  timestamp: number;
}

interface CesiumGameMapProps {
  playerUnits: GameUnit[];
  enemyUnits: GameUnit[];
  selectedUnitId: string | null;
  actedUnitIds: string[];
  turnPhase: TurnPhase;
  onUnitClick: (id: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  focusTarget: { lat: number; lng: number; key: string } | null;
  attackTrajectories?: AttackTrajectory[];
}

export default function CesiumGameMap({
  playerUnits,
  enemyUnits,
  selectedUnitId,
  actedUnitIds,
  turnPhase,
  onUnitClick,
  onMapClick,
  focusTarget,
  attackTrajectories = [],
}: CesiumGameMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerType | null>(null);
  const lastBillboardImageRef = useRef<Map<string, string>>(new Map());
  const lastPositionRef = useRef<Map<string, string>>(new Map());
  const cesiumRef = useRef<typeof import("cesium") | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedCities, setLoadedCities] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lighting, setLighting] = useState<"day" | "night" | "auto">("auto");
  const [terrainExag, setTerrainExag] = useState<number>(1);
  const [sceneOpen, setSceneOpen] = useState(false);

  // Initialize viewer
  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof window === "undefined") return;
    (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = CESIUM_BASE_URL;

    let destroyed = false;
    let viewer: ViewerType | null = null;
    let handlerToDestroy: { destroy: () => void } | null = null;

    (async () => {
      try {
        const Cesium = await import("cesium");
        await import("cesium/Build/Cesium/Widgets/widgets.css");
        cesiumRef.current = Cesium;
        if (destroyed || !containerRef.current) return;
        if (CESIUM_ION_TOKEN) Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

        viewer = new Cesium.Viewer(containerRef.current, {
          timeline: false, animation: false, geocoder: false, homeButton: false,
          sceneModePicker: false, baseLayerPicker: false, navigationHelpButton: false,
          fullscreenButton: false, infoBox: false, selectionIndicator: false,
          terrain: Cesium.Terrain.fromWorldTerrain(),
        }) as unknown as ViewerType;

        viewerRef.current = viewer;
        if (viewer.cesiumWidget?.creditContainer) {
          (viewer.cesiumWidget.creditContainer as unknown as HTMLElement).style.display = "none";
        }
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.skyAtmosphere.show = true;

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(DEFAULT_VIEW.lng, DEFAULT_VIEW.lat - 5, DEFAULT_VIEW.height),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-45),
            roll: 0,
          },
        });

        // Click handler — pick entity or ground
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handlerToDestroy = handler as unknown as { destroy: () => void };
        handler.setInputAction((movement: { position: { x: number; y: number } }) => {
          const picked = viewer!.scene as unknown as { pick: (pos: { x: number; y: number }) => { id?: { id?: string } } | undefined };
          const pick = picked.pick(movement.position);
          if (pick?.id?.id) {
            // Entity clicked
            onUnitClick(pick.id.id);
            return;
          }
          // Ground pick for movement
          const scene = viewer!.scene as unknown as { pickPosition?: (pos: { x: number; y: number }) => unknown };
          const cartesian = scene.pickPosition?.(movement.position)
            ?? (viewer!.camera.pickEllipsoid?.(movement.position, Cesium.Ellipsoid.WGS84));
          if (cartesian) {
            const carto = Cesium.Cartographic.fromCartesian(cartesian as InstanceType<typeof Cesium.Cartesian3>);
            const lat = Cesium.Math.toDegrees(carto.latitude);
            const lng = Cesium.Math.toDegrees(carto.longitude);
            onMapClick(lat, lng);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        setLoading(false);

        // Load PLATEAU tilesets
        for (const city of PLATEAU_CITIES) {
          if (destroyed) break;
          try {
            const tileset = await Cesium.Cesium3DTileset.fromUrl(city.tilesetUrl, { maximumScreenSpaceError: 16 });
            if (destroyed) break;
            viewer.scene.primitives.add(tileset);
            setLoadedCities(prev => prev + 1);
          } catch {
            // Tileset load failure is non-fatal; UI shows loaded count
          }
        }
      } catch (err) {
        if (!destroyed) {
          setError(err instanceof Error ? err.message : "Cesium init failed");
          setLoading(false);
        }
      }
    })();

    return () => {
      destroyed = true;
      if (handlerToDestroy) try { handlerToDestroy.destroy(); } catch { /* ignore */ }
      if (viewer) try { viewer.destroy(); } catch { /* ignore */ }
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync game entities with viewer
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium) return;

    const actedSet = new Set(actedUnitIds);
    const currentIds = new Set<string>();

    const upsertEntity = (unit: GameUnit, faction: "player" | "enemy") => {
      const hpPct = Math.max(0, Math.round((unit.hp / unit.maxHp) * 100));
      const acted = actedSet.has(unit.id);
      const selected = selectedUnitId === unit.id;
      const isBase = unit.id.startsWith("base-");
      const iconType = isBase ? "base" : unit.type;
      const image = getCachedBillboard(iconType, faction, hpPct, acted, selected);
      const posKey = `${unit.lat.toFixed(6)},${unit.lng.toFixed(6)}`;
      const pos = Cesium.Cartesian3.fromDegrees(unit.lng, unit.lat, 100);
      currentIds.add(unit.id);

      const existing = viewer.entities.getById(unit.id) as { position?: { setValue: (v: unknown) => void }; billboard?: { image?: { setValue: (v: unknown) => void } }; label?: { text?: { setValue: (v: string) => void } } } | undefined;
      if (existing) {
        // Only update properties that actually changed
        if (lastPositionRef.current.get(unit.id) !== posKey) {
          existing.position?.setValue(pos);
          lastPositionRef.current.set(unit.id, posKey);
        }
        if (lastBillboardImageRef.current.get(unit.id) !== image) {
          existing.billboard?.image?.setValue(image);
          lastBillboardImageRef.current.set(unit.id, image);
        }
        return;
      }
      lastPositionRef.current.set(unit.id, posKey);
      lastBillboardImageRef.current.set(unit.id, image);
      viewer.entities.add({
        id: unit.id,
        position: pos,
        billboard: {
          image,
          width: faction === "enemy" ? 56 : 52,
          height: faction === "enemy" ? 56 : 52,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          pixelOffset: new Cesium.Cartesian2(0, -28),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: unit.name,
          font: "bold 12px sans-serif",
          pixelOffset: new Cesium.Cartesian2(0, 10),
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.fromCssColorString("#0b1020"),
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          scale: 0.85,
          translucencyByDistance: new Cesium.NearFarScalar(50_000, 1.0, 1_500_000, 0.0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    };

    for (const u of playerUnits) {
      if (u.status !== "destroyed") upsertEntity(u, "player");
    }
    for (const u of enemyUnits) {
      if (u.status !== "destroyed") upsertEntity(u, "enemy");
    }

    // Remove entities for units no longer present
    const toRemove: string[] = [];
    for (const entity of viewer.entities.values) {
      const id = (entity as { id: string }).id;
      if (!currentIds.has(id)) toRemove.push(id);
    }
    for (const id of toRemove) {
      viewer.entities.removeById(id);
      lastBillboardImageRef.current.delete(id);
      lastPositionRef.current.delete(id);
    }
  }, [playerUnits, enemyUnits, selectedUnitId, actedUnitIds]);

  // Attack trajectory arcs — add ballistic curves for combat events
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || attackTrajectories.length === 0) return;

    const addedIds: string[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const traj of attackTrajectories) {
      const arcId = `arc-${traj.id}`;
      const impactId = `impact-${traj.id}`;

      // Create arc (ballistic curve via 3 waypoints: origin→apex→target)
      const midLat = (traj.from.lat + traj.to.lat) / 2;
      const midLng = (traj.from.lng + traj.to.lng) / 2;
      const distKm = Math.hypot(traj.to.lat - traj.from.lat, traj.to.lng - traj.from.lng) * 111;
      const apexHeight = Math.min(80_000, Math.max(15_000, distKm * 300)); // altitude-scaled apex

      const positions = [
        Cesium.Cartesian3.fromDegrees(traj.from.lng, traj.from.lat, 500),
        Cesium.Cartesian3.fromDegrees(midLng, midLat, apexHeight),
        Cesium.Cartesian3.fromDegrees(traj.to.lng, traj.to.lat, 500),
      ];

      // Smooth curve via Catmull-Rom spline
      const spline = new Cesium.CatmullRomSpline({ times: [0, 0.5, 1], points: positions });
      const samples: unknown[] = [];
      for (let t = 0; t <= 1.0001; t += 0.03) {
        samples.push(spline.evaluate(Math.min(1, t)));
      }

      viewer.entities.add({
        id: arcId,
        polyline: {
          positions: samples,
          width: 3,
          material: Cesium.Color.fromCssColorString("#fbbf24").withAlpha(0.9),
          clampToGround: false,
        },
      });
      addedIds.push(arcId);

      // Impact ring at target
      viewer.entities.add({
        id: impactId,
        position: Cesium.Cartesian3.fromDegrees(traj.to.lng, traj.to.lat, 100),
        ellipse: {
          semiMinorAxis: 3000,
          semiMajorAxis: 3000,
          material: Cesium.Color.fromCssColorString("#ef4444").withAlpha(0.3),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString("#ef4444"),
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        },
      });
      addedIds.push(impactId);

      // Auto-cleanup after 2s
      const timer = setTimeout(() => {
        viewer.entities.removeById(arcId);
        viewer.entities.removeById(impactId);
      }, 2000);
      timers.push(timer);
    }

    return () => {
      for (const t of timers) clearTimeout(t);
      for (const id of addedIds) viewer.entities.removeById(id);
    };
  }, [attackTrajectories]);

  // Apply lighting mode
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium) return;
    const globe = viewer.scene.globe as unknown as { enableLighting: boolean };
    const clock = viewer.clock as unknown as { currentTime?: unknown; shouldAnimate?: boolean } | undefined;
    if (lighting === "auto") {
      globe.enableLighting = true;
      if (clock) clock.shouldAnimate = false;
    } else if (lighting === "day") {
      // Set time to noon JST (UTC 03:00)
      const now = new Date();
      now.setUTCHours(3, 0, 0, 0);
      if (clock) clock.currentTime = Cesium.JulianDate.fromDate(now);
      globe.enableLighting = true;
      if (clock) clock.shouldAnimate = false;
    } else if (lighting === "night") {
      // Set time to midnight JST (UTC 15:00)
      const now = new Date();
      now.setUTCHours(15, 0, 0, 0);
      if (clock) clock.currentTime = Cesium.JulianDate.fromDate(now);
      globe.enableLighting = true;
      if (clock) clock.shouldAnimate = false;
    }
  }, [lighting]);

  // Apply terrain exaggeration
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const globe = viewer.scene.globe as unknown as { terrainExaggeration?: number };
    globe.terrainExaggeration = terrainExag;
  }, [terrainExag]);

  // Fly to focus target
  useEffect(() => {
    if (!focusTarget) return;
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(focusTarget.lng, focusTarget.lat - 0.1, 30_000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-50),
        roll: 0,
      },
      duration: 1.2,
    });
  }, [focusTarget]);

  // Camera preset nav
  const flyToPreset = useCallback((preset: CameraPreset) => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(preset.lng, preset.lat - 0.3, preset.height),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-40),
        roll: 0,
      },
      duration: 1.5,
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 bg-bg-deep/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
          <div className="readout text-sm text-accent-cyan uppercase tracking-widest mb-2 animate-pulse-dot">
            {CESIUM_UI.LOADING}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-bg-deep/90 flex items-center justify-center z-10 p-6">
          <div className="text-center">
            <div className="readout text-sm text-alert-critical uppercase tracking-widest mb-3">{CESIUM_UI.INIT_ERROR}</div>
            <div className="text-xs text-text-secondary max-w-md">{error}</div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="absolute bottom-4 left-4 bg-bg-surface/95 backdrop-blur-md border border-border-subtle rounded-lg px-3 py-1.5 pointer-events-none z-[900]">
            <div className="readout text-xs text-accent-cyan">
              {CESIUM_UI.PLATEAU_LABEL}: {loadedCities}/{PLATEAU_CITIES.length}{CESIUM_UI.PLATEAU_CITY_UNIT}
            </div>
          </div>

          {/* Enemy phase indicator */}
          {turnPhase === "enemy" && (
            <div className="absolute inset-0 pointer-events-none z-[800] bg-gradient-to-br from-transparent via-transparent to-alert-critical/20 animate-pulse" />
          )}

          {/* Scene controls + camera presets — top-left collapsible panel */}
          <div className="absolute top-16 left-3 bg-bg-surface/95 backdrop-blur-md border border-border-subtle rounded-lg overflow-hidden z-[900] w-48">
            <button
              onClick={() => setSceneOpen(o => !o)}
              className="w-full px-3 py-1.5 border-b border-border-subtle hover:bg-bg-elevated/30 transition-colors flex items-center justify-between"
            >
              <span className="readout text-xs text-accent-cyan uppercase tracking-wider">{CESIUM_UI.CONTROL_TITLE}</span>
              <span className="text-text-dim text-xs">{sceneOpen ? "▲" : "▼"}</span>
            </button>
            {sceneOpen && (
              <div className="p-2 space-y-3">
                {/* Camera presets */}
                <div>
                  <div className="readout text-xs text-text-dim uppercase tracking-wider mb-1 px-1">
                    {CESIUM_UI.CAMERA_COMPACT}
                  </div>
                  <div className="space-y-0.5">
                    {CAMERA_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => flyToPreset(preset)}
                        className="w-full text-left px-2.5 py-1 rounded text-xs text-text-secondary hover:bg-accent-cyan/10 hover:text-accent-cyan transition-colors"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lighting */}
                <div>
                  <div className="readout text-xs text-text-dim uppercase tracking-wider mb-1 px-1">
                    {CESIUM_UI.TIME_LABEL}
                  </div>
                  <div className="flex gap-0.5">
                    {([
                      { key: "auto", label: CESIUM_UI.TIME_NOW },
                      { key: "day", label: CESIUM_UI.TIME_DAY },
                      { key: "night", label: CESIUM_UI.TIME_NIGHT },
                    ] as const).map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setLighting(opt.key)}
                        className={`flex-1 px-1.5 py-1 rounded text-xs transition-colors ${
                          lighting === opt.key
                            ? "bg-accent-cyan/15 text-accent-cyan"
                            : "text-text-dim hover:text-text-secondary hover:bg-bg-elevated/40"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Terrain exaggeration */}
                <div>
                  <div className="flex items-center justify-between mb-1 px-1">
                    <span className="readout text-xs text-text-dim uppercase tracking-wider">
                      {CESIUM_UI.TERRAIN_EXAG}
                    </span>
                    <span className="readout text-xs text-accent-cyan">×{terrainExag.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.5}
                    value={terrainExag}
                    onChange={e => setTerrainExag(Number(e.target.value))}
                    className="w-full h-1 appearance-none bg-bg-elevated rounded cursor-pointer [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-accent-cyan [&::-webkit-slider-thumb]:rounded-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
