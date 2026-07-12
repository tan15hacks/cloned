import { ITEMS, clamp } from "./game-shared.js";
import { calendarForDay } from "./seasons-data.js";

const registerItem = (id, value) => { ITEMS[id] ||= value; };

registerItem("wormBait", { name: "Worm Bait", icon: "🪱", value: 18 });
registerItem("glowBait", { name: "Glow Bait", icon: "✨", value: 46 });
registerItem("spinnerTackle", { name: "Silver Spinner", icon: "🌀", value: 420 });
registerItem("luckyTackle", { name: "Treasure Bobber", icon: "🧿", value: 680 });
registerItem("anglerToken", { name: "Angler's Token", icon: "🎣", value: 350 });

export const FISH_QUALITY_ORDER = ["normal", "silver", "gold", "iridium"];
export const FISH_QUALITY = {
  normal: { name: "Normal", icon: "●", multiplier: 1 },
  silver: { name: "Silver", icon: "◆", multiplier: 1.25 },
  gold: { name: "Gold", icon: "★", multiplier: 1.6 },
  iridium: { name: "Iridium", icon: "✦", multiplier: 2.2 },
};

export const BAIT_DEFS = {
  none: { id: "none", name: "No Bait", icon: "➖", item: null, rarityBonus: 0, legendaryBonus: 0, description: "A patient cast using only the rod." },
  worm: { id: "worm", name: "Worm Bait", icon: "🪱", item: "wormBait", rarityBonus: .18, legendaryBonus: .01, description: "Improves uncommon and rare bite rates." },
  glow: { id: "glow", name: "Glow Bait", icon: "✨", item: "glowBait", rarityBonus: .08, legendaryBonus: .08, description: "Strongly attracts nocturnal and legendary fish." },
};

export const TACKLE_DEFS = {
  none: { id: "none", name: "No Tackle", icon: "➖", uses: 0, description: "The basic Hearthvale fishing rig." },
  spinner: { id: "spinner", name: "Silver Spinner", icon: "🌀", item: "spinnerTackle", uses: 14, zoneBonus: 7, speedReduction: .08, description: "Widens the reel zone and slightly calms fish movement." },
  lucky: { id: "lucky", name: "Treasure Bobber", icon: "🧿", item: "luckyTackle", uses: 10, treasureBonus: .14, qualityBonus: .22, description: "Improves treasure and high-quality catch chances." },
};

const fish = (id, name, regions, options = {}) => ({
  id, name, regions, icon: "🐟", seasons: ["spring", "summer", "autumn", "winter"],
  start: 360, end: 1440, weather: null, minLevel: 1, rarity: "common", weight: 18,
  difficulty: 1, minSize: 12, maxSize: 34, category: "fish", legendary: false,
  description: "A familiar fish found across Hearthvale.", ...options,
});

export const FISH_SPECIES = [
  fish("brookMinnow", "Brook Minnow", ["farm", "village"], { icon: "🐟", weight: 30, minSize: 8, maxSize: 18, description: "A tiny silver fish that gathers near calm farm channels." }),
  fish("hearthCarp", "Hearth Carp", ["farm", "village", "city"], { icon: "🐠", seasons: ["spring", "autumn"], weight: 18, difficulty: 1.2, minSize: 24, maxSize: 68, description: "A hardy carp associated with old settlement ponds." }),
  fish("canalBream", "Silvercrest Canal Bream", ["city"], { icon: "🐟", seasons: ["summer", "autumn", "winter"], start: 480, end: 1260, weight: 21, difficulty: 1.3, minSize: 20, maxSize: 48, description: "A polished-scaled bream thriving beneath Silvercrest bridges." }),
  fish("highlandSalmon", "Northwatch Salmon", ["northwatch"], { icon: "🐟", seasons: ["spring", "autumn"], weather: ["Rain", "Cloudy"], weight: 15, difficulty: 1.7, minSize: 42, maxSize: 92, description: "A powerful salmon climbing the cold Northwatch streams." }),
  fish("cloverPerch", "Clover Perch", ["greenfields"], { icon: "🐟", seasons: ["spring", "summer"], start: 360, end: 1080, weight: 26, difficulty: 1.1, minSize: 16, maxSize: 38, description: "A green-finned perch hidden beneath flowering river grass." }),
  fish("moonfin", "Moonfin", ["moonlake"], { icon: "🐠", seasons: ["spring", "summer", "winter"], start: 900, end: 1440, rarity: "uncommon", weight: 17, difficulty: 1.8, minSize: 28, maxSize: 60, description: "Its pale fins shine after sunset on Moonlake." }),
  fish("glimmerfin", "Glimmerfin", ["moonlake", "veilmoor"], { icon: "🐠", seasons: ["summer", "winter"], weather: ["Sparkfall"], start: 960, end: 1440, minLevel: 3, rarity: "rare", weight: 8, difficulty: 2.2, minSize: 34, maxSize: 72, category: "rareFish", description: "A luminous fish drawn to Sparkfall reflections." }),
  fish("starKoi", "Star-Crowned Koi", ["moonlake"], { icon: "🌟", seasons: ["winter"], weather: ["Sparkfall"], start: 1140, end: 1440, minLevel: 8, rarity: "legendary", weight: 1.2, difficulty: 3.6, minSize: 88, maxSize: 128, category: "rareFish", legendary: true, description: "Moonlake's oldest legend, crowned by starlight." }),
  fish("mistEel", "Veilmoor Mist Eel", ["veilmoor"], { icon: "🐍", seasons: ["spring", "autumn"], weather: ["Rain", "Cloudy"], start: 720, end: 1440, rarity: "uncommon", weight: 15, difficulty: 2, minSize: 45, maxSize: 105, category: "rareFish", description: "An eel that vanishes when the fog thins." }),
  fish("icePike", "Frostpeak Ice Pike", ["frostpeak"], { icon: "🐟", seasons: ["winter"], weather: ["Snow", "Cloudy", "Clear"], weight: 19, difficulty: 2.1, minSize: 38, maxSize: 88, category: "rareFish", description: "A sharp-jawed pike living beneath thin mountain ice." }),
  fish("auroraChar", "Aurora Char", ["frostpeak"], { icon: "🌌", seasons: ["winter"], weather: ["Sparkfall"], start: 1080, end: 1440, minLevel: 8, rarity: "legendary", weight: 1.1, difficulty: 3.7, minSize: 76, maxSize: 118, category: "rareFish", legendary: true, description: "Its scales carry the colors of Frostwane's aurora." }),
  fish("shadowTrout", "Lightless Shadow Trout", ["darkforest"], { icon: "🐟", seasons: ["autumn", "winter"], start: 1020, end: 1440, rarity: "rare", weight: 9, difficulty: 2.5, minSize: 32, maxSize: 74, category: "rareFish", description: "A silent trout whose outline seems detached from its body." }),
  fish("mireCatfish", "Murkfen Catfish", ["swamp"], { icon: "🐟", seasons: ["summer", "autumn"], weather: ["Rain", "Cloudy"], weight: 20, difficulty: 1.8, minSize: 44, maxSize: 110, description: "A broad catfish that burrows beneath warm mud." }),
  fish("bloomscale", "Bloomscale", ["swamp"], { icon: "🪷", seasons: ["spring", "summer"], start: 420, end: 960, rarity: "uncommon", weight: 12, difficulty: 2.1, minSize: 22, maxSize: 54, category: "rareFish", description: "Petal-like scales camouflage it among Swamp Blooms." }),
  fish("voidLamprey", "Dreadwild Void Lamprey", ["dreadwild"], { icon: "🕳️", seasons: ["autumn", "winter"], start: 1080, end: 1440, weather: ["Cloudy", "Sparkfall"], minLevel: 6, rarity: "rare", weight: 6, difficulty: 3, minSize: 58, maxSize: 126, category: "rareFish", description: "A dangerous lamprey that follows unstable Waystone currents." }),
  fish("emberEel", "Cinderwake Ember Eel", ["volcano"], { icon: "🔥", seasons: ["summer", "autumn"], start: 960, end: 1440, minLevel: 5, rarity: "rare", weight: 7, difficulty: 2.8, minSize: 52, maxSize: 112, category: "rareFish", description: "Its body remains warm even after leaving volcanic water." }),
  fish("cinderKoi", "Cinderheart Koi", ["volcano"], { icon: "🌋", seasons: ["summer"], weather: ["Sparkfall"], start: 1140, end: 1440, minLevel: 9, rarity: "legendary", weight: 1, difficulty: 3.9, minSize: 92, maxSize: 136, category: "rareFish", legendary: true, description: "A living ember said to remember the first eruption." }),
  fish("sunscale", "Suncoast Sunscale", ["suncoast"], { icon: "🐠", seasons: ["spring", "summer"], start: 420, end: 1080, weight: 24, difficulty: 1.3, minSize: 18, maxSize: 46, description: "A bright reef fish common along warm Suncoast shallows." }),
  fish("tideRunner", "Tide Runner", ["suncoast", "ruins"], { icon: "🐟", seasons: ["summer", "autumn"], start: 720, end: 1320, rarity: "uncommon", weight: 15, difficulty: 2, minSize: 40, maxSize: 96, category: "rareFish", description: "A fast ocean fish that follows the strongest incoming tide." }),
  fish("goldenMarlin", "Golden Dawn Marlin", ["suncoast"], { icon: "☀️", seasons: ["summer"], weather: ["Clear"], start: 360, end: 540, minLevel: 9, rarity: "legendary", weight: 1, difficulty: 4, minSize: 180, maxSize: 260, category: "rareFish", legendary: true, description: "The Suncoast's legendary marlin appears only at clear summer dawn." }),
  fish("relicGar", "Suncleft Relic Gar", ["ruins"], { icon: "🏺", seasons: ["spring", "autumn"], weather: ["Cloudy", "Sparkfall"], minLevel: 5, rarity: "rare", weight: 8, difficulty: 2.7, minSize: 64, maxSize: 132, category: "rareFish", description: "A plated gar nesting among submerged Suncleft masonry." }),
];

export const FISH_SPECIES_MAP = Object.fromEntries(FISH_SPECIES.map((entry) => [entry.id, entry]));
export const LEGENDARY_FISH = FISH_SPECIES.filter((entry) => entry.legendary);

export const FISHING_SHOP_STOCK = [
  { id: "wormBait", label: "Worm Bait ×5", amount: 5, price: 90, daily: 4, minLevel: 1 },
  { id: "glowBait", label: "Glow Bait ×3", amount: 3, price: 180, daily: 3, minLevel: 3 },
  { id: "spinner", label: "Silver Spinner — 14 uses", amount: 14, price: 520, daily: 1, minLevel: 4 },
  { id: "lucky", label: "Treasure Bobber — 10 uses", amount: 10, price: 850, daily: 1, minLevel: 6 },
];

export const FISHING_TREASURES = [
  { type: "coins", amount: [80, 180], weight: 28, label: "Sunken Coin Purse" },
  { type: "item", id: "wood", amount: [4, 9], weight: 18, label: "Driftwood Bundle" },
  { type: "item", id: "copper", amount: [2, 5], weight: 17, label: "Lost Copper Cache" },
  { type: "item", id: "wormBait", amount: [3, 7], weight: 14, label: "Sealed Bait Tin" },
  { type: "item", id: "crystal", amount: [1, 2], weight: 8, label: "Water-Worn Hearth Crystal" },
  { type: "item", id: "relic", amount: [1, 1], weight: 4, label: "Submerged Ancient Relic" },
];

export function fishingTimeMatches(entry, minutes) {
  const time = clamp(Number(minutes) || 360, 0, 1439);
  if (entry.start <= entry.end) return time >= entry.start && time <= entry.end;
  return time >= entry.start || time <= entry.end;
}

export function fishAvailability(entry, state, regionId) {
  const calendar = calendarForDay(state?.day || 1);
  const level = state?.progression?.skillLevels?.fishing || 1;
  if (!entry.regions.includes(regionId)) return { available: false, reason: "Different region" };
  if (!entry.seasons.includes(calendar.season.id)) return { available: false, reason: `${entry.seasons.join("/")} only` };
  if (!fishingTimeMatches(entry, state?.minutes)) return { available: false, reason: `Available ${formatFishingWindow(entry)}` };
  if (entry.weather && !entry.weather.includes(state?.weather)) return { available: false, reason: `${entry.weather.join("/")} weather` };
  if (level < entry.minLevel) return { available: false, reason: `Fishing Level ${entry.minLevel}` };
  if (entry.legendary && state?.fishing?.legendaryCaught?.includes(entry.id)) return { available: false, reason: "Already caught" };
  return { available: true, reason: "Available now" };
}

export function availableFish(state, regionId) {
  return FISH_SPECIES.filter((entry) => fishAvailability(entry, state, regionId).available);
}

export function selectFishSpecies(state, regionId, baitId = "none", roll = Math.random()) {
  const candidates = availableFish(state, regionId);
  if (!candidates.length) return null;
  const bait = BAIT_DEFS[baitId] || BAIT_DEFS.none;
  const weighted = candidates.map((entry) => {
    let weight = entry.weight;
    if (entry.rarity === "uncommon") weight *= 1 + bait.rarityBonus;
    if (entry.rarity === "rare") weight *= 1 + bait.rarityBonus * 1.6;
    if (entry.legendary) weight *= 1 + bait.legendaryBonus * 12;
    if (baitId === "glow" && entry.start >= 900) weight *= 1.35;
    return { entry, weight: Math.max(.01, weight) };
  });
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = clamp(Number(roll) || 0, 0, .999999) * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.entry;
  }
  return weighted.at(-1)?.entry || null;
}

export function fishSize(entry, fishingLevel = 1, accuracy = 0, roll = Math.random()) {
  const skill = clamp((Number(fishingLevel) || 1) / 10, .1, 1);
  const factor = clamp((Number(roll) || 0) * .65 + clamp(Number(accuracy) || 0, 0, 1) * .2 + skill * .15, 0, 1);
  return Math.round((entry.minSize + (entry.maxSize - entry.minSize) * factor) * 10) / 10;
}

export function formatFishingWindow(entry) {
  const format = (minutes) => {
    const hour24 = Math.floor(minutes / 60) % 24;
    const minute = Math.floor(minutes % 60);
    const suffix = hour24 >= 12 ? "PM" : "AM";
    return `${hour24 % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
  };
  return `${format(entry.start)}–${format(entry.end)}`;
}

export function validateFishingData() {
  const ids = new Set();
  for (const entry of FISH_SPECIES) {
    if (ids.has(entry.id) || !entry.name || !entry.regions.length || !entry.seasons.length) return false;
    ids.add(entry.id);
    if (entry.minSize <= 0 || entry.maxSize <= entry.minSize || entry.difficulty <= 0 || entry.weight <= 0) return false;
    if (!FISH_QUALITY_ORDER.includes("normal") || !["fish", "rareFish"].includes(entry.category)) return false;
  }
  return ids.size === 21 && LEGENDARY_FISH.length === 4 && Object.values(BAIT_DEFS).length === 3 && Object.values(TACKLE_DEFS).length === 3;
}
