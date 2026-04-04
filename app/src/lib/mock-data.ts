export type SeverityLevel = "critical" | "warning" | "info" | "normal";

export interface KpiData {
  label: string;
  value: string;
  unit: string;
  trend: "up" | "down" | "stable";
  trendValue: string;
  severity: SeverityLevel;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: "facility" | "vehicle" | "alert" | "personnel" | "drone";
  label: string;
  status: SeverityLevel;
  detail: string;
}

export interface AlertItem {
  id: string;
  title: string;
  category: string;
  severity: SeverityLevel;
  score: number;
  timestamp: string;
  location: string;
  description: string;
  suggestedAction: string;
  markerId?: string;
}

export interface WorkflowCard {
  id: string;
  title: string;
  stage: "detected" | "reviewing" | "approved" | "executed";
  severity: SeverityLevel;
  assignee: string;
  eta: string;
  source: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
  timestamp: string;
}

export const KPI_DATA: KpiData[] = [
  { label: "稼働率", value: "94.2", unit: "%", trend: "down", trendValue: "-1.3%", severity: "warning" },
  { label: "在庫充足率", value: "87.6", unit: "%", trend: "down", trendValue: "-4.2%", severity: "critical" },
  { label: "配送遅延", value: "3", unit: "件", trend: "up", trendValue: "+2", severity: "warning" },
  { label: "AI検知", value: "12", unit: "件", trend: "up", trendValue: "+5", severity: "info" },
  { label: "承認待ち", value: "7", unit: "件", trend: "stable", trendValue: "±0", severity: "normal" },
  { label: "SLA達成", value: "98.1", unit: "%", trend: "stable", trendValue: "+0.1%", severity: "normal" },
];

export const MAP_MARKERS: MapMarker[] = [
  // Facilities (real coordinates)
  { id: "f1", lat: 35.6812, lng: 139.7671, type: "facility", label: "東京中央倉庫", status: "critical", detail: "在庫不足 3品目 | 充足率 82.3%" },
  { id: "f2", lat: 34.6937, lng: 135.5023, type: "facility", label: "大阪第二拠点", status: "normal", detail: "正常稼働 | 稼働率 96.8%" },
  { id: "f3", lat: 35.1815, lng: 136.9066, type: "facility", label: "名古屋配送センター", status: "warning", detail: "設備点検アラート | 冷蔵庫#3" },
  { id: "f4", lat: 33.5904, lng: 130.4017, type: "facility", label: "福岡物流拠点", status: "normal", detail: "正常稼働 | 充足率 94.1%" },
  { id: "f5", lat: 43.0621, lng: 141.3544, type: "facility", label: "札幌倉庫", status: "normal", detail: "正常稼働 | 充足率 91.5%" },
  // Vehicles
  { id: "v1", lat: 35.6284, lng: 139.7387, type: "vehicle", label: "配送車 T-04", status: "warning", detail: "遅延 25分 | 品川区付近" },
  { id: "v2", lat: 34.7055, lng: 135.4983, type: "vehicle", label: "配送車 O-11", status: "normal", detail: "予定通り | 大阪市内配送中" },
  { id: "v3", lat: 35.0116, lng: 137.0700, type: "vehicle", label: "配送車 N-07", status: "critical", detail: "ルート障害 | 国道1号線停滞" },
  { id: "v4", lat: 35.3912, lng: 136.7223, type: "vehicle", label: "配送車 N-12", status: "normal", detail: "予定通り | 岐阜方面" },
  // Alerts
  { id: "a1", lat: 35.6895, lng: 139.6917, type: "alert", label: "需要急増検知", status: "critical", detail: "品番 A-2240 | 48h以内枯渇" },
  { id: "a2", lat: 35.1700, lng: 136.8815, type: "alert", label: "温度異常", status: "warning", detail: "冷蔵庫 #3 | +2.3℃逸脱" },
  // Personnel
  { id: "p1", lat: 35.6762, lng: 139.6503, type: "personnel", label: "田中 太郎 (管理者)", status: "normal", detail: "東京中央 | オンライン" },
  { id: "p2", lat: 34.7025, lng: 135.4959, type: "personnel", label: "佐藤 健一 (技術)", status: "normal", detail: "大阪第二 | オンライン" },
  // Drones
  { id: "d1", lat: 35.7100, lng: 139.8107, type: "drone", label: "ドローン D-01", status: "normal", detail: "巡回中 | 東京湾岸エリア | 高度120m" },
  { id: "d2", lat: 35.1950, lng: 136.9300, type: "drone", label: "ドローン D-02", status: "warning", detail: "バッテリー残量22% | 名古屋拠点上空" },
  { id: "d3", lat: 34.6500, lng: 135.5200, type: "drone", label: "ドローン D-03", status: "normal", detail: "配送中 | 大阪市内 | ETA 8分" },
  { id: "d4", lat: 33.6200, lng: 130.4200, type: "drone", label: "ドローン D-04", status: "info", detail: "点検モード | 福岡倉庫屋上" },
];

// Route polylines for vehicles
export interface RouteData {
  vehicleId: string;
  points: [number, number][];
  status: SeverityLevel;
}

export const VEHICLE_ROUTES: RouteData[] = [
  {
    vehicleId: "v1",
    points: [[35.6812, 139.7671], [35.6600, 139.7500], [35.6284, 139.7387]],
    status: "warning",
  },
  {
    vehicleId: "v3",
    points: [[35.1815, 136.9066], [35.1000, 137.0000], [35.0116, 137.0700]],
    status: "critical",
  },
  {
    vehicleId: "v2",
    points: [[34.6937, 135.5023], [34.7000, 135.5000], [34.7055, 135.4983]],
    status: "normal",
  },
  {
    vehicleId: "d1",
    points: [[35.6812, 139.7671], [35.6950, 139.7900], [35.7100, 139.8107]],
    status: "normal",
  },
  {
    vehicleId: "d3",
    points: [[34.6937, 135.5023], [34.6700, 135.5100], [34.6500, 135.5200]],
    status: "normal",
  },
];

export const ALERT_ITEMS: AlertItem[] = [
  {
    id: "alt-1",
    title: "在庫不足リスク: 品番 A-2240",
    category: "在庫",
    severity: "critical",
    score: 95,
    timestamp: "14:23",
    location: "東京中央倉庫",
    description: "需要予測AIが今後48時間以内に品番A-2240の在庫枯渇を検知。現在庫: 120個、予測需要: 340個。",
    suggestedAction: "緊急補充発注 220個 → サプライヤーB（最短24h納品）",
    markerId: "a1",
  },
  {
    id: "alt-2",
    title: "配送ルート障害: 国道1号線",
    category: "物流",
    severity: "critical",
    score: 88,
    timestamp: "14:18",
    location: "名古屋 → 東京ルート",
    description: "道路障害により配送車N-07が停滞中。到着予定が120分以上遅延。顧客3社に影響。",
    suggestedAction: "代替ルート（東名高速経由）へ自動リルート＋顧客通知送信",
    markerId: "v3",
  },
  {
    id: "alt-3",
    title: "設備温度異常: 冷蔵庫 #3",
    category: "設備",
    severity: "warning",
    score: 72,
    timestamp: "14:15",
    location: "名古屋配送センター",
    description: "冷蔵庫#3の内部温度が設定値+2.3℃。コンプレッサー効率低下の兆候。",
    suggestedAction: "予防保全チケット作成 → 佐藤（技術）にアサイン",
    markerId: "a2",
  },
  {
    id: "alt-4",
    title: "配送遅延: T-04便",
    category: "物流",
    severity: "warning",
    score: 65,
    timestamp: "14:10",
    location: "東京都内",
    description: "配送車T-04の到着が25分遅延。交通渋滞による。顧客1社のSLAに抵触リスク。",
    suggestedAction: "顧客への遅延通知自動送信 + ETA更新",
    markerId: "v1",
  },
  {
    id: "alt-5",
    title: "需要トレンド変動: カテゴリC",
    category: "分析",
    severity: "info",
    score: 45,
    timestamp: "14:05",
    location: "全拠点",
    description: "カテゴリCの注文数が前週比+18%。季節要因を超える増加トレンド。",
    suggestedAction: "安全在庫水準の見直しレポート生成",
  },
  {
    id: "alt-6",
    title: "稼働率低下傾向: ライン B",
    category: "設備",
    severity: "info",
    score: 38,
    timestamp: "13:58",
    location: "大阪第二拠点",
    description: "製造ラインBの稼働率が直近1週間で3.2%低下。メンテナンス時期の可能性。",
    suggestedAction: "来週の定期点検スケジュールに追加",
  },
];

export const WORKFLOW_CARDS: WorkflowCard[] = [
  { id: "wf-1", title: "品番A-2240 緊急補充発注", stage: "reviewing", severity: "critical", assignee: "田中", eta: "24h", source: "AI検知 alt-1" },
  { id: "wf-2", title: "N-07 代替ルート適用", stage: "approved", severity: "critical", assignee: "システム", eta: "即時", source: "AI検知 alt-2" },
  { id: "wf-3", title: "冷蔵庫#3 保全チケット", stage: "detected", severity: "warning", assignee: "未割当", eta: "48h", source: "AI検知 alt-3" },
  { id: "wf-4", title: "T-04便 遅延通知送信", stage: "executed", severity: "warning", assignee: "システム", eta: "完了", source: "AI検知 alt-4" },
  { id: "wf-5", title: "カテゴリC 安全在庫見直し", stage: "detected", severity: "info", assignee: "未割当", eta: "72h", source: "AI検知 alt-5" },
  { id: "wf-6", title: "ラインB 点検スケジュール追加", stage: "detected", severity: "info", assignee: "佐藤", eta: "1w", source: "AI検知 alt-6" },
];

export const CHAT_HISTORY: ChatMessage[] = [
  { id: "c1", role: "system", content: "MAVEN AI オンライン — 全システム接続確認完了", timestamp: "14:00" },
  { id: "c2", role: "user", content: "今、最も優先すべき課題を3つ教えて", timestamp: "14:20" },
  { id: "c3", role: "ai", content: "現在の優先課題トップ3:\n\n1. 🔴 品番A-2240の在庫枯渇リスク（スコア95）— 48h以内に欠品の可能性。緊急発注が必要です。\n\n2. 🔴 配送車N-07のルート障害（スコア88）— 120分超の遅延が発生中。代替ルートを提案済み、承認待ちです。\n\n3. 🟡 冷蔵庫#3の温度異常（スコア72）— 予防保全が推奨されます。", timestamp: "14:20" },
  { id: "c4", role: "user", content: "東京中央倉庫の在庫状況を詳しく", timestamp: "14:22" },
  { id: "c5", role: "ai", content: "東京中央倉庫の在庫サマリー:\n\n充足率: 82.3%（全社平均 87.6%を下回る）\n\n要注意品目:\n• A-2240: 残120個（予測需要340個/48h）⚠️\n• B-1185: 残450個（安全在庫ライン付近）\n• C-3301: 残80個（安定）\n\n倉庫使用率: 73%\n直近入荷予定: 本日18:00（サプライヤーA便）", timestamp: "14:22" },
];

export const SUGGESTED_QUERIES = [
  "大阪拠点の稼働状況は？",
  "今週の配送遅延の傾向を分析して",
  "SLAリスクのある顧客一覧を表示",
  "品番A-2240の発注を承認して",
];
