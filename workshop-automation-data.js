import { ITEMS, CROPS, clamp } from "./game-shared.js";

const registerItem = (id, definition) => { ITEMS[id] ||= definition; };

registerItem("qualitySprinklerKit", { name: "Quality Sprinkler", icon: "💦", value: 760 });
registerItem("hearthSprinklerKit", { name: "Hearth Sprinkler", icon: "💠", value: 2100 });
registerItem("beeHouseKit", { name: "Bee House", icon: "🐝", value: 920 });
registerItem("lightningRodKit", { name: "Spark Rod", icon: "⚡", value: 1280 });
registerItem("seedMakerKit", { name: "Seed Maker", icon: "🌾", value: 1460 });
registerItem("wildHoney", { name: "Wildflower Honey", icon: "🍯", value: 145 });
registerItem("sparkHoney", { name: "Spark Honey", icon: "✨", value: 285 });
registerItem("batteryCell", { name: "Hearth Battery", icon: "🔋", value: 340 });

export const AUTOMATION_VERSION = 1;
export const MAX_AUTOMATION_DEVICES = 40;

export const WORKSHOP_BLUEPRINTS = [
  {
    id: "qualitySprinkler", kit: "qualitySprinklerKit", name: "Quality Sprinkler", icon: "💦",
    description: "Waters all eight neighboring crop tiles before the next morning's growth.",
    cost: { wood: 20, stone: 20, copper: 8, iron: 4 }, requires: ["workshop"], maxPlaced: 16,
  },
  {
    id: "beeHouse", kit: "beeHouseKit", name: "Bee House", icon: "🐝",
    description: "Produces honey every two days. Four nearby mature crops increase the yield to two jars.",
    cost: { wood: 45, fiber: 20, iron: 4 }, requires: ["workshop"], maxPlaced: 12,
  },
  {
    id: "lightningRod", kit: "lightningRodKit", name: "Spark Rod", icon: "⚡",
    description: "Captures Sparkfall energy and stores one Hearth Battery when the sky ignites.",
    cost: { copper: 18, iron: 12, crystal: 2 }, requires: ["greenhouse"], maxPlaced: 8,
  },
  {
    id: "seedMaker", kit: "seedMakerKit", name: "Seed Maker", icon: "🌾",
    description: "Processes one harvested crop into fresh seeds by the following morning.",
    cost: { wood: 30, copper: 12, iron: 8, crystal: 2 }, requires: ["greenhouse"], maxPlaced: 8,
  },
  {
    id: "hearthSprinkler", kit: "hearthSprinklerKit", name: "Hearth Sprinkler", icon: "💠",
    description: "Waters every crop tile within two spaces: up to twenty-four plots around one device.",
    cost: { iron: 20, silver: 10, gold: 4, crystal: 6, batteryCell: 2 }, requires: ["irrigation"], maxPlaced: 12,
  },
];

export const WORKSHOP_BLUEPRINT_MAP = Object.fromEntries(WORKSHOP_BLUEPRINTS.map((entry) => [entry.id, entry]));
export const AUTOMATION_TYPES = new Set(WORKSHOP_BLUEPRINTS.map((entry) => entry.id));
export const AUTOMATION_KITS = new Set(WORKSHOP_BLUEPRINTS.map((entry) => entry.kit));
export const MACHINE_OUTPUT_ITEMS = new Set(["wildHoney", "sparkHoney", "batteryCell", "turnipSeed", "berrySeed", "moonSeed"]);

export const SEED_MAKER_RECIPES = {
  turnip: { input: "turnip", output: "turnipSeed", amount: 3 },
  berry: { input: "berry", output: "berrySeed", amount: 2 },
  moonbean: { input: "moonbean", output: "moonSeed", amount: 2 },
};

export function sprinklerOffsets(type) {
  const radius = type === "hearthSprinkler" ? 2 : type === "qualitySprinkler" ? 1 : 0;
  const offsets = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      offsets.push([dx, dy]);
    }
  }
  return offsets;
}

export function createAutomationState(existing = {}) {
  const value = existing && typeof existing === "object" ? existing : {};
  return {
    version: AUTOMATION_VERSION,
    knownBlueprints: Array.isArray(value.knownBlueprints)
      ? [...new Set(value.knownBlueprints.filter((id) => WORKSHOP_BLUEPRINT_MAP[id]))]
      : [],
    stats: {
      crafted: clamp(Math.floor(Number(value.stats?.crafted) || 0), 0, 999999999),
      placed: clamp(Math.floor(Number(value.stats?.placed) || 0), 0, 999999999),
      tilesWatered: clamp(Math.floor(Number(value.stats?.tilesWatered) || 0), 0, 999999999),
      honeyCollected: clamp(Math.floor(Number(value.stats?.honeyCollected) || 0), 0, 999999999),
      batteriesCollected: clamp(Math.floor(Number(value.stats?.batteriesCollected) || 0), 0, 999999999),
      seedsMade: clamp(Math.floor(Number(value.stats?.seedsMade) || 0), 0, 999999999),
    },
  };
}

export function blueprintUnlocked(expansion, blueprint) {
  const completed = new Set(expansion?.completed || []);
  return Boolean(blueprint && blueprint.requires.every((id) => completed.has(id)));
}

export function createAutomationDevice(type, x, y, day = 1, serial = Date.now()) {
  const blueprint = WORKSHOP_BLUEPRINT_MAP[type];
  if (!blueprint) return null;
  const base = {
    id: `automation:${serial}:${type}`,
    type,
    x: Math.floor(x) + .5,
    y: Math.floor(y) + .5,
    placedDay: Math.max(1, Math.floor(Number(day) || 1)),
  };
  if (type === "beeHouse") return { ...base, nextReadyDay: base.placedDay + 2, output: null };
  if (type === "lightningRod") return { ...base, lastCapturedDay: 0, output: null };
  if (type === "seedMaker") return { ...base, input: null, output: null, readyDay: 0 };
  return base;
}

export function automationDeviceAt(placed, x, y) {
  return (placed || []).find((entry) => AUTOMATION_TYPES.has(entry.type) && Math.floor(entry.x) === Math.floor(x) && Math.floor(entry.y) === Math.floor(y));
}

export function blueprintCostText(blueprint) {
  return Object.entries(blueprint?.cost || {})
    .map(([id, amount]) => `${ITEMS[id]?.icon || "📦"} ${amount} ${ITEMS[id]?.name || id}`)
    .join(" · ");
}

export function validateWorkshopAutomationData() {
  if (WORKSHOP_BLUEPRINTS.length !== 5 || new Set(WORKSHOP_BLUEPRINTS.map((entry) => entry.id)).size !== 5) return false;
  if (sprinklerOffsets("qualitySprinkler").length !== 8 || sprinklerOffsets("hearthSprinkler").length !== 24) return false;
  if (WORKSHOP_BLUEPRINTS.some((entry) => !ITEMS[entry.kit] || entry.maxPlaced < 1 || Object.keys(entry.cost).some((id) => !ITEMS[id]))) return false;
  if (Object.entries(SEED_MAKER_RECIPES).some(([crop, recipe]) => !CROPS[crop] || !ITEMS[recipe.input] || !ITEMS[recipe.output] || recipe.amount < 1)) return false;
  return ["wildHoney", "sparkHoney", "batteryCell"].every((id) => ITEMS[id]);
}
