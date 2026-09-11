import type { Profile, Settings, SkinId } from "./types";

const KEY = "bomb-arena-save-v1";
const SAVE_VERSION = 1;

const defaultSettings = (): Settings => ({
  music: 0.55,
  sfx: 0.8,
  shake: 0.7,
  vibrate: true,
  lang: "uk",
  quality: "high",
});

export const defaultProfile = (): Profile => ({
  version: SAVE_VERSION,
  xp: 0,
  level: 1,
  coins: 0,
  skin: "ember",
  unlocked: ["ember"],
  settings: defaultSettings(),
  campaignUnlocked: 1,
  campaignBest: Array.from({ length: 15 }, () => 0),
  highArena: 0,
  highEndless: 0,
  gamesPlayed: 0,
  wins: 0,
});

function migrate(raw: Partial<Profile> & { version?: number }): Profile {
  const base = defaultProfile();
  const settings = { ...base.settings, ...(raw.settings ?? {}) };
  const unlocked = (raw.unlocked ?? base.unlocked).filter((s): s is SkinId =>
    ["ember", "arctic", "dusk", "forest"].includes(s),
  );
  return {
    ...base,
    ...raw,
    version: SAVE_VERSION,
    settings,
    unlocked: unlocked.length ? unlocked : ["ember"],
    campaignBest: Array.from({ length: 15 }, (_, i) => raw.campaignBest?.[i] ?? 0),
  };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return migrate(parsed);
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: Profile): void {
  try {
    const prev = localStorage.getItem(KEY);
    if (prev) localStorage.setItem(KEY + ":bak", prev);
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* private mode / quota */
  }
}
