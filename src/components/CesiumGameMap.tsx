"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PLATEAU_CITIES, DEFAULT_VIEW, CAMERA_PRESETS, type CameraPreset } from "@/lib/plateau-cities";
import type { GameUnit, TurnPhase } from "@/lib/game-types";

const CESIUM_BASE_URL = "/cesium/";
const CESIUM_ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "";

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

type ViewerType = {
  scene: {
    globe: { enableLighting: boolean; depthTestAgainstTerrain: boolean };
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
  screenSpaceEventHandler: unknown;
  destroy: () => void;
};

interface CesiumGameMapProps {
  playerUnits: GameUnit[];
  enemyUnits: GameUnit[];
  selectedUnitId: string | null;
  actedUnitIds: string[];
  turnPhase: TurnPhase;
  onUnitClick: (id: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  focusTarget: { lat: number; lng: number; key: string } | null;
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
}: CesiumGameMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerType | null>(null);
  const cesiumRef = useRef<typeof import("cesium") | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedCities, setLoadedCities] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Initialize viewer
  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof window === "undefined") return;
    (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = CESIUM_BASE_URL;

    let destroyed = false;
    let viewer: ViewerType | null = null;

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
          } catch (e) {
            console.warn(`PLATEAU load failed: ${city.name}`, e);
          }
        }
      } catch (err) {
        if (!destroyed) {
          console.error("Cesium init error:", err);
          setError(err instanceof Error ? err.message : "Cesium init failed");
          setLoading(false);
        }
      }
    })();

    return () => {
      destroyed = true;
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
      const svg = unitBillboardSvg(iconType, faction, hpPct, acted, selected);
      const image = svgToDataUri(svg);
      const pos = Cesium.Cartesian3.fromDegrees(unit.lng, unit.lat, 100);
      currentIds.add(unit.id);

      const existing = viewer.entities.getById(unit.id) as { position?: { setValue: (v: unknown) => void }; billboard?: { image?: { setValue: (v: unknown) => void } }; label?: { text?: { setValue: (v: string) => void } } } | undefined;
      if (existing) {
        existing.position?.setValue(pos);
        existing.billboard?.image?.setValue(image);
        existing.label?.text?.setValue(unit.name);
        return;
      }
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
    for (const id of toRemove) viewer.entities.removeById(id);
  }, [playerUnits, enemyUnits, selectedUnitId, actedUnitIds]);

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
            CESIUM エンジン初期化中...
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-bg-deep/90 flex items-center justify-center z-10 p-6">
          <div className="text-center">
            <div className="readout text-sm text-alert-critical uppercase tracking-widest mb-3">初期化エラー</div>
            <div className="text-xs text-text-secondary max-w-md">{error}</div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="absolute bottom-4 left-4 bg-bg-surface/95 backdrop-blur-md border border-border-subtle rounded-lg px-3 py-1.5 pointer-events-none z-[900]">
            <div className="readout text-xs text-accent-cyan">
              PLATEAU: {loadedCities}/{PLATEAU_CITIES.length}都市
            </div>
          </div>

          {/* Enemy phase indicator */}
          {turnPhase === "enemy" && (
            <div className="absolute inset-0 pointer-events-none z-[800] bg-gradient-to-br from-transparent via-transparent to-alert-critical/20 animate-pulse" />
          )}

          {/* Camera presets */}
          <div className="absolute top-16 right-3 bg-bg-surface/95 backdrop-blur-md border border-border-subtle rounded-lg overflow-hidden z-[900]">
            <div className="px-3 py-1.5 border-b border-border-subtle">
              <div className="readout text-xs text-accent-cyan uppercase tracking-wider">カメラ</div>
            </div>
            <div className="p-1 space-y-0.5">
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
        </>
      )}
    </div>
  );
}
