# MAVEN Smart System (MSS)

**Intelligent Cockpit for Business Operations**

MSS (Maven Smart System) は、軍用C2(Command & Control)システムの設計思想を業務オペレーションに適用した、インテリジェント・コックピット型ダッシュボードのプロトタイプです。

Palantir AIP を参考に、「情報の可視化(地図)」+「AIによる検知」+「意思決定(ワークフロー)」を一つの画面に統合し、オペレーターが承認・実行するだけで業務が完結するインターフェースを目指しています。

---

## コンセプト

| 要素 | 説明 |
|---|---|
| **共通状況図 (COP)** | Leaflet実地図上に施設・車両・ドローン・人員をリアルタイム表示 |
| **AI自動検知** | 異常値・リスクをスコアリングし、優先順位付きで一覧表示 |
| **意思決定ワークフロー** | 検知 → レビュー → 承認 → 実行のパイプラインを可視化 |
| **自然言語IF** | AIチャットで状況要約・ドリルダウン検索・アクション実行 |

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) + React 19 |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 + CSS Variables |
| 地図 | Leaflet + react-leaflet (CARTO dark/light tiles) |
| アイコン | Lucide React |
| フォント | Exo 2 (display) + Share Tech Mono (data readout) |

---

## セットアップ

```bash
npm install
npm run dev
```

`http://localhost:3000` でダッシュボードが表示されます。

---

## プロジェクト構成

```
├── src/
│   ├── app/
│   │   ├── layout.tsx          # ルートレイアウト
│   │   ├── page.tsx            # メインダッシュボード (ThemeProvider配置)
│   │   └── globals.css         # CSS変数定義 (dark/light), アニメーション, コンポーネントスタイル
│   ├── components/
│   │   ├── StatusHeader.tsx    # ヘッダー: ロゴ, システム状態, テーマ切替, 時計
│   │   ├── HudKpi.tsx          # KPIストリップ: 稼働率, 在庫充足率, 配送遅延等
│   │   ├── TacticalMap.tsx     # COP地図: Leaflet, マーカー, ポリライン, レイヤー切替, タイムライン
│   │   ├── AiTriage.tsx        # AI検知パネル: スコア付きアラート一覧, 推奨アクション, 承認ボタン
│   │   ├── WorkflowKanban.tsx  # ワークフロー: 検知→レビュー→承認→完了のリスト表示
│   │   └── ChatInterface.tsx   # AIチャット: 対話, サジェストクエリ, プリセット応答
│   ├── hooks/
│   │   └── useTheme.ts         # テーマContext: dark/light切替, localStorage永続化
│   └── lib/
│       └── mock-data.ts        # モックデータ: マーカー座標, アラート, ワークフロー, チャット履歴
├── public/                     # 静的アセット
├── package.json
└── tsconfig.json
```

---

## 主要機能

### 1. 共通状況図 (COP) — `TacticalMap`

- **Leaflet実地図**: CARTO dark/light タイルを使用。ズーム・パン・実座標対応
- **マーカー種別**: 施設(F), 車両(V), ドローン(D), 検知(!), 人員(P)
- **ポリライン**: 車両・ドローンの移動ルートを表示
- **レイヤー切替**: 種別ごとのON/OFFフィルタリング
- **タイムラインスライダー**: 12:00〜LIVE の時系列コントロール (UIプロトタイプ)
- **クリックポップアップ**: マーカー詳細情報を表示

### 2. AI検知・トリアージ — `AiTriage`

- 重要度スコア(0-100)で自動ソート
- カテゴリ: 在庫 / 物流 / 設備 / 分析
- 展開式で詳細説明 + AI推奨アクションを表示
- 「承認・実行」ボタンでワークフローへ直結
- 「地図」ボタンでCOP上の該当マーカーにフォーカス

### 3. 意思決定ワークフロー — `WorkflowKanban`

- 4段階パイプライン: 検知 → レビュー中 → 承認済 → 完了
- ホバーで「次のステージへ進める」ボタン表示
- 担当者・ETA・ソース情報を表示
- 完了タスクは取り消し線で表示

### 4. 自然言語インターフェース — `ChatInterface`

- AIとの対話形式で状況確認・指示実行
- 4つのプリセットクエリ (サジェストボタン):
  - 大阪拠点の稼働状況
  - 配送遅延の傾向分析
  - SLAリスク顧客一覧
  - 品番A-2240の発注承認
- 日本語IME対応 (composing状態の管理)

### 5. KPIストリップ — `HudKpi`

- 稼働率 / 在庫充足率 / 配送遅延 / AI検知 / 承認待ち / SLA達成
- 重要度に応じた色分け (critical: 赤, warning: 黄, info: シアン)
- トレンドインジケーター (上昇/下降/安定)

---

## テーマ

ヘッダー右側の Sun/Moon ボタンでダーク/ライトモードを切替。`localStorage` に永続化されます。

| | ダークモード | ライトモード |
|---|---|---|
| 背景 | Deep navy (#070b15) | Slate white (#f8fafc) |
| 地図タイル | CARTO Dark | CARTO Light |
| アクセント | Cyan (#22d3ee) | Teal (#0891b2) |
| エフェクト | Glow + Scanline | Subtle shadow |

CSS変数ベースで `[data-theme="light"]` セレクタにより一括切替。

---

## アクセシビリティ

- 最小フォントサイズ: 12px (WCAG準拠)
- コントラスト比: 4.5:1以上 (通常テキスト)
- タッチターゲット: 最小32px (ボタン類)
- キーボード操作: フォーカス状態の視覚的区別
- 日本語IME: composingEvent対応

---

## モックデータ

プロトタイプとしてリアルな業務シナリオを再現:

- **施設**: 東京中央倉庫, 大阪第二拠点, 名古屋配送センター, 福岡物流拠点, 札幌倉庫
- **車両**: T-04 (遅延), O-11 (正常), N-07 (ルート障害), N-12 (正常)
- **ドローン**: D-01 (巡回), D-02 (バッテリー警告), D-03 (配送中), D-04 (点検)
- **アラート**: 在庫枯渇リスク, ルート障害, 温度異常, 配送遅延, 需要トレンド, 稼働率低下

---

## 今後の拡張方向

- [ ] WebSocket接続によるリアルタイムデータストリーミング
- [ ] バックエンドAPI統合 (在庫管理, ERP連携)
- [ ] LLM統合 (実際のAI応答)
- [ ] マーカーのドラッグ & ジオフェンシング
- [ ] ダッシュボードレイアウトのカスタマイズ
- [ ] 多言語対応 (i18n)
- [ ] モバイル/タブレットレスポンシブ対応

---

## デザインリファレンス

- [Palantir AIP](https://www.palantir.com/platforms/aip/) — データ統合+AI判断のUI/UX
- 軍用C2 (Command & Control) システム — COP, トリアージ, 意思決定ワークフロー

---

## ライセンス

Private repository.
