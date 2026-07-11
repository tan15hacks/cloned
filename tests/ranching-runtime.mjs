import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { installRanching } from "../game-ranch-core.js";
import { installRanchingRender } from "../game-ranch-render.js";
import { installRanchingUI } from "../game-ranch-ui-main.js";
import { installRanchingMachines } from "../game-ranch-machines.js";
import { createAnimal, MACHINE_DEFS } from "../ranch-data.js";

class RanchRuntimeHarness {
  defaultState() {
    return {
      day: 1,
      minutes: 600,
      mode: "world",
      weather: "Clear",
      tomorrowWeather: "Clear",
      player: { x: 5, y: 25, energy: 100, maxEnergy: 100 },
      inventory: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])),
      coins: 99999,
      soil: {},
      resources: [{ id: "pasture-conflict", x: 4.5, y: 23.5 }],
      monsters: [],
      progression: { adventureLevel: 10, skillLevels: { farming: 10 } },
      beacon: { level: 0 },
      stats: { totalEarned: 0 },
      journal: [],
      achievements: [],
    };
  }
  migrateState(data) {
    const base = this.defaultState();
    return { ...base, ...data, player: { ...base.player, ...(data?.player || {}) }, inventory: { ...base.inventory, ...(data?.inventory || {}) } };
  }
  enterGame() {}
  update(dt) { this.state.minutes += dt * 1.25; }
  nextDay() { this.state.day += 1; this.state.minutes = 360; }
  interact() {}
  openBuildingService() {}
  updateContextHint() {}
  drawWorld() {}
  collides() { return false; }
  targetTile() { return { x: 4, y: 23 }; }
  visibleBounds() { return { startX: 0, endX: 60, startY: 0, endY: 70 }; }
  addItem(id, amount = 1) { this.state.inventory[id] = (this.state.inventory[id] || 0) + amount; }
  spendEnergy(amount) { this.state.player.energy -= amount; }
  awardSkillXp() { this.skillAwarded = true; }
  awardAdventureXp() { this.adventureAwarded = true; }
  checkAchievement(id, condition) { if (condition && !this.state.achievements.includes(id)) this.state.achievements.push(id); }
  sound() {}
  toast(message) { this.lastToast = message; }
  saveGame() {}
  closeModal() {}
  openModal() {}
  toggleGameMenu() {}
  showHowToPlay() {}
  rebuildResourceMap() { this.resourceMapRebuilt = true; }
}

installRanching(RanchRuntimeHarness);
installRanchingRender(RanchRuntimeHarness);
installRanchingUI(RanchRuntimeHarness);
installRanchingMachines(RanchRuntimeHarness);

const game = new RanchRuntimeHarness();
game.state = game.defaultState();
game.enterGame();
assert.ok(game.state.ranch, "Ranch state must initialize");
assert.equal(game.state.resources.length, 0, "Pasture resource conflicts must be removed");

game.state.ranch.buildings.coop.level = 3;
const chicken = createAnimal("chicken", "animal-1", 1, "Pip");
chicken.ageDays = 5;
chicken.fedToday = true;
chicken.pettedDay = 1;
chicken.friendship = 9;
chicken.happiness = 95;
chicken.wasOutsideToday = true;
game.state.ranch.animals.push(chicken);
game.nextDay(false);
assert.equal(game.state.day, 2);
assert.ok(chicken.productReady || game.state.inventory.egg > 0, "A mature cared-for chicken should produce");

game.state.ranch.incubator = { species: "chicken", daysRemaining: 1, ready: false };
game.nextDay(false);
assert.equal(game.state.ranch.incubator, null, "Incubator should hatch when space is available");
assert.equal(game.state.ranch.animals.length, 2);

game.state.ranch.machines.mayonnaise.count = 1;
game.state.ranch.machines.mayonnaise.slots = [{ input: "egg", output: "mayonnaise", quality: "gold", remaining: 1, ready: false }];
game.update(1);
assert.equal(game.state.ranch.machines.mayonnaise.slots[0].ready, true, "Machines should advance with game time");

assert.equal(game.collides(40, 6, .3), true, "Constructed coop must have collision");
assert.equal(game.collides(5, 25, .3), false, "Pasture must remain walkable");

console.log(JSON.stringify({
  ok: true,
  animals: game.state.ranch.animals.length,
  machines: Object.keys(MACHINE_DEFS).length,
  day: game.state.day,
  spawnClear: true,
  incubation: true,
}));
