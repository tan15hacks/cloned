import assert from "node:assert/strict";
import {
  FARMSTEAD_OBJECT_ATLAS_URI,
  FARMSTEAD_OBJECT_ATLAS_WIDTH,
  FARMSTEAD_OBJECT_ATLAS_HEIGHT,
  FARMSTEAD_OBJECT_SPRITES,
} from "../farmstead-object-art-data.js";
import {
  farmsteadObjectDestination,
  isFarmsteadFence,
  isFarmsteadObjectResource,
  installFarmsteadObjectArt,
} from "../game-farmstead-object-art.js";

const encoded = FARMSTEAD_OBJECT_ATLAS_URI.replace("data:image/png;base64,", "");
const png = Buffer.from(encoded, "base64");
assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
assert.equal(png.readUInt32BE(16), FARMSTEAD_OBJECT_ATLAS_WIDTH);
assert.equal(png.readUInt32BE(20), FARMSTEAD_OBJECT_ATLAS_HEIGHT);
assert.equal(png.subarray(-8, -4).toString("ascii"), "IEND");
assert.equal(FARMSTEAD_OBJECT_ATLAS_WIDTH, 448);
assert.equal(FARMSTEAD_OBJECT_ATLAS_HEIGHT, 232);

for (const [id, sprite] of Object.entries(FARMSTEAD_OBJECT_SPRITES)) {
  assert.equal(sprite.x >= 0 && sprite.y >= 0, true, `${id} must begin inside the atlas`);
  assert.equal(sprite.width > 0 && sprite.height > 0, true, `${id} must have a positive size`);
  assert.equal(sprite.x + sprite.width <= FARMSTEAD_OBJECT_ATLAS_WIDTH, true, `${id} must fit the atlas width`);
  assert.equal(sprite.y + sprite.height <= FARMSTEAD_OBJECT_ATLAS_HEIGHT, true, `${id} must fit the atlas height`);
}

assert.equal(isFarmsteadObjectResource({ type: "tree", x: 10.5, y: 20.5 }), true);
assert.equal(isFarmsteadObjectResource({ type: "fruitTree", x: 10.5, y: 20.5 }), true);
assert.equal(isFarmsteadObjectResource({ type: "rock", x: 10.5, y: 20.5 }), true);
assert.equal(isFarmsteadObjectResource({ type: "grass", x: 10.5, y: 20.5 }), false);
assert.equal(isFarmsteadObjectResource({ type: "tree", x: 70.5, y: 20.5 }), false);
assert.equal(isFarmsteadFence({ type: "fenceH", x: 17, y: 50, w: 6, h: 1 }), true);
assert.equal(isFarmsteadFence({ type: "fenceV", x: 48, y: 14, w: 1, h: 12 }), true);
assert.equal(isFarmsteadFence({ type: "fenceH", x: 80, y: 10, w: 5, h: 1 }), false);

assert.deepEqual(farmsteadObjectDestination("crate", 5.5, 6.5), {
  x: 160,
  y: 192,
  width: 32,
  height: 32,
});
const tree = farmsteadObjectDestination("tree", 5.5, 6.5);
assert.equal(tree.width, 96);
assert.equal(tree.height, 128);
const rock = farmsteadObjectDestination("rock", 5.5, 6.5);
assert.equal(rock.width, 49.6);
assert.equal(rock.height, 49.6);

class FallbackHarness {
  constructor() {
    this.state = { mode: "world" };
    this.activeChunkSignature = "ready";
    this.fallbacks = [];
  }
  enterGame() { this.fallbacks.push("enter"); }
  drawResource(_ctx, resource) { this.fallbacks.push(`resource:${resource.type}`); }
  drawWorldDecorations() { this.fallbacks.push("decorations"); }
  drawAuthoredStructures() { this.fallbacks.push("structures"); }
  drawBuildings() { this.fallbacks.push("buildings"); }
}
installFarmsteadObjectArt(FallbackHarness);
const fallback = new FallbackHarness();
fallback.enterGame();
fallback.drawResource({}, { type: "tree", x: 10.5, y: 20.5 });
fallback.drawWorldDecorations({}, [], false);
fallback.drawAuthoredStructures({}, { startX: 0, startY: 0, endX: 20, endY: 20 });
fallback.drawBuildings({}, { startX: 0, startY: 0, endX: 20, endY: 20 });
assert.deepEqual(fallback.fallbacks, ["enter", "resource:tree", "decorations", "structures", "buildings"]);

console.log(JSON.stringify({
  ok: true,
  atlasBytes: png.length,
  sprites: Object.keys(FARMSTEAD_OBJECT_SPRITES).length,
  farmhouseArt: true,
  treeArt: true,
  rockArt: true,
  fenceArt: true,
  crateArt: true,
  geometricFallback: true,
}));
