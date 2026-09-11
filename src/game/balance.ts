import type { EnemySpec, LevelDef, PowerKind, SkinId, ThemeId } from "./types";

export const STEP = 1 / 60;
export const BOMB_FUSE = 2.5;
export const FLAME_TTL = 0.42;
export const DROP_CHANCE = 0.3;
export const PICKUP_TTL = 10;
export const BASE_SPEED = 3.35;
export const SPEED_STEP = 0.48;
export const MAX_SPEED_LEVEL = 3;
export const MAX_BOMBS = 8;
export const MAX_FIRE = 8;
export const INVULN_HIT = 1.35;
export const SHIELD_TIME = 8;
export const SUDDEN_INTERVAL = 7.5;
export const PICKUP_RADIUS = 0.38;

export const DROP_WEIGHTS: { kind: PowerKind; w: number }[] = [
  { kind: "bomb", w: 22 },
  { kind: "fire", w: 22 },
  { kind: "speed", w: 18 },
  { kind: "shield", w: 10 },
  { kind: "pass", w: 8 },
  { kind: "remote", w: 8 },
  { kind: "life", w: 12 },
];

export const SKINS: {
  id: SkinId;
  hue: number;
  cost: number;
  nameKey: "skinEmber" | "skinArctic" | "skinDusk" | "skinForest";
}[] = [
  { id: "ember", hue: 0, cost: 0, nameKey: "skinEmber" },
  { id: "arctic", hue: 168, cost: 250, nameKey: "skinArctic" },
  { id: "dusk", hue: 262, cost: 400, nameKey: "skinDusk" },
  { id: "forest", hue: 88, cost: 550, nameKey: "skinForest" },
];

export const THEME_TINT: Record<ThemeId, string> = {
  city: "rgba(40, 70, 110, 0.18)",
  dungeon: "rgba(90, 55, 25, 0.16)",
  neon: "rgba(10, 40, 50, 0.22)",
};

function enemiesFor(n: number): EnemySpec[] {
  const table: EnemySpec[][] = [
    [{ kind: "slime", count: 2 }],
    [{ kind: "slime", count: 3 }],
    [
      { kind: "slime", count: 3 },
      { kind: "beetle", count: 1 },
    ],
    [
      { kind: "slime", count: 2 },
      { kind: "beetle", count: 2 },
    ],
    [{ kind: "beetle", count: 3 }],
    [
      { kind: "slime", count: 2 },
      { kind: "beetle", count: 2 },
      { kind: "ghost", count: 1 },
    ],
    [
      { kind: "beetle", count: 3 },
      { kind: "ghost", count: 1 },
    ],
    [
      { kind: "slime", count: 3 },
      { kind: "beetle", count: 2 },
      { kind: "ghost", count: 1 },
    ],
    [
      { kind: "beetle", count: 3 },
      { kind: "ghost", count: 2 },
    ],
    [
      { kind: "slime", count: 2 },
      { kind: "beetle", count: 3 },
      { kind: "ghost", count: 2 },
    ],
    [
      { kind: "beetle", count: 4 },
      { kind: "ghost", count: 2 },
    ],
    [
      { kind: "slime", count: 3 },
      { kind: "beetle", count: 3 },
      { kind: "ghost", count: 2 },
    ],
    [
      { kind: "beetle", count: 4 },
      { kind: "ghost", count: 3 },
    ],
    [
      { kind: "slime", count: 2 },
      { kind: "beetle", count: 4 },
      { kind: "ghost", count: 3 },
    ],
    [
      { kind: "beetle", count: 5 },
      { kind: "ghost", count: 4 },
    ],
  ];
  return table[Math.min(n - 1, table.length - 1)]!;
}

export const CAMPAIGN: LevelDef[] = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1;
  const themes: ThemeId[] = ["city", "dungeon", "neon"];
  return {
    id: n,
    size: n <= 3 ? 11 : n <= 9 ? 13 : 15,
    density: Math.min(0.7, 0.34 + n * 0.022),
    time: n <= 5 ? 150 : n <= 10 ? 180 : 210,
    theme: themes[i % 3]!,
    lives: 3,
    enemies: enemiesFor(n),
    beetleBombs: n >= 6,
  };
});

export function arenaDef(): LevelDef {
  return {
    id: 0,
    size: 13,
    density: 0.5,
    time: 180,
    theme: "neon",
    lives: 1,
    enemies: [
      { kind: "slime", count: 3 },
      { kind: "beetle", count: 2 },
      { kind: "ghost", count: 1 },
    ],
    beetleBombs: true,
  };
}

export function endlessDef(wave: number): LevelDef {
  return {
    id: wave,
    size: 13,
    density: Math.min(0.62, 0.4 + wave * 0.015),
    time: 0,
    theme: (["city", "dungeon", "neon"] as ThemeId[])[wave % 3]!,
    lives: 3,
    enemies: [
      { kind: "slime", count: 2 + Math.floor(wave / 3) },
      { kind: "beetle", count: Math.floor(wave / 2) },
      { kind: "ghost", count: Math.floor(wave / 4) },
    ],
    beetleBombs: wave >= 2,
  };
}

export function xpForLevel(level: number): number {
  return Math.round(120 * Math.pow(1.22, level - 1));
}

export function coinsFromScore(score: number, won: boolean): number {
  return Math.floor(score / 12) + (won ? 25 : 8);
}

export function xpFromMatch(score: number, won: boolean): number {
  return 40 + Math.floor(score / 18) + (won ? 40 : 0);
}

export const POWER_INDEX: Record<PowerKind, number> = {
  bomb: 0,
  fire: 1,
  speed: 2,
  shield: 3,
  pass: 4,
  remote: 5,
  life: 6,
};
