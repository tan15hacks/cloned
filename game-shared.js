import {
  TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY,
  ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES,
  CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile,
  isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile,
  regionAt, terrainAt, generateResources, generateMonsters, generateQuests,
  generateGuildBounties,
} from "./world.js";
import {
  CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor,
  chestLoot, caveMerchantStock,
} from "./cave.js";

export { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock };

export const $ = (id) => document.getElementById(id);
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const keyOf = (x, y) => `${x},${y}`;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const randomChoice = (items) => items[Math.floor(Math.random() * items.length)];
export const safeParse = (text, fallback = null) => { try { return JSON.parse(text); } catch { return fallback; } };
export const formatTime = (minutes) => { const total = Math.floor(minutes); let hour = Math.floor(total / 60) % 24; const mins = total % 60; const suffix = hour >= 12 ? "PM" : "AM"; hour = hour % 12 || 12; return `${hour}:${String(mins).padStart(2, "0")} ${suffix}`; };
export const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
export const GUILD_RANKS = [{name:"F",xp:0},{name:"E",xp:100},{name:"D",xp:250},{name:"C",xp:500},{name:"B",xp:900},{name:"A",xp:1500},{name:"S",xp:2500}];
export const FORAGE_TYPES = new Set(["herb","mushroom","apple","swampBloom","mistPearl","snowHerb","volcanicGlass"]);
export const AXE_TYPES = new Set(["tree","darkTree","mangrove","palm","fruitTree","mistTree","grass"]);
export const PICK_TYPES = new Set(["rock","snowRock","volcanicRock","dreadRock","ruinStone","ore","silverOre","goldOre","obsidianOre","relicNode","voidNode","frostcore","embercore","volcanicGlass","mistPearl"]);
export function forecastWeather(day) { if (day % 7 === 0) return "Sparkfall"; const value = Math.abs(Math.sin(day * 9.173 + 2.71)); if (value < .18) return "Rain"; if (value < .34) return "Cloudy"; if (value > .95) return "Sparkfall"; return "Clear"; }
