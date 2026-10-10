import { CanvasTexture, SRGBColorSpace, Texture, TextureLoader } from 'three';
import { sceneById, sceneRegistry, type SceneId, type SceneDefinition } from './registry';

export type SceneAssets = { image: Texture; depth: Texture; layers: Texture[] };
const fallbacks = new Map<SceneId, SceneAssets>();
const loaded = new Map<string, Promise<Texture>>();

function canvasTexture(canvas: HTMLCanvasElement, color = true) {
  const texture = new CanvasTexture(canvas);
  if (color) texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeBackdrop(scene: SceneDefinition) {
  const canvas = document.createElement('canvas');
  canvas.width = 1600; canvas.height = 900;
  const ctx = canvas.getContext('2d')!;
  const palette: Record<SceneId, [string, string, string]> = {
    hero: ['#0b1724', '#24424a', '#315b3d'], about: ['#0a1620', '#35515a', '#486443'],
    projects: ['#101923', '#3a4140', '#62503c'], skills: ['#091a1b', '#244d43', '#3b6648'],
    experience: ['#111b23', '#37454a', '#675944'], contact: ['#091722', '#244858', '#375452'],
  };
  const [sky, horizon, ground] = palette[scene.id];
  const gradient = ctx.createLinearGradient(0, 0, 0, 900);
  gradient.addColorStop(0, '#080e1a'); gradient.addColorStop(.48, sky); gradient.addColorStop(.8, horizon); gradient.addColorStop(1, ground);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1600, 900);
  const moon = ctx.createRadialGradient(1070, 240, 12, 1070, 240, 225);
  moon.addColorStop(0, 'rgba(205,225,218,.65)'); moon.addColorStop(.2, 'rgba(156,199,210,.28)'); moon.addColorStop(1, 'rgba(110,173,190,0)');
  ctx.fillStyle = moon; ctx.fillRect(760, 0, 620, 570);
  ctx.beginPath(); ctx.arc(1070, 240, 79, 0, Math.PI * 2); ctx.fillStyle = 'rgba(194,216,207,.56)'; ctx.fill();
  // Original, non-referential ruined skyline shapes; no characters or logos.
  for (let i = 0; i < 34; i++) {
    const x = i * 54 - 18 + Math.sin(i * 6.17) * 19;
    const height = 165 + (i * 67 % 245);
    const top = 740 - height;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(7,19,23,.92)' : 'rgba(8,23,28,.84)';
    ctx.fillRect(x, top, 47 + (i % 4) * 6, height);
    ctx.fillStyle = 'rgba(221,168,99,.28)';
    for (let row = 0; row < 6; row++) for (let col = 0; col < 2; col++) {
      if ((i + row * 2 + col) % 6 === 0) ctx.fillRect(x + 11 + col * 18, top + 25 + row * 31, 4, 8);
    }
  }
  const haze = ctx.createLinearGradient(0, 560, 0, 900);
  haze.addColorStop(0, 'rgba(54,111,116,.03)'); haze.addColorStop(.5, 'rgba(58,113,105,.2)'); haze.addColorStop(1, 'rgba(4,15,16,.5)');
  ctx.fillStyle = haze; ctx.fillRect(0, 540, 1600, 360);
  return canvasTexture(canvas);
}

function makeDepth() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 288;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 512, 288);
  gradient.addColorStop(0, '#272727'); gradient.addColorStop(.4, '#777777'); gradient.addColorStop(.72, '#b0b0b0'); gradient.addColorStop(1, '#eeeeee');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 288);
  for (let i = 0; i < 24; i++) {
    const x = i * 23, h = 60 + (i * 31 % 120);
    ctx.fillStyle = `rgba(255,255,255,${.18 + (i % 4) * .12})`;
    ctx.fillRect(x, 288 - h, 12 + (i % 5) * 5, h);
  }
  return canvasTexture(canvas, false);
}

function makeLayer(index: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1600; canvas.height = 900;
  const ctx = canvas.getContext('2d')!;
  if (index === 0) {
    const gradient = ctx.createLinearGradient(0, 540, 0, 900);
    gradient.addColorStop(0, 'rgba(13,29,35,0)'); gradient.addColorStop(1, 'rgba(12,32,35,.35)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 500, 1600, 400);
    for (let i = 0; i < 18; i++) {
      const x = i * 104; ctx.fillStyle = 'rgba(8,19,24,.56)';
      ctx.fillRect(x, 420 + (i * 41 % 140), 62, 480);
    }
  } else if (index === 1) {
    ctx.fillStyle = 'rgba(4,15,18,.66)';
    for (let i = 0; i < 11; i++) {
      const x = i * 166 - 25, h = 110 + (i * 53 % 180);
      ctx.fillRect(x, 900 - h, 91, h);
    }
    ctx.strokeStyle = 'rgba(62,103,64,.48)'; ctx.lineWidth = 9;
    for (let i = 0; i < 14; i++) {
      const x = i * 137;
      ctx.beginPath(); ctx.moveTo(x, 900); ctx.bezierCurveTo(x - 70, 650, x + 50, 550, x + (i % 2 ? 120 : -90), 490); ctx.stroke();
    }
  } else {
    const gradient = ctx.createLinearGradient(0, 520, 0, 900);
    gradient.addColorStop(0, 'rgba(14,32,28,0)'); gradient.addColorStop(1, 'rgba(3,13,13,.93)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 520, 1600, 380);
    for (let i = 0; i < 37; i++) {
      const x = i * 47 - 60, y = 900 - (i * 47 % 155);
      ctx.fillStyle = i % 2 ? 'rgba(38,73,43,.8)' : 'rgba(18,53,36,.88)';
      ctx.beginPath(); ctx.ellipse(x, y, 60 + (i % 3) * 15, 26 + (i % 4) * 8, -.3, 0, Math.PI * 2); ctx.fill();
    }
  }
  return canvasTexture(canvas);
}

export function getFallbackAssets(scene: SceneDefinition): SceneAssets {
  const existing = fallbacks.get(scene.id);
  if (existing) return existing;
  const assets = { image: makeBackdrop(scene), depth: makeDepth(), layers: [makeLayer(0), makeLayer(1), makeLayer(2)] };
  fallbacks.set(scene.id, assets);
  return assets;
}

function loadTexture(path: string, fallback: Texture) {
  const existing = loaded.get(path);
  if (existing) return existing;
  const task = new Promise<Texture>((resolve) => {
    new TextureLoader().load(path, (texture) => {
      texture.colorSpace = path.endsWith('-depth.png') ? texture.colorSpace : SRGBColorSpace;
      texture.needsUpdate = true;
      resolve(texture);
    }, undefined, () => {
      console.warn(`[scene engine] Missing asset "${path}"; using generated atmospheric texture.`);
      resolve(fallback);
    });
  });
  loaded.set(path, task);
  return task;
}

export async function loadSceneAssets(id: SceneId): Promise<SceneAssets> {
  const scene = sceneById(id);
  const fallback = getFallbackAssets(scene);
  const imagePromise = loadTexture(scene.image, fallback.image);
  const depthPromise = loadTexture(scene.depthMap, fallback.depth);
  const layerPromises = (scene.layers ?? []).map((path, index) => loadTexture(path, fallback.layers[index] ?? fallback.layers[2]));
  const [image, depth, ...layers] = await Promise.all([imagePromise, depthPromise, ...layerPromises]);
  return { image, depth, layers };
}

export function preloadScene(id: SceneId) {
  void loadSceneAssets(id);
}

export function preloadNextScene(id: SceneId) {
  const index = sceneRegistry.findIndex((scene) => scene.id === id);
  const next = sceneRegistry[(index + 1) % sceneRegistry.length];
  if (next) preloadScene(next.id);
}
