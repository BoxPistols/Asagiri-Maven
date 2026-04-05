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

// Default camera position — centered over Japan at tactical altitude
export const DEFAULT_VIEW = {
  lat: 36.2,
  lng: 138.5,
  height: 800_000, // meters
  heading: 0,
  pitch: -45,
  roll: 0,
};
