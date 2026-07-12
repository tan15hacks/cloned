import assert from "node:assert/strict";
import { clearAutomationStreamConflicts, installWorkshopAutomationStreamRuntime } from "../game-workshop-automation-stream-runtime.js";

const direct = {
  placed: [{ id: "automation:1", type: "beeHouse", x: 22.5, y: 25.5 }],
  resources: [
    { id: "blocked-tree", x: 22.5, y: 25.5 },
    { id: "safe-tree", x: 23.5, y: 25.5 },
  ],
  monsters: [{ id: "blocked-monster", x: 22.5, y: 25.5 }],
};
assert.equal(clearAutomationStreamConflicts(direct), 2);
assert.deepEqual(direct.resources.map((entry) => entry.id), ["safe-tree"]);
assert.equal(direct.monsters.length, 0);

class StreamHarness {
  constructor() {
    this.rebuilds = 0;
    this.state = {
      placed: [{ id: "automation:2", type: "qualitySprinkler", x: 24.5, y: 25.5 }],
      resources: [], monsters: [],
    };
  }
  refreshActiveWorldChunks() {
    this.state.resources = [
      { id: "generated-conflict", x: 24.5, y: 25.5 },
      { id: "generated-safe", x: 26.5, y: 25.5 },
    ];
    return "refreshed";
  }
  rebuildResourceMap() { this.rebuilds += 1; }
}

installWorkshopAutomationStreamRuntime(StreamHarness);
const game = new StreamHarness();
assert.equal(game.refreshActiveWorldChunks(true), "refreshed");
assert.deepEqual(game.state.resources.map((entry) => entry.id), ["generated-safe"]);
assert.equal(game.rebuilds, 1);

console.log(JSON.stringify({
  ok: true,
  exactTileConflictsRemoved: true,
  unrelatedResourcesPreserved: true,
  wrappedChunkRefresh: true,
}));
