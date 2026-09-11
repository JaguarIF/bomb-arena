import { create } from "zustand";
import { CAMPAIGN, coinsFromScore, SKINS, xpForLevel, xpFromMatch } from "@/game/balance";
import { defaultProfile, loadProfile, saveProfile } from "@/game/save";
import type { Lang, MatchConfig, MatchResult, ModeId, Profile, ScreenId, Settings, SkinId } from "@/game/types";
import { arenaDef } from "@/game/balance";

type Store = {
  profile: Profile;
  screen: ScreenId;
  match: MatchConfig | null;
  lastResult: MatchResult | null;
  newHigh: boolean;
  setScreen: (s: ScreenId) => void;
  patchSettings: (p: Partial<Settings>) => void;
  setLang: (l: Lang) => void;
  buySkin: (id: SkinId) => boolean;
  equipSkin: (id: SkinId) => void;
  startCampaign: (levelId: number) => void;
  startArena: () => void;
  startEndless: () => void;
  applyResult: (r: MatchResult) => void;
  persist: () => void;
};

function persist(profile: Profile) {
  saveProfile(profile);
}

export const useProfile = create<Store>((set, get) => ({
  profile: defaultProfile(),
  screen: "menu",
  match: null,
  lastResult: null,
  newHigh: false,
  setScreen: (screen) => set({ screen }),
  patchSettings: (p) => {
    const profile = { ...get().profile, settings: { ...get().profile.settings, ...p } };
    persist(profile);
    set({ profile });
  },
  setLang: (lang) => get().patchSettings({ lang }),
  buySkin: (id) => {
    const { profile } = get();
    const def = SKINS.find((s) => s.id === id);
    if (!def || profile.unlocked.includes(id) || profile.coins < def.cost) return false;
    const next: Profile = {
      ...profile,
      coins: profile.coins - def.cost,
      unlocked: [...profile.unlocked, id],
      skin: id,
    };
    persist(next);
    set({ profile: next });
    return true;
  },
  equipSkin: (id) => {
    const { profile } = get();
    if (!profile.unlocked.includes(id)) return;
    const next = { ...profile, skin: id };
    persist(next);
    set({ profile: next });
  },
  startCampaign: (levelId) => {
    const def = CAMPAIGN[levelId - 1];
    if (!def) return;
    const { profile } = get();
    if (levelId > profile.campaignUnlocked) return;
    set({
      screen: "play",
      match: {
        mode: "campaign",
        levelId,
        size: def.size,
        density: def.density,
        time: def.time,
        theme: def.theme,
        lives: def.lives,
        enemies: def.enemies,
        beetleBombs: !!def.beetleBombs,
        skin: profile.skin,
        seed: (Date.now() ^ (levelId * 9973)) >>> 0,
        tutorial: levelId === 1 && profile.gamesPlayed === 0,
      },
    });
  },
  startArena: () => {
    const def = arenaDef();
    const { profile } = get();
    set({
      screen: "play",
      match: {
        mode: "arena",
        levelId: 0,
        size: def.size,
        density: def.density,
        time: def.time,
        theme: def.theme,
        lives: def.lives,
        enemies: def.enemies,
        beetleBombs: true,
        skin: profile.skin,
        seed: Date.now() >>> 0,
        tutorial: false,
      },
    });
  },
  startEndless: () => {
    const { profile } = get();
    set({
      screen: "play",
      match: {
        mode: "endless" as ModeId,
        levelId: 1,
        size: 13,
        density: 0.42,
        time: 0,
        theme: "dungeon",
        lives: 3,
        enemies: [
          { kind: "slime", count: 3 },
          { kind: "beetle", count: 1 },
        ],
        beetleBombs: false,
        skin: profile.skin,
        seed: Date.now() >>> 0,
        tutorial: false,
      },
    });
  },
  applyResult: (r) => {
    const { profile } = get();
    const coins = coinsFromScore(r.score, r.won);
    const xpGain = xpFromMatch(r.score, r.won);
    let xp = profile.xp + xpGain;
    let level = profile.level;
    let need = xpForLevel(level);
    while (xp >= need) {
      xp -= need;
      level += 1;
      need = xpForLevel(level);
    }
    const campaignBest = profile.campaignBest.slice();
    let newHigh = false;
    if (r.mode === "campaign" && r.won) {
      campaignBest[r.levelId - 1] = Math.max(campaignBest[r.levelId - 1] ?? 0, r.score);
      if (r.score >= (profile.campaignBest[r.levelId - 1] ?? 0)) newHigh = r.score > (profile.campaignBest[r.levelId - 1] ?? 0);
    }
    if (r.mode === "arena" && r.score > profile.highArena) {
      newHigh = true;
    }
    if (r.mode === "endless" && r.score > profile.highEndless) newHigh = true;
    const next: Profile = {
      ...profile,
      xp,
      level,
      coins: profile.coins + coins,
      gamesPlayed: profile.gamesPlayed + 1,
      wins: profile.wins + (r.won ? 1 : 0),
      campaignUnlocked:
        r.mode === "campaign" && r.won
          ? Math.max(profile.campaignUnlocked, Math.min(15, r.levelId + 1))
          : profile.campaignUnlocked,
      campaignBest,
      highArena: r.mode === "arena" ? Math.max(profile.highArena, r.score) : profile.highArena,
      highEndless: r.mode === "endless" ? Math.max(profile.highEndless, r.score) : profile.highEndless,
    };
    persist(next);
    set({
      profile: next,
      lastResult: { ...r, coins, xp: xpGain },
      newHigh,
      screen: "result",
    });
  },
  persist: () => persist(get().profile),
}));
