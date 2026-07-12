import { ITEMS, NPC_DEFS, clamp } from "./game-shared.js";
import "./ranch-data.js";
import { INTERIOR_MAPS } from "./living-world-data.js";

const registerItem = (id, value) => { ITEMS[id] ||= value; };

registerItem("turnipBroth", { name: "Hearth Turnip Broth", icon: "🥣", value: 110 });
registerItem("sunberryCompote", { name: "Sunberry Compote", icon: "🍓", value: 145 });
registerItem("herbOmelet", { name: "Silverleaf Omelet", icon: "🍳", value: 175 });
registerItem("glowcapSkillet", { name: "Glowcap Skillet", icon: "🍄", value: 220 });
registerItem("riverStew", { name: "Hearth & Kettle River Stew", icon: "🍲", value: 285 });
registerItem("appleCustard", { name: "Orchard Apple Custard", icon: "🍮", value: 310 });
registerItem("moonbeanCurry", { name: "Moonbean Curry", icon: "🍛", value: 390 });
registerItem("cheeseTurnipBake", { name: "Golden Turnip Bake", icon: "🧀", value: 455 });
registerItem("fisherPie", { name: "Moonlake Fisher Pie", icon: "🥧", value: 545 });
registerItem("frostmintTea", { name: "Frostmint Cream Tea", icon: "🫖", value: 480 });
registerItem("swampChowder", { name: "Murkfen Bloom Chowder", icon: "🥘", value: 640 });
registerItem("starParfait", { name: "Starwatch Parfait", icon: "🍨", value: 710 });
registerItem("truffleRisotto", { name: "Grand Market Truffle Risotto", icon: "🍚", value: 980 });
registerItem("emberHotpot", { name: "Cinderwake Ember Hotpot", icon: "🔥", value: 1040 });
registerItem("depthsPlatter", { name: "Grand Depths Victory Platter", icon: "🍱", value: 1320 });
registerItem("hearthvaleFeast", { name: "Hearthvale Continental Feast", icon: "🍽️", value: 2200 });

export const COOKING_QUALITY_ORDER = ["normal", "silver", "gold", "iridium"];
export const COOKING_QUALITY = {
  normal: { name: "Homestyle", icon: "●", multiplier: 1, potency: 1 },
  silver: { name: "Refined", icon: "🥈", multiplier: 1.2, potency: 1.15 },
  gold: { name: "Gourmet", icon: "🥇", multiplier: 1.5, potency: 1.35 },
  iridium: { name: "Masterwork", icon: "💠", multiplier: 2, potency: 1.6 },
};

export const MEAL_BUFFS = {
  comfort: { name: "Farmhand's Comfort", icon: "🌾", description: "Reduces energy spent by tools and attacks.", energyEfficiency: .18 },
  swift: { name: "Quickstep", icon: "💨", description: "Improves movement speed.", moveSpeed: .1 },
  warded: { name: "Warded Stomach", icon: "🛡️", description: "Improves armor and resistance to harmful effects.", armor: 2, statusResist: .1 },
  focus: { name: "Clear Focus", icon: "🎯", description: "Improves critical chance and attack speed.", crit: .06, attackSpeed: .08 },
  hunter: { name: "Hunter's Supper", icon: "⚔️", description: "Improves damage and rare equipment finds.", damage: 2, lootBonus: .06 },
  fortune: { name: "Fortune's Flavor", icon: "🍀", description: "Improves rare equipment and loot finds.", lootBonus: .13, crit: .025 },
  vitality: { name: "Hearth Vitality", icon: "❤️", description: "Improves maximum health and status resistance.", maxHealth: 15, statusResist: .08 },
  explorer: { name: "Continental Explorer", icon: "🧭", description: "Improves speed, resistance, and energy efficiency.", moveSpeed: .06, statusResist: .08, energyEfficiency: .1 },
  master: { name: "Hearthvale Banquet", icon: "👑", description: "A balanced feast improving combat, travel, luck, and endurance.", damage: 2, armor: 2, crit: .04, moveSpeed: .06, lootBonus: .08, statusResist: .1, energyEfficiency: .1, maxHealth: 10 },
};

const recipe = (id, ingredients, options) => ({ id, item: id, ingredients, ...options });

export const COOKING_RECIPES = [
  recipe("turnipBroth", { turnip: 2, herb: 1 }, { level: 1, unlock: { type: "starter" }, energy: 45, health: 10, duration: 240, buff: "comfort", xp: 16, description: "A simple farmhouse broth that makes a long workday easier." }),
  recipe("sunberryCompote", { berry: 2, apple: 1 }, { level: 1, unlock: { type: "starter" }, energy: 38, health: 8, duration: 240, buff: "fortune", xp: 17, description: "Bright fruit slowly cooked into a lucky travel sweet." }),
  recipe("herbOmelet", { egg: 2, herb: 1 }, { level: 1, unlock: { type: "starter" }, energy: 55, health: 16, duration: 260, buff: "swift", xp: 19, description: "Fresh eggs and Silverleaf folded into a light morning meal." }),
  recipe("glowcapSkillet", { mushroom: 2, egg: 1 }, { level: 2, unlock: { type: "level", level: 2 }, energy: 62, health: 20, duration: 300, buff: "warded", xp: 23, description: "A savory skillet whose gentle glow settles the stomach." }),
  recipe("riverStew", { fish: 1, turnip: 2, herb: 1 }, { level: 2, unlock: { type: "heart", npcId: "rowan", threshold: 3 }, energy: 78, health: 28, duration: 360, buff: "vitality", xp: 28, description: "Rowan's filling inn stew, built around the day's river catch." }),
  recipe("appleCustard", { apple: 2, milk: 1, egg: 1 }, { level: 3, unlock: { type: "heart", npcId: "lumi", threshold: 3 }, energy: 74, health: 24, duration: 360, buff: "comfort", xp: 30, description: "A warm custard Lumi describes as the color of returning home." }),
  recipe("moonbeanCurry", { moonbean: 2, milk: 1, herb: 1 }, { level: 4, unlock: { type: "level", level: 4 }, energy: 88, health: 30, duration: 420, buff: "focus", xp: 35, description: "Moonbeans and herbs simmered until every flavor becomes clear." }),
  recipe("cheeseTurnipBake", { turnip: 2, cheese: 1 }, { level: 4, unlock: { type: "heart", npcId: "mira", threshold: 6 }, energy: 98, health: 36, duration: 420, buff: "vitality", xp: 38, description: "Mira's harvest bake with a crisp cheese crust." }),
  recipe("fisherPie", { rareFish: 1, egg: 1, milk: 1 }, { level: 5, unlock: { type: "heart", npcId: "tavi", threshold: 6 }, energy: 108, health: 42, duration: 480, buff: "hunter", xp: 44, description: "Tavi's impossible fish story turned into a very real pie." }),
  recipe("frostmintTea", { snowHerb: 1, milk: 1, herb: 1 }, { level: 5, unlock: { type: "heart", npcId: "pella", threshold: 6 }, energy: 72, health: 48, duration: 480, buff: "warded", xp: 43, description: "A cooling cream tea formulated to steady an adventurer." }),
  recipe("swampChowder", { fish: 1, swampBloom: 1, mushroom: 1, milk: 1 }, { level: 6, unlock: { type: "heart", npcId: "niva", threshold: 6 }, energy: 112, health: 48, duration: 520, buff: "explorer", xp: 50, description: "An unexpectedly elegant chowder with misty floral notes." }),
  recipe("starParfait", { berry: 2, goatMilk: 1, moonbean: 1 }, { level: 7, unlock: { type: "heart", npcId: "sora", threshold: 6 }, energy: 96, health: 32, duration: 540, buff: "fortune", xp: 56, description: "Layers of fruit and moonbean cream arranged like a winter sky." }),
  recipe("truffleRisotto", { truffle: 1, cheese: 1, moonbean: 1 }, { level: 8, unlock: { type: "heart", npcId: "cass", threshold: 9 }, energy: 128, health: 48, duration: 600, buff: "swift", xp: 68, description: "A Grand Market luxury prepared slowly and served quickly." }),
  recipe("emberHotpot", { fish: 1, turnip: 1, ash: 1, snowHerb: 1 }, { level: 8, unlock: { type: "heart", npcId: "bram", threshold: 9 }, energy: 122, health: 58, duration: 600, buff: "hunter", xp: 72, description: "Bram's forge-side hotpot balances living heat with Frostmint." }),
  recipe("depthsPlatter", { rareFish: 1, goatCheese: 1, mushroom: 1 }, { level: 9, unlock: { type: "heart", npcId: "aria", threshold: 9 }, energy: 142, health: 68, duration: 660, buff: "master", xp: 84, description: "A Guild victory meal reserved for expeditions that return." }),
  recipe("hearthvaleFeast", { truffleOil: 1, goatCheese: 1, duckEgg: 1, berry: 2, moonbean: 2 }, { level: 10, unlock: { type: "level", level: 10 }, energy: 180, health: 90, duration: 720, buff: "master", xp: 110, description: "A continental banquet combining the Farmstead, wilds, city, and coast." }),
];

export const COOKING_RECIPE_MAP = Object.fromEntries(COOKING_RECIPES.map((entry) => [entry.id, entry]));
export const COOKING_STARTER_RECIPES = COOKING_RECIPES.filter((entry) => entry.unlock.type === "starter").map((entry) => entry.id);

export function cookingXpForLevel(level) {
  const safe = clamp(Math.floor(Number(level) || 1), 1, 10);
  return safe <= 1 ? 0 : 65 * (safe - 1) * (safe - 1);
}

export function cookingLevelFromXp(xp) {
  const safe = Math.max(0, Number(xp) || 0);
  let level = 1;
  while (level < 10 && safe >= cookingXpForLevel(level + 1)) level += 1;
  return level;
}

export function calculateMealQuality(averageIngredientQuality = 0, cookingLevel = 1, roll = Math.random()) {
  const score = clamp(Number(averageIngredientQuality) || 0, 0, 3) * .62
    + Math.max(0, clamp(Number(cookingLevel) || 1, 1, 10) - 1) * .075
    + clamp(Number(roll) || 0, 0, .999999) * .7;
  if (score >= 2.42) return "iridium";
  if (score >= 1.48) return "gold";
  if (score >= .68) return "silver";
  return "normal";
}

export function mealBuffStats(buffId, quality = "normal") {
  const buff = MEAL_BUFFS[buffId] || MEAL_BUFFS.comfort;
  const potency = COOKING_QUALITY[quality]?.potency || 1;
  const numeric = {};
  for (const key of ["damage", "armor", "crit", "attackSpeed", "moveSpeed", "lootBonus", "statusResist", "energyEfficiency", "maxHealth"]) {
    if (buff[key]) numeric[key] = buff[key] * potency;
  }
  return { ...buff, ...numeric };
}

export function recipeSourceLabel(entry) {
  if (!entry) return "Unknown recipe";
  if (entry.unlock.type === "starter") return "Starter farmhouse recipe";
  if (entry.unlock.type === "level") return `Cooking Level ${entry.unlock.level}`;
  const npc = NPC_DEFS.find((candidate) => candidate.id === entry.unlock.npcId);
  return `${npc?.name || entry.unlock.npcId}'s ${entry.unlock.threshold}-heart recipe`;
}

export function registerFarmhouseKitchen() {
  const map = INTERIOR_MAPS.farmhouse;
  if (!map) return null;
  if (!map.objects.some((object) => object.id === "farmhouse-stove")) map.objects.push({ id: "farmhouse-stove", type: "stove", x: 14, y: 8, w: 2, h: 3, solid: true });
  if (!map.objects.some((object) => object.id === "farmhouse-cookbook-shelf")) map.objects.push({ id: "farmhouse-cookbook-shelf", type: "bookshelf", x: 13, y: 2, w: 2, h: 2, solid: true });
  if (!map.interactions.some((entry) => entry.id === "kitchenStove")) map.interactions.push({ id: "kitchenStove", x: 13.5, y: 11.5, label: "Cook at Stove" });
  if (!map.interactions.some((entry) => entry.id === "cookbook")) map.interactions.push({ id: "cookbook", x: 13.5, y: 4.5, label: "Read Cookbook" });
  map.lights ||= [];
  if (!map.lights.some((light) => light.id === "kitchen-fire")) map.lights.push({ id: "kitchen-fire", x: 15.5, y: 9.5, radius: 3.5, color: "#ffb05b" });
  map.ambience ||= "kitchen";
  return map;
}

export function validateCookingData() {
  registerFarmhouseKitchen();
  const ids = new Set();
  for (const entry of COOKING_RECIPES) {
    if (ids.has(entry.id) || !ITEMS[entry.item] || !MEAL_BUFFS[entry.buff]) return false;
    ids.add(entry.id);
    if (!Object.keys(entry.ingredients).length || Object.entries(entry.ingredients).some(([id, amount]) => !ITEMS[id] || amount < 1)) return false;
    if (entry.level < 1 || entry.level > 10 || entry.energy < 0 || entry.health < 0 || entry.duration <= 0) return false;
    if (entry.unlock.type === "heart" && (!NPC_DEFS.some((npc) => npc.id === entry.unlock.npcId) || ![3, 6, 9].includes(entry.unlock.threshold))) return false;
  }
  return ids.size === 16 && INTERIOR_MAPS.farmhouse.interactions.some((entry) => entry.id === "kitchenStove") && INTERIOR_MAPS.farmhouse.interactions.some((entry) => entry.id === "cookbook");
}

registerFarmhouseKitchen();
