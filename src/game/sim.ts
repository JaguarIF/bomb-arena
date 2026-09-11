import {
  BASE_SPEED,
  BOMB_FUSE,
  DROP_CHANCE,
  DROP_WEIGHTS,
  FLAME_TTL,
  INVULN_HIT,
  MAX_BOMBS,
  MAX_FIRE,
  MAX_SPEED_LEVEL,
  PICKUP_TTL,
  SHIELD_TIME,
  SPEED_STEP,
  SUDDEN_INTERVAL,
} from "./balance";
import { DIRS, enemySlots, generateGrid, inBounds } from "./grid";
import { pickWeighted, shuffle } from "./rng";
import type {
  Actor,
  ActorKind,
  Bomb,
  CellKind,
  Flame,
  Floater,
  HudSnap,
  InputState,
  MatchConfig,
  MatchResult,
  Particle,
  Pickup,
  PowerKind,
} from "./types";
import { Juice } from "./juice";
import { audio } from "./audio";

const RAY = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function cellOf(x: number, y: number): [number, number] {
  return [Math.floor(x), Math.floor(y)];
}

function center(cx: number, cy: number): [number, number] {
  return [cx + 0.5, cy + 0.5];
}

function snap4(mx: number, my: number): [number, number] {
  if (Math.abs(mx) < 0.28 && Math.abs(my) < 0.28) return [0, 0];
  if (Math.abs(mx) > Math.abs(my)) return [Math.sign(mx), 0];
  return [0, Math.sign(my)];
}

function dirFrom(dx: number, dy: number): Actor["dir"] {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 1 : 2;
  return dy < 0 ? 3 : 0;
}

let nextId = 1;

export class Sim {
  grid: CellKind[][] = [];
  size = 13;
  actors: Actor[] = [];
  bombs: Bomb[] = [];
  flames: Flame[] = [];
  pickups: Pickup[] = [];
  particles: Particle[] = [];
  floaters: Floater[] = [];
  juice = new Juice();
  rng: () => number;
  config: MatchConfig;
  timeLeft = 0;
  score = 0;
  combo = 0;
  comboT = 0;
  kills = 0;
  sudden = false;
  suddenT = 0;
  shrink = 0;
  paused = false;
  over = false;
  won = false;
  usedRevive = false;
  offeringRevive = false;
  hitstopSkip = 0;
  wave = 1;
  spawnWaveT = 0;
  tutorialIdx = 0;
  tutorialT = 0;
  lastInput: InputState = {
    mx: 0,
    my: 0,
    bomb: false,
    bombPressed: false,
    detonate: false,
    detonatePressed: false,
    pausePressed: false,
  };

  constructor(config: MatchConfig, rng: () => number) {
    this.config = config;
    this.rng = rng;
    this.size = config.size;
    this.grid = generateGrid(config.size, config.density, rng);
    this.timeLeft = config.time;
    const [px, py] = center(1, 1);
    this.actors.push(this.makeActor("player", px, py, config.lives));
    for (const e of enemySlots(this.grid, config.enemies, rng)) {
      const [x, y] = center(e.x, e.y);
      const a = this.makeActor(e.kind, x, y, 1);
      if (e.kind === "beetle") a.aggro = 7;
      if (e.kind === "ghost") {
        a.aggro = 9;
        a.speed = BASE_SPEED * 0.95;
      }
      if (e.kind === "slime") a.speed = BASE_SPEED * 0.72;
      this.actors.push(a);
    }
    if (config.tutorial) {
      this.tutorialIdx = 0;
      this.tutorialT = 3.2;
    } else this.tutorialIdx = -1;
  }

  private makeActor(kind: ActorKind, x: number, y: number, lives: number): Actor {
    return {
      id: nextId++,
      kind,
      x,
      y,
      dir: 0,
      moving: false,
      speed: BASE_SPEED,
      speedLevel: 0,
      alive: true,
      invuln: kind === "player" ? 0.8 : 0,
      shield: 0,
      bombMax: 1,
      bombsOut: 0,
      fire: 1,
      bombPass: false,
      remote: false,
      lives,
      anim: 0,
      deathT: 0,
      flash: 0,
      aiTimer: 0.2 + this.rng() * 0.4,
      aggro: 5,
      wantX: 0,
      wantY: 0,
    };
  }

  player(): Actor {
    return this.actors.find((a) => a.kind === "player")!;
  }

  step(dt: number, input: InputState) {
    this.lastInput = input;
    this.juice.update(dt);
    if (this.paused || this.over || this.offeringRevive) return;
    if (this.juice.hitstop > 0) return;

    if (this.tutorialIdx >= 0) {
      this.tutorialT -= dt;
      if (this.tutorialT <= 0) {
        this.tutorialIdx++;
        this.tutorialT = 3.2;
        if (this.tutorialIdx > 2) this.tutorialIdx = -1;
      }
    }

    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;

    if (this.config.time > 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0 && !this.sudden) {
        this.sudden = true;
        this.timeLeft = 0;
        this.suddenT = 0.4;
      }
    } else {
      this.spawnWaveT += dt;
      if (this.spawnWaveT > 22) {
        this.spawnWaveT = 0;
        this.wave++;
        this.spawnEndless();
      }
    }

    if (this.sudden) {
      this.suddenT -= dt;
      if (this.suddenT <= 0) {
        this.suddenT = SUDDEN_INTERVAL;
        this.shrinkRing();
      }
    }

    this.tickBombs(dt);
    this.tickFlames(dt);
    this.tickPickups(dt);
    this.movePlayer(dt, input);
    this.moveEnemies(dt);
    this.tickActors(dt);
    this.tickParticles(dt);
    this.resolveHits();
    this.checkEnd();
  }

  private spawnEndless() {
    const empties: [number, number][] = [];
    const p = this.player();
    for (let y = 1; y < this.size - 1; y++) {
      for (let x = 1; x < this.size - 1; x++) {
        if (this.grid[y]![x] !== "empty") continue;
        if (Math.abs(x - Math.floor(p.x)) + Math.abs(y - Math.floor(p.y)) < 6) continue;
        empties.push([x, y]);
      }
    }
    if (!empties.length) return;
    const [x, y] = empties[Math.floor(this.rng() * empties.length)]!;
    const kinds: ActorKind[] = this.wave > 4 ? ["beetle", "ghost", "slime"] : ["slime", "beetle"];
    const kind = kinds[Math.floor(this.rng() * kinds.length)] as Exclude<ActorKind, "player">;
    const [cx, cy] = center(x, y);
    this.actors.push(this.makeActor(kind, cx, cy, 1));
  }

  private shrinkRing() {
    this.shrink++;
    const s = this.shrink;
    let crushed = 0;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const edge = x === s || y === s || x === this.size - 1 - s || y === this.size - 1 - s;
        if (!edge) continue;
        if (this.grid[y]![x] === "solid") continue;
        this.grid[y]![x] = "solid";
        crushed++;
        this.burst(x + 0.5, y + 0.5, "#8ea0b5", 6);
        this.pickups = this.pickups.filter((p) => !(p.cellX === x && p.cellY === y));
        for (const a of this.actors) {
          if (!a.alive) continue;
          const [cx, cy] = cellOf(a.x, a.y);
          if (cx === x && cy === y) this.hurt(a, true);
        }
      }
    }
    if (crushed) {
      this.juice.addTrauma(0.25);
      audio.tick();
    }
  }

  private tickBombs(dt: number) {
    for (const b of this.bombs) {
      if (!b.remote) b.fuse -= dt;
      const owner = this.actors.find((a) => a.id === b.owner);
      if (b.passOwner && owner) {
        const [cx, cy] = cellOf(owner.x, owner.y);
        if (cx !== b.cellX || cy !== b.cellY) b.passOwner = false;
      }
    }
    const ready = this.bombs.filter((b) => !b.remote && b.fuse <= 0);
    for (const b of ready) this.detonate(b);
  }

  detonate(bomb: Bomb) {
    if (!this.bombs.includes(bomb)) return;
    this.bombs = this.bombs.filter((b) => b !== bomb);
    const owner = this.actors.find((a) => a.id === bomb.owner);
    if (owner) owner.bombsOut = Math.max(0, owner.bombsOut - 1);
    this.combo += 1;
    this.comboT = 0.7;
    if (this.combo > 1) {
      this.score += 25 * (this.combo - 1);
      this.float(bomb.cellX + 0.5, bomb.cellY + 0.2, `x${this.combo}`, "#f3efe6");
    }
    this.placeFlame(bomb.cellX, bomb.cellY);
    this.juice.addTrauma(0.38);
    this.juice.freeze(0.035);
    audio.explosion();
    if (this.config.skin) {
      /* keep vibrate in engine */
    }
    for (const [dx, dy] of RAY) {
      for (let i = 1; i <= bomb.fire; i++) {
        const x = bomb.cellX + dx * i;
        const y = bomb.cellY + dy * i;
        if (!inBounds(this.size, x, y)) break;
        const cell = this.grid[y]![x]!;
        if (cell === "solid") break;
        this.placeFlame(x, y);
        if (cell === "soft") {
          this.breakSoft(x, y);
          break;
        }
        const other = this.bombs.find((b) => b.cellX === x && b.cellY === y);
        if (other) this.detonate(other);
      }
    }
  }

  private placeFlame(x: number, y: number) {
    const ex = this.flames.find((f) => f.cellX === x && f.cellY === y);
    if (ex) {
      ex.ttl = FLAME_TTL;
      return;
    }
    this.flames.push({ cellX: x, cellY: y, ttl: FLAME_TTL, max: FLAME_TTL });
    this.pickups = this.pickups.filter((p) => !(p.cellX === x && p.cellY === y));
    this.burst(x + 0.5, y + 0.5, "#ff8a3c", 10);
  }

  private breakSoft(x: number, y: number) {
    this.grid[y]![x] = "empty";
    this.score += 10;
    this.burst(x + 0.5, y + 0.5, "#c4a574", 8);
    if (this.rng() < DROP_CHANCE && !this.pickups.some((p) => p.cellX === x && p.cellY === y)) {
      const kind = pickWeighted(this.rng, DROP_WEIGHTS).kind;
      this.pickups.push({ kind, cellX: x, cellY: y, ttl: PICKUP_TTL, bob: this.rng() * 4 });
    }
  }

  private tickFlames(dt: number) {
    for (const f of this.flames) f.ttl -= dt;
    this.flames = this.flames.filter((f) => f.ttl > 0);
  }

  private tickPickups(dt: number) {
    for (const p of this.pickups) {
      p.ttl -= dt;
      p.bob += dt * 3;
    }
    this.pickups = this.pickups.filter((p) => p.ttl > 0);
  }

  private walkable(actor: Actor, cx: number, cy: number): boolean {
    if (!inBounds(this.size, cx, cy)) return false;
    const cell = this.grid[cy]![cx]!;
    if (cell === "solid") return false;
    if (cell === "soft") return actor.kind === "ghost";
    const bomb = this.bombs.find((b) => b.cellX === cx && b.cellY === cy);
    if (bomb) {
      if (actor.bombPass) return true;
      if (bomb.passOwner && bomb.owner === actor.id) return true;
      return false;
    }
    for (const o of this.actors) {
      if (o === actor || !o.alive || o.deathT > 0) continue;
      const [ox, oy] = cellOf(o.x, o.y);
      if (ox === cx && oy === cy) return false;
    }
    return true;
  }

  private moveToward(actor: Actor, dx: number, dy: number, dt: number) {
    if (dx === 0 && dy === 0) {
      actor.moving = false;
      return;
    }
    actor.dir = dirFrom(dx, dy);
    actor.moving = true;
    const sp = actor.speed * dt;
    const [cx, cy] = cellOf(actor.x, actor.y);
    const [tcx, tcy] = center(cx, cy);

    if (dx !== 0) {
      if (Math.abs(actor.y - tcy) > 0.08) {
        actor.y += Math.sign(tcy - actor.y) * Math.min(sp, Math.abs(tcy - actor.y));
        return;
      }
      actor.y = tcy;
      const nx = actor.x + dx * sp;
      const ncx = Math.floor(nx);
      if (ncx !== cx && !this.walkable(actor, ncx, cy)) {
        actor.x = tcx;
      } else actor.x = nx;
    } else {
      if (Math.abs(actor.x - tcx) > 0.08) {
        actor.x += Math.sign(tcx - actor.x) * Math.min(sp, Math.abs(tcx - actor.x));
        return;
      }
      actor.x = tcx;
      const ny = actor.y + dy * sp;
      const ncy = Math.floor(ny);
      if (ncy !== cy && !this.walkable(actor, cx, ncy)) {
        actor.y = tcy;
      } else actor.y = ny;
    }
  }

  private movePlayer(dt: number, input: InputState) {
    const p = this.player();
    if (!p.alive || p.deathT > 0) return;
    const [dx, dy] = snap4(input.mx, input.my);
    p.wantX = input.mx;
    p.wantY = input.my;
    this.moveToward(p, dx, dy, dt);
    if (input.bombPressed) this.tryPlant(p);
    if (input.detonatePressed && p.remote) {
      for (const b of [...this.bombs.filter((b) => b.owner === p.id)]) this.detonate(b);
    }
    this.tryPickup(p);
  }

  private tryPlant(p: Actor) {
    if (p.bombsOut >= p.bombMax) {
      if (p.remote) {
        for (const b of [...this.bombs.filter((b) => b.owner === p.id)]) this.detonate(b);
      }
      return;
    }
    const [cx, cy] = cellOf(p.x, p.y);
    if (this.grid[cy]![cx] !== "empty") return;
    if (this.bombs.some((b) => b.cellX === cx && b.cellY === cy)) return;
    if (this.pickups.some((u) => u.cellX === cx && u.cellY === cy)) return;
    this.bombs.push({
      id: nextId++,
      owner: p.id,
      cellX: cx,
      cellY: cy,
      fuse: BOMB_FUSE,
      fire: p.fire,
      remote: p.remote,
      passOwner: true,
    });
    p.bombsOut++;
    audio.plant();
  }

  private tryPickup(p: Actor) {
    const [cx, cy] = cellOf(p.x, p.y);
    const item = this.pickups.find((u) => u.cellX === cx && u.cellY === cy);
    if (!item) return;
    this.pickups = this.pickups.filter((u) => u !== item);
    this.applyPower(p, item.kind);
    this.score += 20;
    audio.pickup();
    this.float(p.x, p.y - 0.4, "+20", "#d7c7a0");
  }

  private applyPower(p: Actor, kind: PowerKind) {
    switch (kind) {
      case "bomb":
        p.bombMax = Math.min(MAX_BOMBS, p.bombMax + 1);
        break;
      case "fire":
        p.fire = Math.min(MAX_FIRE, p.fire + 1);
        break;
      case "speed":
        p.speedLevel = Math.min(MAX_SPEED_LEVEL, p.speedLevel + 1);
        p.speed = BASE_SPEED + p.speedLevel * SPEED_STEP;
        break;
      case "shield":
        p.shield = SHIELD_TIME;
        break;
      case "pass":
        p.bombPass = true;
        break;
      case "remote":
        p.remote = true;
        for (const b of this.bombs) if (b.owner === p.id) b.remote = true;
        break;
      case "life":
        p.lives = Math.min(5, p.lives + 1);
        break;
    }
  }

  private flameAt(cx: number, cy: number): boolean {
    return this.flames.some((f) => f.cellX === cx && f.cellY === cy);
  }

  private danger(cx: number, cy: number): boolean {
    if (this.flameAt(cx, cy)) return true;
    for (const b of this.bombs) {
      if (b.fuse > 1.15 && !b.remote) continue;
      if (b.cellX === cx && b.cellY === cy) return true;
      if (b.cellX === cx && Math.abs(b.cellY - cy) <= b.fire) {
        let blocked = false;
        const step = Math.sign(cy - b.cellY) || 1;
        for (let y = b.cellY + step; y !== cy; y += step) {
          if (this.grid[y]![cx] !== "empty") {
            blocked = true;
            break;
          }
        }
        if (!blocked && this.grid[cy]![cx] !== "solid") return true;
      }
      if (b.cellY === cy && Math.abs(b.cellX - cx) <= b.fire) {
        let blocked = false;
        const step = Math.sign(cx - b.cellX) || 1;
        for (let x = b.cellX + step; x !== cx; x += step) {
          if (this.grid[cy]![x] !== "empty") {
            blocked = true;
            break;
          }
        }
        if (!blocked && this.grid[cy]![cx] !== "solid") return true;
      }
    }
    return false;
  }

  private moveEnemies(dt: number) {
    const p = this.player();
    for (const e of this.actors) {
      if (e.kind === "player" || !e.alive || e.deathT > 0) continue;
      const [cx, cy] = cellOf(e.x, e.y);
      e.aiTimer -= dt;
      if (this.danger(cx, cy)) {
        const opts = shuffle(this.rng, DIRS).filter((d) => this.walkable(e, cx + d.dx, cy + d.dy));
        opts.sort((a, b) => {
          const da = this.danger(cx + a.dx, cy + a.dy) ? 1 : 0;
          const db = this.danger(cx + b.dx, cy + b.dy) ? 1 : 0;
          return da - db;
        });
        const pick = opts[0];
        if (pick) this.moveToward(e, pick.dx, pick.dy, dt);
        else e.moving = false;
        continue;
      }
      const [tcx, tcy] = center(cx, cy);
      const aligned = Math.abs(e.x - tcx) < 0.08 && Math.abs(e.y - tcy) < 0.08;
      if (e.aiTimer <= 0 && aligned) {
        e.aiTimer = 0.18 + this.rng() * 0.45;
        const md = Math.abs(Math.floor(p.x) - cx) + Math.abs(Math.floor(p.y) - cy);
        let opts = DIRS.filter((d) => this.walkable(e, cx + d.dx, cy + d.dy) && !this.danger(cx + d.dx, cy + d.dy));
        if (!opts.length) opts = DIRS.filter((d) => this.walkable(e, cx + d.dx, cy + d.dy));
        if (e.kind !== "slime" && md <= e.aggro && p.alive) {
          opts.sort((a, b) => {
            const da = Math.abs(Math.floor(p.x) - (cx + a.dx)) + Math.abs(Math.floor(p.y) - (cy + a.dy));
            const db = Math.abs(Math.floor(p.x) - (cx + b.dx)) + Math.abs(Math.floor(p.y) - (cy + b.dy));
            return da - db;
          });
        } else {
          opts = shuffle(this.rng, opts);
        }
        const pick = opts[0];
        if (pick) {
          e.wantX = pick.dx;
          e.wantY = pick.dy;
        }
        if (
          this.config.beetleBombs &&
          e.kind === "beetle" &&
          e.bombsOut === 0 &&
          md >= 2 &&
          md <= 4 &&
          this.rng() < 0.12
        ) {
          e.bombMax = 1;
          e.fire = 2;
          this.tryPlant(e);
        }
      }
      this.moveToward(e, e.wantX, e.wantY, dt);
    }
  }

  private tickActors(dt: number) {
    for (const a of this.actors) {
      if (a.invuln > 0) a.invuln -= dt;
      if (a.shield > 0) a.shield -= dt;
      if (a.flash > 0) a.flash -= dt;
      if (a.moving && a.alive) a.anim += dt * a.speed * 2.4;
      if (a.deathT > 0) {
        a.deathT -= dt;
        if (a.deathT <= 0 && a.lives <= 0) a.alive = false;
      }
    }
  }

  private resolveHits() {
    for (const a of this.actors) {
      if (!a.alive || a.deathT > 0 || a.invuln > 0) continue;
      const [cx, cy] = cellOf(a.x, a.y);
      if (this.flameAt(cx, cy)) this.hurt(a, false);
    }
  }

  private hurt(a: Actor, crush: boolean) {
    if (a.shield > 0 && !crush) {
      a.shield = 0;
      a.invuln = 0.8;
      a.flash = 0.2;
      this.juice.addTrauma(0.2);
      return;
    }
    a.flash = 0.18;
    a.lives -= 1;
    if (a.lives > 0) {
      a.invuln = INVULN_HIT;
      const [sx, sy] = center(1, 1);
      if (a.kind === "player") {
        a.x = sx;
        a.y = sy;
      }
      this.juice.addTrauma(0.45);
      audio.death();
      return;
    }
    a.deathT = 0.55;
    a.moving = false;
    this.juice.addTrauma(0.7);
    this.juice.freeze(0.07);
    audio.death();
    this.burst(a.x, a.y, "#f3efe6", 14);
    if (a.kind !== "player") {
      this.kills++;
      this.score += 100;
      this.float(a.x, a.y - 0.3, "+100", "#f3efe6");
    }
  }

  revive() {
    if (this.usedRevive) return;
    const p = this.player();
    this.usedRevive = true;
    this.offeringRevive = false;
    p.alive = true;
    p.lives = 1;
    p.deathT = 0;
    p.invuln = 2;
    const [x, y] = center(1, 1);
    p.x = x;
    p.y = y;
    this.over = false;
    this.won = false;
  }

  giveUp() {
    this.offeringRevive = false;
    const p = this.player();
    p.alive = false;
    p.lives = 0;
    p.deathT = 0;
    this.finish(false);
  }

  private checkEnd() {
    const p = this.player();
    if (p.lives <= 0 && p.deathT <= 0) {
      p.alive = false;
      if (this.offeringRevive || this.over) return;
      if (!this.usedRevive && this.config.mode !== "arena") {
        this.offeringRevive = true;
        return;
      }
      this.finish(false);
      return;
    }
    if (p.alive && p.deathT <= 0) {
      const foes = this.actors.filter((a) => a.kind !== "player" && (a.alive || a.deathT > 0));
      if (foes.length === 0 && this.config.mode !== "endless") this.finish(true);
    }
  }

  private finish(won: boolean) {
    if (this.over) return;
    this.over = true;
    this.won = won;
    if (won) {
      this.score += Math.floor(this.timeLeft) * 2;
      audio.win();
    } else audio.lose();
  }

  result(): MatchResult {
    return {
      won: this.won,
      score: this.score,
      coins: 0,
      xp: 0,
      timeLeft: Math.max(0, this.timeLeft),
      kills: this.kills,
      mode: this.config.mode,
      levelId: this.config.levelId,
    };
  }

  hud(): HudSnap {
    const p = this.player();
    const tips = ["tipMove", "tipSoft", "tipChain"] as const;
    return {
      lives: Math.max(0, p.lives),
      bombs: Math.max(0, p.bombMax - p.bombsOut),
      bombMax: p.bombMax,
      fire: p.fire,
      speedLevel: p.speedLevel,
      shield: p.shield > 0,
      remote: p.remote,
      pass: p.bombPass,
      timeLeft: Math.max(0, this.timeLeft),
      score: this.score,
      combo: this.combo,
      enemies: this.actors.filter((a) => a.kind !== "player" && (a.alive || a.deathT > 0)).length,
      suddenDeath: this.sudden,
      paused: this.paused,
      over: this.over,
      won: this.won,
      canRevive: this.offeringRevive,
      tutorial: this.tutorialIdx >= 0 ? tips[this.tutorialIdx] ?? null : null,
    };
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const s = 1.2 + this.rng() * 2.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.28 + this.rng() * 0.25,
        max: 0.5,
        size: 0.06 + this.rng() * 0.08,
        color,
        gravity: 2.2,
      });
    }
  }

  private float(x: number, y: number, text: string, color: string) {
    this.floaters.push({ x, y, text, life: 0.7, max: 0.7, color });
  }

  private tickParticles(dt: number) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) f.life -= dt;
    this.floaters = this.floaters.filter((f) => f.life > 0);
    if (this.particles.length > 220) this.particles.splice(0, this.particles.length - 220);
  }

  getYaw(): number {
    const mx = this.lastInput.mx;
    const my = this.lastInput.my;
    if (Math.abs(mx) < 0.01 && Math.abs(my) < 0.01) {
      const p = this.player();
      const dx = p.dir === 1 ? -1 : p.dir === 2 ? 1 : 0;
      const dy = p.dir === 3 ? -1 : p.dir === 0 ? 1 : 0;
      return Math.atan2(-dy, dx);
    }
    return Math.atan2(-my, mx);
  }

  getSpeed(): number {
    const p = this.player();
    const mag = Math.hypot(this.lastInput.mx, this.lastInput.my);
    if (mag > 0.12) return p.speed;
    return p.moving ? p.speed : 0;
  }
}
