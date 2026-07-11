import assert from "node:assert/strict";
import {
  SKILL_IDS,
  QUALITY_TIERS,
  CAVE_MILESTONES,
  UPGRADE_REQUIREMENTS,
  SHOP_STOCK,
  createProgressionState,
  levelFromXp,
  xpForLevel,
  qualityRoll,
  caveBand,
  enhancementCost,
} from "../progression-data.js";

assert.deepEqual(SKILL_IDS, ["farming", "mining", "combat", "fishing", "foraging"]);
assert.equal(QUALITY_TIERS.length, 4);
assert.deepEqual(Object.keys(CAVE_MILESTONES).map(Number), [10, 20, 30, 40, 50]);
assert.equal(CAVE_MILESTONES[50].type, "depthWarden");
assert.ok(CAVE_MILESTONES[10].gear.length >= 2);
assert.ok(UPGRADE_REQUIREMENTS.weaponPower[6].items.voidshard >= 1);
assert.ok(SHOP_STOCK.seedshop.every((entry) => entry.daily > 0));

const state = createProgressionState({ adventureXp: xpForLevel(3), skillXp: { farming: xpForLevel(2) } });
assert.equal(state.adventureLevel, 4);
assert.equal(state.skillLevels.farming, 3);
assert.equal(state.skillLevels.combat, 1);
assert.equal(levelFromXp(0), 1);
assert.equal(caveBand(9), "copper");
assert.equal(caveBand(10), "iron");
assert.equal(caveBand(20), "silver");
assert.equal(caveBand(30), "gold");
assert.equal(caveBand(40), "obsidian");
assert.equal(caveBand(50), "heart");

assert.equal(qualityRoll(1, 0, 0, "Clear", .99), "normal");
assert.equal(qualityRoll(10, 4, 3, "Sparkfall", 0), "iridium");
assert.ok(enhancementCost(2).coins > enhancementCost(1).coins);

console.log(JSON.stringify({
  ok: true,
  skills: SKILL_IDS.length,
  qualityTiers: QUALITY_TIERS.length,
  milestoneBosses: Object.keys(CAVE_MILESTONES).length,
  maxAdventureLevel: levelFromXp(Number.MAX_SAFE_INTEGER),
  seedShopEntries: SHOP_STOCK.seedshop.length,
}));
