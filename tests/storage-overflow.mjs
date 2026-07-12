import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { createStorageState, STORAGE_CHESTS } from "../inventory-storage-data.js";
import { installStorageAndShipping } from "../game-storage.js";
import { installStorageRuntime } from "../game-storage-runtime.js";
import { installStorageOverflowRuntime } from "../game-storage-overflow-runtime.js";

const qualityMap = (value = {}) => ({ normal: 0, silver: 0, gold: 0, iridium: 0, ...value });
const ranchIds = ["egg", "duckEgg", "feather", "milk", "goatMilk", "wool", "truffle", "mayonnaise", "duckMayonnaise", "cheese", "goatCheese", "cloth", "truffleOil"];

class OverflowHarness {
  defaultState() {
    return {
      day: 1, mode: "world", coins: 1000,
      player: { x: 11.5, y: 15.5 }, living: { interiorId: null },
      inventory: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])),
      upgrades: { backpack: 40 },
      progression: { qualityInventory: Object.fromEntries(["turnip", "berry", "moonbean", "fish", "rareFish", "apple"].map((id) => [id, qualityMap()])) },
      ranch: { qualityInventory: Object.fromEntries(ranchIds.map((id) => [id, qualityMap()])) },
      cooking: { meals: {} }, social: { letters: [] },
      questStats: {}, stats: { totalEarned: 0 }, achievements: [], visitedRegions: ["farm"],
      resources: [], placed: [], soil: {}, journal: [], beacon: { level: 0 }, storage: null,
    };
  }
  migrateState(data) { return { ...this.defaultState(), ...data }; }
  enterGame() {}
  nextDay() { this.state.day += 1; }
  addItem(id, amount = 1) { this.state.inventory[id] = (this.state.inventory[id] || 0) + amount; }
  addRanchItem(id, quality, amount) { this.addItem(id, amount); this.state.ranch.qualityInventory[id][quality] += amount; }
  recordQuality(id, quality, amount = 1) { this.state.progression.qualityInventory[id][quality] += amount; }
  harvestCrop() {}
  finishFishingCatch() {}
  cookMeal() {}
  sellCategory() {}
  interact() {}
  interactInterior() {}
  updateContextHint() {}
  drawBuildings() {}
  collides() { return false; }
  toggleGameMenu() {}
  showInventory() {}
  checkQuests() {}
  buildToolbar() {}
  rebuildResourceMap() {}
  refreshActiveWorldChunks() {}
  checkAchievement() {}
  saveGame() {}
  closeModal() {}
  toast(message) { this.lastToast = message; }
  sound() {}
}

installStorageAndShipping(OverflowHarness);
installStorageRuntime(OverflowHarness);
installStorageOverflowRuntime(OverflowHarness);

const game = new OverflowHarness();
game.state = game.defaultState();
game.state.storage = createStorageState({}, game.state);

// Fill the backpack with forty unique stacks while keeping test items absent.
const filler = Object.keys(ITEMS).filter((id) => !["apple", "milk", "egg", "wood"].includes(id)).slice(0, 40);
for (const id of filler) game.state.inventory[id] = 1;
assert.equal(Object.values(game.state.inventory).filter((count) => count > 0).length, 40);

// The preferred pantry Apple stack is full, so a quality harvest must route to the trunk.
game.state.storage.chests.pantry.items.apple = 9999;
game.state.storage.chests.pantry.qualities.apple = qualityMap({ normal: 9999 });
game._storageExpectProgressionQuality = true;
const appleResult = game.addItem("apple", 1, false);
game.recordQuality("apple", "gold", 1);
game._storageExpectProgressionQuality = false;
assert.equal(game.state.inventory.apple, 0);
assert.equal(game.state.storage.chests.trunk.items.apple, 1);
assert.equal(game.state.storage.chests.trunk.qualities.apple.normal, 0);
assert.equal(game.state.storage.chests.trunk.qualities.apple.gold, 1);
assert.equal(appleResult.storageSegments.some((entry) => entry.chestId === "trunk" && entry.count === 1), true);

// Ranch products follow the same path and preserve Iridium quality.
game.state.storage.chests.pantry.items.milk = 9999;
game.state.storage.chests.pantry.qualities.milk = qualityMap({ normal: 9999 });
const milkResult = game.addRanchItem("milk", "iridium", 2, false);
assert.equal(game.state.inventory.milk, 0);
assert.equal(game.state.ranch.qualityInventory.milk.iridium, 0);
assert.equal(game.state.storage.chests.trunk.items.milk, 2);
assert.equal(game.state.storage.chests.trunk.qualities.milk.iridium, 2);
assert.equal(milkResult.stored, 2);

// Storing a Normal product must not relabel premium stock already in the alternate chest.
game.state.storage.chests.pantry.items.egg = 9999;
game.state.storage.chests.pantry.qualities.egg = qualityMap({ normal: 9999 });
game.state.storage.chests.trunk.items.egg = 1;
game.state.storage.chests.trunk.qualities.egg = qualityMap({ gold: 1 });
game.addRanchItem("egg", "normal", 1, false);
assert.equal(game.state.storage.chests.trunk.items.egg, 2);
assert.equal(game.state.storage.chests.trunk.qualities.egg.gold, 1);
assert.equal(game.state.storage.chests.trunk.qualities.egg.normal, 1);

// Material overflow normally prefers the trunk; a full trunk stack must fall back to the pantry.
game.state.storage.chests.trunk.items.wood = 9999;
game.state.storage.chests.trunk.qualities.wood = qualityMap({ normal: 9999 });
const woodResult = game.addItem("wood", 3, false);
assert.equal(game.state.inventory.wood, 0);
assert.equal(game.state.storage.chests.pantry.items.wood, 3);
assert.equal(woodResult.storageSegments.some((entry) => entry.chestId === "pantry" && entry.count === 3), true);

assert.equal(game.state.storage.chests.pantry.capacity, STORAGE_CHESTS.pantry.capacity);
assert.equal(game.state.storage.chests.trunk.capacity, STORAGE_CHESTS.trunk.capacity);

console.log(JSON.stringify({
  ok: true,
  alternateChestFallback: true,
  progressionQualityPreserved: true,
  ranchQualityPreserved: true,
  normalQualityIsolation: true,
  stackLimitsRespected: true,
}));
