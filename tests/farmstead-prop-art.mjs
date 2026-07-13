import assert from "node:assert/strict";
import { BUILDINGS, regionAt } from "../game-shared.js";
import { AUTHORED_STRUCTURES } from "../world-polish-data.js";
import { farmsteadPropArtTargets, installFarmsteadPropArt } from "../game-farmstead-prop-art.js";

const targets = farmsteadPropArtTargets();
assert.equal(targets.farmhouse?.id, "farmhouse");
assert.equal(regionAt(targets.farmhouse.x, targets.farmhouse.y).id, "farm");
assert.equal(targets.fences.length > 0, true);
assert.equal(targets.fences.every((entry) => entry.type.startsWith("fence")), true);
assert.equal(targets.fences.every((entry) => regionAt(entry.x, entry.y).id === "farm"), true);

class Harness {
  drawResource() { this.fallbackResource = true; }
  drawBuildings() { this.fallbackBuildings = true; }
  drawWorldDecorations() { this.fallbackDecorations = true; }
  drawAuthoredStructures() { this.fallbackStructures = true; }
}
installFarmsteadPropArt(Harness);
assert.equal(typeof Harness.prototype.drawResource, "function");
assert.equal(typeof Harness.prototype.drawBuildings, "function");
assert.equal(typeof Harness.prototype.drawWorldDecorations, "function");
assert.equal(typeof Harness.prototype.drawAuthoredStructures, "function");
assert.equal(BUILDINGS.some((entry) => entry.id === "farmhouse"), true);
assert.equal(AUTHORED_STRUCTURES.length > 0, true);

console.log(JSON.stringify({
  ok: true,
  farmhouse: targets.farmhouse.id,
  farmFences: targets.fences.length,
  rendererHooks: 4,
}));
