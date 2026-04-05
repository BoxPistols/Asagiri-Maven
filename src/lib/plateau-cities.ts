// PLATEAU 3D city tilesets (国土交通省 Project PLATEAU)
// https://www.mlit.go.jp/plateau/

export interface PlateauCity {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tilesetUrl: string;
}

// Tilesets hosted on Project PLATEAU's assets CDN
export const PLATEAU_CITIES: PlateauCity[] = [
  // Tokyo (3 wards)
  {
    id: "tokyo-chiyoda",
    name: "東京・千代田区",
    lat: 35.6938,
    lng: 139.7534,
    tilesetUrl: "https://assets.cms.plateau.reearth.io/assets/11/861920-9fb7-4f49-b365-ffdbad6e31f7/13101_chiyoda-ku_city_2022_citygml_3_op_bldg_3dtiles_13101_chiyoda_lod2/tileset.json",
  },
  {
    id: "tokyo-minato",
    name: "東京・港区",
    lat: 35.6580,
    lng: 139.7514,
    tilesetUrl: "https://assets.cms.plateau.reearth.io/assets/bd/3fa59c-a4ae-4f5a-9c91-ea6e55b75bb0/13103_minato-ku_city_2022_citygml_3_op_bldg_3dtiles_13103_minato_lod2/tileset.json",
  },
  {
    id: "tokyo-taito",
    name: "東京・台東区",
    lat: 35.7127,
    lng: 139.7799,
    tilesetUrl: "https://assets.cms.plateau.reearth.io/assets/11/b7eaf6-58eb-494c-9fde-5d9ec9e2f38b/13106_taito-ku_city_2022_citygml_3_op_bldg_3dtiles_13106_taito_lod2/tileset.json",
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
  { id: "tokyo", name: "東京", lat: 35.68, lng: 139.76, height: 8_000 },
  { id: "osaka", name: "大阪", lat: 34.6937, lng: 135.5023, height: 10_000 },
  { id: "nagoya", name: "名古屋", lat: 35.1815, lng: 136.9066, height: 10_000 },
  { id: "fukuoka", name: "福岡", lat: 33.5904, lng: 130.4017, height: 10_000 },
  { id: "sapporo", name: "札幌", lat: 43.0621, lng: 141.3544, height: 10_000 },
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
