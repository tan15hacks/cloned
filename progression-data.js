export const SKILL_IDS = ["farming", "mining", "combat", "fishing", "foraging"];

export const SKILL_DEFS = {
  farming: { name: "Farming", icon: "🌾", description: "Improves crop quality and farm profits." },
  mining: { name: "Mining", icon: "⛏️", description: "Improves ore yields and cave efficiency." },
  combat: { name: "Combat", icon: "⚔️", description: "Improves damage, critical chance, and survival." },
  fishing: { name: "Fishing", icon: "🎣", description: "Improves fish quality and rare catches." },
  foraging: { name: "Foraging", icon: "🌿", description: "Improves gathered yields and regional finds." },
};

export const QUALITY_TIERS = [
  { id: "normal", name: "Normal", icon: "●", multiplier: 1 },
  { id: "silver", name: "Silver", icon: "🥈", multiplier: 1.25 },
  { id: "gold", name: "Gold", icon: "🥇", multiplier: 1.6 },
  { id: "iridium", name: "Iridium", icon: "💠", multiplier: 2.2 },
];

export const CAVE_MILESTONES = {
  10: { name: "Mycelial Behemoth", type: "fungalBrute", hp: 90, damage: 20, xp: 120, coins: 220, gear: ["guildSabre", "ironMail"], unlock: "Iron Tier" },
  20: { name: "Prismatic Colossus", type: "gemGolem", hp: 145, damage: 27, xp: 220, coins: 420, gear: ["hunterHelm", "luckyRing"], unlock: "Silver Tier" },
  30: { name: "Frostbound Champion", type: "glacialKnight", hp: 210, damage: 34, xp: 340, coins: 680, gear: ["frostTreads", "frostPlate"], unlock: "Gold Tier" },
  40: { name: "Caldera Tyrant", type: "infernoGolem", hp: 300, damage: 42, xp: 500, coins: 1050, gear: ["emberCharm", "emberEdge"], unlock: "Obsidian Tier" },
  50: { name: "Warden of the Deep", type: "depthWarden", hp: 360, damage: 48, xp: 800, coins: 1600, gear: ["depthRing", "voidbrand"], unlock: "Heart Tier" },
};

export const UPGRADE_REQUIREMENTS = {
  toolPower: {
    2: { coins: 350, items: { copper: 8, wood: 12 } },
    3: { coins: 800, items: { iron: 8, wood: 20 } },
    4: { coins: 1600, items: { silver: 8, crystal: 2 } },
    5: { coins: 3000, items: { gold: 8, obsidian: 4 } },
  },
  weaponPower: {
    2: { coins: 400, items: { copper: 6, fang: 3 } },
    3: { coins: 950, items: { iron: 8, hide: 4 } },
    4: { coins: 1900, items: { silver: 8, crystal: 2 } },
    5: { coins: 3500, items: { gold: 8, frostcore: 2 } },
    6: { coins: 6000, items: { obsidian: 8, embercore: 3, voidshard: 1 } },
  },
  armor: {
    1: { coins: 450, items: { copper: 8, hide: 3 } },
    2: { coins: 1000, items: { iron: 10, hide: 5 } },
    3: { coins: 2100, items: { silver: 10, frostcore: 2 } },
    4: { coins: 3900, items: { gold: 10, embercore: 2 } },
    5: { coins: 6500, items: { obsidian: 10, voidshard: 2 } },
  },
};

export const SHOP_STOCK = {
  seedshop: [
    { id: "turnipSeed", amount: 5, price: 55, farming: 1, daily: 5 },
    { id: "berrySeed", amount: 5, price: 150, farming: 2, daily: 3 },
    { id: "moonSeed", amount: 3, price: 300, farming: 4, daily: 2 },
    { id: "snack", amount: 1, price: 40, farming: 1, daily: 5 },
  ],
  market: [
    { id: "turnipSeed", amount: 10, price: 100, farming: 1, daily: 4 },
    { id: "berrySeed", amount: 10, price: 275, farming: 2, daily: 3 },
    { id: "moonSeed", amount: 6, price: 560, farming: 4, daily: 2 },
    { id: "apple", amount: 3, price: 110, farming: 1, daily: 3 },
  ],
};

export const ADVENTURE_PERKS = [
  { level: 2, name: "Prepared Traveler", text: "+10 maximum energy." },
  { level: 4, name: "Roadwise", text: "+5% movement speed." },
  { level: 6, name: "Merchant Rapport", text: "+5% sale prices." },
  { level: 8, name: "Deep Pockets", text: "+8 backpack capacity." },
  { level: 10, name: "Veteran Instinct", text: "+3% critical chance and better gear pity." },
  { level: 15, name: "Continental Hero", text: "+15 maximum health and +5% status resistance." },
  { level: 20, name: "Hearthvale Legend", text: "+8% all earned skill XP." },
];

export function xpForLevel(level) {
  const safe = Math.max(1, Math.floor(level));
  return Math.floor(80 * safe * safe + 20 * safe);
}

export function levelFromXp(xp, max = 20) {
  let level = 1;
  while (level < max && xp >= xpForLevel(level)) level += 1;
  return level;
}

export function caveBand(floor) {
  if (floor >= 50) return "heart";
  if (floor >= 40) return "obsidian";
  if (floor >= 30) return "gold";
  if (floor >= 20) return "silver";
  if (floor >= 10) return "iron";
  return "copper";
}

export function createProgressionState(existing = {}) {
  const skillXp = Object.fromEntries(SKILL_IDS.map((id) => [id, Math.max(0, Number(existing?.skillXp?.[id]) || 0)]));
  const skillLevels = Object.fromEntries(SKILL_IDS.map((id) => [id, levelFromXp(skillXp[id], 10)]));
  return {
    version: 1,
    adventureXp: Math.max(0, Number(existing.adventureXp) || 0),
    adventureLevel: levelFromXp(Math.max(0, Number(existing.adventureXp) || 0), 20),
    skillXp,
    skillLevels,
    qualityInventory: existing.qualityInventory && typeof existing.qualityInventory === "object" ? existing.qualityInventory : {},
    bossRewards: Array.isArray(existing.bossRewards) ? existing.bossRewards : [],
    unlockedCaveTiers: Array.isArray(existing.unlockedCaveTiers) ? existing.unlockedCaveTiers : ["copper"],
    dailyStock: existing.dailyStock && typeof existing.dailyStock === "object" ? existing.dailyStock : {},
    stockDay: Number(existing.stockDay) || 0,
    enhancements: existing.enhancements && typeof existing.enhancements === "object" ? existing.enhancements : {},
    lastSale: existing.lastSale || null,
    pityKills: Math.max(0, Number(existing.pityKills) || 0),
  };
}

export function qualityRoll(skillLevel, harmony = 0, beaconLevel = 0, weather = "Clear", roll = Math.random()) {
  const skill = Math.max(1, Number(skillLevel) || 1);
  const bonus = (skill - 1) * 0.018 + Math.min(4, harmony) * 0.025 + beaconLevel * 0.018 + (weather === "Sparkfall" ? 0.05 : 0);
  const iridium = Math.min(0.02 + bonus * 0.18, 0.16);
  const gold = Math.min(0.08 + bonus * 0.55, 0.38);
  const silver = Math.min(0.24 + bonus, 0.62);
  if (roll < iridium) return "iridium";
  if (roll < iridium + gold) return "gold";
  if (roll < iridium + gold + silver) return "silver";
  return "normal";
}

export function qualityMultiplier(id) {
  return QUALITY_TIERS.find((tier) => tier.id === id)?.multiplier || 1;
}

export function enhancementCost(level) {
  const next = Math.max(1, level + 1);
  return { coins: 350 * next * next, crystal: next, ore: next <= 1 ? "copper" : next === 2 ? "silver" : "obsidian", amount: 3 * next };
}
