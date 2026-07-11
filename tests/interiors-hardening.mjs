import assert from "node:assert/strict";
import {
  installExpandedInteriorsRuntime, normalizeExpandedInteriorRuntime, safeInteriorReturnPoint,
} from "../game-expanded-interiors-runtime.js";

class InteriorRuntimeHarness {
  constructor() {
    this.state = null;
    this.refreshCount = 0;
    this.interactionCount = 0;
  }
  migrateState(data) {
    return {
      mode: data?.mode || "world",
      minutes: Number(data?.minutes) || 600,
      player: { x: Number(data?.player?.x) || 11.5, y: Number(data?.player?.y) || 15.5 },
      living: { interiorId: data?.living?.interiorId || null, worldReturn: data?.living?.worldReturn || null },
      interiors: data?.interiors || null,
      npcs: data?.npcs || [{ id: "mira", interiorId: "missing" }],
    };
  }
  enterGame() { this.entered = true; }
  leaveInterior() { this.state.mode = "world"; this.state.living.interiorId = null; }
  handleExpandedInteriorInteraction() { this.interactionCount += 1; }
  refreshInteriorNpcAssignments() { this.refreshCount += 1; }
  toast(message) { this.lastToast = message; }
}

installExpandedInteriorsRuntime(InteriorRuntimeHarness);
const game = new InteriorRuntimeHarness();

const resumed = game.migrateState({
  mode: "interior",
  minutes: 600,
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

game.state = {
  ...resumed,
  mode: "interior",
  minutes: 1100,
  living: { interiorId: "seedshop", worldReturn: { x: 68.5, y: 16.5 } },
};
game.handleExpandedInteriorInteraction({ id: "seedCounter" }, { id: "seedshop" });
assert.equal(game.interactionCount, 0, "Closed service counters must not open their shop action");
assert.match(game.lastToast, /closed/i);
game.state.minutes = 600;
game.handleExpandedInteriorInteraction({ id: "seedCounter" }, { id: "seedshop" });
assert.equal(game.interactionCount, 1, "Open service counters must call the original interaction");

game.state.minutes = 1100;
game.handleExpandedInteriorInteraction({ id: "cropCalendar" }, { id: "seedshop" });
assert.equal(game.interactionCount, 2, "Lore interactions should remain available after closing");

console.log(JSON.stringify({
  ok: true,
  correctExteriorResume: true,
  invalidReturnFallback: true,
  visitNormalization: true,
  staleAssignmentCleanup: true,
  indoorClosingRules: true,
}));
