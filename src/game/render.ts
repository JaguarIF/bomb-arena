import { POWER_INDEX, THEME_TINT } from "./balance";
import { blit, type Sheets } from "./assets";
import type { Actor, PowerKind, SkinId, ThemeId } from "./types";
import type { Sim } from "./sim";

export function renderArena(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  sheets: Sheets,
  skin: SkinId,
  theme: ThemeId,
  w: number,
  h: number,
  quality: "high" | "low",
) {
  const size = sim.size;
  const pad = 8;
  const cell = Math.floor(Math.min((w - pad * 2) / size, (h - pad * 2) / size));
  const ox = Math.floor((w - cell * size) / 2);
  const oy = Math.floor((h - cell * size) / 2);
  const shake = sim.juice.offset();

  ctx.save();
  ctx.fillStyle = "#0c1018";
  ctx.fillRect(0, 0, w, h);
  ctx.translate(ox + shake.x, oy + shake.y);
  if (shake.rot) {
    ctx.translate((cell * size) / 2, (cell * size) / 2);
    ctx.rotate(shake.rot);
    ctx.translate((-cell * size) / 2, (-cell * size) / 2);
  }

  const floor = sheets.floors[theme];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hash = (x * 1103515245 + y * 12345) >>> 0;
      const sx = hash & 127;
      const sy = (hash >> 7) & 127;
      ctx.drawImage(floor, sx, sy, 128, 128, x * cell, y * cell, cell, cell);
    }
  }

  ctx.fillStyle = THEME_TINT[theme];
  ctx.fillRect(0, 0, size * cell, size * cell);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const k = sim.grid[y]![x];
      if (k === "solid") {
        ctx.drawImage(sheets.wall, x * cell, y * cell - cell * 0.06, cell, cell);
      } else if (k === "soft") {
        ctx.drawImage(sheets.crate, x * cell + cell * 0.04, y * cell - cell * 0.02, cell * 0.92, cell * 0.92);
      }
    }
  }

  for (const p of sim.pickups) {
    const bob = Math.sin(p.bob) * cell * 0.06;
    const fade = p.ttl < 2 ? 0.4 + 0.6 * Math.abs(Math.sin(p.bob * 4)) : 1;
    ctx.globalAlpha = fade;
    drawPower(ctx, sheets, p.kind, p.cellX * cell, p.cellY * cell + bob - cell * 0.08, cell);
    ctx.globalAlpha = 1;
  }

  for (const f of sim.flames) {
    const t = 1 - f.ttl / f.max;
    const col = t < 0.5 ? Math.min(1, Math.floor(t * 4)) : Math.min(3, 1 + Math.floor((t - 0.5) * 4));
    const row = 0;
    const c = col % 2;
    const r = Math.min(1, Math.floor(col / 2) + row);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.55 + 0.45 * (f.ttl / f.max);
    blit(
      ctx,
      sheets.explosion,
      2,
      2,
      c,
      r,
      f.cellX * cell - cell * 0.05,
      f.cellY * cell - cell * 0.1,
      cell * 1.1,
      cell * 1.1,
    );
    ctx.restore();
  }

  for (const b of sim.bombs) {
    const pulse = b.remote ? 0 : Math.min(3, Math.floor((1 - b.fuse / 2.5) * 4));
    const col = pulse % 2;
    const row = Math.floor(pulse / 2);
    const squash = 1 + Math.sin(b.fuse * 14) * (b.fuse < 0.6 ? 0.08 : 0.03);
    blit(
      ctx,
      sheets.bomb,
      2,
      2,
      col,
      row,
      b.cellX * cell + cell * 0.1,
      b.cellY * cell + cell * 0.08,
      cell * 0.8,
      cell * 0.8 * squash,
    );
  }

  const drawList = sim.actors
    .filter((a) => a.alive || a.deathT > 0)
    .sort((a, b) => a.y - b.y);
  for (const a of drawList) drawActor(ctx, sheets, a, skin, cell);

  if (quality === "high") {
    for (const p of sim.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * cell, p.y * cell, p.size * cell, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.font = `600 ${Math.max(11, Math.floor(cell * 0.32))}px Outfit, sans-serif`;
  ctx.textAlign = "center";
  for (const f of sim.floaters) {
    ctx.globalAlpha = f.life / f.max;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x * cell, f.y * cell - (1 - f.life / f.max) * cell * 0.6);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
  return cell;
}

function drawPower(
  ctx: CanvasRenderingContext2D,
  sheets: Sheets,
  kind: PowerKind,
  x: number,
  y: number,
  cell: number,
) {
  const idx = kind === "life" ? 6 : POWER_INDEX[kind];
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  blit(ctx, sheets.powerups, 2, 4, col, row, x + cell * 0.12, y + cell * 0.08, cell * 0.76, cell * 0.76);
}

function drawActor(
  ctx: CanvasRenderingContext2D,
  sheets: Sheets,
  a: Actor,
  skin: SkinId,
  cell: number,
) {
  const px = a.x * cell - cell * 0.5;
  const py = a.y * cell - cell * 0.62;
  if (a.invuln > 0 && Math.floor(a.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  if (a.flash > 0) ctx.filter = "brightness(2.2)";
  if (a.kind === "player" && a.deathT > 0) {
    const frame = Math.min(3, Math.floor((1 - a.deathT / 0.55) * 4));
    blit(ctx, sheets.death, 2, 2, frame % 2, Math.floor(frame / 2), px, py, cell, cell);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    return;
  }
  if (a.kind !== "player" && a.deathT > 0) {
    ctx.globalAlpha = a.deathT / 0.55;
  }
  const frame = a.moving ? Math.floor(a.anim) % 4 : 0;
  if (a.kind === "player") {
    blit(ctx, sheets.player[skin], 4, 4, frame, a.dir, px, py, cell, cell);
    if (a.shield > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(190, 220, 255, 0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x * cell, a.y * cell - cell * 0.08, cell * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } else if (a.kind === "ghost") {
    blit(ctx, sheets.ghost, 2, 2, frame % 2, Math.floor(frame / 2) % 2, px, py, cell, cell);
  } else {
    const img = a.kind === "beetle" ? sheets.beetle : sheets.slime;
    blit(ctx, img, 4, 4, frame, a.dir, px, py, cell, cell);
  }
  ctx.filter = "none";
  ctx.globalAlpha = 1;
}
