import { ITEMS, clamp } from "./game-shared.js";

const registerItem = (id, value) => { ITEMS[id] ||= value; };

registerItem("hay", { name: "Hay", icon: "🌾", value: 8 });
registerItem("animalMedicine", { name: "Animal Medicine", icon: "💊", value: 120 });
registerItem("heater", { name: "Barn Heater", icon: "♨️", value: 700 });
registerItem("incubatorPack", { name: "Incubator Heat Pack", icon: "🔥", value: 90 });
registerItem("scythe", { name: "Ranch Scythe", icon: "🌙", value: 350 });
registerItem("milkingPail", { name: "Milking Pail", icon: "🪣", value: 450 });
registerItem("shears", { name: "Wool Shears", icon: "✂️", value: 520 });
registerItem("egg", { name: "Egg", icon: "🥚", value: 52 });
registerItem("duckEgg", { name: "Duck Egg", icon: "🪺", value: 78 });
registerItem("feather", { name: "Duck Feather", icon: "🪶", value: 115 });
registerItem("milk", { name: "Milk", icon: "🥛", value: 95 });
registerItem("goatMilk", { name: "Goat Milk", icon: "🍼", value: 145 });
registerItem("wool", { name: "Wool", icon: "🧶", value: 155 });
registerItem("truffle", { name: "Truffle", icon: "🍄", value: 310 });
registerItem("mayonnaise", { name: "Mayonnaise", icon: "🏺", value: 145 });
registerItem("duckMayonnaise", { name: "Duck Mayonnaise", icon: "🫙", value: 215 });
registerItem("cheese", { name: "Cheese", icon: "🧀", value: 255 });
registerItem("goatCheese", { name: "Goat Cheese", icon: "🧀", value: 375 });
registerItem("cloth", { name: "Cloth", icon: "🧵", value: 430 });
registerItem("truffleOil", { name: "Truffle Oil", icon: "🫗", value: 820 });

export const RANCH_QUALITY_ORDER = ["normal", "silver", "gold", "iridium"];
export const RANCH_QUALITY = {
  normal: { name: "Normal", icon: "●", multiplier: 1 },
  silver: { name: "Silver", icon: "◆", multiplier: 1.25 },
  gold: { name: "Gold", icon: "★", multiplier: 1.6 },
  iridium: { name: "Iridium", icon: "✦", multiplier: 2.2 },
};

export const PASTURE = { x: 3, y: 22, w: 10, h: 27 };
export const COOP_SITE = { x: 39, y: 5, w: 8, h: 9, door: { x: 43.5, y: 14.5 } };
export const BARN_DOOR = { x: 28.5, y: 14.5 };

export const HOUSING_UPGRADES = {
  coop: [
    { level: 0, name: "No Coop", capacity: 0, unlocks: [] },
    { level: 1, name: "Basic Coop", capacity: 4, unlocks: ["chicken"], days: 2, cost: { coins: 2200, wood: 80, stone: 45 } },
    { level: 2, name: "Large Coop", capacity: 8, unlocks: ["chicken", "duck"], days: 3, cost: { coins: 5600, wood: 130, stone: 90, copper: 10 } },
    { level: 3, name: "Deluxe Coop", capacity: 12, unlocks: ["chicken", "duck"], days: 4, cost: { coins: 9800, wood: 190, stone: 130, iron: 15, crystal: 1 }, autoFeeder: true, qualityBonus: .1 },
  ],
  barn: [
    { level: 0, name: "Old Empty Barn", capacity: 0, unlocks: [] },
    { level: 1, name: "Basic Barn", capacity: 4, unlocks: ["cow"], days: 2, cost: { coins: 4200, wood: 120, stone: 85 } },
    { level: 2, name: "Large Barn", capacity: 8, unlocks: ["cow", "goat", "sheep"], days: 3, cost: { coins: 8800, wood: 185, stone: 145, iron: 12 } },
    { level: 3, name: "Deluxe Barn", capacity: 12, unlocks: ["cow", "goat", "sheep", "pig"], days: 4, cost: { coins: 15400, wood: 265, stone: 205, gold: 8, crystal: 2 }, autoFeeder: true, winterProtection: true, qualityBonus: .12 },
  ],
};

export const SILO_UPGRADES = [
  { level: 0, name: "Loose Hay Stack", capacity: 40 },
  { level: 1, name: "Farm Silo", capacity: 240, days: 2, cost: { coins: 2300, wood: 65, stone: 85, copper: 5 } },
  { level: 2, name: "Expanded Silo", capacity: 480, days: 3, cost: { coins: 6200, wood: 120, stone: 150, iron: 8 } },
];

export const ANIMAL_SPECIES = {
  chicken: {
    name: "Chicken", icon: "🐔", housing: "coop", price: 800, farmingLevel: 1,
    matureDays: 3, productEvery: 1, product: "egg", speed: .62, color: "#f3eee1",
  },
  cow: {
    name: "Cow", icon: "🐄", housing: "barn", price: 2400, farmingLevel: 2,
    matureDays: 5, productEvery: 1, product: "milk", tool: "milkingPail", speed: .48, color: "#ece5d5",
  },
  duck: {
    name: "Duck", icon: "🦆", housing: "coop", price: 1900, farmingLevel: 4,
    matureDays: 4, productEvery: 2, product: "duckEgg", alternateProduct: "feather", alternateChance: .18, speed: .58, color: "#d9e4b2",
  },
  goat: {
    name: "Goat", icon: "🐐", housing: "barn", price: 3600, farmingLevel: 5,
    matureDays: 6, productEvery: 2, product: "goatMilk", tool: "milkingPail", speed: .55, color: "#d6cab7",
  },
  sheep: {
    name: "Sheep", icon: "🐑", housing: "barn", price: 4200, farmingLevel: 6,
    matureDays: 7, productEvery: 3, product: "wool", tool: "shears", speed: .46, color: "#f1eee4",
  },
  pig: {
    name: "Pig", icon: "🐖", housing: "barn", price: 6800, farmingLevel: 8,
    matureDays: 8, productEvery: 2, product: "truffle", outdoorProduct: true, speed: .52, color: "#dc9c99",
  },
};

export const RANCH_SUPPLIES = {
  hay: { item: "hay", name: "Hay Bundle ×10", amount: 10, price: 180, farmingLevel: 1 },
  animalMedicine: { item: "animalMedicine", name: "Animal Medicine", amount: 1, price: 180, farmingLevel: 1 },
  scythe: { item: "scythe", name: "Ranch Scythe", amount: 1, price: 480, farmingLevel: 1, unique: true },
  milkingPail: { item: "milkingPail", name: "Milking Pail", amount: 1, price: 650, farmingLevel: 2, unique: true },
  shears: { item: "shears", name: "Wool Shears", amount: 1, price: 780, farmingLevel: 5, unique: true },
  heater: { item: "heater", name: "Barn Heater", amount: 1, price: 950, farmingLevel: 4 },
  incubatorPack: { item: "incubatorPack", name: "Incubator Heat Pack", amount: 1, price: 220, farmingLevel: 4 },
};

export const MACHINE_DEFS = {
  mayonnaise: {
    name: "Mayonnaise Machine", icon: "🏺", farmingLevel: 3, minutes: 180,
    cost: { coins: 1300, wood: 20, stone: 12, copper: 2 },
    inputs: { egg: "mayonnaise", duckEgg: "duckMayonnaise" },
  },
  cheesePress: {
    name: "Cheese Press", icon: "🧀", farmingLevel: 4, minutes: 240,
    cost: { coins: 1900, wood: 30, stone: 18, iron: 3 },
    inputs: { milk: "cheese", goatMilk: "goatCheese" },
  },
  loom: {
    name: "Loom", icon: "🧵", farmingLevel: 6, minutes: 300,
    cost: { coins: 2400, wood: 38, fiber: 24, iron: 4 },
    inputs: { wool: "cloth", feather: "cloth" },
  },
  oilMaker: {
    name: "Oil Maker", icon: "🫗", farmingLevel: 8, minutes: 360,
    cost: { coins: 4200, wood: 52, gold: 3, crystal: 1 },
    inputs: { truffle: "truffleOil" },
  },
};

export const RANCH_PRODUCT_IDS = [
  "egg", "duckEgg", "feather", "milk", "goatMilk", "wool", "truffle",
  "mayonnaise", "duckMayonnaise", "cheese", "goatCheese", "cloth", "truffleOil",
];

const ANIMAL_NAMES = [
  "Pip", "Mochi", "Pebble", "Clover", "Sunny", "Maple", "Taro", "Biscuit",
  "Nori", "Poppy", "Bean", "Miso", "Dewdrop", "Copper", "Luna", "Wren",
];

export function createPastureGrass(existing = []) {
  if (Array.isArray(existing) && existing.length) {
    return existing.map((patch, index) => ({
      id: patch.id || `ranch-grass-${index}`,
      x: Number(patch.x) || PASTURE.x + 1,
      y: Number(patch.y) || PASTURE.y + 1,
      growth: clamp(Number(patch.growth) || 0, 0, 1),
    }));
  }
  const patches = [];
  let id = 0;
  for (let y = PASTURE.y + 1; y < PASTURE.y + PASTURE.h - 1; y += 3) {
    for (let x = PASTURE.x + 1; x < PASTURE.x + PASTURE.w - 1; x += 2) {
      patches.push({ id: `ranch-grass-${id++}`, x: x + .5, y: y + .5, growth: 1 });
    }
  }
  return patches;
}

export function createQualityInventory(existing = {}) {
  const result = {};
  for (const id of RANCH_PRODUCT_IDS) {
    const value = existing?.[id] || {};
    result[id] = Object.fromEntries(RANCH_QUALITY_ORDER.map((quality) => [quality, Math.max(0, Math.floor(Number(value[quality]) || 0))]));
  }
  return result;
}

export function createAnimal(speciesId, id, day = 1, name = null) {
  const species = ANIMAL_SPECIES[speciesId];
  if (!species) return null;
  const numeric = Math.max(1, Number(String(id).match(/\d+/)?.[0]) || 1);
  return {
    id: String(id || `animal-${numeric}`),
    species: speciesId,
    name: String(name || ANIMAL_NAMES[(numeric - 1) % ANIMAL_NAMES.length]).slice(0, 18),
    ageDays: 0,
    friendship: 0,
    happiness: 72,
    health: 100,
    sick: false,
    fedToday: false,
    pettedDay: 0,
    outside: false,
    wasOutsideToday: false,
    x: PASTURE.x + 2.5 + (numeric % 4) * 1.6,
    y: PASTURE.y + 3.5 + (numeric % 7) * 2.2,
    targetX: null,
    targetY: null,
    wanderTimer: 0,
    productReady: null,
    lastProductDay: 0,
    purchasedDay: Math.max(1, Number(day) || 1),
    colorVariant: numeric % 9 === 0 ? "rare" : "normal",
  };
}

function normalizeAnimal(value, index, day) {
  const base = createAnimal(value?.species || "chicken", value?.id || `animal-${index + 1}`, day, value?.name);
  if (!base) return null;
  const animal = { ...base, ...(value || {}) };
  animal.species = ANIMAL_SPECIES[animal.species] ? animal.species : "chicken";
  animal.name = String(animal.name || base.name).slice(0, 18);
  animal.ageDays = Math.max(0, Math.floor(Number(animal.ageDays) || 0));
  animal.friendship = clamp(Number(animal.friendship) || 0, 0, 10);
  animal.happiness = clamp(Number(animal.happiness) || 0, 0, 100);
  animal.health = clamp(Number(animal.health) || 0, 1, 100);
  animal.sick = Boolean(animal.sick);
  animal.fedToday = Boolean(animal.fedToday);
  animal.pettedDay = Math.max(0, Math.floor(Number(animal.pettedDay) || 0));
  animal.outside = Boolean(animal.outside);
  animal.wasOutsideToday = Boolean(animal.wasOutsideToday);
  animal.x = Number(animal.x) || base.x;
  animal.y = Number(animal.y) || base.y;
  animal.targetX = Number.isFinite(Number(animal.targetX)) ? Number(animal.targetX) : null;
  animal.targetY = Number.isFinite(Number(animal.targetY)) ? Number(animal.targetY) : null;
  animal.wanderTimer = Math.max(0, Number(animal.wanderTimer) || 0);
  if (animal.productReady && !ITEMS[animal.productReady.id]) animal.productReady = null;
  return animal;
}

function createMachineState(existing = {}) {
  const result = {};
  for (const id of Object.keys(MACHINE_DEFS)) {
    const value = existing?.[id] || {};
    const count = clamp(Math.floor(Number(value.count) || 0), 0, 2);
    const slots = Array.isArray(value.slots) ? value.slots.slice(0, count) : [];
    while (slots.length < count) slots.push(null);
    result[id] = {
      count,
      slots: slots.map((slot) => slot ? {
        input: ITEMS[slot.input] ? slot.input : null,
        output: ITEMS[slot.output] ? slot.output : null,
        quality: RANCH_QUALITY[slot.quality] ? slot.quality : "normal",
        remaining: Math.max(0, Number(slot.remaining) || 0),
        ready: Boolean(slot.ready),
      } : null),
    };
  }
  return result;
}

export function createRanchState(existing = {}, day = 1) {
  const value = existing && typeof existing === "object" ? existing : {};
  const buildings = value.buildings || {};
  const ranch = {
    version: 1,
    animals: Array.isArray(value.animals) ? value.animals.map((animal, index) => normalizeAnimal(animal, index, day)).filter(Boolean).slice(0, 24) : [],
    nextAnimalId: Math.max(1, Math.floor(Number(value.nextAnimalId) || 1)),
    buildings: {
      coop: {
        level: clamp(Math.floor(Number(buildings.coop?.level) || 0), 0, 3),
        doorOpen: buildings.coop?.doorOpen !== false,
        heater: Boolean(buildings.coop?.heater),
        autoCollector: Boolean(buildings.coop?.autoCollector),
      },
      barn: {
        level: clamp(Math.floor(Number(buildings.barn?.level) || 0), 0, 3),
        doorOpen: buildings.barn?.doorOpen !== false,
        heater: Boolean(buildings.barn?.heater),
        autoCollector: Boolean(buildings.barn?.autoCollector),
      },
      silo: { level: clamp(Math.floor(Number(buildings.silo?.level) || 0), 0, 2) },
    },
    hay: Math.max(0, Math.floor(Number(value.hay) || 0)),
    troughWater: clamp(Number(value.troughWater) || 100, 0, 100),
    cleanliness: clamp(Number(value.cleanliness) || 100, 0, 100),
    construction: value.construction && typeof value.construction === "object" ? {
      kind: ["coop", "barn", "silo"].includes(value.construction.kind) ? value.construction.kind : null,
      targetLevel: Math.max(1, Math.floor(Number(value.construction.targetLevel) || 1)),
      daysRemaining: Math.max(1, Math.floor(Number(value.construction.daysRemaining) || 1)),
    } : null,
    grass: createPastureGrass(value.grass),
    incubator: value.incubator && typeof value.incubator === "object" ? {
      species: value.incubator.species === "duck" ? "duck" : "chicken",
      daysRemaining: Math.max(0, Math.floor(Number(value.incubator.daysRemaining) || 0)),
      ready: Boolean(value.incubator.ready),
    } : null,
    machines: createMachineState(value.machines),
    qualityInventory: createQualityInventory(value.qualityInventory),
    stats: {
      animalsPurchased: Math.max(0, Math.floor(Number(value.stats?.animalsPurchased) || 0)),
      productsCollected: Math.max(0, Math.floor(Number(value.stats?.productsCollected) || 0)),
      artisanCollected: Math.max(0, Math.floor(Number(value.stats?.artisanCollected) || 0)),
      grassCut: Math.max(0, Math.floor(Number(value.stats?.grassCut) || 0)),
      happyDays: Math.max(0, Math.floor(Number(value.stats?.happyDays) || 0)),
      artisanTypes: Array.isArray(value.stats?.artisanTypes) ? [...new Set(value.stats.artisanTypes.filter((id) => ITEMS[id]))] : [],
    },
    lastProcessedDay: Math.max(0, Math.floor(Number(value.lastProcessedDay) || 0)),
    lastAutoCollection: Array.isArray(value.lastAutoCollection) ? value.lastAutoCollection.filter((entry) => ITEMS[entry.id]) : [],
  };
  ranch.nextAnimalId = Math.max(ranch.nextAnimalId, ranch.animals.reduce((max, animal) => Math.max(max, Number(String(animal.id).match(/\d+/)?.[0]) || 0), 0) + 1);
  ranch.hay = Math.min(ranch.hay, siloCapacity(ranch));
  return ranch;
}

export function housingDefinition(ranch, kind) {
  const level = ranch?.buildings?.[kind]?.level || 0;
  return HOUSING_UPGRADES[kind]?.[level] || HOUSING_UPGRADES[kind][0];
}

export function housingCapacity(ranch, kind) { return housingDefinition(ranch, kind).capacity || 0; }
export function housingAnimalCount(ranch, kind) { return (ranch?.animals || []).filter((animal) => ANIMAL_SPECIES[animal.species]?.housing === kind).length; }
export function housingHasRoom(ranch, kind) { return housingAnimalCount(ranch, kind) < housingCapacity(ranch, kind); }
export function siloCapacity(ranch) { return SILO_UPGRADES[ranch?.buildings?.silo?.level || 0]?.capacity || 40; }

export function speciesUnlocked(ranch, speciesId, farmingLevel = 1) {
  const species = ANIMAL_SPECIES[speciesId];
  if (!species || farmingLevel < species.farmingLevel) return false;
  return housingDefinition(ranch, species.housing).unlocks.includes(speciesId);
}

export function ranchQualityRoll({ friendship = 0, happiness = 50, buildingLevel = 1, farmingLevel = 1, heated = true, roll = Math.random() } = {}) {
  const rating = clamp(
    clamp(friendship, 0, 10) / 10 * .3
    + clamp(happiness, 0, 100) / 100 * .28
    + Math.max(0, buildingLevel - 1) * .1
    + Math.max(0, farmingLevel - 1) * .025
    + (heated ? .04 : 0),
    0,
    .95,
  );
  const value = clamp(Number(roll) || 0, 0, .999999);
  const iridium = Math.max(0, (rating - .67) * .46);
  const gold = Math.max(.02, (rating - .3) * .42);
  const silver = .14 + rating * .24;
  if (value < iridium) return "iridium";
  if (value < iridium + gold) return "gold";
  if (value < iridium + gold + silver) return "silver";
  return "normal";
}

export function productForAnimal(animal, context = {}) {
  const species = ANIMAL_SPECIES[animal?.species];
  if (!species || animal.productReady || animal.ageDays < species.matureDays) return null;
  const day = Math.max(1, Math.floor(Number(context.day) || 1));
  if (day - (animal.lastProductDay || 0) < species.productEvery) return null;
  if (!context.fed || context.watered === false || animal.sick || animal.health < 35 || animal.happiness < 24) return null;
  if (species.outdoorProduct && (!context.wasOutside || ["Rain", "Snow"].includes(context.weather) || context.seasonId === "winter")) return null;
  const productId = species.alternateProduct && Number(context.productRoll) < species.alternateChance ? species.alternateProduct : species.product;
  const quality = ranchQualityRoll({
    friendship: animal.friendship,
    happiness: animal.happiness,
    buildingLevel: context.buildingLevel,
    farmingLevel: context.farmingLevel,
    heated: context.heated,
    roll: context.qualityRoll,
  });
  const doubleChance = Math.max(0, (Number(context.farmingLevel) || 1) - 7) * .025 + (animal.friendship >= 9 ? .05 : 0);
  const amount = Number(context.doubleRoll) < doubleChance ? 2 : 1;
  return { id: productId, quality, amount };
}

export function nextHousingUpgrade(ranch, kind) {
  const current = ranch?.buildings?.[kind]?.level || 0;
  const list = kind === "silo" ? SILO_UPGRADES : HOUSING_UPGRADES[kind];
  return list?.[current + 1] || null;
}

export function pastureContains(x, y) {
  return x >= PASTURE.x && x < PASTURE.x + PASTURE.w && y >= PASTURE.y && y < PASTURE.y + PASTURE.h;
}
