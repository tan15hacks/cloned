import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS } from "./world-data.js";
import { MONSTER_TYPES, REGION_MONSTERS } from "./monster-data.js";
import { isPolishPathTile, isWorldClearanceTile, solidDecorationAtTile, structureAtTile } from "./world-polish-data.js";
export { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, REGION_MONSTERS };

const rect = (x, y, rx, ry, rw, rh) => x >= rx && x < rx + rw && y >= ry && y < ry + rh;
const ellipse = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
export const hash = (x, y, seed = 0) => {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
};

export function regionAt(x, y) {
  return REGIONS.find((region) => rect(x, y, region.x, region.y, region.w, region.h)) || REGIONS[0];
}

export function isBridgeTile(x, y) {
  return rect(x, y, 54, 101, 4, 4) || rect(x, y, 112, 67, 4, 4) || rect(x, y, 173, 112, 4, 4);
}

export function isWaterTile(x, y) {
  if (isBridgeTile(x, y)) return false;
  const farmPond = ellipse(x, y, 31, 41, 8, 6);
  const moonLake = ellipse(x, y, 83, 83, 18, 13);
  const riverOne = rect(x, y, 54, 54, 4, 67);
  const riverTwo = rect(x, y, 112, 60, 4, 65);
  const mistPools = (ellipse(x, y, 143, 103, 8, 4) || ellipse(x, y, 160, 129, 7, 4));
  const swampWater = regionAt(x, y).id === "swamp" && hash(x, y, 91) > 0.73 && !isPathTile(x, y);
  const coastOcean = regionAt(x, y).id === "suncoast" && y >= 207;
  const lava = regionAt(x, y).id === "volcano" && (ellipse(x, y, 220, 165, 13, 8) || (hash(x, y, 707) > 0.91 && !isPathTile(x, y)));
  return farmPond || moonLake || riverOne || riverTwo || mistPools || swampWater || coastOcean || lava;
}

export function isPathTile(x, y) {
  const paths = [
    [10, 13, 4, 20], [28, 13, 3, 20], [8, 30, 184, 4],
    [66, 15, 4, 20], [86, 15, 4, 20],
    [118, 20, 70, 4], [118, 41, 70, 4], [118, 62, 70, 4],
    [128, 18, 4, 47], [150, 17, 4, 49], [170, 17, 4, 49], [184, 30, 4, 40],
    [218, 18, 4, 31], [188, 46, 35, 4],
    [42, 31, 4, 76], [40, 88, 45, 4],
    [83, 91, 4, 77], [55, 102, 60, 4],
    [112, 105, 58, 4], [164, 43, 4, 151],
    [50, 145, 61, 4], [107, 145, 60, 4],
    [50, 145, 4, 57], [108, 151, 4, 54],
    [164, 188, 63, 4], [220, 104, 4, 104],
    [50, 199, 61, 4], [108, 199, 58, 4],
    [188, 69, 4, 123], [240, 111, 4, 97],
  ];
  return isBridgeTile(x, y) || isPolishPathTile(x, y) || paths.some(([px, py, pw, ph]) => rect(x, y, px, py, pw, ph));
}

export function buildingAtTile(x, y) {
  return BUILDINGS.find((building) => rect(x, y, building.x, building.y, building.w, building.h));
}

export function isReservedTile(x, y) {
  if (buildingAtTile(x, y) || isWaterTile(x, y) || isPathTile(x, y)) return true;
  if (isWorldClearanceTile(x, y) || structureAtTile(x, y) || solidDecorationAtTile(x, y)) return true;
  if (WAYSTONES.some((stone) => Math.floor(stone.x) === x && Math.floor(stone.y) === y)) return true;
  if (CAVE_ENTRANCES.some((entry) => Math.floor(entry.x) === x && Math.floor(entry.y) === y)) return true;
  return Object.values(INTERACTIONS).some((point) => Math.floor(point.x) === x && Math.floor(point.y) === y);
}

export function isFarmableTile(x, y) {
  return rect(x, y, 4, 15, 48, 38) && !isReservedTile(x, y);
}

export function terrainAt(x, y) {
  if (isWaterTile(x, y)) return regionAt(x, y).id === "volcano" ? "lava" : "water";
  if (isPathTile(x, y)) return isBridgeTile(x, y) ? "bridge" : "path";
  const region = regionAt(x, y);
  return isFarmableTile(x, y) ? "field" : region.terrain;
}

export function generateResources(day = 1) {
  const resources = [];
  let id = day * 100000 + 1;
  const add = (type, x, y, hp = 1) => resources.push({ id: id++, type, x: x + 0.5, y: y + 0.5, hp, maxHp: hp });
  for (let y = 2; y < WORLD_H - 2; y += 1) {
    for (let x = 2; x < WORLD_W - 2; x += 1) {
      if (isReservedTile(x, y)) continue;
      const region = regionAt(x, y).id;
      const r = hash(x, y, day);
      if (region === "farm") {
        if (isFarmableTile(x, y) && r > .973) add("rock", x, y, 2);
        else if (isFarmableTile(x, y) && r > .945) add("grass", x, y, 1);
        else if (!isFarmableTile(x, y) && r > .955) add("tree", x, y, 3);
      } else if (["village", "city", "northwatch"].includes(region)) {
        if (r > .992) add("tree", x, y, 3);
        else if (r > .982) add("grass", x, y, 1);
      } else if (region === "greenfields") {
        if (r > .965) add("tree", x, y, 3); else if (r > .91) add("grass", x, y, 1); else if (r > .895) add("herb", x, y, 1);
      } else if (region === "moonlake") {
        if (r > .968) add("fruitTree", x, y, 3); else if (r > .925) add("herb", x, y, 1); else if (r > .9) add("grass", x, y, 1);
      } else if (region === "darkforest") {
        if (r > .82) add("darkTree", x, y, 4); else if (r > .76) add("grass", x, y, 1); else if (r > .73) add("mushroom", x, y, 1);
      } else if (region === "swamp") {
        if (r > .91) add("mangrove", x, y, 4); else if (r > .86) add("mushroom", x, y, 1); else if (r > .83) add("swampBloom", x, y, 1);
      } else if (region === "veilmoor") {
        if (r > .945) add("mistTree", x, y, 3); else if (r > .915) add("mistPearl", x, y, 2); else if (r > .89) add("herb", x, y, 1);
      } else if (region === "frostpeak") {
        if (r > .9) add(r > .982 ? "frostcore" : r > .95 ? "silverOre" : "snowRock", x, y, r > .982 ? 4 : r > .95 ? 3 : 2); else if (r > .875) add("snowHerb", x, y, 1);
      } else if (region === "volcano") {
        if (r > .9) add(r > .98 ? "embercore" : r > .94 ? "obsidianOre" : "volcanicRock", x, y, r > .98 ? 4 : 3); else if (r > .875) add("volcanicGlass", x, y, 2);
      } else if (region === "dreadwild") {
        if (r > .94) add(r > .987 ? "voidNode" : "dreadRock", x, y, r > .987 ? 5 : 3); else if (r > .91) add("darkTree", x, y, 4);
      } else if (region === "suncoast") {
        if (r > .955) add("palm", x, y, 3); else if (r > .91) add("grass", x, y, 1);
      } else if (region === "ruins") {
        if (r > .93) add(r > .982 ? "relicNode" : r > .96 ? "goldOre" : "ruinStone", x, y, r > .982 ? 4 : 3);
      }
    }
  }
  return resources;
}

export function generateMonsters(day = 1) {
  const monsters = [];
  let id = day * 10000 + 1;
  for (const [regionId, types] of Object.entries(REGION_MONSTERS)) {
    const region = REGIONS.find((entry) => entry.id === regionId);
    const count = region.reward === "elite" ? 18 : region.reward === "high" ? 15 : region.reward === "medium" ? 12 : 9;
    let placed = 0;
    for (let attempt = 0; attempt < count * 30 && placed < count; attempt += 1) {
      const x = region.x + 3 + Math.floor(hash(attempt, day, region.x + 3) * Math.max(1, region.w - 6));
      const y = region.y + 3 + Math.floor(hash(day, attempt, region.y + 7) * Math.max(1, region.h - 6));
      if (isReservedTile(x, y) || isWaterTile(x, y)) continue;
      const type = types[placed % types.length];
      const def = MONSTER_TYPES[type];
      monsters.push({ id: id++, type, x: x + .5, y: y + .5, hp: def.hp, maxHp: def.hp, cooldown: 0, homeX: x + .5, homeY: y + .5 });
      placed += 1;
    }
  }
  return monsters;
}

export function generateQuests(day) {
  const pool = [
    { id: `wood-${day}`, title: "Warm Hearth", type: "wood", target: 15, reward: 100, text: "Gather 15 wood for Hearthvale." },
    { id: `harvest-${day}`, title: "City Produce Order", type: "harvest", target: 6, reward: 175, text: "Harvest 6 crops for Silvercrest Market." },
    { id: `fish-${day}`, title: "Moonlake Catch", type: "fish", target: 3, reward: 150, text: "Catch 3 fish from any region." },
    { id: `talk-${day}`, title: "Two Settlements", type: "talk", target: 5, reward: 120, text: "Speak with 5 residents." },
    { id: `monsters-${day}`, title: "Road Patrol", type: "monsters", target: 5, reward: 220, text: "Defeat 5 monsters outside safe settlements." },
    { id: `forage-${day}`, title: "Regional Samples", type: "forage", target: 5, reward: 180, text: "Gather 5 forage items." },
    { id: `explore-${day}`, title: "A Vast Continent", type: "explore", target: 6, reward: 250, text: "Visit 6 different regions today." },
    { id: `cave-${day}`, title: "Below Silvercrest", type: "caveFloors", target: 3, reward: 260, text: "Descend 3 new cave floors." },
  ];
  const offset = day % pool.length;
  return [pool[offset], pool[(offset + 3) % pool.length], pool[(offset + 5) % pool.length]].map((quest) => ({ ...quest, claimed: false }));
}

export function generateGuildBounties(day) {
  const regions = ["greenfields", "darkforest", "swamp", "veilmoor", "frostpeak", "volcano", "dreadwild", "ruins"];
  return regions.slice(0, 4).map((regionId, index) => {
    const shifted = regions[(index + day) % regions.length];
    const region = REGIONS.find((entry) => entry.id === shifted);
    const target = region.reward === "elite" ? 4 : region.reward === "high" ? 5 : 6;
    return { id: `guild-${day}-${shifted}`, region: shifted, title: `${region.name} Hunt`, target, reward: target * (region.reward === "elite" ? 110 : region.reward === "high" ? 75 : 45), xp: target * (region.reward === "elite" ? 22 : region.reward === "high" ? 15 : 9), claimed: false };
  });
}
