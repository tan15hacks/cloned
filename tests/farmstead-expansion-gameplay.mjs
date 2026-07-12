import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { createStorageState } from "../inventory-storage-data.js";
import { createFarmExpansionState } from "../farmstead-expansion-data.js";
import { installFarmsteadExpansion } from "../game-farmstead-expansion.js";

const quality = (normal = 0) => ({ normal, silver: 0, gold: 0, iridium: 0 });

class FarmsteadHarness {
  defaultState() {
    const inventory = Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0]));
    inventory.wood = 10;
    inventory.stone = 24;
    inventory.turnipSeed = 4;
    const state = {
      day: 1, coins: 2000, mode: "world",
      player: { x: 11.5, y: 15.5, energy: 100, maxEnergy: 100 },
      inventory, storage: null, social: { letters: [] },
      resources: [], monsters: [], placed: [], soil: {}, journal: [], achievements: [],
      stats: { cropsHarvested: 0 }, selectedCrop: "turnip", living: { interiorId: null },
      upgrades: {}, farmExpansion: null,
    };
    state.storage = createStorageState({}, state);
    state.storage.chests.trunk.items.wood = 30;
    state.storage.chests.trunk.qualities.wood = quality(30);
    state.farmExpansion = createFarmExpansionState({}, state);
    return state;
  }
  migrateState(data) { return { ...this.defaultState(), ...data }; }
  enterGame() {}
  nextDay() { this.state.day += 1; }
  useHoe() {}
  useWater() {}
  plantSeed() {}
  interact() {}
  interactInterior() {}
  updateContextHint() {}
  drawTerrainTile() {}
  drawBuildings() {}
  collides() { return false; }
  renderInterior() {}
  toggleGameMenu() {}
  rebuildResourceMap() {}
  refreshActiveWorldChunks() {}
  checkAchievement() {}
  saveGame() {}
  closeModal() {}
  toast(message) { this.lastToast = message; }
  sound() {}
  showZoneBanner() {}
}

installFarmsteadExpansion(FarmsteadHarness);
const game = new FarmsteadHarness();
game.state = game.defaultState();
game.showFarmsteadPlan = () => {};

game.startFarmProject("southField");
assert.equal(game.state.coins, 500);
assert.equal(game.state.inventory.wood, 0);
assert.equal(game.state.storage.chests.trunk.items.wood, undefined);
assert.equal(game.state.inventory.stone, 0);
assert.equal(game.state.farmExpansion.project.id, "southField");
assert.equal(game.state.farmExpansion.project.daysRemaining, 1);

game.nextDay(false);
assert.equal(game.state.day, 2);
assert.deepEqual(game.state.farmExpansion.completed, ["southField"]);
assert.equal(game.state.farmExpansion.project, null);

game.state.soil = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`${4 + index},20`, { tilled: true, watered: false, crop: { type: "turnip", growth: 0 } }]));
assert.equal(game.processFarmsteadMorningWatering(), 16);
assert.equal(Object.values(game.state.soil).filter((soil) => soil.watered).length, 16);
assert.equal(game.state.farmExpansion.stats.autoWateredTiles, 16);

game.state.farmExpansion.completed.push("workshop", "greenhouse");
game.state.farmExpansion.greenhouseSoil = {
  "4,7": { tilled: true, watered: true, crop: { type: "turnip", growth: 0, plantedDay: 1, greenhouse: true } },
};
game.processGreenhouseDay();
assert.equal(game.state.farmExpansion.greenhouseSoil["4,7"].crop.growth, 1);
assert.equal(game.state.farmExpansion.greenhouseSoil["4,7"].watered, false);

game.state.farmExpansion.completed.push("irrigation", "greenhouseDeluxe");
game.processGreenhouseDay();
assert.equal(game.state.farmExpansion.greenhouseSoil["4,7"].crop.growth, 2.25);
assert.equal(game.state.farmExpansion.greenhouseSoil["4,7"].watered, true);

console.log(JSON.stringify({
  ok: true,
  storageMaterialConsumption: true,
  projectCompletion: true,
  outdoorIrrigationLimit: 16,
  protectedGrowth: true,
  deluxeGrowth: 1.25,
}));
