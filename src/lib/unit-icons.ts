// ========== MAVEN COMMAND: SVG Unit Icon Generator ==========
// Military-style unit icons for Leaflet divIcon markers

import type { UnitType } from "@/lib/game-types";

// ---------------------------------------------------------------------------
// HP bar color helper
// ---------------------------------------------------------------------------

function hpBarColor(hpPercent: number): string {
  if (hpPercent > 60) return "#34d399";
  if (hpPercent > 30) return "#fbbf24";
  return "#f87171";
}

// ---------------------------------------------------------------------------
// Icon shape SVGs per unit type
// Each returns the inner SVG content to be placed inside the icon plate.
// Canvas is roughly 28x28 centered in a 36x32 area (with padding).
// ---------------------------------------------------------------------------

function infantryPath(color: string): string {
  // Soldier silhouette: helmet + torso + rifle
  return `
    <circle cx="20" cy="10" r="4.5" fill="${color}" opacity="0.9"/>
    <path d="M14 16 C14 14, 16 13, 20 13 C24 13, 26 14, 26 16 L27 24 C27 25, 26 26, 25 26 L15 26 C14 26, 13 25, 13 24 Z" fill="${color}" opacity="0.85"/>
    <rect x="26" y="11" width="2" height="12" rx="1" fill="${color}" opacity="0.7" transform="rotate(15, 27, 17)"/>
  `;
}

function vehiclePath(color: string): string {
  // Tank/APC: hull + turret + barrel
  return `
    <rect x="8" y="16" width="24" height="10" rx="2" fill="${color}" opacity="0.85"/>
    <rect x="14" y="10" width="12" height="8" rx="2" fill="${color}" opacity="0.9"/>
    <rect x="26" y="12" width="8" height="3" rx="1" fill="${color}" opacity="0.8"/>
    <circle cx="11" cy="27" r="2.5" fill="${color}" opacity="0.6"/>
    <circle cx="19" cy="27" r="2.5" fill="${color}" opacity="0.6"/>
    <circle cx="27" cy="27" r="2.5" fill="${color}" opacity="0.6"/>
  `;
}

function dronePath(color: string): string {
  // Quadcopter top-down: central body + 4 rotors
  return `
    <rect x="16" y="12" width="8" height="8" rx="2" fill="${color}" opacity="0.9"/>
    <line x1="17" y1="13" x2="10" y2="8" stroke="${color}" stroke-width="1.5" opacity="0.7"/>
    <line x1="23" y1="13" x2="30" y2="8" stroke="${color}" stroke-width="1.5" opacity="0.7"/>
    <line x1="17" y1="19" x2="10" y2="24" stroke="${color}" stroke-width="1.5" opacity="0.7"/>
    <line x1="23" y1="19" x2="30" y2="24" stroke="${color}" stroke-width="1.5" opacity="0.7"/>
    <circle cx="10" cy="8" r="3.5" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.6"/>
    <circle cx="30" cy="8" r="3.5" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.6"/>
    <circle cx="10" cy="24" r="3.5" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.6"/>
    <circle cx="30" cy="24" r="3.5" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.6"/>
  `;
}

function shipPath(color: string): string {
  // Naval vessel side view: hull + bridge + mast
  return `
    <path d="M4 22 L8 26 L32 26 L36 22 L34 18 L6 18 Z" fill="${color}" opacity="0.85"/>
    <rect x="14" y="11" width="10" height="7" rx="1" fill="${color}" opacity="0.9"/>
    <rect x="18" y="6" width="2" height="6" rx="0.5" fill="${color}" opacity="0.7"/>
    <line x1="16" y1="8" x2="22" y2="8" stroke="${color}" stroke-width="1" opacity="0.5"/>
    <rect x="26" y="14" width="4" height="4" rx="1" fill="${color}" opacity="0.7"/>
  `;
}

function cyberPath(color: string): string {
  // Circuit / hacker icon: monitor + circuit lines
  return `
    <rect x="11" y="8" width="18" height="14" rx="2" fill="${color}" opacity="0.85"/>
    <rect x="13" y="10" width="14" height="10" rx="1" fill="#0b1020" opacity="0.9"/>
    <text x="20" y="18" text-anchor="middle" fill="${color}" font-size="8" font-family="monospace" font-weight="bold" opacity="0.9">&gt;_</text>
    <rect x="17" y="22" width="6" height="2" rx="0.5" fill="${color}" opacity="0.7"/>
    <rect x="15" y="24" width="10" height="1.5" rx="0.5" fill="${color}" opacity="0.6"/>
    <circle cx="8" cy="12" r="1.5" fill="${color}" opacity="0.5"/>
    <circle cx="32" cy="12" r="1.5" fill="${color}" opacity="0.5"/>
    <line x1="9.5" y1="12" x2="11" y2="12" stroke="${color}" stroke-width="1" opacity="0.4"/>
    <line x1="29" y1="12" x2="30.5" y2="12" stroke="${color}" stroke-width="1" opacity="0.4"/>
  `;
}

// ---------------------------------------------------------------------------
// Main icon generator
// ---------------------------------------------------------------------------

const ICON_GENERATORS: Record<UnitType, (color: string) => string> = {
  infantry: infantryPath,
  vehicle: vehiclePath,
  drone: dronePath,
  ship: shipPath,
  cyber: cyberPath,
};

/**
 * Generate an inline SVG string for a game unit marker.
 *
 * Total icon size: 40x44px
 *   - Background plate: 40x36 (rounded rect with faction glow)
 *   - Gap: 4px
 *   - HP bar: 40x4 at bottom
 *
 * @param type       Unit type (infantry, vehicle, etc.)
 * @param faction    "player" (cyan/green) or "enemy" (red)
 * @param hpPercent  0-100
 * @param acted      Whether the unit has acted this turn
 * @param isSelected Whether this unit is currently selected
 */
export function getUnitIconSvg(
  type: UnitType,
  faction: "player" | "enemy",
  hpPercent: number,
  acted: boolean,
  isSelected: boolean = false,
): string {
  const isPlayer = faction === "player";
  // Friendly: clear BLUE with shield. Enemy: intense RED triangular warning
  const primary = isPlayer ? "#3b82f6" : "#fbbf24";
  const glowColor = isPlayer ? "rgba(59,130,246,0.5)" : "rgba(239,68,68,0.9)";
  const plateBg = isPlayer ? "rgba(15,23,42,0.95)" : "rgba(127,12,12,0.98)";
  const plateBorder = isPlayer ? "#3b82f6" : "#ef4444";
  const hpCol = hpBarColor(hpPercent);
  const hpWidth = Math.max(1, Math.round(36 * hpPercent / 100));
  const clampedHp = Math.max(0, Math.min(100, hpPercent));

  // Faction indicator dot position
  const factionDotColor = isPlayer ? "#60a5fa" : "#f87171";
  const factionDotX = isPlayer ? 5 : 35;

  // Selected pulsing ring
  const selectedRing = isSelected
    ? `<rect x="0" y="0" width="40" height="36" rx="6" ry="6"
         fill="none" stroke="#818cf8" stroke-width="2" opacity="0.8">
         <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
       </rect>`
    : "";

  // Acted overlay: checkmark badge + dim effect
  const actedOverlay = acted
    ? `<g>
         <rect x="0" y="0" width="40" height="44" rx="0" fill="rgba(0,0,0,0.35)"/>
         <circle cx="32" cy="6" r="6" fill="#34d399"/>
         <path d="M29 6 L31 8.5 L35 3.5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
       </g>`
    : "";

  // Get the unit shape
  const shapeSvg = (ICON_GENERATORS[type] ?? infantryPath)(primary);

  // ENEMY: triangular warning shape with pulsing red glow
  if (!isPlayer) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="52" viewBox="0 0 48 52">
      <defs>
        <filter id="glow-enemy-${hpWidth}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <radialGradient id="enemy-pulse-${hpWidth}">
          <stop offset="0%" stop-color="#ef4444" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Pulsing danger ring -->
      <circle cx="24" cy="22" r="18" fill="url(#enemy-pulse-${hpWidth})">
        <animate attributeName="r" values="18;24;18" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite"/>
      </circle>

      <!-- Red warning triangle background -->
      <path d="M 24 4 L 44 38 L 4 38 Z" fill="#7f0c0c" stroke="#ef4444" stroke-width="2.5" filter="url(#glow-enemy-${hpWidth})"/>

      <!-- Inner warning triangle -->
      <path d="M 24 8 L 40 36 L 8 36 Z" fill="rgba(127,12,12,0.95)" stroke="#fbbf24" stroke-width="1.2"/>

      <!-- Unit type shape in center (matches player icons) -->
      <g transform="translate(4, 6) scale(0.8)">
        ${(ICON_GENERATORS[type] ?? infantryPath)("#fbbf24")}
      </g>

      <!-- ENEMY label -->
      <rect x="8" y="0" width="32" height="8" rx="2" fill="#ef4444"/>
      <text x="24" y="6" text-anchor="middle" font-family="monospace" font-size="6" font-weight="bold" fill="#fff">ENEMY</text>

      <!-- HP bar background -->
      <rect x="4" y="42" width="40" height="5" rx="2" fill="rgba(30,30,40,0.9)"/>
      <rect x="4" y="42" width="${Math.round(40 * hpPercent / 100)}" height="5" rx="2" fill="${hpCol}">
        ${clampedHp <= 30 ? '<animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite"/>' : ''}
      </rect>

      ${selectedRing}
    </svg>`;
  }

  // PLAYER: friendly blue shield shape
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="44" viewBox="0 0 40 44">
  <defs>
    <filter id="glow-player-${hpWidth}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Blue glow halo -->
  <circle cx="20" cy="18" r="16" fill="rgba(59,130,246,0.25)" filter="url(#glow-player-${hpWidth})"/>

  <!-- Shield background -->
  <path d="M 20 2 L 36 6 L 36 22 Q 36 32 20 36 Q 4 32 4 22 L 4 6 Z"
    fill="${plateBg}" stroke="${plateBorder}" stroke-width="2"/>

  <!-- ALLY label -->
  <rect x="8" y="0" width="24" height="6" rx="1" fill="#3b82f6"/>
  <text x="20" y="5" text-anchor="middle" font-family="monospace" font-size="5" font-weight="bold" fill="#fff">ALLY</text>

  <!-- Unit shape inside shield -->
  <g transform="translate(0, 2)">
    ${shapeSvg}
  </g>

  <!-- HP bar background -->
  <rect x="2" y="38" width="36" height="4" rx="2" fill="rgba(30,30,40,0.8)"/>
  <rect x="2" y="38" width="${hpWidth}" height="4" rx="2" fill="${hpCol}" opacity="0.95">
    ${clampedHp <= 30 ? '<animate attributeName="opacity" values="0.95;0.4;0.95" dur="1.2s" repeatCount="indefinite"/>' : ''}
  </rect>

  ${selectedRing}
  ${actedOverlay}
</svg>`;
}
