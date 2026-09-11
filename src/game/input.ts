import type { InputState } from "./types";

const GAME_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "KeyX",
  "KeyF",
  "KeyP",
  "Escape",
  "Enter",
]);

function radial(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export class Input {
  keys = new Set<string>();
  injected: Set<string> | null = null;
  stickX = 0;
  stickY = 0;
  bombHeld = false;
  detonateHeld = false;
  private prevBomb = false;
  private prevDet = false;
  private prevPause = false;
  private pointers = new Map<number, { x: number; y: number; role: "stick" | "bomb" | "det" }>();
  private stickOrigin: { x: number; y: number } | null = null;
  bombRect: DOMRect | null = null;
  detRect: DOMRect | null = null;
  canvas: HTMLElement | null = null;

  attach(el: HTMLElement) {
    this.canvas = el;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.onVis);
    el.addEventListener("pointerdown", this.onPtrDown);
    el.addEventListener("pointermove", this.onPtrMove);
    el.addEventListener("pointerup", this.onPtrUp);
    el.addEventListener("pointercancel", this.onPtrUp);
  }

  detach(el: HTMLElement) {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.onVis);
    el.removeEventListener("pointerdown", this.onPtrDown);
    el.removeEventListener("pointermove", this.onPtrMove);
    el.removeEventListener("pointerup", this.onPtrUp);
    el.removeEventListener("pointercancel", this.onPtrUp);
    this.clear();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onVis = () => {
    if (document.hidden) this.keys.clear();
  };

  private clear = () => {
    this.keys.clear();
    this.pointers.clear();
    this.stickX = 0;
    this.stickY = 0;
    this.stickOrigin = null;
    this.bombHeld = false;
    this.detonateHeld = false;
  };

  private onPtrDown = (e: PointerEvent) => {
    const t = e.target as HTMLElement;
    const role = t.closest("[data-role]")?.getAttribute("data-role") as
      | "stick"
      | "bomb"
      | "det"
      | null;
    if (!role) return;
    e.preventDefault();
    t.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, role });
    if (role === "stick") this.stickOrigin = { x: e.clientX, y: e.clientY };
    if (role === "bomb") this.bombHeld = true;
    if (role === "det") this.detonateHeld = true;
  };

  private onPtrMove = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    if (!p || p.role !== "stick" || !this.stickOrigin) return;
    const dx = e.clientX - this.stickOrigin.x;
    const dy = e.clientY - this.stickOrigin.y;
    const max = 46;
    const clamped = radial(dx / max, dy / max, 0.12);
    this.stickX = clamped.x;
    this.stickY = clamped.y;
  };

  private onPtrUp = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (!p) return;
    if (p.role === "stick") {
      const still = [...this.pointers.values()].some((x) => x.role === "stick");
      if (!still) {
        this.stickX = 0;
        this.stickY = 0;
        this.stickOrigin = null;
      }
    }
    if (p.role === "bomb") this.bombHeld = [...this.pointers.values()].some((x) => x.role === "bomb");
    if (p.role === "det") this.detonateHeld = [...this.pointers.values()].some((x) => x.role === "det");
  };

  poll(): InputState {
    const keys = this.injected ?? this.keys;
    let mx = this.stickX;
    let my = this.stickY;

    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;

    let padBomb = false;
    let padDet = false;
    let padPause = false;
    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() ?? [] : [];
    for (const pad of pads) {
      if (!pad || pad.mapping !== "standard") continue;
      const st = radial(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      mx += st.x;
      my += st.y;
      if (pad.buttons[12]?.pressed) my -= 1;
      if (pad.buttons[13]?.pressed) my += 1;
      if (pad.buttons[14]?.pressed) mx -= 1;
      if (pad.buttons[15]?.pressed) mx += 1;
      if (pad.buttons[0]?.pressed) padBomb = true;
      if (pad.buttons[2]?.pressed) padDet = true;
      if (pad.buttons[9]?.pressed) padPause = true;
    }

    mx = Math.max(-1, Math.min(1, mx));
    my = Math.max(-1, Math.min(1, my));

    const bomb = this.bombHeld || keys.has("Space") || padBomb;
    const detonate = this.detonateHeld || keys.has("KeyX") || keys.has("KeyF") || padDet;
    const pause = keys.has("Escape") || keys.has("KeyP") || padPause;

    const state: InputState = {
      mx,
      my,
      bomb,
      bombPressed: bomb && !this.prevBomb,
      detonate,
      detonatePressed: detonate && !this.prevDet,
      pausePressed: pause && !this.prevPause,
    };
    this.prevBomb = bomb;
    this.prevDet = detonate;
    this.prevPause = pause;
    return state;
  }

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
  }
}
