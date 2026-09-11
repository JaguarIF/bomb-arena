import type { ActorKind, CellKind, EnemySpec } from "./types";

export function inBounds(size: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < size && y < size;
}

export function generateGrid(size: number, density: number, rng: () => number): CellKind[][] {
  const g: CellKind[][] = [];
  for (let y = 0; y < size; y++) {
    g[y] = [];
    for (let x = 0; x < size; x++) {
      if (x === 0 || y === 0 || x === size - 1 || y === size - 1) g[y]![x] = "solid";
      else if (x % 2 === 0 && y % 2 === 0) g[y]![x] = "solid";
      else g[y]![x] = "empty";
    }
  }
  const spawns = spawnPoints(size);
  const near = (x: number, y: number) =>
    spawns.some(([sx, sy]) => Math.abs(x - sx) + Math.abs(y - sy) <= 2);
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (g[y]![x] === "empty" && !near(x, y) && rng() < density) g[y]![x] = "soft";
    }
  }
  return g;
}

export function spawnPoints(size: number): [number, number][] {
  return [
    [1, 1],
    [size - 2, 1],
    [1, size - 2],
    [size - 2, size - 2],
  ];
}

export function enemySlots(
  grid: CellKind[][],
  specs: EnemySpec[],
  rng: () => number,
): { kind: Exclude<ActorKind, "player">; x: number; y: number }[] {
  const size = grid.length;
  const empties: [number, number][] = [];
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (grid[y]![x] !== "empty") continue;
      if (Math.abs(x - 1) + Math.abs(y - 1) < 5) continue;
      empties.push([x, y]);
    }
  }
  for (let i = empties.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [empties[i], empties[j]] = [empties[j]!, empties[i]!];
  }
  const out: { kind: Exclude<ActorKind, "player">; x: number; y: number }[] = [];
  let k = 0;
  for (const spec of specs) {
    for (let n = 0; n < spec.count; n++) {
      const slot = empties[k++];
      if (!slot) break;
      out.push({ kind: spec.kind, x: slot[0], y: slot[1] });
    }
  }
  return out;
}

export const DIRS: { dx: number; dy: number; dir: 0 | 1 | 2 | 3 }[] = [
  { dx: 0, dy: 1, dir: 0 },
  { dx: -1, dy: 0, dir: 1 },
  { dx: 1, dy: 0, dir: 2 },
  { dx: 0, dy: -1, dir: 3 },
];
