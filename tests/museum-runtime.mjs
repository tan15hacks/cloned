import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { MUSEUM_BUNDLES, createMuseumState } from "../museum-data.js";
import { installMuseumCollections, consumeMuseumItem } from "../game-museum.js";
import { installMuseumRuntime, hardenMuseumState } from "../game-museum-runtime.js";

const qualityMap = (values = {}) => ({ normal: 0, silver: 0, gold: 0, iridium: 0, ...values });

class MuseumHarness {
  constructor() {
    this.state = this.defaultState();
    this.achievementIds = [];
  }
  defaultState() {
    return {
      version: 3,
      mapVersion: 3,
      day: 1,
      mode: "world",
      coins: 300,
      player: { x: 11.5, y: 15.5 },
      inventory: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])),
      progression: { adventureXp: 0, qualityInventory: {} },
      ranch: { qualityInventory: {} },
      cooking: {
        meals: Object.fromEntries(["turnipBroth", "riverStew", "fisherPie", "swampChowder", "emberHotpot", "hearthvaleFeast"].map((id) => [id, qualityMap()])),
        stats: { uniqueRecipesCooked: [] },
      },
      fishing: { journal: {} },
      social: { letters: [] },
      living: { interiorId: null },
      visitedRegions: ["farm"],
      journal: [],
      achievements: [],
      stats: { totalEarned: 0 },
      museum: null,
    };
  }
  migrateState(data) {
    const base = this.defaultState();
    return {
      ...base,
      ...data,
      player: { ...base.player, ...(data?.player || {}) },
      inventory: { ...base.inventory, ...(data?.inventory || {}) },
      progression: { ...base.progression, ...(data?.progression || {}), qualityInventory: { ...(data?.progression?.qualityInventory || {}) } },
      ranch: { ...base.ranch, ...(data?.ranch || {}), qualityInventory: { ...(data?.ranch?.qualityInventory || {}) } },
      cooking: {
        ...base.cooking,
        ...(data?.cooking || {}),
        meals: { ...base.cooking.meals, ...(data?.cooking?.meals || {}) },
        stats: { ...base.cooking.stats, ...(data?.cooking?.stats || {}) },
      },
      fishing: { ...base.fishing, ...(data?.fishing || {}), journal: { ...(data?.fishing?.journal || {}) } },
      social: { ...base.social, ...(data?.social || {}), letters: [...(data?.social?.letters || [])] },
      stats: { ...base.stats, ...(data?.stats || {}) },
    };
  }
  enterGame() {}
  nextDay() { this.state.day += 1; }
  enterInterior(id) { this.state.mode = "interior"; this.state.living.interiorId = id; }
  handleExpandedInteriorInteraction() {}
  toggleGameMenu() {}
  closeModal() { this.modalOpen = false; }
  openModal() { this.modalOpen = true; }
  showMuseumCollections() {}
  addItem(id, amount = 1) { this.state.inventory[id] = (this.state.inventory[id] || 0) + amount; }
  awardAdventureXp(amount) { this.state.progression.adventureXp += amount; }
  checkAchievement(id, condition) { if (condition && !this.achievementIds.includes(id)) this.achievementIds.push(id); }
  saveGame() { this.saveCount = (this.saveCount || 0) + 1; }
  toast(message) { this.lastToast = message; }
  sound() {}
}

installMuseumCollections(MuseumHarness);
installMuseumRuntime(MuseumHarness);

const game = new MuseumHarness();
game.state = game.defaultState();
game.showMuseumCollections = () => {};
game.enterGame();
assert.ok(game.state.museum);
assert.equal(game.state.social.letters.filter((letter) => letter.id === "museum-opening").length, 1);
assert.equal(game.state.museum.introQueued, true);
game.enterGame();
assert.equal(game.state.social.letters.filter((letter) => letter.id === "museum-opening").length, 1, "Museum invitation must not duplicate");

// Donations must consume the matching quality record before removing inventory.
game.state.inventory.turnip = 1;
game.state.progression.qualityInventory.turnip = qualityMap({ silver: 1 });
game.donateMuseumItem("firstHarvest", "turnip", 1);
assert.equal(game.state.inventory.turnip, 0);
assert.equal(game.state.progression.qualityInventory.turnip.silver, 0);
assert.equal(game.state.museum.donated.firstHarvest.turnip, 1);
assert.equal(game.achievementIds.includes("museum-first-donation"), true);

// Prepared meal donations must also remove the pantry quality record.
game.state.inventory.turnipBroth = 1;
game.state.cooking.meals.turnipBroth.gold = 1;
const removedMeal = consumeMuseumItem(game.state, "turnipBroth", 1);
assert.equal(removedMeal, 1);
assert.equal(game.state.inventory.turnipBroth, 0);
assert.equal(game.state.cooking.meals.turnipBroth.gold, 0);

// Completing a bundle grants its reward exactly once.
for (const id of ["berry", "moonbean", "apple"]) game.state.inventory[id] = 1;
const coinsBefore = game.state.coins;
const xpBefore = game.state.progression.adventureXp;
game.donateMuseumAvailable("firstHarvest");
assert.equal(game.state.museum.completedBundles.includes("firstHarvest"), true);
assert.equal(game.state.museum.rewardedBundles.includes("firstHarvest"), true);
assert.equal(game.state.coins, coinsBefore + 450);
assert.equal(game.state.progression.adventureXp, xpBefore + 45);
assert.equal(game.state.inventory.museumToken, 1);
assert.equal(game.achievementIds.includes("museum-first-gallery"), true);
const rewardedCoins = game.state.coins;
game.donateMuseumAvailable("firstHarvest");
assert.equal(game.state.coins, rewardedCoins, "A completed gallery cannot pay its reward twice");
assert.equal(game.state.inventory.museumToken, 1);

// Entering Silvercrest Hall records a museum visit.
const visitsBefore = game.state.museum.visits;
game.enterInterior("cityHall", {});
assert.equal(game.state.museum.visits, visitsBefore + 1);

// Imported invalid values must be rejected rather than completing collections.
const malformed = {
  day: 8,
  inventory: { turnip: Number.POSITIVE_INFINITY, museumToken: -4, curatorSeal: Number.NaN },
  museum: {
    donated: {
      firstHarvest: { turnip: Number.POSITIVE_INFINITY, berry: -8, moonbean: 99, apple: 0 },
      injected: { relic: 999 },
    },
    rewardedBundles: ["firstHarvest", "injected"],
    completedBundles: ["injected"],
    reputation: Number.POSITIVE_INFINITY,
    rank: "Forged",
    visits: Number.POSITIVE_INFINITY,
    lastDonationDay: 999,
    allRewardClaimed: true,
  },
};
hardenMuseumState(malformed);
assert.equal(malformed.museum.donated.firstHarvest.turnip, 0);
assert.equal(malformed.museum.donated.firstHarvest.berry, 0);
assert.equal(malformed.museum.donated.firstHarvest.moonbean, 1);
assert.equal(malformed.museum.completedBundles.length, 0);
assert.equal(malformed.museum.rewardedBundles.length, 0);
assert.equal(malformed.museum.allRewardClaimed, false);
assert.equal(malformed.museum.visits, 0);
assert.equal(malformed.museum.lastDonationDay, 8);
assert.equal(malformed.inventory.turnip, 0);
assert.equal(malformed.inventory.museumToken, 0);
assert.equal(malformed.inventory.curatorSeal, 0);
assert.ok(malformed.museum.reputation >= 0 && malformed.museum.reputation <= 67);

// A legitimate fully donated state can retain only valid completion and reward flags.
const complete = { day: 50, inventory: {}, museum: createMuseumState() };
for (const bundle of MUSEUM_BUNDLES) for (const requirement of bundle.requirements) complete.museum.donated[bundle.id][requirement.item] = requirement.amount;
complete.museum.rewardedBundles = MUSEUM_BUNDLES.map((entry) => entry.id);
complete.museum.allRewardClaimed = true;
hardenMuseumState(complete);
assert.equal(complete.museum.completedBundles.length, 9);
assert.equal(complete.museum.rewardedBundles.length, 9);
assert.equal(complete.museum.allRewardClaimed, true);
assert.equal(complete.museum.rank, "Continental Curator");

console.log(JSON.stringify({
  ok: true,
  welcomeLetter: true,
  qualityDonationSynchronization: true,
  preparedMealSynchronization: true,
  oneTimeBundleRewards: true,
  cityHallVisits: true,
  saveHardening: true,
  completeMuseumState: true,
}));
