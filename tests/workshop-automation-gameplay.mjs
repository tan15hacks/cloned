import assert from "node:assert/strict";
import { ITEMS, CROPS, keyOf } from "../game-shared.js";
import { createStorageState } from "../inventory-storage-data.js";
import { createFarmExpansionState } from "../farmstead-expansion-data.js";
import {
  createAutomationState, createAutomationDevice,
} from "../workshop-automation-data.js";
import { installWorkshopAutomation } from "../game-workshop-automation.js";

class AutomationHarness {
  constructor() {
    this.nextTarget = { x: 22, y: 25 };
    this.messages = [];
  }
  defaultState() {
    const inventory = Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0]));
    inventory.wood = 5;
    inventory.stone = 20;
    inventory.copper = 8;
    inventory.iron = 4;
    const state = {
      day: 1, weather: "Clear", mode: "world", coins: 5000,
      player: { x: 22.5, y: 26.5, facing: "up", energy: 100, maxEnergy: 100 },
      inventory, storage: null, placed: [], soil: {}, resources: [],
      farmExpansion: createFarmExpansionState({ completed: ["southField", "workshop", "greenhouse", "irrigation"] }, { day: 1 }),
      automation: createAutomationState(), journal: [], achievements: [],
      progression: { skillLevels: { farming: 5 } },
    };
    state.storage = createStorageState({}, state);
    state.storage.chests.trunk.items.wood = 15;
    state.storage.chests.trunk.qualities.wood = { normal: 15, silver: 0, gold: 0, iridium: 0 };
    return state;
  }
  migrateState(data) { return { ...this.defaultState(), ...data }; }
  enterGame() {}
  nextDay() {
    for (const soil of Object.values(this.state.soil)) {
      if (soil.crop && soil.watered) soil.crop.growth += 1;
      soil.watered = false;
    }
    this.state.day += 1;
  }
  interact() {}
  updateContextHint() {}
  drawPlaced() {}
  openFarmWorkshop() {}
  toggleGameMenu() {}
  targetTile() { return { ...this.nextTarget }; }
  currentResourceAt() { return null; }
  placedAt(x, y) { return this.state.placed.find((entry) => Math.floor(entry.x) === x && Math.floor(entry.y) === y); }
  addItem(id, amount) { this.state.inventory[id] = (this.state.inventory[id] || 0) + amount; }
  checkAchievement() {}
  saveGame() {}
  closeModal() {}
  sound() {}
  toast(message) { this.messages.push(message); }
}

installWorkshopAutomation(AutomationHarness);
const game = new AutomationHarness();
game.state = game.defaultState();
game.showAutomationWorkshop = () => {};

game.craftAutomationBlueprint("qualitySprinkler");
assert.equal(game.state.inventory.qualitySprinklerKit, 1);
assert.equal(game.state.inventory.wood, 0);
assert.equal(game.state.storage.chests.trunk.items.wood, undefined);
assert.equal(game.state.inventory.stone, 0);
assert.equal(game.state.inventory.copper, 0);
assert.equal(game.state.inventory.iron, 0);
assert.equal(game.state.automation.stats.crafted, 1);
assert.deepEqual(game.state.automation.knownBlueprints, ["qualitySprinkler"]);

game.placeAutomationDevice("qualitySprinkler");
assert.equal(game.state.inventory.qualitySprinklerKit, 0);
assert.equal(game.state.placed.length, 1);
assert.equal(game.state.placed[0].type, "qualitySprinkler");
assert.equal(game.state.placed[0].x, 22.5);
assert.equal(game.state.automation.stats.placed, 1);

for (const [dx, dy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]) {
  game.state.soil[keyOf(22 + dx, 25 + dy)] = { tilled: true, watered: false, crop: { type: "turnip", growth: 0 } };
}
game.nextDay(false);
assert.equal(game.state.day, 2);
assert.equal(Object.values(game.state.soil).every((soil) => soil.crop.growth === 1), true, "Sprinklers must water before daily crop growth");
assert.equal(game.state.automation.stats.tilesWatered, 8);

const bee = createAutomationDevice("beeHouse", 34, 26, 1, "bee");
game.state.placed.push(bee);
for (const [x, y] of [[33,25],[34,25],[35,25],[35,26]]) game.state.soil[keyOf(x, y)] = { tilled: true, watered: false, crop: { type: "berry", growth: CROPS.berry.days } };
game.state.day = 2;
game.state.weather = "Clear";
game.processAutomationMorning();
assert.deepEqual(bee.output, { id: "wildHoney", amount: 2 });
game.collectAutomationOutput(bee);
assert.equal(game.state.inventory.wildHoney, 2);
assert.equal(game.state.automation.stats.honeyCollected, 2);

const rod = createAutomationDevice("lightningRod", 36, 27, 3, "rod");
game.state.placed.push(rod);
game.state.day = 3;
game.state.weather = "Sparkfall";
game.processAutomationMorning();
assert.deepEqual(rod.output, { id: "batteryCell", amount: 1 });
game.collectAutomationOutput(rod);
assert.equal(game.state.inventory.batteryCell, 1);
assert.equal(game.state.automation.stats.batteriesCollected, 1);

const maker = createAutomationDevice("seedMaker", 37, 27, 4, "maker");
maker.input = { crop: "turnip", item: "turnip" };
maker.readyDay = 5;
game.state.placed.push(maker);
game.state.day = 4;
game.state.weather = "Clear";
game.processAutomationMorning();
assert.equal(maker.input, null);
assert.deepEqual(maker.output, { id: "turnipSeed", amount: 3 });
game.collectAutomationOutput(maker);
assert.equal(game.state.inventory.turnipSeed, 3);
assert.equal(game.state.automation.stats.seedsMade, 3);

console.log(JSON.stringify({
  ok: true,
  storageCrafting: true,
  placedDevice: game.state.placed[0].type,
  sprinklerGrowthOrder: true,
  honeyYield: 2,
  sparkBattery: 1,
  seedsProduced: 3,
}));
