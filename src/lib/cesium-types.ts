// Typed wrappers for Cesium objects used by CesiumGameMap.
// These reduce `as unknown as` casting noise in the component.

export interface CesiumViewer {
  scene: {
    globe: {
      enableLighting: boolean;
      depthTestAgainstTerrain: boolean;
      terrainExaggeration?: number;
    };
    skyAtmosphere: { show: boolean };
    primitives: { add: (tileset: unknown) => unknown };
    canvas: HTMLCanvasElement;
    pick: (pos: { x: number; y: number }) => { id?: { id?: string } } | undefined;
    pickPosition?: (pos: { x: number; y: number }) => unknown;
  };
  camera: {
    setView: (opts: Record<string, unknown>) => void;
    flyTo: (opts: Record<string, unknown>) => void;
    pickEllipsoid?: (position: { x: number; y: number }, ellipsoid?: unknown) => unknown;
  };
  cesiumWidget: { creditContainer: HTMLElement };
  entities: {
    add: (opts: Record<string, unknown>) => CesiumEntity;
    removeById: (id: string) => boolean;
    getById: (id: string) => CesiumEntity | undefined;
    values: CesiumEntity[];
  };
  clock?: { currentTime: unknown; shouldAnimate?: boolean };
  destroy: () => void;
}

export interface CesiumEntity {
  id: string;
  position?: { setValue: (v: unknown) => void };
  billboard?: {
    image?: { setValue: (v: unknown) => void };
  };
  label?: {
    text?: { setValue: (v: string) => void };
  };
}

export interface CesiumHandler {
  destroy: () => void;
}

export interface MapEvent {
  target?: {
    on?: (event: string, handler: (e: unknown) => void) => void;
    flyTo?: (latlng: [number, number], zoom?: number, options?: { duration?: number }) => void;
    getZoom?: () => number;
  };
}
