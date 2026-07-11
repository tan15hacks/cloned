import assert from "node:assert/strict";
import { installSeasonsRuntime } from "../game-seasons-runtime.js";

class Harness {
  migrateState(data) { return structuredClone(data); }
  enterGame() { this.entered = true; }
  finishFestival() { this.rewards = (this.rewards || 0) + 1; }
  openFestival() { this.opened = true; }
  clearFestivalTimer() { this.cleared = true; }
  toast() {}
}

installSeasonsRuntime(Harness);
const harness = new Harness();
harness.state = harness.migrateState({
  day: 7,
  seasons: {
    completedFestivals: [],
    festivalScores: { "y1:bloomfair": 150 },
    yearlySets: { 1: "invalid" },
  },
});
assert.equal(harness.state.seasons.festivalScores["y1:bloomfair"], 100);
assert.deepEqual(harness.state.seasons.yearlySets[1], []);

const festival = { id: "bloomfair", season: "spring", day: 7 };
harness.finishFestival(festival, 80);
assert.equal(harness.rewards, 1);
harness.state.seasons.completedFestivals.push("y1:bloomfair");
harness.finishFestival(festival, 80);
assert.equal(harness.rewards, 1, "A festival reward must only be issued once per year");
assert.equal(harness.opened, true);

console.log(JSON.stringify({ ok: true, duplicateRewardGuard: true, normalized: true }));
