// MAVEN Smart System: AI Advisor
// Analyzes game state and generates tactical suggestions

import type { GameState, GameUnit } from "@/lib/game-types";
import { getAttackRange, getTypeAdvantage } from "@/lib/combat-rules";

export interface AdvisorMessage {
  id: string;
  priority: "critical" | "warning" | "info" | "good";
  category: "threat" | "opportunity" | "resource" | "strategy" | "status";
  title: string;
  detail: string;
  suggestedAction?: string;
  targetUnitId?: string; // suggested unit to act on
}

function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export function analyzeSituation(state: GameState): AdvisorMessage[] {
  const msgs: AdvisorMessage[] = [];

  const livePlayer = state.playerUnits.filter(u => u.status !== "destroyed");
  const liveEnemy = state.enemyUnits.filter(u => u.status !== "destroyed");
  const bases = livePlayer.filter(u => u.id.startsWith("base-"));
  const mobile = livePlayer.filter(u => !u.id.startsWith("base-"));

  // === THREAT: Enemies near bases ===
  for (const base of bases) {
    const nearbyEnemies = liveEnemy.filter(e => distance(base, e) <= 1.5);
    if (nearbyEnemies.length > 0) {
      const nearest = nearbyEnemies.reduce((a, b) =>
        distance(base, a) < distance(base, b) ? a : b
      );
      const dist = distance(base, nearest).toFixed(2);
      msgs.push({
        id: `threat-base-${base.id}`,
        priority: "critical",
        category: "threat",
        title: `${base.name}に敵接近`,
        detail: `${nearest.name}が${dist}度(${(Number(dist) * 111).toFixed(0)}km)まで迫っています。拠点が陥落すれば敗北に近づきます。`,
        suggestedAction: `近くの機動部隊で迎撃を。拠点から出撃する車両・ドローンが有効です。`,
      });
    }
  }

  // === RESOURCE: Low supply ===
  if (state.supply < 40 && state.supply > 0) {
    msgs.push({
      id: "resource-supply",
      priority: state.supply < 20 ? "critical" : "warning",
      category: "resource",
      title: `補給残量 ${state.supply}`,
      detail: `修理には10消費します。拠点が破壊されると生産も減少します。防衛を優先してください。`,
      suggestedAction: "損傷ユニットの修理は拠点に戻してから。戦線を無理に拡げない。",
    });
  }

  // === STATUS: Damaged units ===
  const damaged = mobile.filter(u => u.hp / u.maxHp < 0.4 && u.status !== "destroyed");
  if (damaged.length > 0) {
    const mostDamaged = damaged.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b));
    const hpPct = Math.round((mostDamaged.hp / mostDamaged.maxHp) * 100);
    msgs.push({
      id: `damaged-${mostDamaged.id}`,
      priority: hpPct < 25 ? "warning" : "info",
      category: "status",
      title: `${mostDamaged.name} 大破寸前 (HP ${hpPct}%)`,
      detail: `修理しないと次の攻撃で失います。拠点の0.5度以内に戻れば補給10で修理可能。`,
      suggestedAction: "最寄り拠点へ退避し、修理(Eキー)を実行。",
      targetUnitId: mostDamaged.id,
    });
  }

  // === OPPORTUNITY: Weak enemy in range ===
  for (const playerUnit of mobile.filter(u => !u.actedThisTurn)) {
    const range = playerUnit.range ?? getAttackRange(playerUnit.type);
    const inRangeEnemies = liveEnemy.filter(e => distance(playerUnit, e) <= range);
    const weakEnemies = inRangeEnemies.filter(e => e.hp / e.maxHp < 0.4);
    if (weakEnemies.length > 0) {
      const target = weakEnemies[0];
      const advantage = getTypeAdvantage(playerUnit.type, target.type);
      const advText = advantage > 1.2 ? "有利" : advantage < 0.8 ? "不利" : "互角";
      msgs.push({
        id: `opp-${playerUnit.id}-${target.id}`,
        priority: "good",
        category: "opportunity",
        title: `撃破チャンス: ${target.name}`,
        detail: `${playerUnit.name}の射程内・HP${Math.round((target.hp / target.maxHp) * 100)}%。相性${advText}。`,
        suggestedAction: `${playerUnit.name}で${target.name}を攻撃(Wキー)。`,
        targetUnitId: playerUnit.id,
      });
      break; // Only suggest one opportunity at a time
    }
  }

  // === STRATEGY: Idle units ===
  const idleUnacted = mobile.filter(u => !u.actedThisTurn && u.status !== "destroyed");
  if (idleUnacted.length >= 3) {
    msgs.push({
      id: "strategy-idle",
      priority: "info",
      category: "strategy",
      title: `未行動部隊 ${idleUnacted.length}`,
      detail: `Tabキーで順次切替。ターンを終える前に全員が行動できます。`,
      suggestedAction: "Tabで次の部隊を選択 → 移動or攻撃を指示。",
    });
  }

  // === THREAT: Enemy closing on facility ===
  for (const enemy of liveEnemy) {
    for (const base of bases) {
      const d = distance(enemy, base);
      if (d < 0.8) {
        msgs.push({
          id: `close-${enemy.id}-${base.id}`,
          priority: "critical",
          category: "threat",
          title: `警報: 敵が${base.name}に接近`,
          detail: `残り${(d * 111).toFixed(0)}km。次ターンに攻撃範囲内に入る可能性。`,
          suggestedAction: "機動部隊で迎撃ライン構築。艦船なら対艦有効。",
        });
        break;
      }
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, warning: 1, good: 2, info: 3 };
  msgs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return msgs;
}

// Answer a natural-language query based on current game state
export function answerQuery(state: GameState, query: string): string {
  const q = query.toLowerCase();
  const livePlayer = state.playerUnits.filter(u => u.status !== "destroyed");
  const liveEnemy = state.enemyUnits.filter(u => u.status !== "destroyed");
  const bases = livePlayer.filter(u => u.id.startsWith("base-"));
  const mobile = livePlayer.filter(u => !u.id.startsWith("base-"));

  // Unit count queries
  if (q.includes("残") || q.includes("何機") || q.includes("何体") || q.includes("いくつ")) {
    return `味方機動部隊 ${mobile.length}体 / 拠点 ${bases.length}/5 / 敵 ${liveEnemy.length}体 残存。\n補給: ${state.supply}`;
  }

  // Threat queries
  if (q.includes("脅威") || q.includes("危険") || q.includes("敵") || q.includes("攻撃")) {
    const worst = liveEnemy
      .map(e => ({ e, nearestBase: bases.reduce((a, b) => {
        const da = Math.hypot(e.lat - a.lat, e.lng - a.lng);
        const db = Math.hypot(e.lat - b.lat, e.lng - b.lng);
        return da < db ? a : b;
      }, bases[0] ?? { lat: 0, lng: 0, name: "" }) }))
      .sort((a, b) => {
        const da = Math.hypot(a.e.lat - a.nearestBase.lat, a.e.lng - a.nearestBase.lng);
        const db = Math.hypot(b.e.lat - b.nearestBase.lat, b.e.lng - b.nearestBase.lng);
        return da - db;
      })[0];
    if (worst) {
      const d = Math.hypot(worst.e.lat - worst.nearestBase.lat, worst.e.lng - worst.nearestBase.lng);
      return `最も危険: ${worst.e.name}\n${worst.nearestBase.name}から${(d * 111).toFixed(0)}km\n相性・射程を確認し迎撃を。`;
    }
    return "現時点で差し迫った脅威は確認できません。";
  }

  // Repair / supply
  if (q.includes("修理") || q.includes("回復") || q.includes("補給")) {
    const damaged = mobile.filter(u => u.hp / u.maxHp < 0.7);
    return `補給残量: ${state.supply}\n損傷部隊: ${damaged.length}体\n修理コスト: 10/回 (+30HP)\n拠点から0.5度以内で修理可能`;
  }

  // Strategy
  if (q.includes("どうすれば") || q.includes("作戦") || q.includes("戦略") || q.includes("次")) {
    const suggestions = analyzeSituation(state);
    if (suggestions.length === 0) return "現状維持。次のターンで情勢を再評価します。";
    return suggestions.slice(0, 2).map(s => `• ${s.title}\n  → ${s.suggestedAction ?? s.detail}`).join("\n\n");
  }

  // Supply income
  if (q.includes("収入") || q.includes("生産")) {
    const aliveBases = bases.length;
    const income = bases.reduce((sum, b) => {
      const SUP: Record<string, number> = { "base-tokyo": 15, "base-osaka": 10, "base-nagoya": 10, "base-fukuoka": 7, "base-sapporo": 7 };
      const base = SUP[b.id] ?? 5;
      return sum + (b.hp / b.maxHp < 0.5 ? Math.floor(base / 2) : base);
    }, 0);
    return `補給収入: +${income}/T (${aliveBases}拠点)\n運用コスト: -3/T\n実質: ${income - 3 >= 0 ? "+" : ""}${income - 3}/T`;
  }

  // Wave / progression
  if (q.includes("ウェーブ") || q.includes("波")) {
    return `現在 Wave ${state.wave}/5 · ターン ${state.turn}/${state.maxTurns}\n全5ウェーブを生き延び、最終ボスを撃破すれば勝利。`;
  }

  // Default
  return `「${query}」は認識できませんでした。\n\n例: 脅威は? / 補給状況は? / どうすれば? / 残り何体?`;
}

export function getSituationSummary(state: GameState): string {
  const liveMobile = state.playerUnits.filter(u => !u.id.startsWith("base-") && u.status !== "destroyed").length;
  const liveBases = state.playerUnits.filter(u => u.id.startsWith("base-") && u.status !== "destroyed").length;
  const liveEnemy = state.enemyUnits.filter(u => u.status !== "destroyed").length;
  const minKpi = Math.min(state.kpis.combat, state.kpis.supply, state.kpis.morale, state.kpis.intel);

  if (liveEnemy === 0) {
    return "脅威なし。ターン終了で次ウェーブへ。";
  }
  if (liveBases < 4) {
    return `警告: 拠点${5 - liveBases}つ喪失。防衛を最優先に。`;
  }
  if (minKpi < 30) {
    return `危険: KPI低下中。消耗戦を避け、戦線を縮小せよ。`;
  }
  if (liveEnemy > liveMobile * 1.5) {
    return `劣勢: 敵${liveEnemy}体 vs 我${liveMobile}体。慎重に対応を。`;
  }
  return `戦況: 我${liveMobile}体 / 敵${liveEnemy}体 / 拠点${liveBases}/5 / 補給${state.supply}`;
}
