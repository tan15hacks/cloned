import assert from "node:assert/strict";
import { hardenWorkshopAutomationState } from "../game-workshop-automation-runtime.js";

const state = {
  day: 10,
  inventory: {},
  storage: { chests: {} },
  soil: { "25,25": { tilled: true } },
  automation: {
    knownBlueprints: ["qualitySprinkler", "forged"],
    stats: { crafted: 4, placed: 1, tilesWatered: 12, honeyCollected: -5, batteriesCollected: 2, seedsMade: 8 },
  },
  placed: [
    { id: "lantern:1", type: "lantern", x: 24.5, y: 25.5 },
    { id: "automation:shared", type: "qualitySprinkler", x: 22.2, y: 25.9, placedDay: -4 },
    { id: "automation:shared", type: "seedMaker", x: 23.5, y: 25.5, placedDay: 8, input: { crop: "turnip", item: "turnip" }, output: { id: "turnipSeed", amount: 0 }, readyDay: 2 },
    { id: "automation:duplicate-tile", type: "beeHouse", x: 22.5, y: 25.5, nextReadyDay: 2, output: { id: "sparkHoney", amount: 2 } },
    { id: "automation:soil", type: "lightningRod", x: 25.5, y: 25.5, output: { id: "batteryCell", amount: 1 } },
    { id: "automation:outside", type: "beeHouse", x: 200.5, y: 200.5 },
    { id: "automation:infinite", type: "hearthSprinkler", x: Number.POSITIVE_INFINITY, y: 25.5 },
  ],
};

const result = hardenWorkshopAutomationState(state);
assert.equal(result.removed, 4);
assert.equal(state.placed.length, 3);
assert.equal(state.placed[0].type, "lantern");
const sprinkler = state.placed.find((entry) => entry.type === "qualitySprinkler");
const maker = state.placed.find((entry) => entry.type === "seedMaker");
assert.equal(sprinkler.x, 22.5);
assert.equal(sprinkler.y, 25.5);
assert.equal(sprinkler.placedDay, 1);
assert.equal(maker.output, null, "Zero-sized imported output must be rejected");
assert.deepEqual(maker.input, { crop: "turnip", item: "turnip" });
assert.equal(maker.readyDay, 2);
assert.notEqual(maker.id, sprinkler.id, "Duplicate automation IDs must be rewritten");
assert.deepEqual(state.automation.knownBlueprints.sort(), ["qualitySprinkler", "seedMaker"]);
assert.equal(state.automation.stats.honeyCollected, 0);
assert.equal(state.automation.stats.placed >= 2, true);

const malicious = {
  day: 3,
  soil: {},
  placed: [
    { id: "automation:bad-output", type: "lightningRod", x: 22.5, y: 25.5, output: { id: "gold", amount: 999 } },
    { id: "automation:bad-input", type: "seedMaker", x: 23.5, y: 25.5, input: { crop: "forged", item: "turnip" }, readyDay: 1 },
  ],
  automation: {},
};
hardenWorkshopAutomationState(malicious);
assert.equal(malicious.placed[0].output, null);
assert.equal(malicious.placed[1].input, null);
assert.equal(malicious.placed[1].readyDay, 0);

console.log(JSON.stringify({
  ok: true,
  invalidDevicesRemoved: result.removed,
  duplicateIdsRewritten: true,
  zeroOutputsRejected: true,
  forgedOutputsRejected: true,
  forgedInputsRejected: true,
}));
