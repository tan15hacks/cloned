import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { createStorageState } from "../inventory-storage-data.js";
import {
  installStorageAndShipping, backpackQualityCounts, moveBackpackToContainer,
  moveContainerToBackpack, processShippingState,
} from "../game-storage.js";
import { installStorageRuntime } from "../game-storage-runtime.js";

const qualityMap = (value = {}) => ({ normal: 0, silver: 0, gold: 0, iridium: 0, ...value });

class StorageHarness {
  constructor() {
    this.state = this.defaultState();
    this.achievementIds = [];
  }
  defaultState() {
    return {
      day: 1,
      mode: "world",
      coins: 10000,
      player: { x: 11.5, y: 15.5 },
      inventory: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])),
      upgrades: { backpack: 40 },
      progression: { qualityInventory: { turnip: qualityMap(), berry: qualityMap(), moonbean: qualityMap(), fish: qualityMap(), rareFish: qualityMap(), apple: qualityMap() } },
      ranch: { qualityInventory: Object.fromEntries(["egg", "duckEgg", "feather", "milk", "goatMilk", "wool", "truffle", "mayonnaise", "duckMayonnaise", "cheese", "goatCheese", "cloth", "truffleOil"].map((id) => [id, qualityMap()])) },
      cooking: { meals: Object.fromEntries(["turnipBroth", "riverStew", "fisherPie", "swampChowder", "emberHotpot", "hearthvaleFeast"].map((id) => [id, qualityMap()])) },
      social: { letters: [] },
      living: { interiorId: null },
      resources: [], placed: [], soil: {}, journal: [], visitedRegions: ["farm", "city"],
      questStats: { wood: 0, stone: 0, copper: 0 },
      stats: { totalEarned: 0 }, achievements: [], beacon: { level: 0 }, storage: null,
    };
  }
  migrateState(data) { return { ...this.defaultState(), ...data, inventory: { ...this.defaultState().inventory, ...(data?.inventory || {}) }, upgrades: { backpack: 40, ...(data?.upgrades || {}) } }; }
  enterGame() {}
  nextDay() { this.state.day += 1; }
  addItem(id, amount = 1) { this.state.inventory[id] = (this.state.inventory[id] || 0) + amount; if (this.state.questStats[id] !== undefined) this.state.questStats[id] += amount; }
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
  checkAchievement(id, condition) { if (condition && !this.achievementIds.includes(id)) this.achievementIds.push(id); }
  saveGame() { this.saveCount = (this.saveCount || 0) + 1; }
  closeModal() {}
  toast(message) { this.lastToast = message; }
  sound() {}
}

installStorageAndShipping(StorageHarness);
installStorageRuntime(StorageHarness);
const game = new StorageHarness();
game.state = game.defaultState();
game.state.storage = createStorageState({}, game.state);

// Quality-aware backpack to pantry and back.
game.state.inventory.turnip = 3;
game.state.progression.qualityInventory.turnip = qualityMap({ normal: 1, gold: 2 });
let moved = moveBackpackToContainer(game.state, "turnip", 3, game.state.storage.chests.pantry);
assert.equal(moved, 3);
assert.equal(game.state.inventory.turnip, 0);
assert.equal(game.state.progression.qualityInventory.turnip.normal, 0);
assert.equal(game.state.progression.qualityInventory.turnip.gold, 0);
assert.equal(game.state.storage.chests.pantry.items.turnip, 3);
assert.equal(game.state.storage.chests.pantry.qualities.turnip.normal, 1);
assert.equal(game.state.storage.chests.pantry.qualities.turnip.gold, 2);

moved = moveContainerToBackpack(game.state, "turnip", 1, game.state.storage.chests.pantry);
assert.equal(moved, 1);
assert.equal(game.state.inventory.turnip, 1);
assert.equal(game.state.progression.qualityInventory.turnip.normal, 1, "Retrieval should preserve the stored quality tier");
assert.equal(game.state.storage.chests.pantry.items.turnip, 2);

// Fill every backpack stack, then verify a new collected item routes to its preferred chest.
for (const id of Object.keys(ITEMS).filter((id) => !["apple", "milk"].includes(id)).slice(0, 40)) game.state.inventory[id] = Math.max(1, game.state.inventory[id] || 0);
assert.ok(Object.values(game.state.inventory).filter((count) => count > 0).length >= 40);
game.state.upgrades.backpack = 40;
game.state.inventory.apple = 0;
game._storageExpectProgressionQuality = true;
const overflow = game.addItem("apple", 1, false);
game.recordQuality("apple", "gold", 1);
game._storageExpectProgressionQuality = false;
assert.equal(overflow.backpack, 0);
assert.equal(overflow.stored, 1);
assert.equal(game.state.storage.chests.pantry.items.apple, 1);
assert.equal(game.state.storage.chests.pantry.qualities.apple.gold, 1);
assert.equal(game.state.storage.chests.pantry.qualities.apple.normal, 0);

// Ranch quality uses the same overflow route without duplicating the backpack ledger.
game.state.inventory.milk = 0;
const ranchOverflow = game.addRanchItem("milk", "iridium", 2, false);
assert.equal(ranchOverflow.stored, 2);
assert.equal(game.state.inventory.milk, 0);
assert.equal(game.state.ranch.qualityInventory.milk.iridium, 0);
assert.equal(game.state.storage.chests.pantry.qualities.milk.iridium, 2);

// Shipping records quality and pays once at day transition.
const shippingState = game.defaultState();
shippingState.storage = createStorageState({}, shippingState);
shippingState.storage.shipping.items.berry = 2;
shippingState.storage.shipping.qualities.berry = qualityMap({ gold: 2 });
const shipment = processShippingState(shippingState, 1);
assert.equal(shipment.count, 2);
assert.equal(shipment.total, Math.floor(ITEMS.berry.value * 1.6) * 2);
assert.deepEqual(shippingState.storage.shipping.items, {});

const dayGame = new StorageHarness();
dayGame.state = dayGame.defaultState();
dayGame.state.storage = createStorageState({}, dayGame.state);
dayGame.state.storage.shipping.items.turnip = 2;
dayGame.state.storage.shipping.qualities.turnip = qualityMap({ normal: 1, silver: 1 });
const coinsBefore = dayGame.state.coins;
dayGame.nextDay(false);
assert.equal(dayGame.state.day, 2);
assert.equal(dayGame.state.storage.stats.shipments, 1);
assert.equal(dayGame.state.storage.lastShipment.items[0].count, 2);
assert.ok(dayGame.state.coins > coinsBefore);
const paidCoins = dayGame.state.coins;
dayGame.nextDay(false);
assert.equal(dayGame.state.coins, paidCoins, "An empty bin cannot repeat the previous payout");

// Backpack upgrades consume materials and expand the unique-stack limit.
const upgradeGame = new StorageHarness();
upgradeGame.state = upgradeGame.defaultState();
upgradeGame.state.storage = createStorageState({}, upgradeGame.state);
upgradeGame.state.inventory.cloth = 1;
upgradeGame.state.ranch.qualityInventory.cloth = qualityMap({ silver: 1 });
upgradeGame.showStorageOverview = () => {};
upgradeGame.buyBackpackUpgrade();
assert.equal(upgradeGame.state.upgrades.backpack, 56);
assert.equal(upgradeGame.state.coins, 7200);
assert.equal(upgradeGame.state.inventory.cloth, 0);
assert.equal(upgradeGame.state.ranch.qualityInventory.cloth.silver, 0);
assert.equal(upgradeGame.achievementIds.includes("storage-pack-upgrade"), true);

assert.deepEqual(backpackQualityCounts(upgradeGame.state, "cloth"), qualityMap());

console.log(JSON.stringify({
  ok: true,
  qualityChestTransfers: true,
  capacityOverflowRouting: true,
  progressionQualityOverflow: true,
  ranchQualityOverflow: true,
  overnightShipping: true,
  oneTimePayout: true,
  backpackUpgrade: true,
}));
