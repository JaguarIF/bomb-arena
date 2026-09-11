import type { SkinId } from "./types";
import { SKINS } from "./balance";

export type Sheets = {
  player: Record<SkinId, HTMLCanvasElement | HTMLImageElement>;
  slime: HTMLImageElement;
  beetle: HTMLImageElement;
  ghost: HTMLImageElement;
  bomb: HTMLImageElement;
  explosion: HTMLImageElement;
  death: HTMLImageElement;
  powerups: HTMLImageElement;
  crate: HTMLImageElement;
  wall: HTMLImageElement;
  floors: { city: HTMLImageElement; dungeon: HTMLImageElement; neon: HTMLImageElement };
};

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path.replace(/^\//, "")}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/i.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("fail " + src));
    img.src = src;
  });
}

function tint(img: HTMLImageElement, hue: number): HTMLCanvasElement {
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
