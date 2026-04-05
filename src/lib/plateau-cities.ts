// PLATEAU 3D city tilesets (国土交通省 Project PLATEAU)
// https://www.mlit.go.jp/plateau/

export interface PlateauCity {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tilesetUrl: string;
}

// Tilesets hosted on Project PLATEAU's assets CDN (via Re:Earth)
export const PLATEAU_CITIES: PlateauCity[] = [
  {
    id: "tokyo-taito",
    name: "東京・台東区",
    lat: 35.7150,
    lng: 139.7965,
    tilesetUrl: "https://assets.cms.plateau.reearth.io/assets/59/0fbb20-59cb-4ce5-9d12-2273ce72e6d2/13106_taito-ku_city_2024_citygml_1_op_bldg_3dtiles_13106_taito-ku_lod2_no_texture/tileset.json",
  },
  {
    id: "tokyo-minato",
    name: "東京・港区",
    lat: 35.6585,
    lng: 139.7454,
    tilesetUrl: "https://assets.cms.plateau.reearth.io/assets/ee/252e4a-c745-45fd-95f0-f0a396d4e395/13103_minato-ku_pref_2023_citygml_2_op_bldg_3dtiles_13103_minato-ku_lod2_no_texture/tileset.json",
  },
  {
    id: "sendai",
    name: "仙台市",
    lat: 38.2526,
    lng: 140.8697,
    tilesetUrl: "https://assets.cms.plateau.reearth.io/assets/bd/e78220-9044-4dcd-9519-5ff5730e25f2/04100_sendai-shi_city_2024_citygml_1_op_bldg_3dtiles_04101_aoba-ku_lod2_no_texture/tileset.json",
  },
  {
    id: "hiroshima",
    name: "広島市",
    lat: 34.3954,
    lng: 132.4553,
    tilesetUrl: "https://assets.cms.plateau.reearth.io/assets/96/b46095-22bc-4190-b658-3ef163e36c9f/34100_hiroshima-shi_city_2024_citygml_1_op_bldg_3dtiles_34101_naka-ku_lod2_no_texture/tileset.json",
  },
  {
    id: "fukuoka",
    name: "福岡市",
    lat: 33.5901,
    lng: 130.4017,
    tilesetUrl: "https://assets.cms.plateau.reearth.io/assets/bf/d8ff81-ad03-486b-a021-6865e50c3b23/40130_fukuoka-shi_city_2024_citygml_2_op_bldg_3dtiles_40133_chuo-ku_lod2/tileset.json",
  },
];

// Quick-nav presets for camera positioning (base coordinates reused)
export interface CameraPreset {
  id: string;
  name: string;
  lat: number;
  lng: number;
  height: number; // meters
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: "japan", name: "日本全体", lat: 36.2, lng: 138.5, height: 2_500_000 },
  { id: "sapporo", name: "札幌", lat: 43.0621, lng: 141.3544, height: 10_000 },
  { id: "sendai", name: "仙台", lat: 38.2526, lng: 140.8697, height: 8_000 },
  { id: "tokyo", name: "東京", lat: 35.68, lng: 139.76, height: 8_000 },
  { id: "nagoya", name: "名古屋", lat: 35.1815, lng: 136.9066, height: 10_000 },
  { id: "osaka", name: "大阪", lat: 34.6937, lng: 135.5023, height: 10_000 },
  { id: "hiroshima", name: "広島", lat: 34.3954, lng: 132.4553, height: 8_000 },
  { id: "fukuoka", name: "福岡", lat: 33.5904, lng: 130.4017, height: 10_000 },
];

// Default camera position — centered over Japan at tactical altitude
export const DEFAULT_VIEW = {
  lat: 36.2,
  lng: 138.5,
  height: 800_000, // meters
  heading: 0,
  pitch: -45,
  roll: 0,
};
