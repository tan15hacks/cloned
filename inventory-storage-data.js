import { ITEMS, clamp } from "./game-shared.js";
import { INTERIOR_MAPS } from "./living-world-data.js";
import { RANCH_PRODUCT_IDS, RANCH_QUALITY_ORDER } from "./ranch-data.js";
import { COOKING_RECIPE_MAP } from "./cooking-data.js";
import "./fishing-data.js";
import "./museum-data.js";

export const STORAGE_VERSION = 1;
export const BACKPACK_STACK_LIMIT = 999;
export const STORAGE_STACK_LIMIT = 9999;
export const SHIPPING_BIN = { x: 21.5, y: 14.5, label: "Farmstead Shipping Bin" };
export const STORAGE_QUALITY_ORDER = ["normal", "silver", "gold", "iridium"];
export const STORAGE_QUALITY_MULTIPLIERS = { normal: 1, silver: 1.25, gold: 1.6, iridium: 2.2 };

export const BACKPACK_UPGRADES = [
  { capacity: 40, name: "Field Pack", coins: 0, cost: {} },
  { capacity: 56, name: "Explorer Pack", coins: 2800, cost: { cloth: 1 } },
  { capacity: 72, name: "Expedition Pack", coins: 7600, cost: { cloth: 3, iron: 5 } },
  { capacity: 96, name: "Curator Pack", coins: 16800, cost: { cloth: 6, gold: 4 } },
];

export const STORAGE_CHESTS = {
  pantry: { id: "pantry", name: "Farmhouse Pantry", icon: "🧺", capacity: 80, description: "Food, crops, forage, fish, ranch goods, and prepared meals." },
  trunk: { id: "trunk", name: "Adventure Trunk", icon: "🧰", capacity: 120, description: "Materials, monster drops, equipment, supplies, and collectibles." },
};

const CATEGORY_DEFS = [
  { id: "seeds", name: "Seeds", icon: "🌱", items: new Set(["turnipSeed", "berrySeed", "moonSeed"]) },
  { id: "crops", name: "Crops", icon: "🌾", items: new Set(["turnip", "berry", "moonbean", "apple"]) },
  { id: "forage", name: "Forage", icon: "🌿", items: new Set(["fiber", "herb", "mushroom", "swampBloom", "mistPearl", "snowHerb", "volcanicGlass"]) },
  { id: "fish", name: "Fish", icon: "🐟", items: new Set(["fish", "rareFish"]) },
  { id: "ranch", name: "Ranch", icon: "🐄", items: new Set(RANCH_PRODUCT_IDS.slice(0, 7)) },
  { id: "artisan", name: "Artisan", icon: "⚙️", items: new Set(RANCH_PRODUCT_IDS.slice(7)) },
  { id: "meals", name: "Meals", icon: "🍲", items: new Set(Object.keys(COOKING_RECIPE_MAP)) },
  { id: "materials", name: "Materials", icon: "⛏️", items: new Set(["wood", "stone", "copper", "iron", "silver", "gold", "obsidian", "crystal", "frostcore", "embercore", "voidshard", "relic"]) },
  { id: "monster", name: "Monster Drops", icon: "🐾", items: new Set(["slimeGel", "fang", "venom", "hide", "ash"]) },
  { id: "consumables", name: "Consumables", icon: "🧴", items: new Set(["snack", "tea", "potion", "caveTonic", "wormBait", "glowBait", "animalMedicine", "incubatorPack"]) },
];

export const INVENTORY_CATEGORIES = [
  { id: "all", name: "All", icon: "🎒" },
  ...CATEGORY_DEFS.map(({ id, name, icon }) => ({ id, name, icon })),
  { id: "special", name: "Special", icon: "✨" },
  { id: "misc", name: "Other", icon: "📦" },
];

const NON_SHIPPABLE = new Set([
  "scythe", "milkingPail", "shears", "heater", "friendshipPin", "festivalToken",
  "waystoneStabilizer", "riftCompass", "museumToken", "curatorSeal", "anglerToken",
]);
const PROGRESSION_QUALITY_ITEMS = new Set(["turnip", "berry", "moonbean", "fish", "rareFish", "apple"]);
const SPECIAL_PATTERN = /(blade|sword|armor|helmet|boots|ring|charm|compass|token|seal|pin|spinner|bobber)/i;

const finiteInt = (value, fallback = 0) => {
  const numeric = Number(value);
  return Math.floor(Number.isFinite(numeric) ? numeric : fallback);
};

export function inventoryCategoryForItem(id) {
  for (const category of CATEGORY_DEFS) if (category.items.has(id)) return category.id;
  if (NON_SHIPPABLE.has(id) || SPECIAL_PATTERN.test(id)) return "special";
  return "misc";
}

export function preferredStorageChest(id) {
  return ["seeds", "crops", "forage", "fish", "ranch", "artisan", "meals", "consumables"].includes(inventoryCategoryForItem(id)) ? "pantry" : "trunk";
}

export function isQualityTrackedItem(id) {
  return PROGRESSION_QUALITY_ITEMS.has(id) || RANCH_PRODUCT_IDS.includes(id) || Boolean(COOKING_RECIPE_MAP[id]);
}

export function isShippableItem(id) {
  const item = ITEMS[id];
  return Boolean(item && Number(item.value) > 0 && !NON_SHIPPABLE.has(id) && !SPECIAL_PATTERN.test(id));
}

export function normalizeStorageQualities(value, count) {
  const result = Object.fromEntries(STORAGE_QUALITY_ORDER.map((quality) => [quality, clamp(finiteInt(value?.[quality]), 0, STORAGE_STACK_LIMIT)]));
  let total = STORAGE_QUALITY_ORDER.reduce((sum, quality) => sum + result[quality], 0);
  if (total < count) result.normal += count - total;
  else if (total > count) {
    let excess = total - count;
    for (const quality of STORAGE_QUALITY_ORDER) {
      const remove = Math.min(excess, result[quality]);
      result[quality] -= remove;
      excess -= remove;
      if (excess <= 0) break;
    }
  }
  return result;
}

export function createStorageContainer(existing = {}, capacity = 80) {
  const items = {};
  const qualities = {};
  const sourceItems = existing?.items && typeof existing.items === "object" ? existing.items : {};
  for (const [id, raw] of Object.entries(sourceItems)) {
    if (!ITEMS[id]) continue;
    const count = clamp(finiteInt(raw), 0, STORAGE_STACK_LIMIT);
    if (count <= 0) continue;
    items[id] = count;
    qualities[id] = normalizeStorageQualities(existing?.qualities?.[id], count);
  }
  return { capacity, items, qualities };
}

export function storageOccupiedSlots(container) {
  return Object.values(container?.items || {}).filter((count) => Number(count) > 0).length;
}

export function backpackOccupiedSlots(state) {
  return Object.entries(state?.inventory || {}).filter(([id, count]) => ITEMS[id] && Number(count) > 0).length;
}

export function createStorageState(existing = {}, state = null) {
  const value = existing && typeof existing === "object" ? existing : {};
  const chests = {
    pantry: createStorageContainer(value.chests?.pantry, STORAGE_CHESTS.pantry.capacity),
    trunk: createStorageContainer(value.chests?.trunk, STORAGE_CHESTS.trunk.capacity),
  };
  const shipping = createStorageContainer(value.shipping, 160);
  const lastShipmentItems = Array.isArray(value.lastShipment?.items) ? value.lastShipment.items.filter((entry) => entry && ITEMS[entry.id]).map((entry) => ({
    id: entry.id,
    count: clamp(finiteInt(entry.count), 0, STORAGE_STACK_LIMIT),
    value: clamp(finiteInt(entry.value), 0, 99999999),
  })).filter((entry) => entry.count > 0).slice(0, 160) : [];
  return {
    version: STORAGE_VERSION,
    introQueued: Boolean(value.introQueued),
    sortMode: ["category", "name", "count", "value"].includes(value.sortMode) ? value.sortMode : "category",
    filter: INVENTORY_CATEGORIES.some((category) => category.id === value.filter) ? value.filter : "all",
    chests,
    shipping,
    lastShipment: value.lastShipment && typeof value.lastShipment === "object" ? {
      day: clamp(finiteInt(value.lastShipment.day), 0, Math.max(0, finiteInt(state?.day))),
      total: clamp(finiteInt(value.lastShipment.total), 0, 99999999),
      items: lastShipmentItems,
    } : null,
    stats: {
      itemsStored: clamp(finiteInt(value.stats?.itemsStored), 0, 999999999),
      itemsRetrieved: clamp(finiteInt(value.stats?.itemsRetrieved), 0, 999999999),
      itemsShipped: clamp(finiteInt(value.stats?.itemsShipped), 0, 999999999),
      shippingRevenue: clamp(finiteInt(value.stats?.shippingRevenue), 0, 999999999),
      shipments: clamp(finiteInt(value.stats?.shipments), 0, 999999999),
      upgradesBought: clamp(finiteInt(value.stats?.upgradesBought), 0, BACKPACK_UPGRADES.length - 1),
    },
  };
}

export function nextBackpackUpgrade(capacity) {
  const safe = Math.max(1, finiteInt(capacity, 40));
  return BACKPACK_UPGRADES.find((entry) => entry.capacity > safe) || null;
}

export function shipmentValueForItem(id, qualities, multiplier = 1) {
  const base = Math.max(0, Number(ITEMS[id]?.value) || 0);
  return STORAGE_QUALITY_ORDER.reduce((sum, quality) => sum + Math.floor((qualities?.[quality] || 0) * base * STORAGE_QUALITY_MULTIPLIERS[quality] * multiplier), 0);
}

export function registerFarmhouseStorage() {
  const map = INTERIOR_MAPS.farmhouse;
  if (!map) return null;
  const existingChest = map.objects.find((object) => object.type === "chest" && object.x === 15 && object.y === 2);
  if (existingChest && !existingChest.id) existingChest.id = "farmhouse-pantry-chest";
  const storageInteraction = map.interactions.find((entry) => entry.id === "storage");
  if (storageInteraction) storageInteraction.label = "Open Farmhouse Pantry";
  if (!map.objects.some((object) => object.id === "farmhouse-adventure-trunk")) map.objects.push({ id: "farmhouse-adventure-trunk", type: "chest", x: 2, y: 8, w: 2, h: 2, solid: true });
  if (!map.interactions.some((entry) => entry.id === "storageTrunk")) map.interactions.push({ id: "storageTrunk", x: 4.5, y: 9.5, label: "Open Adventure Trunk" });
  return map;
}

export function storageCostText(upgrade) {
  if (!upgrade) return "Maximum capacity reached";
  const materials = Object.entries(upgrade.cost || {}).map(([id, amount]) => `${ITEMS[id]?.icon || "📦"} ${amount} ${ITEMS[id]?.name || id}`);
  return [`${upgrade.coins} coins`, ...materials].join(" · ");
}

export function validateStorageData() {
  registerFarmhouseStorage();
  if (BACKPACK_UPGRADES.some((entry, index) => index > 0 && entry.capacity <= BACKPACK_UPGRADES[index - 1].capacity)) return false;
  if (Object.values(STORAGE_CHESTS).some((entry) => entry.capacity < 40)) return false;
  if (!INTERIOR_MAPS.farmhouse.interactions.some((entry) => entry.id === "storage")) return false;
  if (!INTERIOR_MAPS.farmhouse.interactions.some((entry) => entry.id === "storageTrunk")) return false;
  return INVENTORY_CATEGORIES.length >= 10 && STORAGE_QUALITY_ORDER.join(",") === RANCH_QUALITY_ORDER.join(",");
}

registerFarmhouseStorage();
