import { STEP } from "./balance";
import { audio } from "./audio";
import { loadSheets, type Sheets } from "./assets";
import { Input } from "./input";
import { renderArena } from "./render";
import { Sim } from "./sim";
import { mulberry32 } from "./rng";
import type { HudSnap, MatchConfig, MatchResult, Settings } from "./types";

export type EngineHooks = {
  onHud: (h: HudSnap) => void;
  onOver: (r: MatchResult) => void;
  onReviveOffer: () => void;
};

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  sim: Sim;
  input = new Input();
  sheets: Sheets | null = null;
  config: MatchConfig;
  settings: Settings;
  hooks: EngineHooks;
  private raf = 0;
  private acc = 0;
  private last = 0;
  private running = false;
  private hudClock = 0;
  private ended = false;
  private offered = false;
  ready = false;

  constructor(canvas: HTMLCanvasElement, config: MatchConfig, settings: Settings, hooks: EngineHooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.config = config;
    this.settings = settings;
    this.hooks = hooks;
    this.sim = new Sim(config, mulberry32(config.seed));
    this.sim.juice.shakeScale = settings.shake;
    this.input.attach(canvas.parentElement ?? canvas);
    this.resize();
    this.bindControlsTest();
  }

  async boot() {
    this.sheets = await loadSheets();
    this.ready = true;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.loop(this.last);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.detach(this.canvas.parentElement ?? this.canvas);
    if (window.__controlsTest) delete window.__controlsTest;
  }

  pause() {
    this.sim.paused = true;
  }

  resume() {
    this.sim.paused = false;
    this.last = performance.now();
  }

  private bindControlsTest() {
    window.__controlsTest = {
      getYaw: () => this.sim.getYaw(),
      getSpeed: () => this.sim.getSpeed(),
      setKeys: (codes: string[]) => this.input.setKeys(codes),
      setSteer: (v: number) => {
        this.input.stickX = -v;
      },
    };
  }

  resize() {
    const parent = this.canvas.parentElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = parent?.clientWidth ?? 800;
    const h = parent?.clientHeight ?? 600;
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private loop = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    this.acc += dt;
    const input = this.input.poll();
    if (input.pausePressed && !this.sim.over) {
      this.sim.paused = !this.sim.paused;
    }
    while (this.acc >= STEP) {
      this.sim.step(STEP, input);
      this.acc -= STEP;
    }
    audio.update(STEP, !this.sim.paused && !this.sim.over && !this.sim.offeringRevive);
    this.draw();
    this.hudClock += dt;
    if (this.hudClock > 0.08) {
      this.hudClock = 0;
      this.hooks.onHud(this.sim.hud());
    }
    if (this.sim.offeringRevive && !this.offered) {
      this.offered = true;
      this.hooks.onReviveOffer();
    }
    if (this.sim.over && !this.ended) {
      this.ended = true;
      this.hooks.onOver(this.sim.result());
    }
    if (this.settings.vibrate && this.sim.juice.trauma > 0.5) {
      try {
        navigator.vibrate?.(18);
      } catch {
        /* ignore */
      }
    }
  };

  private draw() {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth ?? 800;
    const h = parent?.clientHeight ?? 600;
    if (!this.sheets) {
      this.ctx.fillStyle = "#0c1018";
      this.ctx.fillRect(0, 0, w, h);
      return;
    }
    renderArena(
      this.ctx,
      this.sim,
      this.sheets,
      this.config.skin,
      this.config.theme,
      w,
      h,
      this.settings.quality,
    );
  }
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
      setSteer?: (v: number) => void;
    };
  }
}
