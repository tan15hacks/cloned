import assert from "node:assert/strict";
import { installExpandedInteriors } from "../game-expanded-interiors.js";
import { INTERIOR_MAPS } from "../living-world-data.js";

class InteriorHarness {
  constructor() {
    this.state = this.defaultState();
    this.screen = { width: 480, height: 320 };
    this.camera = { x: 0, y: 0 };
    this.currentRegion = "village";
  }
  defaultState() {
    return {
      day: 1, minutes: 600, weather: "Clear", tomorrowWeather: "Cloudy", mode: "world",
      player: { x: 68.5, y: 16.5 }, living: { interiorId: null, worldReturn: null },
      npcs: [
        { id: "mira", name: "Mira", x: 68.5, y: 16.5, lines: ["Hello"], friendship: 0 },
        { id: "bram", name: "Bram", x: 172.5, y: 18.5, lines: ["Forge"], friendship: 0 },
        { id: "rowan", name: "Rowan", x: 129.5, y: 61.5, lines: ["Welcome"], friendship: 0 },
      ],
      journal: [], visitedRegions: ["farm", "village"], completedQuests: [],
      guild: { completed: 0 }, upgrades: { toolPower: 1, weaponPower: 1, armor: 0 },
      interiors: null,
    };
  }
  migrateState(data) { return { ...this.defaultState(), ...data, living: { ...this.defaultState().living, ...(data?.living || {}) } }; }
  enterGame() {}
  enterInterior(id, building) { this.state.mode = "interior"; this.state.living.interiorId = id; this.state.living.worldReturn = { x: building.door.x + .5, y: building.door.y + 1.5 }; const map = INTERIOR_MAPS[id]; this.state.player.x = map.exit.x; this.state.player.y = map.exit.y - 1.2; }
  leaveInterior() { this.state.mode = "world"; this.state.living.interiorId = null; }
  openBuildingService(building) { this.fallbackService = building.id; }
  updateNpcSchedules() {}
  updateInterior() {}
  drawNPCs() { this.drawnNpcIds = this.state.npcs.map((npc) => npc.id); }
  interact() { this.interacted = true; }
  interactInterior() { this.oldInteriorInteraction = true; }
  updateCamera() {}
  updateContextHint() {}
  toggleGameMenu() {}
  showHowToPlay() {}
  startActionAnimation() {}
  talkToNPC(npc) { this.talkedTo = npc.id; }
  openSeedShop() { this.serviceOpened = "seedshop"; }
  openInn(city) { this.serviceOpened = city ? "cityInn" : "villageInn"; }
  openBlacksmith(city) { this.serviceOpened = city ? "blacksmith" : "workshop"; }
  openApothecary() { this.serviceOpened = "apothecary"; }
  openMarket() { this.serviceOpened = "market"; }
  openObservatory() { this.serviceOpened = "observatory"; }
  openCityHall() { this.serviceOpened = "cityHall"; }
  showWorldMap() { this.serviceOpened = "worldMap"; }
  openModal() {}
  closeModal() {}
  toast(message) { this.lastToast = message; }
}

installExpandedInteriors(InteriorHarness);
const game = new InteriorHarness();
game.state = game.defaultState();
game.enterGame();
assert.ok(game.state.interiors);
assert.equal(game.state.npcs.find((npc) => npc.id === "mira").interiorId, "seedshop");

const seedBuilding = { id: "seedshop", name: "Mira's Seeds", service: "seedshop", door: { x: 68, y: 15 } };
game.openBuildingService(seedBuilding);
assert.equal(game.state.mode, "interior");
assert.equal(game.state.living.interiorId, "seedshop");
assert.equal(game.state.interiors.visited.includes("seedshop"), true);
assert.equal(game.state.interiors.visits.seedshop, 1);

game.handleExpandedInteriorInteraction({ id: "seedCounter" }, INTERIOR_MAPS.seedshop);
assert.equal(game.serviceOpened, "seedshop");

game.state.mode = "world";
game.state.living.interiorId = null;
game.state.minutes = 1100;
game.openBuildingService(seedBuilding);
assert.match(game.lastToast, /closed/i);

game.state.minutes = 600;
game.refreshInteriorNpcAssignments();
game.drawNPCs({}, {});
assert.equal(game.drawnNpcIds.includes("mira"), false, "Indoor workers must not render on the street");
assert.equal(game.drawnNpcIds.includes("rowan"), false, "Rowan should be working inside the city inn at 10:00 AM");

game.state.mode = "interior";
game.state.living.interiorId = "cityHall";
game.state.player = { x: 16.5, y: 18.3 };
game.updateCamera();
assert.ok(Number.isFinite(game.camera.x) && Number.isFinite(game.camera.y));

const migrated = game.migrateState({ interiors: { visited: ["seedshop", "missing"], visits: { seedshop: 4, missing: 99 }, lastInterior: "missing" } });
assert.deepEqual(migrated.interiors.visited, ["seedshop"]);
assert.equal(migrated.interiors.visits.seedshop, 4);
assert.equal(migrated.interiors.lastInterior, null);

console.log(JSON.stringify({
  ok: true,
  entry: true,
  closedHours: true,
  indoorNpcHiding: true,
  services: true,
  saveMigration: true,
}));
