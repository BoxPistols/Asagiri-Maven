// ========== MAVEN COMMAND: Wave Scenario Definitions ==========

import type { WaveConfig } from "@/lib/game-types";
import {
  SCOUT_DRONE,
  COMBAT_DRONE,
  PATROL_SHIP,
  ASSAULT_SHIP,
  COMMAND_SHIP,
  CYBER_UNIT,
  GROUND_VEHICLE,
  ELITE_VEHICLE,
} from "@/lib/unit-templates";

// ---------------------------------------------------------------------------
// Helper: build an enemy spawn entry from a template + position
// ---------------------------------------------------------------------------
function enemy(
  template: typeof SCOUT_DRONE,
  index: number,
  lat: number,
  lng: number,
  detail: string,
) {
  return {
    faction: "enemy" as const,
    type: template.type,
    name: `${template.namePrefix}-${String(index).padStart(2, "0")}`,
    lat,
    lng,
    hp: template.hp,
    maxHp: template.hp,
    attack: template.attack,
    defense: template.defense,
    speed: template.speed,
    detail,
  };
}

// ---------------------------------------------------------------------------
// Wave 1 — 偵察 (Reconnaissance)
// ---------------------------------------------------------------------------
const wave1: WaveConfig = {
  wave: 1,
  name: "偵察",
  description: "敵偵察ドローンが太平洋側から接近。情報収集と初期対応。",
  turns: 4,
  supplyBonus: 30,
  briefing:
    "敵勢力の偵察活動を確認。小規模ドローンが接近中。まずは状況を把握し、対処してください。",
  intel: [
    "東京湾東方沖合にて小型飛行体を捕捉。速度から偵察ドローンと推定。",
    "福岡上空の防空レーダーに微弱反応。低高度飛行の無人機と分析。",
    "敵ドローンの飛行パターンは典型的な情報収集型。攻撃意図は現時点で低い。",
    "偵察ドローンの制御信号を傍受。発信源は東方海域の艦艇と推定。",
  ],
  spawnUnits: [
    // Multiple drones approaching from different directions
    enemy(SCOUT_DRONE, 1, 35.35, 140.50, "東京湾東方を低速接近中"),
    enemy(SCOUT_DRONE, 2, 33.60, 129.50, "福岡西方海上を飛行中"),
    enemy(SCOUT_DRONE, 3, 34.20, 136.90, "伊勢湾南方から接近中"),
    enemy(COMBAT_DRONE, 4, 35.00, 140.90, "房総沖を低空侵攻中"),
    enemy(COMBAT_DRONE, 5, 33.30, 130.00, "対馬海峡方面から接近"),
    enemy(SCOUT_DRONE, 6, 34.50, 139.80, "伊豆諸島方面を偵察中"),
  ],
  events: [
    {
      type: "recon",
      title: "偵察ドローン検知: 東京湾沖",
      description:
        "東京湾入口東方約80kmに小型無人機を探知。低高度で沿岸に接近中。偵察目的と推定される。",
      severity: "info",
      score: 30,
      location: "東京湾沖",
      lat: 35.35,
      lng: 140.50,
      linkedUnitIds: [],
      suggestedAction: "哨戒ドローンを展開し、監視・迎撃態勢を構築",
    },
    {
      type: "recon",
      title: "不明飛行体: 福岡沖",
      description:
        "福岡西方海上に不明な小型飛行体を確認。東シナ海方面から接近。行動パターンは偵察飛行に一致。",
      severity: "info",
      score: 25,
      location: "福岡西方海上",
      lat: 33.60,
      lng: 129.50,
      linkedUnitIds: [],
      suggestedAction: "福岡拠点の防空レーダーを最大感度に設定し追跡",
    },
    {
      type: "recon",
      title: "電波傍受: 不明通信源",
      description:
        "太平洋上から発信される暗号通信を傍受。偵察ドローンへの制御信号と推定。敵の母艦が近海に展開している可能性。",
      severity: "warning",
      score: 40,
      location: "太平洋沖合",
      lat: 34.50,
      lng: 141.00,
      linkedUnitIds: [],
      suggestedAction: "信号解析を開始し、敵母艦の位置特定を試みる",
    },
  ],
};

// ---------------------------------------------------------------------------
// Wave 2 — サイバー攻撃 (Cyber Attack)
// ---------------------------------------------------------------------------
const wave2: WaveConfig = {
  wave: 2,
  name: "サイバー攻撃",
  description: "電子戦攻撃により通信・センサー網が脅威に晒される。",
  turns: 5,
  supplyBonus: 30,
  briefing:
    "電子戦攻撃を検知。通信網とセンサーシステムに異常が発生しています。サイバー防御を優先してください。",
  intel: [
    "名古屋拠点の通信回線に断続的なジャミングを検出。帯域幅が40%低下。",
    "防空レーダーにゴースト反応が多数出現。敵のセンサー欺瞞と推定。",
    "データベースへの不正アクセス試行を遮断。攻撃元はプロキシ経由で特定困難。",
    "暗号鍵の漏洩リスクあり。全拠点に通信暗号の更新を指示。",
    "サイバー攻撃の規模と組織性から、国家レベルの支援を受けた部隊と分析。",
  ],
  spawnUnits: [
    // Cyber units — virtual presence near key infrastructure
    enemy(CYBER_UNIT, 1, 35.68, 139.77, "東京通信ノードを攻撃中"),
    enemy(CYBER_UNIT, 2, 34.69, 135.50, "大阪センサー網に侵入試行"),
    // Escort drone keeping watch from the Pacific
    enemy(COMBAT_DRONE, 3, 34.00, 140.80, "太平洋上を哨戒飛行中"),
  ],
  events: [
    {
      type: "cyber",
      title: "通信妨害: 東京―名古屋回線",
      description:
        "東京と名古屋を結ぶ基幹通信回線に強力なジャミングを検出。部隊間の連携に支障。情報KPIに影響。",
      severity: "critical",
      score: 70,
      location: "東京―名古屋間",
      lat: 35.18,
      lng: 137.00,
      linkedUnitIds: [],
      suggestedAction: "サイバー防御ユニットを通信ノードに配置し妨害を排除",
    },
    {
      type: "cyber",
      title: "センサー欺瞞: 大阪防空網",
      description:
        "大阪周辺の防空レーダーに大量のゴースト反応が出現。実目標と虚偽目標の判別が困難に。",
      severity: "warning",
      score: 55,
      location: "大阪防空圏",
      lat: 34.69,
      lng: 135.50,
      linkedUnitIds: [],
      suggestedAction: "レーダーフィルタリングの手動切替とサイバー部隊による攻撃元遮断",
    },
    {
      type: "cyber",
      title: "データ窃取試行: 作戦データベース",
      description:
        "作戦司令部のデータベースに対し持続的な不正アクセスを検出。機密情報の漏洩リスクが上昇中。",
      severity: "critical",
      score: 80,
      location: "統合司令部",
      lat: 35.69,
      lng: 139.69,
      linkedUnitIds: [],
      suggestedAction: "緊急ファイアウォール強化と攻撃元IPの遮断を実施",
    },
    {
      type: "recon",
      title: "電子偵察ドローン: 太平洋上",
      description:
        "太平洋上に攻撃型ドローンを確認。サイバー攻撃の物理的支援と推定。通信中継の役割か。",
      severity: "warning",
      score: 45,
      location: "太平洋上",
      lat: 34.00,
      lng: 140.80,
      linkedUnitIds: [],
      suggestedAction: "哨戒部隊を派遣し、物理的な通信中継を破壊",
    },
  ],
};

// ---------------------------------------------------------------------------
// Wave 3 — 海上封鎖 (Naval Blockade)
// ---------------------------------------------------------------------------
const wave3: WaveConfig = {
  wave: 3,
  name: "海上封鎖",
  description: "敵艦隊が主要航路を封鎖。補給線の防衛が急務。",
  turns: 6,
  supplyBonus: 30,
  briefing:
    "敵艦隊が主要航路を封鎖中。補給線の確保が最優先です。海上戦力を展開してください。",
  intel: [
    "関門海峡付近に敵哨戒艦を視認。福岡―大阪間の商船航路が遮断される恐れ。",
    "東京湾入口に敵艦2隻が展開。貿易船の入港が停止状態。物資KPIの低下に注意。",
    "敵艦は対艦ミサイルを搭載していると推定。接近時は十分な護衛が必要。",
    "補給船団が紀伊水道で待機中。航路の安全確保なくして物資輸送は不可能。",
    "偵察衛星が南方海域にさらなる敵艦の集結を確認。増援の可能性あり。",
  ],
  spawnUnits: [
    // Ships blockading Fukuoka-Osaka route (Kanmon Strait / Sea of Japan side)
    enemy(PATROL_SHIP, 1, 33.95, 130.80, "関門海峡付近で航路封鎖中"),
    // Ships at Tokyo Bay entrance
    enemy(PATROL_SHIP, 2, 35.25, 139.90, "東京湾入口を封鎖中"),
    enemy(PATROL_SHIP, 3, 35.10, 140.10, "東京湾南東で遊弋中"),
    // Escort drones flying cover
    enemy(COMBAT_DRONE, 4, 34.20, 131.00, "日本海南西海域を哨戒"),
    enemy(COMBAT_DRONE, 5, 35.00, 140.50, "房総沖を飛行中"),
  ],
  events: [
    {
      type: "supply_cut",
      title: "航路封鎖: 関門海峡",
      description:
        "敵哨戒艦が関門海峡付近に展開し、福岡―大阪間の海上補給路を封鎖。物資輸送が完全停止。",
      severity: "critical",
      score: 85,
      location: "関門海峡",
      lat: 33.95,
      lng: 130.80,
      linkedUnitIds: [],
      suggestedAction: "対艦戦力を集中し封鎖艦を排除。護衛付き補給船団の再開を目指す",
    },
    {
      type: "supply_cut",
      title: "航路封鎖: 東京湾入口",
      description:
        "敵艦2隻が東京湾入口を制圧。首都圏への海上物資輸送が遮断されています。経済的影響甚大。",
      severity: "critical",
      score: 90,
      location: "東京湾口",
      lat: 35.25,
      lng: 139.90,
      linkedUnitIds: [],
      suggestedAction: "海上戦力と航空支援を同時投入し、東京湾の安全を確保",
    },
    {
      type: "attack",
      title: "商船への威嚇射撃",
      description:
        "紀伊水道を航行中の民間商船に対し、敵艦が威嚇射撃を実施。全商船が退避を開始。",
      severity: "warning",
      score: 65,
      location: "紀伊水道",
      lat: 33.90,
      lng: 135.10,
      linkedUnitIds: [],
      suggestedAction: "護衛艦を紀伊水道に派遣し、安全航行を確保",
    },
    {
      type: "recon",
      title: "敵増援情報: 南方海域",
      description:
        "フィリピン海北部に追加の敵艦船群を衛星が確認。24時間以内に日本近海到達の見込み。",
      severity: "warning",
      score: 50,
      location: "フィリピン海北部",
      lat: 30.00,
      lng: 138.00,
      linkedUnitIds: [],
      suggestedAction: "現在の封鎖排除を急ぎ、増援到着前に航路を確保",
    },
  ],
};

// ---------------------------------------------------------------------------
// Wave 4 — 多方面侵攻 (Multi-Front Assault)
// ---------------------------------------------------------------------------
const wave4: WaveConfig = {
  wave: 4,
  name: "多方面侵攻",
  description: "複数方面からの同時攻撃。戦力配分が勝敗を分ける。",
  turns: 7,
  supplyBonus: 30,
  briefing:
    "複数方面からの同時攻撃を確認。全拠点で防衛態勢を強化。戦力の配分が勝敗を分けます。",
  intel: [
    "上陸部隊が九州西岸に接近中。地上戦力の展開を急いでください。",
    "名古屋拠点に対するミサイル攻撃の兆候。対空防御を最大態勢に。",
    "東京湾で敵潜水艦の影を探知。対潜哨戒を強化する必要があります。",
    "士気指標が低下傾向。長期戦の消耗が部隊に影響し始めています。",
    "敵はあえて戦線を拡大し、こちらの戦力を分散させる戦略をとっていると分析。",
    "各拠点の連携が鍵です。孤立した拠点は個別に撃破される危険があります。",
  ],
  spawnUnits: [
    // Ground vehicles landing on Kyushu west coast
    enemy(GROUND_VEHICLE, 1, 33.25, 129.80, "九州西岸から上陸接近中"),
    enemy(GROUND_VEHICLE, 2, 33.40, 129.70, "五島列島方面から接近中"),
    enemy(ELITE_VEHICLE, 3, 33.10, 129.90, "九州南西から上陸作戦中"),
    // Ground vehicle approaching Nagoya from sea
    enemy(GROUND_VEHICLE, 4, 34.70, 137.30, "伊勢湾から名古屋方面へ上陸"),
    // Drones providing air cover
    enemy(COMBAT_DRONE, 5, 33.50, 129.50, "九州上空で制空任務"),
    enemy(COMBAT_DRONE, 6, 35.30, 140.20, "房総半島東方を哨戒"),
    enemy(COMBAT_DRONE, 7, 34.80, 137.50, "伊勢湾上空を飛行"),
    // Ships providing fire support
    enemy(ASSAULT_SHIP, 8, 33.00, 129.30, "五島列島南方で砲撃支援"),
    enemy(ASSAULT_SHIP, 9, 35.50, 140.60, "東京湾東方沖で作戦行動中"),
  ],
  events: [
    {
      type: "attack",
      title: "上陸作戦: 九州西岸",
      description:
        "敵上陸部隊が九州西岸に接近。装甲車両を搭載した揚陸艇が複数確認されています。地上戦力の即時展開が必要。",
      severity: "critical",
      score: 92,
      location: "九州西岸",
      lat: 33.25,
      lng: 129.80,
      linkedUnitIds: [],
      suggestedAction: "地上部隊を海岸線に展開し上陸阻止。航空支援も要請",
    },
    {
      type: "attack",
      title: "艦砲射撃: 名古屋方面",
      description:
        "伊勢湾に進出した敵艦が名古屋方面の拠点に対し砲撃を開始。上陸の前段階と推定。",
      severity: "critical",
      score: 88,
      location: "名古屋・伊勢湾",
      lat: 34.70,
      lng: 137.30,
      linkedUnitIds: [],
      suggestedAction: "対艦ミサイルで敵艦を排除し、名古屋拠点の防空態勢を強化",
    },
    {
      type: "attack",
      title: "空襲: 東京圏",
      description:
        "東京湾東方沖の敵強襲艦から攻撃ドローンが多数発進。首都圏の防空戦力で迎撃が必要。",
      severity: "critical",
      score: 85,
      location: "東京東方海域",
      lat: 35.50,
      lng: 140.60,
      linkedUnitIds: [],
      suggestedAction: "防空システムを全力稼働させ、敵ドローン群を迎撃",
    },
    {
      type: "sabotage",
      title: "後方撹乱: 補給拠点への破壊工作",
      description:
        "大阪補給拠点周辺で不審な活動を検知。敵の特殊部隊による後方撹乱の可能性。物資KPI低下リスク。",
      severity: "warning",
      score: 60,
      location: "大阪拠点",
      lat: 34.69,
      lng: 135.50,
      linkedUnitIds: [],
      suggestedAction: "警備部隊による拠点周辺の掃討と警戒レベルの引き上げ",
    },
    {
      type: "cyber",
      title: "通信妨害再開: 全国ネットワーク",
      description:
        "多方面攻撃に連動し、再びサイバー攻撃が激化。各拠点間の通信品質が悪化しています。",
      severity: "warning",
      score: 55,
      location: "全国通信網",
      lat: 35.00,
      lng: 137.00,
      linkedUnitIds: [],
      suggestedAction: "衛星回線を代替通信手段として確保し、電子戦部隊で対処",
    },
  ],
};

// ---------------------------------------------------------------------------
// Wave 5 — 最終決戦 (Final Battle)
// ---------------------------------------------------------------------------
const wave5: WaveConfig = {
  wave: 5,
  name: "最終決戦",
  description: "敵司令艦を撃沈し、侵攻作戦を終結させよ。",
  turns: 6,
  supplyBonus: 30,
  briefing:
    "敵司令艦を捕捉。これが最後の戦いです。全戦力を集中し、敵指揮系統を無力化せよ。",
  intel: [
    "敵司令艦は重装甲で防御されています。正面攻撃だけでは不十分。多方向からの同時攻撃を推奨。",
    "司令艦の護衛編隊は強力ですが、艦を沈めれば護衛も瓦解すると分析。",
    "敵司令艦からの通信量が急増。残存部隊に総攻撃を命じている模様。",
    "全KPIに圧力がかかっています。最後まで指標の管理を怠らないでください。",
    "我が方の残存戦力は限られています。この一戦に全てを賭けてください。",
    "勝利条件: 敵司令艦の撃沈。これをもって敵の組織的抵抗は終了すると判断。",
  ],
  spawnUnits: [
    // Boss — enemy command ship, east of Tokyo (appears via event on turn 2+)
    enemy(COMMAND_SHIP, 0, 35.40, 141.50, "敵艦隊旗艦。東京東方沖を航行中"),
    // Escort ships
    enemy(ASSAULT_SHIP, 1, 35.20, 141.30, "司令艦護衛。南東で遊弋"),
    enemy(PATROL_SHIP, 2, 35.60, 141.40, "司令艦護衛。北東で哨戒"),
    // Drones — air screen
    enemy(COMBAT_DRONE, 3, 35.50, 141.00, "司令艦上空を防空哨戒"),
    enemy(COMBAT_DRONE, 4, 35.30, 140.80, "房総沖を攻撃飛行中"),
    enemy(COMBAT_DRONE, 5, 34.80, 141.20, "南東海域から接近中"),
    // Ground vehicles — diversionary coastal raids
    enemy(ELITE_VEHICLE, 6, 35.15, 139.95, "千葉沿岸に上陸。陽動目的か"),
    enemy(GROUND_VEHICLE, 7, 33.55, 130.20, "福岡沿岸を威嚇行動中"),
  ],
  events: [
    {
      type: "boss",
      title: "敵司令艦出現: 東京東方海域",
      description:
        "敵艦隊の旗艦「司令艦」を東京東方沖合約200kmに捕捉。推定排水量40,000トン級。強力な対空・対艦兵装を装備。護衛艦隊を伴い西進中。これが最終目標です。",
      severity: "critical",
      score: 100,
      location: "東京東方沖200km",
      lat: 35.40,
      lng: 141.50,
      linkedUnitIds: [],
      suggestedAction: "全利用可能戦力を集結し、多方向から司令艦を攻撃",
    },
    {
      type: "attack",
      title: "護衛艦隊の迎撃行動",
      description:
        "司令艦の護衛艦2隻が接近する味方部隊に対し迎撃行動を開始。護衛を排除するか迂回するか判断が必要。",
      severity: "critical",
      score: 75,
      location: "東京東方沖",
      lat: 35.20,
      lng: 141.30,
      linkedUnitIds: [],
      suggestedAction: "一部戦力で護衛を牽制しつつ、主力を司令艦に集中",
    },
    {
      type: "attack",
      title: "陽動上陸: 千葉沿岸",
      description:
        "敵精鋭車両が千葉沿岸に上陸。戦力分散を狙った陽動と推定されるが、放置すれば後方に脅威。",
      severity: "warning",
      score: 60,
      location: "千葉沿岸",
      lat: 35.15,
      lng: 139.95,
      linkedUnitIds: [],
      suggestedAction: "最小限の防衛戦力で対処し、主力を司令艦攻撃に温存",
    },
    {
      type: "attack",
      title: "ドローン飽和攻撃",
      description:
        "敵ドローン群が我が方の艦隊に向けて飽和攻撃を仕掛けてきました。対空防御の限界を突く戦術。",
      severity: "critical",
      score: 80,
      location: "房総沖海域",
      lat: 35.30,
      lng: 140.80,
      linkedUnitIds: [],
      suggestedAction: "防空システムを集中運用し、重要艦艇を優先防護",
    },
    {
      type: "supply_cut",
      title: "最終補給遮断",
      description:
        "敵が残存補給路にも攻撃を加えています。物資KPIが急速に低下中。長期戦は不利。",
      severity: "warning",
      score: 55,
      location: "日本近海全域",
      lat: 34.00,
      lng: 139.00,
      linkedUnitIds: [],
      suggestedAction: "補給は後回しにして全力で司令艦を早期撃破する方針を推奨",
    },
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const WAVE_CONFIGS: WaveConfig[] = [wave1, wave2, wave3, wave4, wave5];

/** Total number of turns across all waves */
export const TOTAL_TURNS = WAVE_CONFIGS.reduce((sum, w) => sum + w.turns, 0);

/** Look up wave config by wave number (1-indexed) */
export function getWaveConfig(waveNumber: number): WaveConfig | undefined {
  return WAVE_CONFIGS.find((w) => w.wave === waveNumber);
}
