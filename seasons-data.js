import { ITEMS, CROPS, clamp } from "./game-shared.js";
import { EQUIPMENT_DEFS } from "./game-combat.js";

export const DAYS_PER_SEASON = 28;
export const SEASONS_PER_YEAR = 4;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS_PER_YEAR;

ITEMS.festivalToken ||= { name: "Festival Token", icon: "🎟️", value: 25 };
ITEMS.blossomPetal ||= { name: "Blossom Petal", icon: "🌸", value: 55 };
ITEMS.sunShell ||= { name: "Sun Shell", icon: "🐚", value: 65 };
ITEMS.harvestRibbon ||= { name: "Harvest Ribbon", icon: "🎗️", value: 80 };
ITEMS.starShard ||= { name: "Star Shard", icon: "🌟", value: 105 };

EQUIPMENT_DEFS.bloomCharm ||= {
  name: "Bloomfair Charm", icon: "🌸", slot: "charm", rarity: "rare",
  maxHealth: 5, lootBonus: .04, statusResist: .04, value: 900,
};
EQUIPMENT_DEFS.tidecallRing ||= {
  name: "Tidecall Ring", icon: "🌊", slot: "ring", rarity: "rare",
  crit: .025, moveSpeed: .025, lootBonus: .025, value: 1050,
};
EQUIPMENT_DEFS.harvestBoots ||= {
  name: "Harveststep Boots", icon: "🍂", slot: "boots", rarity: "epic",
  moveSpeed: .06, armor: 1, statusResist: .04, value: 1350,
};
EQUIPMENT_DEFS.starCrown ||= {
  name: "Starfall Crown", icon: "👑", slot: "helmet", rarity: "epic",
  maxHealth: 10, armor: 2, statusResist: .08, value: 1800,
};

export const SEASONS = [
  {
    id: "spring", name: "Springbloom", icon: "🌱", color: "#8fcf79",
    tint: "rgba(144, 211, 128, .055)", particle: "petal",
    crops: ["turnip", "berry"],
    line: "Springbloom has returned; every road smells of wet earth and flowers.",
    weather: { Clear: 38, Cloudy: 24, Rain: 30, Sparkfall: 8 },
  },
  {
    id: "summer", name: "Suncrest", icon: "☀️", color: "#efc45f",
    tint: "rgba(255, 197, 86, .06)", particle: "mote",
    crops: ["berry"],
    line: "Suncrest keeps the roads bright late into the evening.",
    weather: { Clear: 57, Cloudy: 18, Rain: 14, Sparkfall: 11 },
  },
  {
    id: "autumn", name: "Emberfall", icon: "🍂", color: "#d78348",
    tint: "rgba(194, 104, 52, .065)", particle: "leaf",
    crops: ["turnip", "moonbean"],
    line: "Emberfall paints the continent copper before the cold arrives.",
    weather: { Clear: 30, Cloudy: 34, Rain: 25, Sparkfall: 11 },
  },
  {
    id: "winter", name: "Frostwane", icon: "❄️", color: "#b9d9e8",
    tint: "rgba(188, 222, 238, .07)", particle: "snow",
    crops: ["moonbean"],
    line: "Frostwane has quieted the fields, but the Waystones still glow warmly.",
    weather: { Clear: 15, Cloudy: 28, Snow: 50, Sparkfall: 7 },
  },
];

export const FESTIVALS = [
  {
    id: "bloomfair", season: "spring", day: 7,
    name: "Hearthvale Bloomfair", icon: "🌸", minigame: "seedSort",
    location: { x: 78.5, y: 21.5, label: "Village Green" },
    description: "Sort enchanted seeds while the village celebrates the first strong growth of the year.",
    skill: "farming", rewardItem: "blossomPetal", gear: "bloomCharm",
  },
  {
    id: "regatta", season: "summer", day: 14,
    name: "Moonlake Regatta", icon: "⛵", minigame: "riverDash",
    location: { x: 81.5, y: 84.5, label: "Moonlake Dock" },
    description: "Power a tiny festival skiff across Moonlake before its enchanted current fades.",
    skill: "fishing", rewardItem: "sunShell", gear: "tidecallRing",
  },
  {
    id: "harvestCrown", season: "autumn", day: 21,
    name: "Silvercrest Harvest Crown", icon: "🌾", minigame: "produceJudge",
    location: { x: 150.5, y: 24.5, label: "Silvercrest Plaza" },
    description: "Present your finest produce to the city judges and compete for the Harvest Crown.",
    skill: "farming", rewardItem: "harvestRibbon", gear: "harvestBoots",
  },
  {
    id: "starfallVigil", season: "winter", day: 28,
    name: "Starfall Vigil", icon: "🌠", minigame: "lanternMemory",
    location: { x: 150.5, y: 24.5, label: "Silvercrest Plaza" },
    description: "Repeat the ancient lantern pattern as the final night of the year fills with falling stars.",
    skill: "foraging", rewardItem: "starShard", gear: "starCrown",
  },
];

export function calendarForDay(day = 1) {
  const safeDay = Math.max(1, Math.floor(Number(day) || 1));
  const zero = safeDay - 1;
  const year = Math.floor(zero / DAYS_PER_YEAR) + 1;
  const dayOfYear = zero % DAYS_PER_YEAR;
  const seasonIndex = Math.floor(dayOfYear / DAYS_PER_SEASON);
  const seasonDay = dayOfYear % DAYS_PER_SEASON + 1;
  const season = SEASONS[seasonIndex];
  return { absoluteDay: safeDay, year, dayOfYear: dayOfYear + 1, seasonIndex, seasonDay, season };
}

export function festivalForDay(day) {
  const calendar = calendarForDay(day);
  return FESTIVALS.find((festival) => festival.season === calendar.season.id && festival.day === calendar.seasonDay) || null;
}

export function festivalKey(day, festival = festivalForDay(day)) {
  if (!festival) return null;
  const calendar = calendarForDay(day);
  return `y${calendar.year}:${festival.id}`;
}

function dayHash(day, salt = 0) {
  let value = (Math.max(1, Math.floor(day)) * 1103515245 + 12345 + salt * 2654435761) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 2246822519) >>> 0;
  value ^= value >>> 13;
  return (value >>> 0) / 4294967296;
}

export function seasonalWeather(day, salt = 0) {
  const season = calendarForDay(day).season;
  const roll = dayHash(day, salt) * Object.values(season.weather).reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  for (const [weather, weight] of Object.entries(season.weather)) {
    cursor += weight;
    if (roll < cursor) return weather;
  }
  return "Clear";
}

export function cropSeasonAffinity(cropType, seasonId) {
  const season = SEASONS.find((entry) => entry.id === seasonId) || SEASONS[0];
  return season.crops.includes(cropType);
}

export function seasonalGrowthMultiplier(cropType, seasonId) {
  return cropSeasonAffinity(cropType, seasonId) ? 1.25 : .75;
}

export function createSeasonState(existing = {}, day = 1) {
  const calendar = calendarForDay(day);
  const value = existing && typeof existing === "object" ? existing : {};
  return {
    version: 1,
    ...value,
    year: calendar.year,
    seasonId: calendar.season.id,
    seasonDay: calendar.seasonDay,
    announcedSeasonKey: value.announcedSeasonKey || null,
    announcedFestivalKey: value.announcedFestivalKey || null,
    completedFestivals: Array.isArray(value.completedFestivals) ? [...new Set(value.completedFestivals)] : [],
    festivalScores: value.festivalScores && typeof value.festivalScores === "object" ? { ...value.festivalScores } : {},
    yearlySets: value.yearlySets && typeof value.yearlySets === "object" ? { ...value.yearlySets } : {},
    activeMinigame: null,
  };
}

export function festivalRewardTier(score) {
  const safe = clamp(Number(score) || 0, 0, 100);
  if (safe >= 80) return { id: "gold", name: "Gold", tokens: 10, xp: 80, quantity: 3 };
  if (safe >= 55) return { id: "silver", name: "Silver", tokens: 6, xp: 45, quantity: 2 };
  return { id: "bronze", name: "Bronze", tokens: 3, xp: 24, quantity: 1 };
}

export const CROP_SEASON_TABLE = Object.fromEntries(
  Object.keys(CROPS).map((crop) => [crop, SEASONS.filter((season) => season.crops.includes(crop)).map((season) => season.id)]),
);
