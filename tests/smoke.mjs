import assert from "node:assert/strict";
import {
  WORLD_W,
  WORLD_H,
  REGIONS,
  NPC_DEFS,
  REGION_MONSTERS,
  generateResources,
  generateMonsters,
} from "../world.js";
import { generateCaveFloor, caveTier } from "../cave.js";

assert.equal(WORLD_W, 256, "World width must remain 256 tiles");
assert.equal(WORLD_H, 224, "World height must remain 224 tiles");
assert.equal(WORLD_W * WORLD_H, 57_344, "World must contain 57,344 tiles");
assert.equal(REGIONS.length, 14, "Expected 14 authored regions");
assert.equal(NPC_DEFS.length, 18, "Expected 18 named residents");

for (const [region, monsters] of Object.entries(REGION_MONSTERS)) {
  assert.equal(monsters.length, 3, `${region} must have three unique surface monsters`);
  assert.equal(new Set(monsters).size, 3, `${region} monster roster must not contain duplicates`);
}

const resources = generateResources(1);
const monsters = generateMonsters(1);
assert.ok(resources.length > 4_000, "Expanded continent should generate thousands of resources");
assert.ok(monsters.length >= 120, "Expanded continent should generate a broad monster population");

for (let floor = 1; floor <= 50; floor += 1) {
  const cave = generateCaveFloor(floor, 12345);
  assert.equal(cave.floor, floor);
  assert.ok(cave.tiles.length > 0, `Floor ${floor} must contain terrain`);
  assert.equal(cave.tier.id, caveTier(floor).id);
}

const hub = generateCaveFloor(1, 12345);
assert.equal(hub.merchants.length, 4, "Floor 1 must contain four expedition merchants/services");
const finalFloor = generateCaveFloor(50, 12345);
assert.ok(finalFloor.monsters.some((monster) => monster.type === "depthWarden"), "Floor 50 must contain the Depth Warden");

console.log(JSON.stringify({
  ok: true,
  tiles: WORLD_W * WORLD_H,
  regions: REGIONS.length,
  resources: resources.length,
  monsters: monsters.length,
  npcs: NPC_DEFS.length,
  caveFloors: 50,
  hubMerchants: hub.merchants.length,
}));
