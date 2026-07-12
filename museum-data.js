import { ITEMS, clamp } from "./game-shared.js";
import "./ranch-data.js";
import "./cooking-data.js";
import "./fishing-data.js";

const registerItem = (id, value) => { ITEMS[id] ||= value; };

registerItem("museumToken", { name: "Silvercrest Museum Token", icon: "🏛️", value: 180 });
registerItem("curatorSeal", { name: "Continental Curator Seal", icon: "🏅", value: 2400 });

const requirement = (item, amount = 1) => ({ item, amount });
const bundle = (id, name, icon, description, requirements, reward) => ({ id, name, icon, description, requirements, reward });

export const MUSEUM_BUNDLES = [
  bundle("firstHarvest", "First Harvest Gallery", "🌾", "Preserve the crops and orchard produce that sustain Hearthvale's settlements.", [
    requirement("turnip"), requirement("berry"), requirement("moonbean"), requirement("apple"),
  ], { coins: 450, xp: 45, token: 1 }),
  bundle("continentalWaters", "Continental Waters Exhibit", "🐟", "Supply representative common and rare catches for the museum's aquatic study.", [
    requirement("fish", 4), requirement("rareFish", 2),
  ], { coins: 600, xp: 60, token: 1 }),
  bundle("ranchHeritage", "Ranch Heritage Hall", "🐄", "Document the products of every major Coop and Barn animal.", [
    requirement("egg"), requirement("milk"), requirement("duckEgg"), requirement("goatMilk"), requirement("wool"), requirement("truffle"),
  ], { coins: 900, xp: 90, token: 1 }),
  bundle("artisanTraditions", "Artisan Traditions Wing", "⚙️", "Display refined goods produced through the Farmstead's artisan machines.", [
    requirement("mayonnaise"), requirement("duckMayonnaise"), requirement("cheese"), requirement("goatCheese"), requirement("cloth"), requirement("truffleOil"),
  ], { coins: 1500, xp: 130, token: 1 }),
  bundle("wildHerbarium", "Wildlands Herbarium", "🌿", "Archive living samples gathered from forests, swamps, mistlands, snowfields, and volcanic ground.", [
    requirement("herb"), requirement("mushroom"), requirement("swampBloom"), requirement("mistPearl"), requirement("snowHerb"), requirement("volcanicGlass"),
  ], { coins: 850, xp: 80, token: 1 }),
  bundle("geologyCabinet", "Continental Geology Cabinet", "💎", "Trace Hearthvale's geology from common ore to the deepest crystalline deposits.", [
    requirement("copper"), requirement("iron"), requirement("silver"), requirement("gold"), requirement("obsidian"), requirement("crystal"),
  ], { coins: 1200, xp: 110, token: 1 }),
  bundle("monsterArchive", "Monster Ecology Archive", "🐾", "Help Guild scholars study the materials left by hostile creatures across the continent.", [
    requirement("slimeGel"), requirement("fang"), requirement("venom"), requirement("hide"), requirement("ash"),
  ], { coins: 1100, xp: 100, token: 1 }),
  bundle("ancientDepths", "Ancient Depths Collection", "🏺", "Preserve evidence from forgotten civilizations and the elemental heart of the Grand Depths.", [
    requirement("relic"), requirement("frostcore"), requirement("embercore"), requirement("voidshard"),
  ], { coins: 1800, xp: 160, token: 1 }),
  bundle("hearthvaleTable", "The Hearthvale Table", "🍽️", "Record the continent's culinary history through meals learned from home, friendship, travel, and mastery.", [
    requirement("turnipBroth"), requirement("riverStew"), requirement("fisherPie"), requirement("swampChowder"), requirement("emberHotpot"), requirement("hearthvaleFeast"),
  ], { coins: 2200, xp: 180, token: 1 }),
];

export const MUSEUM_BUNDLE_MAP = Object.fromEntries(MUSEUM_BUNDLES.map((entry) => [entry.id, entry]));
export const MUSEUM_TOTAL_ENTRIES = MUSEUM_BUNDLES.reduce((sum, entry) => sum + entry.requirements.length, 0);
export const MUSEUM_TOTAL_UNITS = MUSEUM_BUNDLES.reduce((sum, entry) => sum + entry.requirements.reduce((subtotal, item) => subtotal + item.amount, 0), 0);

export const MUSEUM_RANKS = [
  { reputation: 0, name: "Visitor", icon: "🎟️" },
  { reputation: 10, name: "Contributor", icon: "📦" },
  { reputation: 25, name: "Patron", icon: "📜" },
  { reputation: 45, name: "Curator", icon: "🗝️" },
  { reputation: 60, name: "Continental Curator", icon: "🏛️" },
];

export function museumRankForReputation(reputation = 0) {
  const safe = Math.max(0, Number(reputation) || 0);
  return [...MUSEUM_RANKS].reverse().find((entry) => safe >= entry.reputation) || MUSEUM_RANKS[0];
}

export function createMuseumState(existing = {}) {
  const value = existing && typeof existing === "object" ? existing : {};
  const donated = {};
  for (const bundleEntry of MUSEUM_BUNDLES) {
    const source = value.donated?.[bundleEntry.id] || {};
    donated[bundleEntry.id] = {};
    for (const entry of bundleEntry.requirements) donated[bundleEntry.id][entry.item] = clamp(Math.floor(Number(source[entry.item]) || 0), 0, entry.amount);
  }
  const completedBundles = MUSEUM_BUNDLES.filter((entry) => entry.requirements.every((requirementEntry) => donated[entry.id][requirementEntry.item] >= requirementEntry.amount)).map((entry) => entry.id);
  const rewardedBundles = Array.isArray(value.rewardedBundles)
    ? [...new Set(value.rewardedBundles.filter((id) => completedBundles.includes(id) && MUSEUM_BUNDLE_MAP[id]))]
    : [];
  const reputation = museumReputation({ donated, completedBundles });
  return {
    version: 1,
    donated,
    completedBundles,
    rewardedBundles,
    reputation,
    rank: museumRankForReputation(reputation).name,
    introQueued: Boolean(value.introQueued),
    allRewardClaimed: Boolean(value.allRewardClaimed && completedBundles.length === MUSEUM_BUNDLES.length),
    visits: clamp(Math.floor(Number(value.visits) || 0), 0, 999999),
    lastDonationDay: clamp(Math.floor(Number(value.lastDonationDay) || 0), 0, 999999),
  };
}

export function museumBundleProgress(state, bundleEntry) {
  const museum = state?.museum || createMuseumState();
  const donated = museum.donated[bundleEntry.id] || {};
  const units = bundleEntry.requirements.reduce((sum, entry) => sum + Math.min(entry.amount, Math.max(0, Number(donated[entry.item]) || 0)), 0);
  const total = bundleEntry.requirements.reduce((sum, entry) => sum + entry.amount, 0);
  const entries = bundleEntry.requirements.filter((entry) => (donated[entry.item] || 0) >= entry.amount).length;
  return { units, total, entries, entryTotal: bundleEntry.requirements.length, complete: units >= total };
}

export function museumOverallProgress(state) {
  const museum = state?.museum || createMuseumState();
  let units = 0;
  let entries = 0;
  for (const bundleEntry of MUSEUM_BUNDLES) {
    const progress = museumBundleProgress({ museum }, bundleEntry);
    units += progress.units;
    entries += progress.entries;
  }
  return { units, totalUnits: MUSEUM_TOTAL_UNITS, entries, totalEntries: MUSEUM_TOTAL_ENTRIES, bundles: museum.completedBundles.length, totalBundles: MUSEUM_BUNDLES.length };
}

export function museumReputation(value) {
  const donated = value?.donated || {};
  const completed = Array.isArray(value?.completedBundles) ? value.completedBundles.length : 0;
  let units = 0;
  for (const bundleEntry of MUSEUM_BUNDLES) for (const entry of bundleEntry.requirements) units += Math.min(entry.amount, Math.max(0, Number(donated[bundleEntry.id]?.[entry.item]) || 0));
  return units + completed * 2;
}

export function validateMuseumData() {
  const ids = new Set();
  for (const bundleEntry of MUSEUM_BUNDLES) {
    if (!bundleEntry.id || ids.has(bundleEntry.id) || !bundleEntry.name || !bundleEntry.requirements.length) return false;
    ids.add(bundleEntry.id);
    const items = new Set();
    for (const entry of bundleEntry.requirements) {
      if (!ITEMS[entry.item] || items.has(entry.item) || !Number.isInteger(entry.amount) || entry.amount <= 0) return false;
      items.add(entry.item);
    }
    if (!Number.isInteger(bundleEntry.reward.coins) || bundleEntry.reward.coins <= 0 || !Number.isInteger(bundleEntry.reward.xp) || bundleEntry.reward.xp <= 0) return false;
  }
  return ids.size === 9 && MUSEUM_TOTAL_ENTRIES === 45 && MUSEUM_TOTAL_UNITS === 49;
}
