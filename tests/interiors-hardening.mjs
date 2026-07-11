import assert from "node:assert/strict";
import {
  installExpandedInteriorsRuntime, normalizeExpandedInteriorRuntime, safeInteriorReturnPoint,
} from "../game-expanded-interiors-runtime.js";

class InteriorRuntimeHarness {
  constructor() {
    this.state = null;
    this.refreshCount = 0;
  }
  migrateState(data) {
    return {
      mode: data?.mode || "world",
      player: { x: Number(data?.player?.x) || 11.5, y: Number(data?.player?.y) || 15.5 },
      living: { interiorId: data?.living?.interiorId || null, worldReturn: data?.living?.worldReturn || null },
      interiors: data?.interiors || null,
      npcs: data?.npcs || [{ id: "mira", interiorId: "missing" }],
    };
  }
  enterGame() { this.entered = true; }
  leaveInterior() { this.state.mode = "world"; this.state.living.interiorId = null; }
  refreshInteriorNpcAssignments() { this.refreshCount += 1; }
}

installExpandedInteriorsRuntime(InteriorRuntimeHarness);
const game = new InteriorRuntimeHarness();

const resumed = game.migrateState({
  mode: "interior",
  player: { x: 15.5, y: 16.2 },
  living: { interiorId: "cityMarket", worldReturn: { x: 152.5, y: 18.5 } },
  interiors: {
    visited: ["cityMarket", "cityMarket", "missing"],
    visits: { cityMarket: 4.8, missing: 99, seedshop: -8 },
    lastInterior: "missing",
    recordsRead: ["city-overview", "city-overview", ""],
  },
  npcs: [{ id: "mira", interiorId: "missing" }],
});
assert.equal(resumed.mode, "world");
assert.equal(resumed.player.x, 152.5);
assert.equal(resumed.player.y, 18.5);
assert.equal(resumed.living.interiorId, null);
assert.equal(resumed.living.worldReturn, null);
assert.deepEqual(resumed.interiors.visited, ["cityMarket"]);
assert.equal(resumed.interiors.visits.cityMarket, 4);
assert.equal(resumed.interiors.visits.seedshop, 0);
assert.equal(resumed.interiors.lastInterior, null);
assert.deepEqual(resumed.interiors.recordsRead, ["city-overview"]);
assert.equal(resumed.npcs[0].interiorId, null);

const fallback = safeInteriorReturnPoint({
  mode: "interior",
  living: { interiorId: "seedshop", worldReturn: { x: -500, y: 9999 } },
});
assert.deepEqual(fallback, { x: 68.5, y: 16.5 });

const unknownFallback = safeInteriorReturnPoint({
  mode: "interior",
  living: { interiorId: "missing", worldReturn: null },
});
assert.deepEqual(unknownFallback, { x: 11.5, y: 15.5 });

game.state = resumed;
game.state.mode = "interior";
game.state.living.interiorId = "seedshop";
game.state.living.worldReturn = { x: 68.5, y: 16.5 };
game.leaveInterior();
assert.equal(game.state.mode, "world");
assert.equal(game.state.living.worldReturn, null);
assert.equal(game.refreshCount, 1);

const normalized = normalizeExpandedInteriorRuntime({
  interiors: { visited: "bad", visits: null, lastInterior: "guild", recordsRead: null },
  living: { interiorId: "guild", worldReturn: { x: 130.5, y: 19.5 } },
  npcs: [],
});
assert.deepEqual(normalized.interiors.visited, []);
assert.equal(normalized.interiors.lastInterior, "guild");
assert.deepEqual(normalized.living.worldReturn, { x: 130.5, y: 19.5 });

console.log(JSON.stringify({
  ok: true,
  correctExteriorResume: true,
  invalidReturnFallback: true,
  visitNormalization: true,
  staleAssignmentCleanup: true,
}));
