import type { SkinId } from "./types";
import { SKINS } from "./balance";

export type Sheets = {
  player: Record<SkinId, HTMLCanvasElement | HTMLImageElement>;
  slime: HTMLImageElement | HTMLCanvasElement;
  beetle: HTMLImageElement | HTMLCanvasElement;
  ghost: HTMLImageElement | HTMLCanvasElement;
  bomb: HTMLImageElement | HTMLCanvasElement;
  explosion: HTMLImageElement | HTMLCanvasElement;
  death: HTMLImageElement | HTMLCanvasElement;
  powerups: HTMLImageElement | HTMLCanvasElement;
  crate: HTMLImageElement | HTMLCanvasElement;
  wall: HTMLImageElement | HTMLCanvasElement;
  floors: { city: HTMLImageElement | HTMLCanvasElement; dungeon: HTMLImageElement | HTMLCanvasElement; neon: HTMLImageElement | HTMLCanvasElement };
};

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? "./";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path.replace(/^\//, "")}`;
}

function fallbackSheet(color: string, w = 256, h = 256): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,.18)";
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if ((i + j) % 2 === 0) ctx.fillRect((w / 4) * i, (h / 4) * j, w / 4, h / 4);
    }
  }
  return c;
}

function loadImage(src: string): Promise<HTMLImageElement | HTMLCanvasElement> {
  return new Promise((resolve) => {
    const img = new Image();
    if (/^https?:/i.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(fallbackSheet("#3d4654"));
    img.src = src;
  });
}

function tint(img: HTMLImageElement | HTMLCanvasElement, hue: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  if (hue) ctx.filter = `hue-rotate(${hue}deg) saturate(1.05)`;
  ctx.drawImage(img, 0, 0);
  ctx.filter = "none";
  return c;
}

export async function loadSheets(): Promise<Sheets> {
  const [
    player,
    slime,
    beetle,
    ghost,
    bomb,
    explosion,
    death,
    powerups,
    crate,
    wall,
    city,
    dungeon,
    neon,
  ] = await Promise.all([
    loadImage(assetUrl("sprites/player.png")),
    loadImage(assetUrl("sprites/slime.png")),
    loadImage(assetUrl("sprites/beetle.png")),
    loadImage(assetUrl("sprites/ghost.png")),
    loadImage(assetUrl("sprites/bomb.png")),
    loadImage(assetUrl("sprites/explosion.png")),
    loadImage(assetUrl("sprites/death.png")),
    loadImage(assetUrl("sprites/powerups.png")),
    loadImage(assetUrl("sprites/crate.png")),
    loadImage(assetUrl("sprites/wall.png")),
    loadImage(assetUrl("sprites/floor-city.png")),
    loadImage(assetUrl("sprites/floor-dungeon.png")),
    loadImage(assetUrl("sprites/floor-neon.png")),
  ]);
  const playerSkins = {} as Record<SkinId, HTMLCanvasElement | HTMLImageElement>;
  for (const s of SKINS) playerSkins[s.id] = s.hue === 0 ? player : tint(player, s.hue);
  return {
    player: playerSkins,
    slime,
    beetle,
    ghost,
    bomb,
    explosion,
    death,
    powerups,
    crate,
    wall,
    floors: { city, dungeon, neon },
  };
}

export function blit(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  cols: number,
  rows: number,
  col: number,
  row: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const iw = (img as HTMLImageElement).width || (img as HTMLCanvasElement).width;
  const ih = (img as HTMLImageElement).height || (img as HTMLCanvasElement).height;
  const cw = iw / cols;
  const ch = ih / rows;
  ctx.drawImage(img, col * cw, row * ch, cw, ch, dx, dy, dw, dh);
}
