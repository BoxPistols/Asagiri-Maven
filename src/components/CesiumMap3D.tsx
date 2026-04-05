"use client";

import { useEffect, useRef, useState } from "react";
import { PLATEAU_CITIES, DEFAULT_VIEW } from "@/lib/plateau-cities";
import { MAP_MARKERS } from "@/lib/mock-data";

// Cesium base URL for static assets (Workers, Assets)
const CESIUM_BASE_URL = "/cesium/";
const CESIUM_ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "";

export default function CesiumMap3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [loadedCities, setLoadedCities] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof window === "undefined") return;

    // Set Cesium base URL for static asset loading
    (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = CESIUM_BASE_URL;

    let destroyed = false;
    let viewer: unknown = null;

    (async () => {
      try {
        const Cesium = await import("cesium");
        await import("cesium/Build/Cesium/Widgets/widgets.css");

        if (destroyed || !containerRef.current) return;

        // Set ion token
        if (CESIUM_ION_TOKEN) {
          Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
        }

        // Create viewer
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
        });

        const v = viewer as {
          scene: {
            globe: { enableLighting: boolean; depthTestAgainstTerrain: boolean };
            skyAtmosphere: { show: boolean };
            primitives: { add: (tileset: unknown) => unknown };
          };
          camera: { setView: (opts: Record<string, unknown>) => void };
          cesiumWidget: { creditContainer: { style: { display: string } } };
          destroy: () => void;
        };

        // Hide credit container (legal: keep minimal)
        if (v.cesiumWidget?.creditContainer) {
          (v.cesiumWidget.creditContainer as HTMLElement).style.display = "none";
        }

        // Enable lighting for realism
        v.scene.globe.enableLighting = true;
        v.scene.globe.depthTestAgainstTerrain = true;
        v.scene.skyAtmosphere.show = true;

        // Set initial camera view (tactical overview of Japan)
        v.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            DEFAULT_VIEW.lng,
            DEFAULT_VIEW.lat - 5, // offset south for tilt view
            DEFAULT_VIEW.height,
          ),
          orientation: {
            heading: Cesium.Math.toRadians(DEFAULT_VIEW.heading),
            pitch: Cesium.Math.toRadians(DEFAULT_VIEW.pitch),
            roll: Cesium.Math.toRadians(DEFAULT_VIEW.roll),
          },
        });

        setLoading(false);

        // Load PLATEAU tilesets progressively
        for (const city of PLATEAU_CITIES) {
          if (destroyed) break;
          try {
            const tileset = await Cesium.Cesium3DTileset.fromUrl(city.tilesetUrl, {
              maximumScreenSpaceError: 16,
            });
            if (destroyed) break;
            v.scene.primitives.add(tileset);
            setLoadedCities(prev => prev + 1);
          } catch (e) {
            console.warn(`Failed to load PLATEAU city: ${city.name}`, e);
          }
        }

        // Add unit markers as Cesium entities
        const addMarker = (lat: number, lng: number, name: string, color: string) => {
          const viewerWithEntities = viewer as { entities: { add: (opts: Record<string, unknown>) => unknown } };
          viewerWithEntities.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lng, lat, 1000),
            point: {
              pixelSize: 14,
              color: Cesium.Color.fromCssColorString(color),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            },
            label: {
              text: name,
              font: "14px sans-serif",
              pixelOffset: new Cesium.Cartesian2(0, -20),
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            },
          });
        };

        // Add markers from existing mock data
        for (const marker of MAP_MARKERS.slice(0, 10)) {
          const color = marker.status === "critical" ? "#ef4444"
            : marker.status === "warning" ? "#fbbf24"
            : "#22d3ee";
          addMarker(marker.lat, marker.lng, marker.label, color);
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
        try {
          (viewer as { destroy: () => void }).destroy();
        } catch { /* ignore */ }
      }
      viewerRef.current = null;
    };
  }, []);

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

      {/* PLATEAU loading indicator */}
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
    </div>
  );
}
