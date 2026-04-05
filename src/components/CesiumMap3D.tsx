"use client";

import { useEffect, useRef, useState } from "react";
import { PLATEAU_CITIES, DEFAULT_VIEW, CAMERA_PRESETS, type CameraPreset } from "@/lib/plateau-cities";
import { MAP_MARKERS } from "@/lib/mock-data";

// Cesium base URL for static assets (Workers, Assets)
const CESIUM_BASE_URL = "/cesium/";
const CESIUM_ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "";

// Tactical SVG-based billboards (encoded as data URIs)
function unitBillboardSvg(type: "base" | "vehicle" | "drone" | "ship" | "alert", status: "normal" | "warning" | "critical"): string {
  const color = status === "critical" ? "#ef4444" : status === "warning" ? "#fbbf24" : "#22d3ee";
  const icons: Record<string, string> = {
    base: `<path d="M24 6 L38 14 L38 28 L24 36 L10 28 L10 14 Z" fill="${color}22" stroke="${color}" stroke-width="2"/>
           <text x="24" y="26" text-anchor="middle" font-family="monospace" font-size="14" font-weight="900" fill="${color}">★</text>`,
    vehicle: `<rect x="10" y="16" width="28" height="12" rx="2" fill="${color}22" stroke="${color}" stroke-width="2"/>
              <rect x="16" y="10" width="14" height="8" rx="2" fill="${color}" opacity="0.8"/>
              <rect x="28" y="12" width="10" height="3" rx="1" fill="${color}"/>`,
    drone: `<circle cx="24" cy="24" r="4" fill="${color}"/>
            <circle cx="12" cy="12" r="4" fill="none" stroke="${color}" stroke-width="2"/>
            <circle cx="36" cy="12" r="4" fill="none" stroke="${color}" stroke-width="2"/>
            <circle cx="12" cy="36" r="4" fill="none" stroke="${color}" stroke-width="2"/>
            <circle cx="36" cy="36" r="4" fill="none" stroke="${color}" stroke-width="2"/>
            <line x1="16" y1="16" x2="20" y2="20" stroke="${color}" stroke-width="2"/>
            <line x1="32" y1="16" x2="28" y2="20" stroke="${color}" stroke-width="2"/>
            <line x1="16" y1="32" x2="20" y2="28" stroke="${color}" stroke-width="2"/>
            <line x1="32" y1="32" x2="28" y2="28" stroke="${color}" stroke-width="2"/>`,
    ship: `<path d="M8 28 L12 22 L36 22 L40 28 L36 34 L12 34 Z" fill="${color}22" stroke="${color}" stroke-width="2"/>
           <rect x="18" y="14" width="12" height="8" rx="1" fill="${color}" opacity="0.8"/>
           <line x1="24" y1="8" x2="24" y2="14" stroke="${color}" stroke-width="2"/>`,
    alert: `<path d="M24 6 L42 38 L6 38 Z" fill="${color}" stroke="#7f0c0c" stroke-width="2"/>
            <rect x="22" y="16" width="4" height="12" fill="#fff"/>
            <circle cx="24" cy="32" r="2" fill="#fff"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <rect width="48" height="48" rx="6" fill="rgba(11,16,32,0.85)" stroke="${color}" stroke-width="1"/>
    ${icons[type] ?? icons.base}
  </svg>`;
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type ViewerType = {
  scene: {
    globe: { enableLighting: boolean; depthTestAgainstTerrain: boolean };
    skyAtmosphere: { show: boolean };
    primitives: { add: (tileset: unknown) => unknown };
  };
  camera: {
    setView: (opts: Record<string, unknown>) => void;
    flyTo: (opts: Record<string, unknown>) => void;
  };
  cesiumWidget: { creditContainer: { style: { display: string } } };
  entities: { add: (opts: Record<string, unknown>) => unknown };
  destroy: () => void;
};

export default function CesiumMap3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerType | null>(null);
  const cesiumModuleRef = useRef<typeof import("cesium") | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedCities, setLoadedCities] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

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
        cesiumModuleRef.current = Cesium;

        if (destroyed || !containerRef.current) return;

        if (CESIUM_ION_TOKEN) {
          Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
        }

        viewer = new Cesium.Viewer(containerRef.current, {
          timeline: false,
          animation: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          baseLayerPicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          terrain: Cesium.Terrain.fromWorldTerrain(),
        }) as unknown as ViewerType;

        viewerRef.current = viewer;

        // Hide credit container
        if (viewer.cesiumWidget?.creditContainer) {
          (viewer.cesiumWidget.creditContainer as unknown as HTMLElement).style.display = "none";
        }

        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.skyAtmosphere.show = true;

        // Initial camera view
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            DEFAULT_VIEW.lng,
            DEFAULT_VIEW.lat - 5,
            DEFAULT_VIEW.height,
          ),
          orientation: {
            heading: Cesium.Math.toRadians(DEFAULT_VIEW.heading),
            pitch: Cesium.Math.toRadians(DEFAULT_VIEW.pitch),
            roll: Cesium.Math.toRadians(DEFAULT_VIEW.roll),
          },
        });

        setLoading(false);

        // Progressive PLATEAU tileset loading
        for (const city of PLATEAU_CITIES) {
          if (destroyed) break;
          try {
            const tileset = await Cesium.Cesium3DTileset.fromUrl(city.tilesetUrl, {
              maximumScreenSpaceError: 16,
            });
            if (destroyed) break;
            viewer.scene.primitives.add(tileset);
            setLoadedCities(prev => prev + 1);
          } catch (e) {
            console.warn(`Failed to load PLATEAU: ${city.name}`, e);
          }
        }

        // Add unit billboards from mock data
        for (const marker of MAP_MARKERS) {
          const status = marker.status as "normal" | "warning" | "critical";
          const typeMap: Record<string, "base" | "vehicle" | "drone" | "ship" | "alert"> = {
            facility: "base", vehicle: "vehicle", drone: "drone",
            alert: "alert", personnel: "vehicle",
          };
          const billboardType = typeMap[marker.type] ?? "vehicle";
          const svg = unitBillboardSvg(billboardType, status);

          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(marker.lng, marker.lat, 0),
            billboard: {
              image: svgToDataUri(svg),
              width: 48,
              height: 48,
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
              pixelOffset: new Cesium.Cartesian2(0, -24),
            },
            label: {
              text: marker.label,
              font: "bold 12px sans-serif",
              pixelOffset: new Cesium.Cartesian2(0, 12),
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.fromCssColorString("#0b1020"),
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
              scale: 0.8,
              translucencyByDistance: new Cesium.NearFarScalar(10_000, 1.0, 500_000, 0.0),
            },
          });
        }
      } catch (err) {
        if (!destroyed) {
          console.error("Cesium init error:", err);
          setError(err instanceof Error ? err.message : "Cesium initialization failed");
          setLoading(false);
        }
      }
    })();

    return () => {
      destroyed = true;
      if (viewer) {
        try { viewer.destroy(); } catch { /* ignore */ }
      }
      viewerRef.current = null;
    };
  }, []);

  // Fly to preset camera
  const flyToPreset = (preset: CameraPreset) => {
    const viewer = viewerRef.current;
    const Cesium = cesiumModuleRef.current;
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
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-bg-deep/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
          <div className="readout text-sm text-accent-cyan uppercase tracking-widest mb-2 animate-pulse-dot">
            CESIUM エンジン初期化中...
          </div>
          <div className="text-xs text-text-secondary">Loading terrain & imagery</div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-bg-deep/90 flex flex-col items-center justify-center z-10 p-6">
          <div className="readout text-sm text-alert-critical uppercase tracking-widest mb-3">
            初期化エラー
          </div>
          <div className="text-xs text-text-secondary max-w-md text-center">{error}</div>
        </div>
      )}

      {/* PLATEAU status indicator */}
      {!loading && !error && (
        <div className="absolute top-4 left-4 bg-bg-surface/95 backdrop-blur-md border border-border-subtle rounded-lg px-3 py-2 pointer-events-none">
          <div className="readout text-xs text-accent-cyan uppercase tracking-wider mb-0.5">
            PLATEAU 3D都市モデル
          </div>
          <div className="readout text-xs text-text-secondary">
            {loadedCities} / {PLATEAU_CITIES.length} 都市ロード済み
          </div>
        </div>
      )}

      {/* Camera preset quick-nav */}
      {!loading && !error && (
        <div className="absolute top-4 right-4 bg-bg-surface/95 backdrop-blur-md border border-border-subtle rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-border-subtle">
            <div className="readout text-xs text-accent-cyan uppercase tracking-wider">
              カメラ移動
            </div>
          </div>
          <div className="p-1.5 space-y-0.5">
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
      )}
    </div>
  );
}
