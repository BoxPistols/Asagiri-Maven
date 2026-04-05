# MAVEN COMMAND — 戦略シミュレーションゲーム

**3D対応・AI支援型ターン制戦略ゲーム**

MAVEN COMMAND は、Palantir AIP の設計思想を応用した**ターン制戦略シミュレーションゲーム**です。
日本列島を舞台に、近隣諸国からの侵攻に対して、プレイヤーは統合作戦司令官として拠点と機動部隊を指揮します。

🎮 **プレイ**: https://boxpistols.github.io/Asagiri-Maven/

---

## 特徴

- **2D/3Dマップ切替** - Leaflet の 2D マップと Cesium + PLATEAU の 3D 都市モデルを即座に切替
- **ターン制戦闘** - WC4スタイルの歩数制移動 (movePoints × stepDistance)
- **AI戦況分析** - MAVEN AI が状況を分析し、行動を推奨 + 対話チャット
- **ユニット相性** - じゃんけん型の相性システム (ドローン vs 艦船 vs 車両 等)
- **5ウェーブシナリオ** - 偵察→サイバー攻撃→海上封鎖→多方面侵攻→最終決戦
- **拠点補給経済** - 5拠点の補給生産、修理、防衛
- **リアルな侵攻経路** - 東シナ海・日本海・宗谷海峡から接近する地政学的リアリズム

---

## コンセプト

| 要素 | 説明 |
|---|---|
| **共通状況図 (COP)** | Leaflet実地図 / Cesium 3D都市モデルに施設・車両・ドローン・艦船をリアルタイム表示 |
| **AI自動検知** | 異常値・リスクをスコアリングし、優先順位付きで一覧表示 |
| **意思決定ワークフロー** | 検知 → レビュー → 承認 → 実行のパイプラインを可視化 |
| **自然言語IF** | AIチャットで状況要約・ドリルダウン検索・アクション実行 |

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) + React 19 |
| 言語 | TypeScript (strict) |
| スタイリング | Tailwind CSS v4 + CSS Variables |
| 2D地図 | Leaflet + react-leaflet (CARTO dark/light tiles) |
| 3D地図 | Cesium 1.140 + PLATEAU (国交省3D都市モデル) |
| オーディオ | Web Audio API (合成BGM + SE) |
| アイコン | Lucide React |
| フォント | Exo 2 (display) + Share Tech Mono (data readout) |

---

## セットアップ

```bash
npm install          # postinstall で Cesium アセットを自動コピー
npm run dev          # http://localhost:3000
npm run build        # 静的エクスポート (GitHub Pages向け)
```

### 環境変数 (任意)

```bash
# .env.local
NEXT_PUBLIC_CESIUM_ION_TOKEN=<your-cesium-ion-token>
```

Cesium Ion のトークンがあると地形データやより高品質な衛星画像が利用可能になります (無しでも動作)。

---

## ゲームプレイ

### 操作

| キー/アクション | 動作 |
|---|---|
| **味方クリック** | ユニット選択 |
| **敵クリック** | 選択中ユニットで攻撃 |
| **地図クリック** | 選択中ユニットを移動 |
| **↑↓←→** | 選択ユニットを1歩移動 |
| **Q** | 移動モード |
| **W / A** | 攻撃モード |
| **E** | 修理 |
| **R** | 待機 |
| **Space / Enter** | ターン終了 |
| **Tab** | 次の未行動ユニット |
| **Esc** | モーダル閉じる |

### 勝敗条件

- **勝利**: 全5ウェーブを生き残り、Wave 5 ボス (敵司令艦「海龍」) を撃破
- **敗北**:
  - KPIいずれかが0に到達
  - 2拠点以上が破壊される
  - 全機動部隊が撃破される

### ユニット種別相性

```
drone  → infantry → cyber → drone     (1.5x damage)
vehicle → ship   → drone  → vehicle
infantry → cyber → drone  → infantry
```

---

## プロジェクト構成

```
src/
├── app/
│   ├── page.tsx              # メインゲームページ (2D/3D統合)
│   ├── layout.tsx            # ルートレイアウト
│   └── globals.css           # スタイル定義
├── components/
│   ├── TacticalMap.tsx       # 2D Leaflet マップ
│   ├── CesiumGameMap.tsx     # 3D Cesium + PLATEAU マップ
│   ├── GameHud.tsx           # 上部HUD (KPI・補給・2D/3D切替)
│   ├── GameControls.tsx      # ターン終了ボタン
│   ├── ActionLauncher.tsx    # 移動/攻撃/修理/待機メニュー
│   ├── UnactedUnitsPanel.tsx # 未行動ユニット一覧
│   ├── MissionObjectives.tsx # 勝敗条件進捗
│   ├── MavenAiAssistant.tsx  # AI戦況分析 + チャット
│   ├── TutorialMode.tsx      # 9ステップ対話型チュートリアル
│   ├── SettingsPanel.tsx     # 設定 (サウンド/tooltip/theme)
│   └── ... 他20+コンポーネント
├── hooks/
│   ├── useGameEngine.ts      # ゲーム状態管理 (useReducer)
│   ├── useGameAudio.ts       # Web Audio API 合成サウンド
│   ├── useGameBgm.ts         # フェーズ別BGM
│   ├── useTheme.ts           # ダーク/ライトテーマ
│   └── ... 他
├── lib/
│   ├── game-types.ts         # 型定義
│   ├── scenarios.ts          # 5ウェーブ定義 (日本侵攻ストーリー)
│   ├── game-init.ts          # 初期ユニット配置
│   ├── enemy-ai.ts           # 敵AI行動
│   ├── combat-rules.ts       # じゃんけん相性システム
│   ├── ai-advisor.ts         # MAVEN AI 分析エンジン
│   ├── plateau-cities.ts     # PLATEAU 3D都市データURL
│   ├── cesium-types.ts       # Cesium型定義
│   ├── safe-storage.ts       # localStorage safe wrapper
│   └── mock-data.ts
└── scripts/
    └── copy-cesium-assets.mjs  # postinstall で public/cesium/ へコピー
```

---

## デプロイ

GitHub Actions で `main` ブランチへのpushで自動デプロイ (GitHub Pages)。

- **本番URL**: https://boxpistols.github.io/Asagiri-Maven/
- **ワークフロー**: `.github/workflows/deploy-pages.yml`

---

## PLATEAU 対応都市

- 東京・港区 (LOD2)
- 東京・台東区 (LOD2)
- 仙台市 (LOD2)
- 広島市 (LOD2)
- 福岡市 (LOD2 テクスチャ付き)

出典: [国土交通省 Project PLATEAU](https://www.mlit.go.jp/plateau/)

---

## 今後の改善

GitHub Issues で管理:
- [#1 i18n: 日本語文字列の定数化](https://github.com/BoxPistols/Asagiri-Maven/issues/1)
- [#2 Magic numbers の定数化](https://github.com/BoxPistols/Asagiri-Maven/issues/2)
- [#3 PLATEAU ロード状態UX改善](https://github.com/BoxPistols/Asagiri-Maven/issues/3)
- [#4 セーブ/ロード機能](https://github.com/BoxPistols/Asagiri-Maven/issues/4)
- [#5 ユニット3Dモデル化 (glTF)](https://github.com/BoxPistols/Asagiri-Maven/issues/5)

---

## 参考資料

- [Palantir AIP](https://www.palantir.com/platforms/aip/) — データ統合+AI判断のUI/UX
- [Project PLATEAU](https://www.mlit.go.jp/plateau/) — 国交省3D都市モデル
- 世界の覇者4 — ターン制戦略ゲームの歩数制移動システム
- [BoxPistols/drone-mapper-plateau](https://github.com/BoxPistols/drone-mapper-plateau) — CesiumJS + PLATEAU 統合の参考実装

---

## ライセンス

個人プロジェクト (MIT 相当の自由利用可)
