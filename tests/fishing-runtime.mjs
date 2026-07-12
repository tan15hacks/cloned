import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { FISH_SPECIES_MAP, BAIT_DEFS, TACKLE_DEFS } from "../fishing-data.js";
import { installFishingOverhaul, createFishingState, ensureFishingShopState } from "../game-fishing.js";
import { installFishingRuntime, hardenFishingState } from "../game-fishing-runtime.js";

class FishingHarness {
  constructor() {
    this.state = this.defaultState();
    this.modalOpen = false;
    this.fishingTimer = null;
    this.activeFishingSession = null;
    this.achievementIds = [];
  }
  defaultState() {
    return {
      version: 3,
      mapVersion: 3,
      day: 1,
      minutes: 600,
      weather: "Clear",
      mode: "world",
      coins: 2000,
      player: { x: 11.5, y: 15.5, energy: 100, maxEnergy: 100, health: 100, maxHealth: 100 },
      inventory: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])),
      progression: {
        skillXp: { farming: 0, mining: 0, combat: 0, fishing: 0, foraging: 0 },
        skillLevels: { farming: 1, mining: 1, combat: 1, fishing: 10, foraging: 1 },
        qualityInventory: {},
      },
      social: { letters: [] },
      fishing: null,
      questStats: { fish: 0 },
      stats: { fishCaught: 0, totalEarned: 0 },
      journal: [],
      achievements: [],
    };
  }
  migrateState(data) {
    const base = this.defaultState();
    return {
      ...base,
      ...data,
      player: { ...base.player, ...(data?.player || {}) },
      inventory: { ...base.inventory, ...(data?.inventory || {}) },
      progression: {
        ...base.progression,
        ...(data?.progression || {}),
        skillXp: { ...base.progression.skillXp, ...(data?.progression?.skillXp || {}) },
        skillLevels: { ...base.progression.skillLevels, ...(data?.progression?.skillLevels || {}) },
        qualityInventory: { ...(data?.progression?.qualityInventory || {}) },
      },
      social: { ...base.social, ...(data?.social || {}), letters: [...(data?.social?.letters || [])] },
      stats: { ...base.stats, ...(data?.stats || {}) },
      questStats: { ...base.questStats, ...(data?.questStats || {}) },
    };
  }
  enterGame() {}
  nextDay() { this.state.day += 1; this.state.minutes = 360; }
  toggleGameMenu() {}
  beginFishing() {}
  closeModal() { this.modalOpen = false; }
  leaveToTitle() { this.closeModal(); }
  openModal(title, body) { this.modalOpen = true; this.lastModal = { title, body }; }
  toast(message) { this.lastToast = message; }
  saveGame() { this.saveCount = (this.saveCount || 0) + 1; }
  sound() {}
  vibrate() {}
  spendEnergy(amount) { this.state.player.energy -= amount; }
  addItem(id, amount = 1) { this.state.inventory[id] = (this.state.inventory[id] || 0) + amount; }
  recordQuality(id, quality, amount = 1) {
    const map = this.state.progression.qualityInventory[id] ||= { normal: 0, silver: 0, gold: 0, iridium: 0 };
    map[quality] += amount;
  }
  awardSkillXp(id, amount) { this.state.progression.skillXp[id] += amount; }
  checkQuests() {}
  checkAchievement(id, condition) { if (condition && !this.achievementIds.includes(id)) this.achievementIds.push(id); }
}

installFishingOverhaul(FishingHarness);
installFishingRuntime(FishingHarness);

const game = new FishingHarness();
game.state = game.defaultState();
game.showFishingGear = () => {};
game.enterGame();
assert.ok(game.state.fishing);
assert.equal(game.state.fishing.introQueued, true);
assert.equal(game.state.social.letters.some((letter) => letter.id === "fishing-overhaul-welcome"), true);
assert.equal(game.state.social.letters.filter((letter) => letter.id === "fishing-overhaul-welcome").length, 1);

const previousRandom = Math.random;
Math.random = () => .99;
try {
  game.finishFishingCatch(FISH_SPECIES_MAP.brookMinnow, "farm", { bait: BAIT_DEFS.none, tackle: TACKLE_DEFS.none }, .92, true);
  assert.equal(game.state.inventory.fish, 1);
  assert.equal(game.state.stats.fishCaught, 1);
  assert.equal(game.state.questStats.fish, 1);
  assert.equal(game.state.fishing.journal.brookMinnow.count, 1);
  assert.ok(game.state.fishing.journal.brookMinnow.largestSize >= FISH_SPECIES_MAP.brookMinnow.minSize);
  assert.equal(game.state.fishing.streak, 1);
  assert.equal(game.state.fishing.perfectCatches, 1);
  assert.equal(game.achievementIds.includes("first-species"), true);

  const coinsBeforeLegend = game.state.coins;
  game.finishFishingCatch(FISH_SPECIES_MAP.starKoi, "moonlake", { bait: BAIT_DEFS.glow, tackle: TACKLE_DEFS.lucky }, .95, true);
  assert.equal(game.state.inventory.rareFish, 1);
  assert.equal(game.state.fishing.legendaryCaught.includes("starKoi"), true);
  assert.equal(game.state.inventory.anglerToken, 1);
  assert.equal(game.state.coins, coinsBeforeLegend + 600);
  assert.equal(game.state.fishing.journal.starKoi.count, 1);
} finally {
  Math.random = previousRandom;
}

ensureFishingShopState(game.state);
const wormStock = game.state.fishing.shopStock.wormBait;
const coinsBeforeBait = game.state.coins;
game.buyFishingSupply("wormBait");
assert.equal(game.state.inventory.wormBait, 5);
assert.equal(game.state.coins, coinsBeforeBait - 90);
assert.equal(game.state.fishing.shopStock.wormBait, wormStock - 1);

const spinnerStock = game.state.fishing.shopStock.spinner;
game.buyFishingSupply("spinner");
assert.equal(game.state.fishing.tackleUses.spinner, 14);
assert.equal(game.state.fishing.shopStock.spinner, spinnerStock - 1);

// Closing the modal by its X button during a fishing session must safely break the streak.
game.state.fishing.streak = 7;
game.activeFishingSession = { speciesId: "brookMinnow", regionId: "farm" };
game.closeModal();
assert.equal(game.activeFishingSession, null);
assert.equal(game.state.fishing.streak, 0);
assert.ok(game.saveCount > 0);

// Sleeping refreshes daily tackle stock and resets a same-day streak.
game.state.fishing.shopStock.wormBait = 0;
game.state.fishing.streak = 4;
const dayBefore = game.state.day;
game.nextDay(false);
assert.equal(game.state.day, dayBefore + 1);
assert.equal(game.state.fishing.streak, 0);
assert.equal(game.state.fishing.shopStock.wormBait, 4);

const malformed = {
  day: 6,
  inventory: { ...Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])), wormBait: -20, glowBait: Number.POSITIVE_INFINITY },
  fishing: {
    selectedBait: "fake",
    selectedTackle: "fake",
    tackleUses: { spinner: -4, lucky: 999999 },
    journal: {
      brookMinnow: { count: 3, bestQuality: "fake", largestSize: 999999, firstDay: -5, lastDay: 999 },
      starKoi: { count: 0, bestQuality: "iridium", largestSize: 100, firstDay: 1, lastDay: 1 },
      missingFish: { count: 900 },
    },
    legendaryCaught: ["starKoi", "missingFish", "starKoi"],
    streak: -10,
    bestStreak: -20,
    lastCatchDay: 99,
    totalCasts: -3,
    totalEscapes: 4,
    treasuresFound: -1,
    perfectCatches: Number.POSITIVE_INFINITY,
    shopDay: 6,
    shopStock: { wormBait: 999, glowBait: -3, spinner: 9, lucky: 9, injected: 10 },
  },
};
hardenFishingState(malformed);
assert.equal(malformed.fishing.selectedBait, "none");
assert.equal(malformed.fishing.selectedTackle, "none");
assert.equal(malformed.fishing.tackleUses.spinner, 0);
assert.equal(malformed.fishing.tackleUses.lucky, 999);
assert.equal(malformed.fishing.journal.missingFish, undefined);
assert.equal(malformed.fishing.journal.starKoi, undefined);
assert.equal(malformed.fishing.journal.brookMinnow.bestQuality, "normal");
assert.ok(malformed.fishing.journal.brookMinnow.largestSize <= FISH_SPECIES_MAP.brookMinnow.maxSize * 1.15);
assert.equal(malformed.fishing.legendaryCaught.length, 0);
assert.equal(malformed.fishing.lastCatchDay, 6);
assert.equal(malformed.fishing.totalCasts, 7);
assert.equal(malformed.fishing.shopStock.wormBait, 4);
assert.equal(malformed.fishing.shopStock.glowBait, 0);
assert.equal(malformed.fishing.shopStock.injected, undefined);
assert.equal(malformed.inventory.wormBait, 0);
assert.equal(malformed.inventory.glowBait, 0);

console.log(JSON.stringify({
  ok: true,
  welcomeLetter: true,
  catchJournal: true,
  legendaryRewards: true,
  tackleShop: true,
  interruptedSessionSafety: true,
  dailyStockRefresh: true,
  saveHardening: true,
}));
