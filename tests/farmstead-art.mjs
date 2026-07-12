import assert from "node:assert/strict";
import {
  FARMSTEAD_ART_TILE, FARMSTEAD_ART_ATLAS_WIDTH, FARMSTEAD_ART_ATLAS_HEIGHT,
  FARMSTEAD_ART_ATLAS_BASE64, FARMSTEAD_ART_ATLAS_URI, FARMSTEAD_ART_MASKS,
  FARMSTEAD_ART_MASK_INDEX,
} from "../farmstead-art-data.js";
import {
  canonicalFarmsteadMask, farmsteadAtlasSource, farmsteadGrassSource,
  shouldDrawFarmsteadFlowers, stableFarmsteadHash,
} from "../game-farmstead-art.js";

assert.equal(FARMSTEAD_ART_TILE, 32);
assert.equal(FARMSTEAD_ART_ATLAS_WIDTH, 512);
assert.equal(FARMSTEAD_ART_ATLAS_HEIGHT, 384);
assert.equal(FARMSTEAD_ART_MASKS.length, 47);
assert.equal(new Set(FARMSTEAD_ART_MASKS).size, 47);
assert.equal(FARMSTEAD_ART_ATLAS_BASE64.length, 24796);
assert.equal(FARMSTEAD_ART_ATLAS_URI.startsWith("data:image/png;base64,iVBORw0KGgo"), true);

const atlasBytes = Buffer.from(FARMSTEAD_ART_ATLAS_BASE64, "base64");
assert.equal(atlasBytes.length, 18596);
assert.deepEqual([...atlasBytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
assert.deepEqual([...atlasBytes.subarray(-12)], [0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

for (const mask of FARMSTEAD_ART_MASKS) {
  assert.equal(Number.isInteger(FARMSTEAD_ART_MASK_INDEX[mask]), true);
  for (const setName of ["path", "soilDry", "soilWatered"]) {
    const source = farmsteadAtlasSource(setName, mask);
    assert.ok(source);
    assert.equal(source.width, 32);
    assert.equal(source.height, 32);
    assert.ok(source.x >= 0 && source.x + source.width <= FARMSTEAD_ART_ATLAS_WIDTH);
    assert.ok(source.y >= 0 && source.y + source.height <= FARMSTEAD_ART_ATLAS_HEIGHT);
  }
}

const occupied = new Set([
  "0,0", "1,0", "2,0",
  "0,1", "1,1", "2,1",
  "0,2", "1,2", "2,2",
]);
assert.equal(canonicalFarmsteadMask(1, 1, (x, y) => occupied.has(`${x},${y}`)), 255);

const cross = new Set(["1,1", "1,0", "2,1", "1,2", "0,1"]);
assert.equal(canonicalFarmsteadMask(1, 1, (x, y) => cross.has(`${x},${y}`)), 15);

const invalidDiagonal = new Set(["1,1", "2,0"]);
assert.equal(canonicalFarmsteadMask(1, 1, (x, y) => invalidDiagonal.has(`${x},${y}`)), 0);

const corner = new Set(["1,1", "1,0", "2,1", "2,0"]);
assert.equal(canonicalFarmsteadMask(1, 1, (x, y) => corner.has(`${x},${y}`)), 19);

assert.equal(stableFarmsteadHash(12, 24, 17), stableFarmsteadHash(12, 24, 17));
assert.notEqual(stableFarmsteadHash(12, 24, 17), stableFarmsteadHash(13, 24, 17));
assert.deepEqual(farmsteadGrassSource(9, 8), farmsteadGrassSource(9, 8));
assert.equal(typeof shouldDrawFarmsteadFlowers(9, 8), "boolean");

console.log(JSON.stringify({
  ok: true,
  embeddedAtlasBytes: atlasBytes.length,
  blobMasks: FARMSTEAD_ART_MASKS.length,
  atlasSets: 3,
  canonicalDiagonalRules: true,
  deterministicGrass: true,
}));
