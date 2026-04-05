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
    movePoints: template.movePoints,
    stepDistance: template.stepDistance,
    detail,
  };
}

// ---------------------------------------------------------------------------
// Wave 1 — 偵察 (Reconnaissance)
// ---------------------------------------------------------------------------
const wave1: WaveConfig = {
  wave: 1,
  name: "忍び寄る影",
  description: "深夜、国境のレーダーが沈黙を破る。静かに、しかし確実に──それは始まった。",
  turns: 4,
  supplyBonus: 30,
  briefing:
    "司令官、緊急招集に応じてくれて感謝する。\n\n02:47、対馬海峡上空で異常信号を捕捉した。\nほぼ同時に、能登半島沖、そして宗谷海峡からも──。\n\n三方向から、だ。偶然ではない。\n\n敵はまず影を送ってきた。我々の目を測るために。\n\n国民はまだ眠っている。君の判断が、彼らの朝を決める。",
  intel: [
    "02:51 対馬海峡上空、高度280m。敵ドローンの熱源反応、識別できず。",
    "03:04 能登半島北方150km、日本海を南下する無人機を確認。信号は大陸方向へ。",
    "03:18 宗谷海峡、気温-4度。レーダー反射面から推定、機体サイズ直径2m。",
    "03:29 傍受した暗号通信を解読中…『目標確認、次段階へ』──何かが始まる。",
    "03:42 衛星画像解析: 日本海上に艦艇の影、複数。母艦と推定される。",
  ],
  spawnUnits: [
    // Turn 0: enemies approach from realistic vectors (west and north)
    enemy(SCOUT_DRONE, 1, 33.30, 128.80, "対馬海峡西方から低空接近中"), // East China Sea / toward Kyushu
    enemy(SCOUT_DRONE, 2, 37.20, 136.50, "能登半島沖・日本海を南下中"), // Sea of Japan / toward Hokuriku
    enemy(SCOUT_DRONE, 3, 45.20, 142.00, "宗谷海峡南下・北海道北方"), // North of Hokkaido / Russia direction
  ],
  reinforcements: [
    {
      turn: 2,
      units: [
        enemy(SCOUT_DRONE, 4, 26.80, 127.40, "沖縄本島西方から接近"), // Okinawa direction
        enemy(SCOUT_DRONE, 5, 35.80, 134.80, "鳥取沖・日本海側"),
        enemy(COMBAT_DRONE, 6, 33.50, 128.50, "五島列島方面から侵攻"),
      ],
    },
    {
      turn: 4,
      units: [
        enemy(COMBAT_DRONE, 7, 38.50, 137.20, "佐渡沖・日本海を侵攻中"),
        enemy(COMBAT_DRONE, 8, 43.80, 143.50, "オホーツク海から南下中"),
      ],
    },
  ],
  events: [
    {
      type: "recon",
      title: "【対馬海峡】未確認機、南下中",
      description:
        "玄界灘の漁船が奇妙な音を聞いたと通報。\n対馬海峡西方60km、我々のレーダーがそれを捉えた。\n\n福岡は200万人の街だ。もし彼らが侵入すれば──。\n\nしかし単独なら。まだ間に合う。",
      severity: "warning",
      score: 45,
      location: "対馬海峡西方",
      lat: 33.30,
      lng: 128.80,
      linkedUnitIds: [],
      suggestedAction: "福岡哨戒基地のドローンを発進させ、接触前に阻止せよ",
    },
    {
      type: "recon",
      title: "【能登半島沖】日本海の闇",
      description:
        "金沢の夜景は静かだ。誰もまだ気づいていない。\n能登半島から150km、奴らは海面すれすれを飛んでいる。\n\nレーダー影が小さすぎる。これは高性能機だ。\n\n名古屋前線基地は応答可能。急げ。",
      severity: "warning",
      score: 40,
      location: "能登半島沖",
      lat: 37.20,
      lng: 136.50,
      linkedUnitIds: [],
      suggestedAction: "名古屋から偵察ドローンを日本海方面へ展開",
    },
    {
      type: "recon",
      title: "【宗谷海峡】北の訪問者",
      description:
        "稚内の漁民たちが50年見てきたのは、流氷だけだった。\n今夜、それ以外の何かが海峡を越えた。\n\n気温-4度。機体は氷を纏いながら飛んでいる。\n北海道の人々を守れるのは君だけだ。",
      severity: "warning",
      score: 42,
      location: "宗谷海峡",
      lat: 45.20,
      lng: 142.00,
      linkedUnitIds: [],
      suggestedAction: "札幌補給基地から北方警戒を強化、宗谷海峡を封鎖せよ",
    },
  ],
};

// ---------------------------------------------------------------------------
// Wave 2 — サイバー攻撃 (Cyber Attack)
// ---------------------------------------------------------------------------
const wave2: WaveConfig = {
  wave: 2,
  name: "見えざる刃",
  description: "敵は電波の向こう側から攻めてきた。画面の中で戦争が始まる。",
  turns: 5,
  supplyBonus: 30,
  briefing:
    "昨夜の偵察は、ただの前哨戦だった。\n\n05:20、名古屋の通信基盤が突然機能不全に陥った。\n続いて大阪──そして東京のレーダーが幻影を映し始めた。\n\nサイバー攻撃だ。しかもプロフェッショナルの仕業。\nこれは単なる犯罪組織のやり口じゃない。国家規模の組織力だ。\n\n奴らは我々の目と耳を奪おうとしている。\n盲目になる前に、攻撃源を特定し、叩かなければ。\n\n時間はない。",
  intel: [
    "05:23 名古屋通信回線、帯域幅42%低下。復旧不能。",
    "05:31 レーダー画面に『幽霊』──存在しない目標が映る。現場は混乱。",
    "05:45 データセンターへの侵入試行1,847件/分。防火壁が軋み始めている。",
    "06:02 暗号鍵更新中──しかし更新中は通信が途切れる。ジレンマだ。",
    "06:14 敵の指揮系統、パターンから特定。北京時間に合わせた運用。分かるだろう。",
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
  name: "海の壁",
  description: "日本は島国だ。海を封じられれば、我々は餓える。",
  turns: 6,
  supplyBonus: 30,
  briefing:
    "まずいことになった、司令官。\n\n関門海峡に敵艦隊が陣取った。\n福岡と大阪を繋ぐ商船航路は、もう使えない。\n\n同時に東京湾入口にも2隻。スーパーから物資が消えるのは時間の問題だ。\n\n日本は海に囲まれている。海を封じられるということは──\n食料が、燃料が、薬が入ってこないということだ。\n\n君が動かなければ、餓える国民が出る。\nそれだけは避けなければ。",
  intel: [
    "07:00 関門海峡、敵艦から発煙弾。商船の通過を威圧。",
    "07:15 東京湾沖、貿易船『さくら丸』が引き返した。港湾は混乱。",
    "07:32 敵哨戒艦、対艦ミサイル4発搭載を確認。接近時は注意。",
    "07:48 紀伊水道に我が補給船団11隻、立ち往生。護衛なしでは動けない。",
    "08:05 衛星が捉えた──南方海域に第二艦隊。奴らは本気だ。",
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
  name: "引き裂かれる列島",
  description: "すべての拠点が同時に燃える。国土が、引き裂かれる。",
  turns: 7,
  supplyBonus: 30,
  briefing:
    "司令官…状況を報告する。\n\n本日未明、敵上陸部隊が九州西岸の五島列島方面に到達。\n同時刻、名古屋上空でミサイル攻撃の警報。\n東京湾には潜水艦の影。\n\n全部だ。奴らは全てを同時に仕掛けてきた。\n\n前線は広がりすぎている。どこを守り、どこを捨てるか──\n君は選ばなければならない。\n\n部隊は疲れている。士気は落ちている。\nそれでも、戦うしかない。\n\n家族が後ろにいる。",
  intel: [
    "10:12 長崎県五島列島、敵装甲車両の上陸を現認。現地からの通報。",
    "10:28 名古屋防空レーダー、高速接近体4つ。対空展開、間に合うか。",
    "10:45 横須賀沖、ソナー音響。潜水艦の可能性──海の底で動く影。",
    "11:02 第3部隊、2日連続交戦。士気低下、連絡官から悲痛な報告。",
    "11:20 敵の戦略、明確になった──戦線拡大による兵力分散。古典的だが効く。",
    "11:38 各拠点の連携が崩れつつある。孤立すれば、各個撃破される。",
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
  name: "暁の決戦",
  description: "すべてを終わらせる時が来た。夜明け前の最後の嵐。",
  turns: 6,
  supplyBonus: 30,
  briefing:
    "司令官。\n\n長い夜だった。我々は耐えた。反撃した。犠牲も出した。\nそして今、ついに──奴らの司令艦を捕捉した。\n\n東京東方150km。敵艦隊旗艦『海龍』。\n重装甲・重火力。奴らの指揮中枢だ。\n\nあの艦を沈めれば、全ては終わる。\n沈められなければ、全てが始まる。\n\n艦は防御が堅い。正面攻撃では跳ね返される。\n多方向から、同時に。相手の想定外を突け。\n\n我が方の戦力は消耗している。\nだが、後ろには125,000,000人がいる。\n\n司令官、よろしく頼む。",
  intel: [
    "04:00 敵司令艦『海龍』、東京東方150km。全長240m、重装甲艦。",
    "04:15 司令艦の護衛艦2隻・ドローン3機・車両部隊の厚い布陣を確認。",
    "04:30 傍受──敵旗艦からの通信急増。『最終攻撃命令』のキーワード。",
    "04:45 KPI全項目、危険域に接近。これが最後の耐久戦だ。",
    "05:00 我が部隊、残存率61%。補給も底が見えている。この一戦で決める。",
    "05:15 勝利条件: 司令艦『海龍』撃沈。奴を沈めれば、この悪夢は終わる。",
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
