import assert from "node:assert/strict";
import { CROPS } from "../game-shared.js";
import { cropStageFor, farmsteadFarmingArtTargets, installFarmsteadFarmingArt } from "../game-farmstead-farming-art.js";

for (const type of Object.keys(CROPS)) {
  const crop = CROPS[type];
  assert.equal(cropStageFor({ type, growth: 0 }), 0);
  assert.equal(cropStageFor({ type, growth: crop.days * .2 }), 1);
  assert.equal(cropStageFor({ type, growth: crop.days * .5 }), 2);
  assert.equal(cropStageFor({ type, growth: crop.days * .8 }), 3);
  assert.equal(cropStageFor({ type, growth: crop.days }), 4);
  assert.equal(cropStageFor({ type, growth: crop.days * 50 }), 4);
}
assert.equal(cropStageFor({ type: "forged", growth: 999 }), 0);
assert.equal(cropStageFor(null), 0);

const targets = farmsteadFarmingArtTargets();
assert.deepEqual(targets.cropTypes.sort(), Object.keys(CROPS).sort());
assert.equal(targets.placedTypes.includes("sprinkler"), true);
assert.equal(targets.placedTypes.includes("lantern"), true);
assert.equal(targets.placedTypes.includes("qualitySprinkler"), true);
assert.equal(targets.placedTypes.includes("hearthSprinkler"), true);
assert.equal(targets.placedTypes.includes("beeHouse"), true);
assert.equal(targets.placedTypes.includes("lightningRod"), true);
assert.equal(targets.placedTypes.includes("seedMaker"), true);
assert.deepEqual(targets.buildings.sort(), ["greenhouse", "workshop"]);
assert.equal(Number.isFinite(targets.shippingBin.x), true);
assert.equal(Number.isFinite(targets.projectBoard.y), true);

class Harness {
  drawCrop() { this.fallbackCrop = true; }
  drawPlaced() { this.fallbackPlaced = true; }
  drawBuildings() { this.fallbackBuildings = true; }
}
installFarmsteadFarmingArt(Harness);
assert.equal(typeof Harness.prototype.drawCrop, "function");
assert.equal(typeof Harness.prototype.drawPlaced, "function");
assert.equal(typeof Harness.prototype.drawBuildings, "function");

console.log(JSON.stringify({
  ok: true,
  cropTypes: targets.cropTypes.length,
  cropStages: 5,
  placedArtTypes: targets.placedTypes.length,
  serviceBuildings: targets.buildings.length,
  rendererHooks: 3,
}));
