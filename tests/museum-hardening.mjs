import assert from "node:assert/strict";
import "../museum-data.js";
import { hardenMuseumState } from "../game-museum-runtime.js";

const state = {
  day: 12,
  inventory: {},
  journal: { forged: true },
  visitedRegions: ["farm", "farm", "moonlake", "missing-region", 42],
  fishing: { journal: [] },
  cooking: { stats: { uniqueRecipesCooked: "not-an-array" } },
  museum: {
    donated: {},
    rewardedBundles: [],
    completedBundles: [],
    visits: 0,
    lastDonationDay: 0,
  },
};

hardenMuseumState(state);
assert.deepEqual(state.journal, []);
assert.deepEqual(state.visitedRegions, ["farm", "moonlake"]);
assert.deepEqual(state.fishing.journal, {});
assert.deepEqual(state.cooking.stats.uniqueRecipesCooked, []);
assert.ok(state.museum && typeof state.museum === "object");

const missing = { day: 1, inventory: {}, visitedRegions: null, fishing: null, cooking: null, museum: null };
hardenMuseumState(missing);
assert.deepEqual(missing.visitedRegions, ["farm"]);
assert.deepEqual(missing.journal, []);
assert.deepEqual(missing.fishing.journal, {});
assert.deepEqual(missing.cooking.stats.uniqueRecipesCooked, []);

console.log(JSON.stringify({
  ok: true,
  malformedJournalSafe: true,
  canonicalVisitedRegions: true,
  fishingJournalSafe: true,
  cookingHistorySafe: true,
}));
