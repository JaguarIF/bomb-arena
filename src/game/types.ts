export type Lang = "uk" | "en";
export type ThemeId = "city" | "dungeon" | "neon";
export type ScreenId =
  | "menu"
  | "modes"
  | "campaign"
  | "shop"
  | "settings"
  | "howto"
  | "play"
  | "pause"
  | "result";

export type ModeId = "campaign" | "arena" | "endless";
export type CellKind = "empty" | "solid" | "soft";
export type Dir = 0 | 1 | 2 | 3; // down, left, right, up
export type ActorKind = "player" | "slime" | "beetle" | "ghost";
export type PowerKind =
  | "bomb"
  | "fire"
  | "speed"
  | "shield"
  | "pass"
  | "remote"
  | "life";

export type SkinId = "ember" | "arctic" | "dusk" | "forest";

export type EnemySpec = { kind: Exclude<ActorKind, "player">; count: number };

export type LevelDef = {
  id: number;
  size: number;
  density: number;
  time: number;
  theme: ThemeId;
  lives: number;
  enemies: EnemySpec[];
  beetleBombs?: boolean;
};

export type MatchConfig = {
  mode: ModeId;
  levelId: number;
  size: number;
  density: number;
  time: number;
  theme: ThemeId;
  lives: number;
  enemies: EnemySpec[];
  beetleBombs: boolean;
  skin: SkinId;
  seed: number;
  tutorial: boolean;
};

export type Actor = {
  id: number;
  kind: ActorKind;
  x: number;
  y: number;
  dir: Dir;
  moving: boolean;
  speed: number;
  speedLevel: number;
  alive: boolean;
  invuln: number;
  shield: number;
  bombMax: number;
  bombsOut: number;
  fire: number;
  bombPass: boolean;
  remote: boolean;
  lives: number;
  anim: number;
  deathT: number;
  flash: number;
  aiTimer: number;
  aggro: number;
  wantX: number;
  wantY: number;
};

export type Bomb = {
  id: number;
  owner: number;
  cellX: number;
  cellY: number;
  fuse: number;
  fire: number;
  remote: boolean;
  passOwner: boolean;
};

export type Flame = {
  cellX: number;
  cellY: number;
  ttl: number;
  max: number;
};

export type Pickup = {
  kind: PowerKind;
  cellX: number;
  cellY: number;
  ttl: number;
  bob: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
};

export type Floater = {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  color: string;
};

export type HudSnap = {
  lives: number;
  bombs: number;
  bombMax: number;
  fire: number;
  speedLevel: number;
  shield: boolean;
  remote: boolean;
  pass: boolean;
  timeLeft: number;
  score: number;
  combo: number;
  enemies: number;
  suddenDeath: boolean;
  paused: boolean;
  over: boolean;
  won: boolean;
  canRevive: boolean;
  tutorial: string | null;
};

export type MatchResult = {
  won: boolean;
  score: number;
  coins: number;
  xp: number;
  timeLeft: number;
  kills: number;
  mode: ModeId;
  levelId: number;
};

export type Settings = {
  music: number;
  sfx: number;
  shake: number;
  vibrate: boolean;
  lang: Lang;
  quality: "high" | "low";
};

export type Profile = {
  version: number;
  xp: number;
  level: number;
  coins: number;
  skin: SkinId;
  unlocked: SkinId[];
  settings: Settings;
  campaignUnlocked: number;
  campaignBest: number[];
  highArena: number;
  highEndless: number;
  gamesPlayed: number;
  wins: number;
};

export type InputState = {
  mx: number;
  my: number;
  bomb: boolean;
  bombPressed: boolean;
  detonate: boolean;
  detonatePressed: boolean;
  pausePressed: boolean;
};
