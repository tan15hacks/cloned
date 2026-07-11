import {
  TILE,
  WORLD_W,
  WORLD_H,
  REGIONS,
  MONSTER_TYPES,
  REGION_MONSTERS,
  hash,
  isReservedTile,
  isWaterTile,
  isFarmableTile,
  regionAt,
} from "./world.js";

export const CHUNK_SIZE = 16;

const chunkKey = (cx, cy) => `${cx},${cy}`;

export function activeChunksForViewport(playerX, playerY, screenWidth, screenHeight) {
  const halfTilesX = Math.ceil(screenWidth / TILE / 2) + CHUNK_SIZE;
  const halfTilesY = Math.ceil(screenHeight / TILE / 2) + CHUNK_SIZE;
  const startCx = Math.max(0, Math.floor((playerX - halfTilesX) / CHUNK_SIZE));
  const endCx = Math.min(Math.ceil(WORLD_W / CHUNK_SIZE) - 1, Math.floor((playerX + halfTilesX) / CHUNK_SIZE));
  const startCy = Math.max(0, Math.floor((playerY - halfTilesY) / CHUNK_SIZE));
  const endCy = Math.min(Math.ceil(WORLD_H / CHUNK_SIZE) - 1, Math.floor((playerY + halfTilesY) / CHUNK_SIZE));
  const chunks = [];
  for (let cy = startCy; cy <= endCy; cy += 1) {
    for (let cx = startCx; cx <= endCx; cx += 1) chunks.push({ cx, cy, key: chunkKey(cx, cy) });
  }
  return chunks;
}

function resourceSpecAt(x, y, day) {
  if (x < 2 || y < 2 || x >= WORLD_W - 2 || y >= WORLD_H - 2 || isReservedTile(x, y)) return null;
  const region = regionAt(x, y).id;
  const r = hash(x, y, day);
  if (region === "farm") {
    if (isFarmableTile(x, y) && r > .973) return ["rock", 2];
    if (isFarmableTile(x, y) && r > .945) return ["grass", 1];
    if (!isFarmableTile(x, y) && r > .955) return ["tree", 3];
  } else if (["village", "city", "northwatch"].includes(region)) {
    if (r > .992) return ["tree", 3];
    if (r > .982) return ["grass", 1];
  } else if (region === "greenfields") {
    if (r > .965) return ["tree", 3];
    if (r > .91) return ["grass", 1];
    if (r > .895) return ["herb", 1];
  } else if (region === "moonlake") {
    if (r > .968) return ["fruitTree", 3];
    if (r > .925) return ["herb", 1];
    if (r > .9) return ["grass", 1];
  } else if (region === "darkforest") {
    if (r > .82) return ["darkTree", 4];
    if (r > .76) return ["grass", 1];
    if (r > .73) return ["mushroom", 1];
  } else if (region === "swamp") {
    if (r > .91) return ["mangrove", 4];
    if (r > .86) return ["mushroom", 1];
    if (r > .83) return ["swampBloom", 1];
  } else if (region === "veilmoor") {
    if (r > .945) return ["mistTree", 3];
    if (r > .915) return ["mistPearl", 2];
    if (r > .89) return ["herb", 1];
  } else if (region === "frostpeak") {
    if (r > .9) return r > .982 ? ["frostcore", 4] : r > .95 ? ["silverOre", 3] : ["snowRock", 2];
    if (r > .875) return ["snowHerb", 1];
  } else if (region === "volcano") {
    if (r > .9) return r > .98 ? ["embercore", 4] : r > .94 ? ["obsidianOre", 3] : ["volcanicRock", 3];
    if (r > .875) return ["volcanicGlass", 2];
  } else if (region === "dreadwild") {
    if (r > .94) return r > .987 ? ["voidNode", 5] : ["dreadRock", 3];
    if (r > .91) return ["darkTree", 4];
  } else if (region === "suncoast") {
    if (r > .955) return ["palm", 3];
    if (r > .91) return ["grass", 1];
  } else if (region === "ruins" && r > .93) {
    return r > .982 ? ["relicNode", 4] : r > .96 ? ["goldOre", 3] : ["ruinStone", 3];
  }
  return null;
}

export function generateResourceChunk(day, cx, cy) {
  const resources = [];
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  const endX = Math.min(WORLD_W, startX + CHUNK_SIZE);
  const endY = Math.min(WORLD_H, startY + CHUNK_SIZE);
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const spec = resourceSpecAt(x, y, day);
      if (!spec) continue;
      const [type, hp] = spec;
      resources.push({ id: `r:${day}:${x}:${y}:${type}`, type, x: x + .5, y: y + .5, hp, maxHp: hp, chunk: chunkKey(cx, cy) });
    }
  }
  return resources;
}

function spawnCountForReward(reward) {
  if (reward === "elite") return 2;
  if (reward === "high") return 2;
  if (reward === "medium") return 1;
  return 1;
}

function spawnChanceForReward(reward) {
  if (reward === "elite") return .95;
  if (reward === "high") return .84;
  if (reward === "medium") return .72;
  return .58;
}

export function generateMonsterChunk(day, cx, cy) {
  const monsters = [];
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  const centerRegion = regionAt(startX + CHUNK_SIZE / 2, startY + CHUNK_SIZE / 2);
  const centerTypes = REGION_MONSTERS[centerRegion.id];
  if (!centerTypes || centerRegion.safe) return monsters;
  const slots = spawnCountForReward(centerRegion.reward);
  for (let slot = 0; slot < slots; slot += 1) {
    if (hash(cx * 31 + slot, cy * 47, day + 701) > spawnChanceForReward(centerRegion.reward)) continue;
    let placed = false;
    for (let attempt = 0; attempt < 10 && !placed; attempt += 1) {
      const x = startX + 1 + Math.floor(hash(cx * 53 + attempt, cy * 67 + slot, day + 911) * (CHUNK_SIZE - 2));
      const y = startY + 1 + Math.floor(hash(cx * 79 + slot, cy * 97 + attempt, day + 313) * (CHUNK_SIZE - 2));
      const region = regionAt(x, y);
      const types = REGION_MONSTERS[region.id];
      if (!types || region.safe || isReservedTile(x, y) || isWaterTile(x, y)) continue;
      const type = types[Math.floor(hash(x, y, day + slot * 17) * types.length) % types.length];
      const def = MONSTER_TYPES[type];
      monsters.push({
        id: `m:${day}:${cx}:${cy}:${slot}:${type}`,
        type,
        x: x + .5,
        y: y + .5,
        hp: def.hp,
        maxHp: def.hp,
        cooldown: 0,
        homeX: x + .5,
        homeY: y + .5,
        chunk: chunkKey(cx, cy),
      });
      placed = true;
    }
  }
  return monsters;
}

export function localMapBounds(playerX, playerY, radiusX = 24, radiusY = 18) {
  return {
    startX: Math.max(0, Math.floor(playerX - radiusX)),
    endX: Math.min(WORLD_W, Math.ceil(playerX + radiusX)),
    startY: Math.max(0, Math.floor(playerY - radiusY)),
    endY: Math.min(WORLD_H, Math.ceil(playerY + radiusY)),
  };
}
