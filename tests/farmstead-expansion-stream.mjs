import assert from "node:assert/strict";
import { FARM_BUILDINGS } from "../farmstead-expansion-data.js";
import { installFarmsteadStreamRuntime } from "../game-farmstead-stream-runtime.js";

class StreamHarness {
  constructor() {
    this.rebuilds = 0;
    this.state = {
      mode: "world",
      farmExpansion: { completed: ["southField", "workshop", "greenhouse"], project: null },
      resources: [], monsters: [], placed: [], soil: {},
    };
  }
  refreshActiveWorldChunks() {
    this.state.resources = [
      { id: "streamed-greenhouse-tree", x: FARM_BUILDINGS.greenhouse.x + 2.5, y: FARM_BUILDINGS.greenhouse.y + 2.5 },
      { id: "streamed-safe-tree", x: 5.5, y: 58.5 },
    ];
    this.state.monsters = [{ id: "streamed-workshop-monster", x: FARM_BUILDINGS.workshop.x + 2.5, y: FARM_BUILDINGS.workshop.y + 2.5 }];
    return "refreshed";
  }
  rebuildResourceMap() { this.rebuilds += 1; }
}

installFarmsteadStreamRuntime(StreamHarness);
const game = new StreamHarness();
const result = game.refreshActiveWorldChunks(true);
assert.equal(result, "refreshed");
assert.deepEqual(game.state.resources.map((entry) => entry.id), ["streamed-safe-tree"]);
assert.equal(game.state.monsters.length, 0);
assert.equal(game.rebuilds, 1);

console.log(JSON.stringify({
  ok: true,
  streamedBuildingConflictsRemoved: true,
  unrelatedResourcesPreserved: true,
  resourceMapRebuilt: true,
}));
