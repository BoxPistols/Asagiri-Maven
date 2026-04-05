// ========== MAVEN COMMAND: Combat Log Formatter ==========
// 戦闘結果を日本語ログメッセージに整形

export interface CombatLogInput {
  attackerName: string;
  defenderName: string;
  damage: number;
  advantage: "strong" | "neutral" | "weak";
  critical: boolean;
  defenderDestroyed: boolean;
}

/**
 * 戦闘結果を読みやすい日本語ログに整形する。
 *
 * 例:
 * - "機動戦闘車 Alpha → 敵哨戒艦 に 28 ダメージ（有利）"
 * - "偵察ドローン Tokyo-1 → 敵偵察ドローン に 12 ダメージ — クリティカル！"
 * - "護衛艦「あさぎり」が 敵強襲艦 を撃破！"
 * - "偵察ドローン Osaka-1 → 敵哨戒艦 に 8 ダメージ（不利）"
 */
export function formatCombatLog(result: CombatLogInput): string {
  // 撃破メッセージ（クリティカル撃破は特別）
  if (result.defenderDestroyed) {
    const critSuffix = result.critical ? "（クリティカル撃破！）" : "";
    return `${result.attackerName} が ${result.defenderName} を撃破！${critSuffix}`;
  }

  // 通常ダメージメッセージ
  const parts: string[] = [
    `${result.attackerName} → ${result.defenderName} に ${result.damage} ダメージ`,
  ];

  // 相性表示
  if (result.advantage === "strong") {
    parts.push("（有利）");
  } else if (result.advantage === "weak") {
    parts.push("（不利）");
  }

  // クリティカル表示
  if (result.critical) {
    parts.push(" — クリティカル！");
  }

  return parts.join("");
}

/**
 * 相性を示す短い戦況メッセージを返す。
 * ログの補足情報として使用。
 */
export function formatAdvantageHint(
  attackerType: string,
  defenderType: string,
  advantage: "strong" | "neutral" | "weak",
): string {
  switch (advantage) {
    case "strong":
      return `有利な戦闘（${attackerType} → ${defenderType}）`;
    case "weak":
      return `不利な戦闘（${attackerType} → ${defenderType}）`;
    default:
      return "";
  }
}
