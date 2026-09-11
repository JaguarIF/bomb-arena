export class Juice {
  trauma = 0;
  hitstop = 0;
  shakeScale = 1;
  reduced = false;
  time = 0;

  constructor() {
    if (typeof window !== "undefined" && window.matchMedia) {
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  }

  addTrauma(v: number) {
    if (this.reduced) return;
    this.trauma = Math.min(1, this.trauma + v * this.shakeScale);
  }

  freeze(seconds: number) {
    if (this.reduced) return;
    this.hitstop = Math.max(this.hitstop, seconds);
  }

  update(dt: number) {
    this.time += dt;
    if (this.hitstop > 0) this.hitstop = Math.max(0, this.hitstop - dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }

  offset(): { x: number; y: number; rot: number } {
    const t = this.trauma * this.trauma;
    if (t <= 0.0001) return { x: 0, y: 0, rot: 0 };
    const n1 = Math.sin(this.time * 67.1);
    const n2 = Math.cos(this.time * 53.7);
    return { x: n1 * t * 10, y: n2 * t * 8, rot: n1 * t * 0.012 };
  }
}
