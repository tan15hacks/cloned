import { ITEMS, clamp } from "./game-shared.js";

export const CRAFTING_VERSION = 1;
export const CRAFTING_MAX_LEVEL = 10;
export const CRAFTING_MAX_PLACED = 220;
export const CRAFTING_PLACEABLE_ORDER = [
  "workbench", "woodPath", "stonePath", "fence", "stoneFence", "gate", "chest",
  "sprinkler", "qualitySprinkler", "iridiumSprinkler", "scarecrow", "lantern", "crystalLantern",
];

const placeable = (id, name, icon, options = {}) => ({
  id,
  name,
  icon,
  category: "placeable",
  level: 1,
  station: "planbook",
  yield: 1,
  solid: true,
  cost: {},
  refund: {},
  description: "A useful farm fixture.",
  ...options,
});

export const CRAFTING_RECIPES = [
  placeable("workbench", "Hearthwood Workbench", "🛠️", {
    level: 1,
    cost: { wood: 20, stone: 10 },
    refund: { wood: 10, stone: 5 },
    description: "Unlocks advanced construction while standing nearby.",
  }),
  placeable("woodPath", "Wood Walkway", "🟫", {
    level: 1,
    yield: 4,
    solid: false,
    cost: { wood: 4 },
    refund: { wood: 1 },
    description: "Crafts four wooden path tiles that improve farm movement speed.",
  }),
  placeable("fence", "Hearthwood Fence", "🪵", {
    level: 1,
    yield: 2,
    cost: { wood: 5 },
    refund: { wood: 2 },
    description: "Crafts two collision fences for organizing fields and animals.",
  }),
  placeable("gate", "Hearthwood Gate", "🚪", {
    level: 2,
    cost: { wood: 7, copper: 1 },
    refund: { wood: 3 },
    description: "A fence gate that opens and closes through interaction.",
  }),
  placeable("chest", "Farm Storage Chest", "🧰", {
    level: 2,
    cost: { wood: 18, copper: 2 },
    refund: { wood: 9, copper: 1 },
    description: "Stores up to 24 different item stacks independently from the backpack.",
  }),
  placeable("sprinkler", "Dewdrop Sprinkler", "💦", {
    level: 2,
    cost: { wood: 8, stone: 8, copper: 2 },
    refund: { wood: 4, stone: 4, copper: 1 },
    description: "Waters the four neighboring farm tiles each morning.",
  }),
  placeable("lantern", "Glow Lantern", "🏮", {
    level: 2,
    cost: { wood: 6, crystal: 1 },
    refund: { wood: 3 },
    description: "Improves crop Harmony within three tiles and lights the farm at night.",
  }),
  placeable("scarecrow", "Hearthvale Scarecrow", "🎃", {
    level: 3,
    station: "workbench",
    cost: { wood: 12, fiber: 16, turnip: 1 },
    refund: { wood: 6, fiber: 8 },
    description: "Protects crops from morning crow damage within an eight-tile radius.",
  }),
  placeable("stonePath", "Stone Farm Path", "⬜", {
    level: 3,
    station: "workbench",
    yield: 4,
    solid: false,
    cost: { stone: 8 },
    refund: { stone: 2 },
    description: "Crafts four durable path tiles with a stronger movement bonus.",
  }),
  placeable("stoneFence", "Reinforced Stone Fence", "🧱", {
    level: 4,
    station: "workbench",
    yield: 2,
    cost: { stone: 8, iron: 1 },
    refund: { stone: 4 },
    description: "Crafts two strong stone fence sections.",
  }),
  placeable("qualitySprinkler", "Silverflow Sprinkler", "🌧️", {
    level: 5,
    station: "workbench",
    cost: { iron: 6, silver: 2, crystal: 1 },
    refund: { iron: 3, silver: 1 },
    description: "Waters all eight surrounding farm tiles each morning.",
  }),
  placeable("crystalLantern", "Hearth Crystal Lantern", "🔆", {
    level: 6,
    station: "workbench",
    cost: { wood: 8, silver: 2, crystal: 2 },
    refund: { wood: 4, silver: 1, crystal: 1 },
    description: "Provides a powerful Harmony bonus within five tiles.",
  }),
  placeable("iridiumSprinkler", "Grand Depths Sprinkler", "💠", {
    level: 8,
    station: "workbench",
    cost: { gold: 6, obsidian: 4, crystal: 2 },
    refund: { gold: 3, obsidian: 2, crystal: 1 },
    description: "Waters a five-by-five area around itself each morning.",
  }),
];

export const CRAFTING_RECIPE_MAP = Object.fromEntries(CRAFTING_RECIPES.map((entry) => [entry.id, entry]));

export const CRAFT_OBJECT_DEFS = Object.fromEntries(CRAFTING_RECIPES.map((entry) => [entry.id, {
  id: entry.id,
  name: entry.name,
  icon: entry.icon,
  solid: entry.solid,
  interactive: ["workbench", "gate", "chest"].includes(entry.id),
}])));

export function craftingXpForLevel(level) {
  const safe = clamp(Math.floor(Number(level) || 1), 1, CRAFTING_MAX_LEVEL);
  return safe <= 1 ? 0 : Math.floor(45 * (safe - 1) * (safe - 1) + 35 * (safe - 1));
}

export function craftingLevelFromXp(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  let level = 1;
  while (level < CRAFTING_MAX_LEVEL && safeXp >= craftingXpForLevel(level + 1)) level += 1;
  return level;
}

export function craftingXpForRecipe(recipe) {
  return Math.max(5, 4 + recipe.level * 4 + Object.values(recipe.cost).reduce((sum, amount) => sum + amount, 0));
}

export function wateringOffsetsFor(type) {
  if (type === "sprinkler") return [[1, 0], [-1, 0], [0, 1], [0, -1]];
  if (type === "qualitySprinkler") {
    const offsets = [];
    for (let y = -1; y <= 1; y += 1) for (let x = -1; x <= 1; x += 1) if (x || y) offsets.push([x, y]);
    return offsets;
  }
  if (type === "iridiumSprinkler") {
    const offsets = [];
    for (let y = -2; y <= 2; y += 1) for (let x = -2; x <= 2; x += 1) if (x || y) offsets.push([x, y]);
    return offsets;
  }
  return [];
}

export function objectIsSolid(placed) {
  if (!placed || !CRAFT_OBJECT_DEFS[placed.type]) return true;
  if (placed.type === "gate" && placed.open) return false;
  return CRAFT_OBJECT_DEFS[placed.type].solid;
}

export function recipeMaterialsLabel(recipe) {
  return Object.entries(recipe.cost).map(([id, amount]) => `${ITEMS[id]?.icon || "📦"} ${ITEMS[id]?.name || id} ×${amount}`).join(" · ");
}

export function validateCraftingData() {
  const ids = new Set();
  for (const recipe of CRAFTING_RECIPES) {
    if (ids.has(recipe.id) || !recipe.name || !recipe.icon || !CRAFT_OBJECT_DEFS[recipe.id]) return false;
    ids.add(recipe.id);
    if (recipe.level < 1 || recipe.level > CRAFTING_MAX_LEVEL || recipe.yield < 1) return false;
    if (!Object.keys(recipe.cost).length) return false;
    for (const [id, amount] of Object.entries(recipe.cost)) if (!ITEMS[id] || !Number.isInteger(amount) || amount <= 0) return false;
    for (const [id, amount] of Object.entries(recipe.refund)) if (!ITEMS[id] || !Number.isInteger(amount) || amount < 0) return false;
  }
  return ids.size === 13 && wateringOffsetsFor("sprinkler").length === 4 && wateringOffsetsFor("qualitySprinkler").length === 8 && wateringOffsetsFor("iridiumSprinkler").length === 24;
}
