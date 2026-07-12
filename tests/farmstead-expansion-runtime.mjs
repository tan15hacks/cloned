import assert from "node:assert/strict";
import { CROPS } from "../game-shared.js";
import { FARM_BUILDINGS } from "../farmstead-expansion-data.js";
import { hardenFarmsteadExpansionState } from "../game-farmstead-expansion-runtime.js";

const state = {
  day: 12,
  mode: "world",
  player: { x: FARM_BUILDINGS.greenhouse.x + 2, y: FARM_BUILDINGS.greenhouse.y + 2 },
  resources: [
    { id: "inside-greenhouse", x: FARM_BUILDINGS.greenhouse.x + 1.5, y: FARM_BUILDINGS.greenhouse.y + 1.5 },
    { id: "safe-resource", x: 4.5, y: 58.5 },
  ],
  monsters: [{ id: "inside-workshop", x: FARM_BUILDINGS.workshop.x + 1.5, y: FARM_BUILDINGS.workshop.y + 1.5 }],
  placed: [{ type: "lantern", x: FARM_BUILDINGS.greenhouse.x + 2.5, y: FARM_BUILDINGS.greenhouse.y + 2.5 }],
  soil: { "41,54": { tilled: true }, "6,20": { tilled: true } },
  farmExpansion: {
    completed: ["southField", "workshop", "greenhouse", "irrigation", "forged-project"],
    project: { id: "greenhouseDeluxe", daysRemaining: 999, startedDay: 999 },
    greenhouseSoil: {
      "4,7": { tilled: true, watered: false, crop: { type: "turnip", growth: Number.POSITIVE_INFINITY, plantedDay: -8 } },
      "18,7": { tilled: true, watered: true, crop: { type: "moonbean", growth: 2, plantedDay: 8 } },
      "99,99": { tilled: true, crop: { type: "turnip", growth: 1 } },
      "5,7": { tilled: true, crop: { type: "forgedCrop", growth: 1 } },
    },
    stats: { greenhouseHarvests: Number.POSITIVE_INFINITY, greenhouseCropsPlanted: -2, autoWateredTiles: 25 },
  },
};

hardenFarmsteadExpansionState(state);
assert.deepEqual(state.farmExpansion.completed, ["southField", "workshop", "greenhouse", "irrigation"]);
assert.equal(state.farmExpansion.project.id, "greenhouseDeluxe");
assert.equal(state.farmExpansion.project.daysRemaining, 4);
assert.equal(state.farmExpansion.project.startedDay, 12);
assert.equal(state.farmExpansion.greenhouseSoil["4,7"].watered, true, "Irrigation should restore greenhouse watering");
assert.equal(state.farmExpansion.greenhouseSoil["4,7"].crop.growth, 0, "Non-finite crop growth must be rejected");
assert.equal(state.farmExpansion.greenhouseSoil["4,7"].crop.plantedDay, 1);
assert.equal(state.farmExpansion.greenhouseSoil["18,7"], undefined, "Deluxe plots stay locked until the project completes");
assert.equal(state.farmExpansion.greenhouseSoil["99,99"], undefined);
assert.equal(state.farmExpansion.greenhouseSoil["5,7"].crop, null);
assert.equal(state.farmExpansion.stats.greenhouseHarvests, 0);
assert.equal(state.farmExpansion.stats.greenhouseCropsPlanted, 0);
assert.equal(state.resources.some((entry) => entry.id === "inside-greenhouse"), false);
assert.equal(state.resources.some((entry) => entry.id === "safe-resource"), true);
assert.equal(state.monsters.length, 0);
assert.equal(state.placed.length, 0);
assert.equal(state.soil["41,54"], undefined);
assert.equal(state.soil["6,20"].tilled, true);
assert.equal(CROPS.turnip.days > 0, true);

const forged = {
  day: 5, resources: [], monsters: [], placed: [], soil: {},
  farmExpansion: {
    completed: ["southField", "greenhouse", "irrigation", "greenhouseDeluxe"],
    project: { id: "greenhouseDeluxe", daysRemaining: 1, startedDay: 5 },
    greenhouseSoil: { "18,7": { tilled: true, crop: { type: "berry", growth: 2 } } },
  },
};
hardenFarmsteadExpansionState(forged);
assert.deepEqual(forged.farmExpansion.completed, ["southField"], "Non-contiguous imported project completion must be rejected");
assert.equal(forged.farmExpansion.project, null);
assert.deepEqual(forged.farmExpansion.greenhouseSoil, {});

console.log(JSON.stringify({
  ok: true,
  dependencyChainProtected: true,
  greenhousePlotsValidated: true,
  nonFiniteValuesRejected: true,
  constructionSitesCleared: true,
}));
