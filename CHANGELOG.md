# Changelog

## 2026-04-06 - 3D統合 + 品質改善

### Added
- **3Dゲームモード** (Cesium + PLATEAU)
  - 2D/3D シームレス切替 (GameHud ボタン)
  - 5つのPLATEAU都市 (東京港区/台東区/仙台/広島/福岡)
  - カメラプリセット (8拠点)
  - 時刻切替 (現在/昼/夜)
  - 地形誇張スライダー (×1〜×5)
  - 攻撃弾道アーク (Catmull-Rom スプライン)
  - SVGビルボード (味方シールド / 敵警告三角)
- **設定パネル** (SettingsPanel)
  - ツールチップ自動閉じモード
  - サウンド ON/OFF
  - チュートリアルリセット
  - ESC キー対応
- **ARIA属性** - 主要インタラクティブ要素に aria-label
- **safe-storage wrapper** - SSR/localStorage無効環境対応
- **useGameAudio timer管理** - メモリリーク防止

### Changed
- 右側サイドバーパネルをアコーディオン統合
- MAVEN AIチャット入口を強調表示
- 吹き出しポップアップをデフォルト2.5秒自動閉じ

### Fixed
- 同一ユニット再選択時のマップワープバグ
- Leafletポップアップのstickyヘッダー/フッター
- console.warn/error を静かなフォールバックに置換
- `alert()` をインライン通知バナーに置換
- デッドステート `selectedMarker` 削除
- Cesium ScreenSpaceEventHandler クリーンアップ追加

### Refactored
- Cesium型定義抽出 (`src/lib/cesium-types.ts`) — unknown casts 14→3
- 文字列定数集約 (`src/lib/cesium-strings.ts`)

---

## 2026-04-05 - 初期ゲーム実装

### Added
- 5ウェーブ戦略ゲーム (偵察→サイバー→海上封鎖→多方面侵攻→決戦)
- ターン制戦闘システム (移動/攻撃/修理/待機)
- じゃんけん型ユニット相性 (combat-rules.ts)
- MAVEN AI アシスタント (状況分析 + 対話チャット)
- 5拠点・9機動部隊の初期配置
- BGM + 12種類のサウンドエフェクト (Web Audio API)
- キーボードショートカット (Q/W/E/R/Space/Tab)
- ダーク/ライトテーマ切替
- 対話型チュートリアル (9ステップ)
- GitHub Pages 自動デプロイ

### Tech Foundation
- Next.js 16 + React 19 + TypeScript (strict)
- Tailwind CSS v4
- Leaflet + react-leaflet (2D地図)
