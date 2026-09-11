import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bomb,
  Flame,
  Heart,
  Pause,
  Play,
  Settings,
  ShoppingBag,
  Timer,
  Trophy,
  Volume2,
  Zap,
} from "lucide-react";
import { Button, bindPress } from "@/components/ui/button";
import { GameEngine } from "@/game/engine";
import { audio } from "@/game/audio";
import { CAMPAIGN, SKINS, xpForLevel } from "@/game/balance";
import { t, type I18nKey } from "@/game/i18n";
import { loadProfile } from "@/game/save";
import type { HudSnap, MatchResult } from "@/game/types";
import { useProfile } from "@/store/profile";
import { cn } from "@/lib/utils";

function useT() {
  const lang = useProfile((s) => s.profile.settings.lang);
  return (k: I18nKey) => t(lang, k);
}

export function GameApp() {
  const screen = useProfile((s) => s.screen);
  const settings = useProfile((s) => s.profile.settings);

  useEffect(() => {
    useProfile.setState({ profile: loadProfile() });
  }, []);

  useEffect(() => {
    audio.setVolumes(settings.music, settings.sfx);
  }, [settings.music, settings.sfx]);

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const vis = () => {
      if (document.hidden) audio.setMuted(true);
      else {
        audio.setMuted(false);
        audio.resume();
      }
      useProfile.getState().persist();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  return (
    <div className="arena-root flex flex-col">
      {screen === "menu" && <MenuScreen />}
      {screen === "modes" && <ModesScreen />}
      {screen === "campaign" && <CampaignScreen />}
      {screen === "shop" && <ShopScreen />}
      {screen === "settings" && <SettingsScreen />}
      {screen === "howto" && <HowToScreen />}
      {screen === "play" && <PlayScreen />}
      {screen === "pause" && <PlayScreen />}
      {screen === "result" && <ResultScreen />}
    </div>
  );
}

function Shell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-center gap-3">
        {onBack ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label="back"
            className="h-11 w-11 shrink-0 px-0"
          >
            <ArrowLeft className="size-5" />
          </Button>
        ) : (
          <span className="w-11" />
        )}
        <h1 className="flex-1 text-center text-lg font-semibold tracking-tight">{title}</h1>
        <span className="w-11" />
      </header>
      {children}
    </div>
  );
}

function MenuScreen() {
  const tr = useT();
  const profile = useProfile((s) => s.profile);
  const setScreen = useProfile((s) => s.setScreen);
  const need = xpForLevel(profile.level);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-[max(2rem,env(safe-area-inset-top))]">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Arena</p>
        <h1 className="mt-2 text-5xl font-semibold tracking-[-0.04em]">Bomb Arena</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{tr("tagline")}</p>
        <div className="mt-6 flex gap-2 text-xs text-muted">
          <span className="hud-chip">
            {tr("level")} {profile.level}
          </span>
          <span className="hud-chip">
            {tr("coins")} {profile.coins}
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-fg" style={{ width: `${Math.min(100, (profile.xp / need) * 100)}%` }} />
        </div>
      </div>
      <div className="relative z-10 mt-10 flex flex-col gap-3">
        <Button size="lg" onClick={() => setScreen("modes")}>
          <Play className="size-4" />
          {tr("play")}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setScreen("shop")}>
            <ShoppingBag className="size-4" />
            {tr("shop")}
          </Button>
          <Button variant="secondary" onClick={() => setScreen("settings")}>
            <Settings className="size-4" />
            {tr("settings")}
          </Button>
        </div>
        <Button variant="ghost" onClick={() => setScreen("howto")}>
          {tr("howto")}
        </Button>
        <p className="text-center text-xs text-subtle">
          {tr("multiplayer")} — {tr("comingSoon")}
        </p>
      </div>
    </div>
  );
}

function ModesScreen() {
  const tr = useT();
  const setScreen = useProfile((s) => s.setScreen);
  const startArena = useProfile((s) => s.startArena);
  const startEndless = useProfile((s) => s.startEndless);
  const profile = useProfile((s) => s.profile);
  return (
    <Shell title={tr("play")} onBack={() => setScreen("menu")}>
      <div className="relative z-10 flex flex-col gap-3">
        <ModeCard
          title={tr("campaign")}
          hint={`${tr("level")} ${profile.campaignUnlocked}/15`}
          onClick={() => setScreen("campaign")}
        />
        <ModeCard title={tr("arena")} hint={`${tr("best")} ${profile.highArena}`} onClick={startArena} />
        <ModeCard title={tr("endless")} hint={`${tr("best")} ${profile.highEndless}`} onClick={startEndless} />
      </div>
    </Shell>
  );
}

function ModeCard({ title, hint, onClick }: { title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      {...bindPress(onClick)}
      className="panel relative z-10 w-full cursor-pointer text-left select-none touch-manipulation transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.99]"
    >
      <div className="text-lg font-semibold tracking-tight">{title}</div>
      <div className="mt-1 text-sm text-muted">{hint}</div>
    </button>
  );
}

function CampaignScreen() {
  const tr = useT();
  const setScreen = useProfile((s) => s.setScreen);
  const start = useProfile((s) => s.startCampaign);
  const unlocked = useProfile((s) => s.profile.campaignUnlocked);
  const best = useProfile((s) => s.profile.campaignBest);
  return (
    <Shell title={tr("campaign")} onBack={() => setScreen("modes")}>
      <div className="relative z-10 grid grid-cols-5 gap-2">
        {CAMPAIGN.map((lv) => {
          const lock = lv.id > unlocked;
          return (
            <button
              key={lv.id}
              type="button"
              disabled={lock}
              data-locked={lock}
              className="level-cell cursor-pointer select-none touch-manipulation"
              {...(lock ? {} : bindPress(() => start(lv.id)))}
            >
              {lv.id}
              {best[lv.id - 1] ? <span className="mt-1 block text-[10px] font-normal text-muted">{best[lv.id - 1]}</span> : null}
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

function ShopScreen() {
  const tr = useT();
  const setScreen = useProfile((s) => s.setScreen);
  const profile = useProfile((s) => s.profile);
  const buy = useProfile((s) => s.buySkin);
  const equip = useProfile((s) => s.equipSkin);
  return (
    <Shell title={tr("shop")} onBack={() => setScreen("menu")}>
      <p className="mb-4 text-sm text-muted">{tr("shopHint")}</p>
      <p className="mb-4 text-sm">
        {tr("coins")}: <span className="font-semibold tabular-nums">{profile.coins}</span>
      </p>
      <div className="relative z-10 flex flex-col gap-3">
        {SKINS.map((s) => {
          const owned = profile.unlocked.includes(s.id);
          const on = profile.skin === s.id;
          return (
            <div key={s.id} className="panel flex items-center justify-between gap-3 !rounded-[var(--radius-lg)] !p-4">
              <div>
                <div className="font-medium">{tr(s.nameKey)}</div>
                <div className="text-xs text-muted">{owned ? tr("equipped") : `${s.cost}`}</div>
              </div>
              {on ? (
                <Button size="sm" variant="secondary" disabled className="w-auto min-w-24">
                  {tr("equipped")}
                </Button>
              ) : owned ? (
                <Button size="sm" variant="secondary" onClick={() => equip(s.id)} className="w-auto min-w-24">
                  {tr("select")}
                </Button>
              ) : (
                <Button size="sm" onClick={() => buy(s.id)} disabled={profile.coins < s.cost} className="w-auto min-w-24">
                  {tr("buy")}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function SettingsScreen() {
  const tr = useT();
  const setScreen = useProfile((s) => s.setScreen);
  const s = useProfile((p) => p.profile.settings);
  const patch = useProfile((p) => p.patchSettings);
  return (
    <Shell title={tr("settings")} onBack={() => setScreen("menu")}>
      <div className="relative z-10 flex flex-col gap-5">
        <SliderRow icon={<Volume2 className="size-4" />} label={tr("music")} value={s.music} onChange={(v) => patch({ music: v })} />
        <SliderRow icon={<Zap className="size-4" />} label={tr("sfx")} value={s.sfx} onChange={(v) => patch({ sfx: v })} />
        <SliderRow icon={<Flame className="size-4" />} label={tr("shake")} value={s.shake} onChange={(v) => patch({ shake: v })} />
        <ToggleRow label={tr("vibrate")} on={s.vibrate} onChange={(v) => patch({ vibrate: v })} />
        <div>
          <div className="mb-2 text-sm text-muted">{tr("language")}</div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={s.lang === "uk" ? "primary" : "secondary"} onClick={() => patch({ lang: "uk" })}>
              Українська
            </Button>
            <Button variant={s.lang === "en" ? "primary" : "secondary"} onClick={() => patch({ lang: "en" })}>
              English
            </Button>
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm text-muted">{tr("quality")}</div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={s.quality === "high" ? "primary" : "secondary"} onClick={() => patch({ quality: "high" })}>
              {tr("high")}
            </Button>
            <Button variant={s.quality === "low" ? "primary" : "secondary"} onClick={() => patch({ quality: "low" })}>
              {tr("low")}
            </Button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function SliderRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2 text-sm">
        {icon}
        {label}
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-fg)]"
      />
    </label>
  );
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className="flex h-12 w-full cursor-pointer items-center justify-between select-none touch-manipulation"
      {...bindPress(() => onChange(!on))}
    >
      <span className="text-sm">{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full border border-border",
          on ? "bg-fg" : "bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-bg transition-transform",
            on ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

function HowToScreen() {
  const tr = useT();
  const setScreen = useProfile((s) => s.setScreen);
  return (
    <Shell title={tr("howto")} onBack={() => setScreen("menu")}>
      <ol className="flex flex-col gap-4 text-sm leading-relaxed text-muted">
        <li>{tr("howtoMove")}</li>
        <li>{tr("howtoBomb")}</li>
        <li>{tr("howtoChain")}</li>
        <li>{tr("howtoGoal")}</li>
      </ol>
    </Shell>
  );
}

function PlayScreen() {
  const tr = useT();
  const match = useProfile((s) => s.match);
  const settings = useProfile((s) => s.profile.settings);
  const setScreen = useProfile((s) => s.setScreen);
  const apply = useProfile((s) => s.applyResult);
  const startCampaign = useProfile((s) => s.startCampaign);
  const startArena = useProfile((s) => s.startArena);
  const startEndless = useProfile((s) => s.startEndless);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudSnap | null>(null);
  const [paused, setPaused] = useState(false);
  const [revive, setRevive] = useState(false);
  const [watching, setWatching] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!match || !canvasRef.current) return;
    audio.unlock();
    const engine = new GameEngine(canvasRef.current, match, settings, {
      onHud: (h) => {
        setHud(h);
        if (h.paused) setPaused(true);
      },
      onOver: (r: MatchResult) => apply(r),
      onReviveOffer: () => setRevive(true),
    });
    engineRef.current = engine;
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    void engine.boot().then(() => engine.start());
    return () => {
      window.removeEventListener("resize", onResize);
      engine.destroy();
      engineRef.current = null;
    };
  }, [match, apply, settings]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const stick = el.querySelector("[data-role=stick]") as HTMLElement | null;
    if (!stick) return;
    const move = (e: PointerEvent) => {
      const r = stick.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const m = Math.min(28, Math.hypot(dx, dy));
      const a = Math.atan2(dy, dx);
      setKnob({ x: Math.cos(a) * m, y: Math.sin(a) * m });
    };
    const up = () => setKnob({ x: 0, y: 0 });
    stick.addEventListener("pointermove", move);
    stick.addEventListener("pointerup", up);
    stick.addEventListener("pointercancel", up);
    return () => {
      stick.removeEventListener("pointermove", move);
      stick.removeEventListener("pointerup", up);
      stick.removeEventListener("pointercancel", up);
    };
  }, []);

  const togglePause = () => {
    const g = engineRef.current;
    if (!g) return;
    if (paused) {
      g.resume();
      setPaused(false);
    } else {
      g.pause();
      setPaused(true);
    }
  };

  const restart = () => {
    if (!match) return;
    if (match.mode === "campaign") startCampaign(match.levelId);
    if (match.mode === "arena") startArena();
    if (match.mode === "endless") startEndless();
    setPaused(false);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-bg">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 px-3 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <div className="hud-chip pointer-events-auto">
          <Heart className="size-3.5" />
          {hud?.lives ?? 0}
        </div>
        <div className="hud-chip">
          <Bomb className="size-3.5" />
          {hud?.bombs ?? 0}/{hud?.bombMax ?? 1}
        </div>
        <div className="hud-chip">
          <Flame className="size-3.5" />
          {hud?.fire ?? 1}
        </div>
        <div className="hud-chip">
          <Timer className="size-3.5" />
          {match?.time ? formatTime(hud?.timeLeft ?? 0) : `${tr("wave")} ${match?.levelId ?? 1}`}
        </div>
        <div className="hud-chip ml-auto tabular-nums">{hud?.score ?? 0}</div>
        <button
          type="button"
          className="pointer-events-auto hud-chip relative z-10 h-11 min-w-11 cursor-pointer justify-center select-none touch-manipulation"
          aria-label={tr("pause")}
          {...bindPress(togglePause)}
        >
          <Pause className="size-4" />
        </button>
      </div>
      {hud?.suddenDeath ? (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-10 text-center text-xs font-medium tracking-wide text-fg">
          {tr("sudden")}
        </div>
      ) : null}
      {hud?.tutorial ? (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10 mx-auto max-w-sm px-4 text-center text-sm text-fg">
          {t(settings.lang, hud.tutorial as I18nKey)}
        </div>
      ) : null}

      <div ref={wrapRef} className="relative min-h-0 flex-1" style={{ touchAction: "none" }}>
        <canvas ref={canvasRef} className="block h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-4 pb-4 pt-6 md:px-8">
          <div data-role="stick" className="stick-base pointer-events-auto">
            <div className="stick-knob" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
          </div>
          <div className="flex flex-col items-center gap-3">
            {hud?.remote ? (
              <button type="button" data-role="det" className="act-btn pointer-events-auto h-14 w-14 cursor-pointer text-xs font-semibold">
                DET
              </button>
            ) : null}
            <button type="button" data-role="bomb" className="act-btn pointer-events-auto cursor-pointer">
              <Bomb className="size-7" />
            </button>
          </div>
        </div>
      </div>

      {paused ? (
        <Overlay>
          <h2 className="mb-5 text-2xl font-semibold tracking-tight">{tr("pause")}</h2>
          <div className="flex flex-col gap-3">
            <Button onClick={togglePause}>{tr("resume")}</Button>
            <Button variant="secondary" onClick={restart}>
              {tr("restart")}
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(true)}>
              {tr("menu")}
            </Button>
          </div>
        </Overlay>
      ) : null}

      {confirm ? (
        <Overlay>
          <p className="mb-5 text-sm leading-relaxed text-muted">{tr("confirmExit")}</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>
              {tr("cancel")}
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                engineRef.current?.destroy();
                setScreen("menu");
              }}
            >
              {tr("quit")}
            </Button>
          </div>
        </Overlay>
      ) : null}

      {revive ? (
        <Overlay>
          <h2 className="mb-2 text-2xl font-semibold">{tr("revive")}</h2>
          <p className="mb-5 text-sm text-muted">{tr("reviveHint")}</p>
          {watching ? (
            <p className="text-sm text-muted">{tr("watching")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setWatching(true);
                  window.setTimeout(() => {
                    engineRef.current?.sim.revive();
                    setRevive(false);
                    setWatching(false);
                  }, 1400);
                }}
              >
                {tr("revive")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setRevive(false);
                  engineRef.current?.sim.giveUp();
                }}
              >
                {tr("skip")}
              </Button>
            </div>
          )}
        </Overlay>
      ) : null}
    </div>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-[color-mix(in_oklab,var(--color-bg)_78%,transparent)] px-6 pointer-events-auto">
      <div className="panel w-full max-w-sm">{children}</div>
    </div>
  );
}

function ResultScreen() {
  const tr = useT();
  const r = useProfile((s) => s.lastResult);
  const high = useProfile((s) => s.newHigh);
  const setScreen = useProfile((s) => s.setScreen);
  const startCampaign = useProfile((s) => s.startCampaign);
  const startArena = useProfile((s) => s.startArena);
  const startEndless = useProfile((s) => s.startEndless);
  if (!r) return null;
  const next = () => {
    if (r.mode === "campaign" && r.won && r.levelId < 15) startCampaign(r.levelId + 1);
    else if (r.mode === "arena") startArena();
    else if (r.mode === "endless") startEndless();
    else setScreen("campaign");
  };
  const replay = () => {
    if (r.mode === "campaign") startCampaign(r.levelId);
    if (r.mode === "arena") startArena();
    if (r.mode === "endless") startEndless();
  };
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">{r.won ? tr("victory") : tr("defeat")}</p>
      <h2 className="mt-2 text-4xl font-semibold tracking-tight">{r.score}</h2>
      {high ? <p className="mt-2 text-sm text-fg">{tr("newHigh")}</p> : null}
      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div className="panel !rounded-[var(--radius-lg)] !p-4">
          <dt className="text-muted">{tr("reward")}</dt>
          <dd className="mt-1 font-semibold tabular-nums">+{r.coins}</dd>
        </div>
        <div className="panel !rounded-[var(--radius-lg)] !p-4">
          <dt className="text-muted">XP</dt>
          <dd className="mt-1 font-semibold tabular-nums">+{r.xp}</dd>
        </div>
        <div className="panel !rounded-[var(--radius-lg)] !p-4">
          <dt className="text-muted">{tr("kills")}</dt>
          <dd className="mt-1 font-semibold tabular-nums">{r.kills}</dd>
        </div>
        <div className="panel !rounded-[var(--radius-lg)] !p-4">
          <dt className="text-muted">
            <Trophy className="mr-1 inline size-3.5" />
            {tr("score")}
          </dt>
          <dd className="mt-1 font-semibold tabular-nums">{r.score}</dd>
        </div>
      </dl>
      <div className="relative z-10 mt-8 flex flex-col gap-3">
        {r.won && r.mode === "campaign" && r.levelId < 15 ? (
          <Button size="lg" onClick={next}>
            {tr("next")}
          </Button>
        ) : (
          <Button size="lg" onClick={replay}>
            {tr("replay")}
          </Button>
        )}
        <Button variant="secondary" onClick={() => setScreen("menu")}>
          {tr("menu")}
        </Button>
      </div>
    </div>
  );
}

function formatTime(s: number) {
  const t = Math.max(0, Math.ceil(s));
  const m = Math.floor(t / 60);
  const r = t % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
