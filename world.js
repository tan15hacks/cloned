export const TILE = 32;
export const WORLD_W = 104;
export const WORLD_H = 78;

export const SAVE_KEY = "hearthvale-save-v2";
export const LEGACY_SAVE_KEY = "hearthvale-save-v1";
export const SETTINGS_KEY = "hearthvale-settings-v1";

export const ITEMS = {
  wood: { name: "Wood", icon: "🪵", value: 8 },
  stone: { name: "Stone", icon: "🪨", value: 7 },
  copper: { name: "Copper Ore", icon: "🟠", value: 22 },
  turnipSeed: { name: "Turnip Seeds", icon: "🌰", value: 12 },
  berrySeed: { name: "Sunberry Seeds", icon: "🫘", value: 22 },
  moonSeed: { name: "Moonbean Seeds", icon: "✨", value: 35 },
  turnip: { name: "Turnip", icon: "🥬", value: 34 },
  berry: { name: "Sunberry", icon: "🍓", value: 58 },
  moonbean: { name: "Moonbean", icon: "🫛", value: 95 },
  fish: { name: "River Fish", icon: "🐟", value: 45 },
  rareFish: { name: "Glimmerfin", icon: "🐠", value: 135 },
  fiber: { name: "Fiber", icon: "🌿", value: 5 },
  herb: { name: "Silverleaf", icon: "🍃", value: 24 },
  mushroom: { name: "Glowcap", icon: "🍄", value: 38 },
  apple: { name: "Orchard Apple", icon: "🍎", value: 42 },
  snack: { name: "Trail Snack", icon: "🥨", value: 30 },
  tea: { name: "Forest Tea", icon: "🍵", value: 55 },
  crystal: { name: "Hearth Crystal", icon: "💎", value: 180 },
};

export const CROPS = {
  turnip: { name: "Turnip", days: 2, seed: "turnipSeed", produce: "turnip", colors: ["#775a2d", "#6a9d45", "#d9ead0"], value: 34 },
  berry: { name: "Sunberry", days: 3, seed: "berrySeed", produce: "berry", colors: ["#775a2d", "#3f8a61", "#d95e52"], value: 58 },
  moonbean: { name: "Moonbean", days: 4, seed: "moonSeed", produce: "moonbean", colors: ["#775a2d", "#5c69a8", "#c9c8ff"], value: 95 },
};

export const TOOLS = [
  { id: "hoe", name: "Hoe", icon: "⛏️" },
  { id: "water", name: "Watering Can", icon: "🚿" },
  { id: "axe", name: "Axe", icon: "🪓" },
  { id: "pick", name: "Pickaxe", icon: "🔨" },
  { id: "seed", name: "Seeds", icon: "🌱" },
  { id: "rod", name: "Fishing Rod", icon: "🎣" },
  { id: "sword", name: "Valley Blade", icon: "🗡️" },
  { id: "snack", name: "Trail Snack", icon: "🥨" },
];

export const RECIPES = [
  { id: "sprinkler", name: "Dewdrop Sprinkler", icon: "💦", description: "Waters the four neighboring soil tiles every morning.", cost: { wood: 8, stone: 8, copper: 2 } },
  { id: "snack", name: "Trail Snack", icon: "🥨", description: "Restores 30 energy.", cost: { berry: 1, turnip: 1 } },
  { id: "lantern", name: "Glow Lantern", icon: "🏮", description: "Boosts Harmony for crops within three tiles.", cost: { wood: 6, crystal: 1 } },
  { id: "forestTea", name: "Forest Tea", icon: "🍵", description: "Restores 45 energy and 15 health.", cost: { herb: 2, mushroom: 1 } },
];

export const SHOP_ITEMS = [
  { id: "turnipSeed", amount: 5, price: 45, description: "Fast, dependable starter crop." },
  { id: "berrySeed", amount: 5, price: 85, description: "A bright crop loved by villagers." },
  { id: "moonSeed", amount: 3, price: 110, description: "Rare crop that resonates strongly at night." },
  { id: "snack", amount: 1, price: 35, description: "Restores 30 energy." },
];

export const WEATHER = {
  Clear: { icon: "☀️", tint: "rgba(255,232,155,.03)" },
  Cloudy: { icon: "☁️", tint: "rgba(110,130,145,.10)" },
  Rain: { icon: "🌧️", tint: "rgba(55,92,125,.16)" },
  Sparkfall: { icon: "✨", tint: "rgba(91,76,145,.12)" },
};

export const BUILDINGS = [
  { id: "farmhouse", name: "Farmhouse", x: 6, y: 4, w: 10, h: 7, door: { x: 11, y: 11 }, wall: "#d7a15f", roof: "#8b4e3f" },
  { id: "barn", name: "Old Barn", x: 22, y: 5, w: 9, h: 6, door: { x: 26, y: 11 }, wall: "#c88c5a", roof: "#7d4439" },
  { id: "shop", name: "Seed Stall", x: 48, y: 7, w: 11, h: 7, door: { x: 53, y: 14 }, wall: "#e4b867", roof: "#a85143" },
  { id: "inn", name: "Hearth & Kettle", x: 64, y: 6, w: 12, h: 8, door: { x: 70, y: 14 }, wall: "#d0a773", roof: "#436f63" },
  { id: "workshop", name: "Oren's Workshop", x: 48, y: 22, w: 10, h: 7, door: { x: 53, y: 29 }, wall: "#ba9a76", roof: "#61727c" },
  { id: "hall", name: "Old Hall", x: 62, y: 21, w: 11, h: 8, door: { x: 67, y: 29 }, wall: "#b9a185", roof: "#6f596f" },
  { id: "observatory", name: "Starwatch", x: 86, y: 6, w: 10, h: 7, door: { x: 91, y: 13 }, wall: "#c9b88e", roof: "#59658c" },
];

export const WAYSTONES = [
  { id: "farm", name: "Farmstead", x: 37.5, y: 18.5, spawn: { x: 35.5, y: 18.5 } },
  { id: "village", name: "Hearthvale Village", x: 59.5, y: 18.5, spawn: { x: 57.5, y: 18.5 } },
  { id: "forest", name: "Whisperwood", x: 26.5, y: 56.5, spawn: { x: 24.5, y: 56.5 } },
  { id: "lake", name: "Moonlake", x: 58.5, y: 39.5, spawn: { x: 58.5, y: 37.5 } },
  { id: "ridge", name: "Ember Ridge", x: 77.5, y: 49.5, spawn: { x: 75.5, y: 49.5 } },
];

export const INTERACTIONS = {
  questBoard: { x: 45.5, y: 18.5 },
  beacon: { x: 67.5, y: 31.5 },
  mineEntrance: { x: 84.5, y: 38.5 },
  dock: { x: 56.5, y: 41.5 },
  grove: { x: 18.5, y: 61.5 },
};

export const NPC_DEFS = [
  {
    id: "mira", name: "Mira", emoji: "👩🏽‍🌾", color: "#d95e52", home: { x: 52.5, y: 15.5 }, favorite: "berry",
    lines: [
      "Every path has been reset to the valley grid. It feels much easier to find your way now.",
      "Mixed mature crops create Harmony. Moonbeans make the resonance even stronger.",
      "The orchard meadow east of the farm has wild fruit after clear mornings.",
    ],
  },
  {
    id: "oren", name: "Oren", emoji: "🧔🏽", color: "#4d7891", home: { x: 53.5, y: 30.5 }, favorite: "copper",
    lines: [
      "Ember Ridge is larger than it looks. Follow the stone road to reach the mine safely.",
      "Copper is common, but Hearth Crystals appear most often after Sparkfall.",
      "A clean path and an honest tool solve most problems in this valley.",
    ],
  },
  {
    id: "lumi", name: "Lumi", emoji: "🧑🏻‍🎨", color: "#8d68a6", home: { x: 67.5, y: 30.5 }, favorite: "moonbean",
    lines: [
      "The Hearthlight connects every zone. Restore it and the Waystones will answer you.",
      "Lanterns make Moonbeans sing. Not literally, but you can see their glow spread.",
      "Moonlake reflects the Beacon at night. It is my favorite place to paint.",
    ],
  },
  {
    id: "tavi", name: "Tavi", emoji: "🧒🏾", color: "#d7a23a", home: { x: 18.5, y: 60.5 }, favorite: "fish",
    lines: [
      "The new bridge finally lines up with the forest path! I stopped falling into the river.",
      "A Glimmerfin lives near the Moonlake dock. Sparkfall nights make it easier to spot.",
      "The deep grove has Glowcaps after rain. They make excellent tea.",
    ],
  },
  {
    id: "sora", name: "Sora", emoji: "🧑🏻‍🔭", color: "#576da6", home: { x: 91.5, y: 14.5 }, favorite: "crystal",
    lines: [
      "From Starwatch, the valley looks like one enormous patchwork quilt.",
      "Sparkfall returns every seventh day, though the weather can surprise us sooner.",
      "Bring me a Hearth Crystal sometime. It bends starlight into little rainbows.",
    ],
  },
];

const rect = (x, y, rx, ry, rw, rh) => x >= rx && x < rx + rw && y >= ry && y < ry + rh;
const ellipse = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;

export function isBridgeTile(x, y) {
  return rect(x, y, 40, 54, 4, 3);
}

export function isWaterTile(x, y) {
  if (isBridgeTile(x, y)) return false;
  const farmPond = rect(x, y, 22, 24, 10, 8) && !((x === 22 || x === 31) && (y === 24 || y === 31));
  const moonLake = ellipse(x, y, 58, 47, 10.5, 6.5);
  const river = rect(x, y, 40, 43, 4, 35);
  return farmPond || moonLake || river;
}

export function isPathTile(x, y) {
  if (isBridgeTile(x, y)) return true;
  const paths = [
    [9, 11, 4, 9],
    [26, 11, 3, 9],
    [10, 17, 75, 3],
    [34, 18, 3, 18],
    [37, 18, 3, 39],
    [52, 14, 3, 16],
    [69, 14, 3, 16],
    [58, 18, 4, 14],
    [66, 18, 4, 14],
    [78, 19, 14, 3],
    [90, 13, 3, 9],
    [10, 35, 4, 27],
    [10, 54, 31, 3],
    [43, 54, 20, 3],
    [43, 37, 17, 3],
    [57, 37, 3, 5],
    [72, 19, 4, 31],
    [75, 48, 11, 3],
    [82, 37, 5, 3],
  ];
  return paths.some(([px, py, pw, ph]) => rect(x, y, px, py, pw, ph));
}

export function buildingAtTile(x, y) {
  return BUILDINGS.find((b) => rect(x, y, b.x, b.y, b.w, b.h));
}

export function isReservedTile(x, y) {
  if (buildingAtTile(x, y) || isWaterTile(x, y) || isPathTile(x, y)) return true;
  if (WAYSTONES.some((w) => Math.floor(w.x) === x && Math.floor(w.y) === y)) return true;
  return Object.values(INTERACTIONS).some((p) => Math.floor(p.x) === x && Math.floor(p.y) === y);
}

export function isFarmableTile(x, y) {
  return rect(x, y, 4, 13, 32, 24) && !isReservedTile(x, y);
}

export function zoneAt(x, y) {
  if (x >= 72 && y >= 34) return { id: "ridge", name: "Ember Ridge" };
  if (x >= 82 && y < 34) return { id: "north", name: "Northwatch Ridge" };
  if (x <= 42 && y >= 39) return { id: "forest", name: "Whisperwood" };
  if (x >= 42 && x < 72 && y >= 35) return { id: "lake", name: "Moonlake Meadow" };
  if (x >= 42 && y < 35) return { id: "village", name: "Hearthvale Village" };
  return { id: "farm", name: "Farmstead" };
}

export function terrainAt(x, y) {
  if (isWaterTile(x, y)) return "water";
  if (isPathTile(x, y)) return isBridgeTile(x, y) ? "bridge" : "path";
  const zone = zoneAt(x, y).id;
  if (zone === "ridge" || zone === "north") return "stone";
  if (zone === "forest") return "forest";
  if (zone === "lake") return "meadow";
  if (zone === "village") return "village";
  return isFarmableTile(x, y) ? "field" : "farm";
}

function hash(x, y, seed = 0) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

export function generateResources(day = 1) {
  const resources = [];
  let id = day * 10000 + 1;
  const add = (type, x, y, hp) => resources.push({ id: id++, type, x: x + 0.5, y: y + 0.5, hp, maxHp: hp });
  for (let y = 2; y < WORLD_H - 2; y += 1) {
    for (let x = 2; x < WORLD_W - 2; x += 1) {
      if (isReservedTile(x, y)) continue;
      const zone = zoneAt(x, y).id;
      const r = hash(x, y, day);
      if (zone === "farm") {
        const onField = isFarmableTile(x, y);
        if (onField && r > 0.975) add("rock", x, y, 2);
        else if (onField && r > 0.94) add("grass", x, y, 1);
        else if (!onField && r > 0.93) add("tree", x, y, 3);
      } else if (zone === "forest") {
        if (r > 0.78) add("tree", x, y, 3);
        else if (r > 0.70) add("grass", x, y, 1);
        else if (r > 0.675) add(day % 2 ? "mushroom" : "herb", x, y, 1);
      } else if (zone === "lake") {
        if (r > 0.955) add("fruitTree", x, y, 3);
        else if (r > 0.90) add("herb", x, y, 1);
        else if (r > 0.86) add("grass", x, y, 1);
      } else if (zone === "ridge" || zone === "north") {
        if (r > 0.82) add(r > 0.972 ? "crystal" : r > 0.91 ? "ore" : "rock", x, y, r > 0.972 ? 4 : r > 0.91 ? 3 : 2);
        else if (zone === "north" && r > 0.79) add("herb", x, y, 1);
      } else if (zone === "village") {
        if (r > 0.985) add("tree", x, y, 3);
        else if (r > 0.96) add("grass", x, y, 1);
      }
    }
  }
  return resources;
}

export function generateMonsters(day = 1) {
  return [
    { id: day * 100 + 1, type: "mite", x: 80.5, y: 47.5, hp: 3, maxHp: 3, cooldown: 0 },
    { id: day * 100 + 2, type: "mite", x: 89.5, y: 54.5, hp: 3, maxHp: 3, cooldown: 0 },
    { id: day * 100 + 3, type: "shade", x: 94.5, y: 65.5, hp: 5, maxHp: 5, cooldown: 0 },
    { id: day * 100 + 4, type: "shade", x: 83.5, y: 67.5, hp: 5, maxHp: 5, cooldown: 0 },
  ];
}

export function generateQuests(day) {
  const pool = [
    { id: `wood-${day}`, title: "Warm Hearth", type: "wood", target: 12, reward: 90, text: "Gather 12 wood for the village ovens." },
    { id: `stone-${day}`, title: "Path Repairs", type: "stone", target: 10, reward: 85, text: "Collect 10 stone for the expanded roads." },
    { id: `harvest-${day}`, title: "Fresh Basket", type: "harvest", target: 4, reward: 130, text: "Harvest 4 crops for the community table." },
    { id: `fish-${day}`, title: "Moonlake Supper", type: "fish", target: 2, reward: 120, text: "Catch 2 fish from a pond, river, or Moonlake." },
    { id: `talk-${day}`, title: "Valley Voices", type: "talk", target: 3, reward: 75, text: "Speak with 3 villagers today." },
    { id: `monsters-${day}`, title: "Quiet the Ridge", type: "monsters", target: 2, reward: 160, text: "Defeat 2 creatures in Ember Ridge." },
    { id: `copper-${day}`, title: "Copper Request", type: "copper", target: 4, reward: 150, text: "Mine 4 copper ore for Oren." },
    { id: `forage-${day}`, title: "Forest Pantry", type: "forage", target: 3, reward: 110, text: "Gather 3 herbs, mushrooms, or apples." },
    { id: `explore-${day}`, title: "A Wider Valley", type: "explore", target: 4, reward: 140, text: "Visit 4 different valley zones today." },
  ];
  const offset = day % pool.length;
  return [pool[offset], pool[(offset + 3) % pool.length], pool[(offset + 6) % pool.length]].map((q) => ({ ...q, claimed: false }));
}
