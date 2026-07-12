import {
  TILE, CROPS, regionAt, terrainAt, isPathTile, isBridgeTile,
} from "./game-shared.js";
import {
  FARMSTEAD_ART_TILE, FARMSTEAD_ART_ATLAS_URI, FARMSTEAD_ART_MASK_INDEX,
  FARMSTEAD_ART_BITS, FARMSTEAD_ART_SETS,
} from "./farmstead-art-data.js";

const ATLAS_COLUMNS = 8;
const FARM_REGION_ID = "farm";

export function stableFarmsteadHash(x, y, seed = 0) {
  let value = Math.imul((Math.floor(x) + 1) | 0, 73856093)
    ^ Math.imul((Math.floor(y) + 1) | 0, 19349663)
    ^ Math.imul((Math.floor(seed) + 1) | 0, 83492791);
  value ^= value >>> 13;
  value = Math.imul(value, 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

export function canonicalFarmsteadMask(x, y, connected) {
  const north = Boolean(connected(x, y - 1));
  const east = Boolean(connected(x + 1, y));
  const south = Boolean(connected(x, y + 1));
  const west = Boolean(connected(x - 1, y));
  let mask = 0;

  if (north) mask |= FARMSTEAD_ART_BITS.N;
  if (east) mask |= FARMSTEAD_ART_BITS.E;
  if (south) mask |= FARMSTEAD_ART_BITS.S;
  if (west) mask |= FARMSTEAD_ART_BITS.W;
  if (north && east && connected(x + 1, y - 1)) mask |= FARMSTEAD_ART_BITS.NE;
  if (south && east && connected(x + 1, y + 1)) mask |= FARMSTEAD_ART_BITS.SE;
  if (south && west && connected(x - 1, y + 1)) mask |= FARMSTEAD_ART_BITS.SW;
  if (north && west && connected(x - 1, y - 1)) mask |= FARMSTEAD_ART_BITS.NW;
  return mask;
}

export function farmsteadAtlasSource(setName, mask = 0) {
  const set = FARMSTEAD_ART_SETS[setName];
  if (!set || Array.isArray(set)) return null;
  const index = FARMSTEAD_ART_MASK_INDEX[mask] ?? FARMSTEAD_ART_MASK_INDEX[0];
  return {
    x: set.x + (index % ATLAS_COLUMNS) * FARMSTEAD_ART_TILE,
    y: set.y + Math.floor(index / ATLAS_COLUMNS) * FARMSTEAD_ART_TILE,
    width: FARMSTEAD_ART_TILE,
    height: FARMSTEAD_ART_TILE,
    index,
    mask,
  };
}

export function farmsteadGrassSource(x, y, flowers = false) {
  if (flowers) return { ...FARMSTEAD_ART_SETS.grassFlowers, width: FARMSTEAD_ART_TILE, height: FARMSTEAD_ART_TILE };
  const variant = stableFarmsteadHash(x, y, 17) % FARMSTEAD_ART_SETS.grass.length;
  return { ...FARMSTEAD_ART_SETS.grass[variant], width: FARMSTEAD_ART_TILE, height: FARMSTEAD_ART_TILE, variant };
}

export function shouldDrawFarmsteadFlowers(x, y) {
  return stableFarmsteadHash(x, y, 91) % 23 === 0;
}

export function isFarmsteadArtTerrain(x, y) {
  return regionAt(x, y).id === FARM_REGION_ID;
}

function drawAtlasTile(ctx, image, source, x, y) {
  ctx.drawImage(
    image,
    source.x, source.y, source.width, source.height,
    x * TILE, y * TILE, TILE + 1, TILE + 1,
  );
}

function drawFallbackSoil(game, ctx, x, y, soil) {
  ctx.fillStyle = soil.watered ? "#594b40" : "#7b5d3d";
  ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
  ctx.strokeStyle = soil.watered ? "#8aa8ba" : "#4f3627";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x * TILE + 5, y * TILE + 10);
  ctx.lineTo(x * TILE + TILE - 5, y * TILE + 8);
  ctx.moveTo(x * TILE + 5, y * TILE + 20);
  ctx.lineTo(x * TILE + TILE - 5, y * TILE + 18);
  ctx.stroke();
  if (soil.crop) game.drawCrop(ctx, x, y, soil.crop);
}

function createAtlasState(game) {
  if (game.farmsteadArtAtlas) return game.farmsteadArtAtlas;
  const state = { image: null, ready: false, failed: false, announced: false };
  game.farmsteadArtAtlas = state;
  if (typeof Image === "undefined") return state;

  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    state.ready = image.naturalWidth > 0;
    state.failed = !state.ready;
    game.activeChunkSignature = "";
  };
  image.onerror = () => {
    state.ready = false;
    state.failed = true;
  };
  image.src = FARMSTEAD_ART_ATLAS_URI;
  state.image = image;
  if (image.complete && image.naturalWidth > 0) state.ready = true;
  return state;
}

export function installFarmsteadTerrainArt(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    enterGame: proto.enterGame,
    drawTerrainTile: proto.drawTerrainTile,
    drawSoil: proto.drawSoil,
    showHowToPlay: proto.showHowToPlay,
  };

  proto.ensureFarmsteadArtAtlas = function ensureFarmsteadArtAtlas() {
    return createAtlasState(this);
  };

  proto.isFarmsteadArtReady = function isFarmsteadArtReady() {
    const atlas = this.ensureFarmsteadArtAtlas();
    return Boolean(atlas.ready && atlas.image);
  };

  proto.enterGame = function enterGameFarmsteadArt() {
    this.ensureFarmsteadArtAtlas();
    return original.enterGame.call(this);
  };

  proto.drawTerrainTile = function drawTerrainTileFarmsteadArt(ctx, x, y) {
    if (!isFarmsteadArtTerrain(x, y)) return original.drawTerrainTile.call(this, ctx, x, y);
    const atlas = this.ensureFarmsteadArtAtlas();
    if (!atlas.ready || !atlas.image) return original.drawTerrainTile.call(this, ctx, x, y);

    const terrain = terrainAt(x, y);
    if (terrain === "water" || terrain === "lava" || terrain === "bridge") {
      return original.drawTerrainTile.call(this, ctx, x, y);
    }

    if (terrain === "path") {
      const connected = (px, py) => isPathTile(px, py) && !isBridgeTile(px, py);
      const mask = canonicalFarmsteadMask(x, y, connected);
      const source = farmsteadAtlasSource("path", mask);
      drawAtlasTile(ctx, atlas.image, source, x, y);
      return;
    }

    const flowers = shouldDrawFarmsteadFlowers(x, y) && !this.state?.soil?.[`${x},${y}`];
    drawAtlasTile(ctx, atlas.image, farmsteadGrassSource(x, y, flowers), x, y);
  };

  proto.drawSoil = function drawSoilFarmsteadArt(ctx, bounds) {
    const atlas = this.ensureFarmsteadArtAtlas();
    if (!atlas.ready || !atlas.image) return original.drawSoil.call(this, ctx, bounds);

    const soilEntries = Object.entries(this.state?.soil || {});
    const connectedKeys = new Set(
      soilEntries
        .filter(([, soil]) => soil && soil.tilled !== false)
        .map(([key]) => key),
    );
    const connected = (x, y) => connectedKeys.has(`${x},${y}`);

    for (const [key, soil] of soilEntries) {
      const [x, y] = key.split(",").map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < bounds.startX || x >= bounds.endX || y < bounds.startY || y >= bounds.endY) continue;
      if (!soil || regionAt(x, y).id !== FARM_REGION_ID) {
        drawFallbackSoil(this, ctx, x, y, soil || {});
        continue;
      }

      const mask = canonicalFarmsteadMask(x, y, connected);
      const source = farmsteadAtlasSource(soil.watered ? "soilWatered" : "soilDry", mask);
      drawAtlasTile(ctx, atlas.image, source, x, y);
      if (soil.crop && CROPS[soil.crop.type]) this.drawCrop(ctx, x, y, soil.crop);
    }
  };

  if (original.showHowToPlay) proto.showHowToPlay = function showHowToPlayFarmsteadArt() {
    return original.showHowToPlay.call(this);
  };
}
