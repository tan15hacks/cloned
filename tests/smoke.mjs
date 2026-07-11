import assert from "node:assert/strict";
import {
  WORLD_W,
  WORLD_H,
  REGIONS,
  NPC_DEFS,
  REGION_MONSTERS,
} from "../world.js";
import {
  CHUNK_SIZE,
  activeChunksForViewport,
  generateResourceChunk,
  generateMonsterChunk,
} from "../world-stream.js";
import {
  WORLD_MINUTES_PER_REAL_SECOND,
  CAVE_MINUTES_PER_REAL_SECOND,
} from "../game-performance.js";
import {
  CHAPTER_ONE_STEPS,
  createChapterOneState,
  chapterProgressValue,
} from "../chapter-one.js";
import { generateCaveFloor, caveTier } from "../cave.js";

assert.equal(WORLD_W, 256, "World width must remain 256 tiles");
assert.equal(WORLD_H, 224, "World height must remain 224 tiles");
assert.equal(WORLD_W * WORLD_H, 57_344, "World must contain 57,344 tiles");
assert.equal(REGIONS.length, 14, "Expected 14 authored regions");
assert.equal(NPC_DEFS.length, 18, "Expected 18 named residents");
assert.equal(CHUNK_SIZE, 16, "Streaming chunks must remain 16×16 tiles");

for (const [region, monsters] of Object.entries(REGION_MONSTERS)) {
  assert.equal(monsters.length, 3, `${region} must have three unique surface monsters`);
  assert.equal(new Set(monsters).size, 3, `${region} monster roster must not contain duplicates`);
}

const mobileChunks = activeChunksForViewport(11.5, 15.5, 390, 844);
assert.ok(mobileChunks.length > 0 && mobileChunks.length <= 16, "Mobile must load only nearby chunks");
const mobileResources = mobileChunks.flatMap(({ cx, cy }) => generateResourceChunk(1, cx, cy));
assert.ok(mobileResources.length > 0, "Nearby farm chunks must contain generated resources");
assert.ok(mobileResources.length < 1_000, "Mobile streaming must not generate the whole continent");

const dreadwild = REGIONS.find((region) => region.id === "dreadwild");
assert.ok(dreadwild, "Dreadwild must exist");
const dangerChunks = activeChunksForViewport(dreadwild.x + dreadwild.w / 2, dreadwild.y + dreadwild.h / 2, 390, 844);
const dangerMonsters = dangerChunks.flatMap(({ cx, cy }) => generateMonsterChunk(1, cx, cy));
assert.ok(dangerMonsters.length > 0, "Hostile local chunks must generate monsters");
assert.ok(dangerMonsters.length < 30, "Only local monsters should be active at once");

assert.equal(WORLD_MINUTES_PER_REAL_SECOND, 1.25, "Overworld clock rate changed unexpectedly");
assert.equal(CAVE_MINUTES_PER_REAL_SECOND, 0.75, "Cave clock rate changed unexpectedly");
assert.equal((1440 - 360) / WORLD_MINUTES_PER_REAL_SECOND / 60, 14.4, "Overworld day should last 14.4 real minutes");

const chapter = createChapterOneState();
assert.equal(CHAPTER_ONE_STEPS.length, 15, "Chapter 1 must contain 14 guided objectives and a completion state");
assert.equal(chapter.step, 0, "New games must begin at the first Chapter 1 objective");
chapter.step = 9;
chapter.counters.greenfieldKills = 2;
assert.deepEqual(chapterProgressValue(chapter, { cave: { maxFloor: 1 } }), { value: 2, goal: 3 }, "Greenfield patrol progress must be tracked");
chapter.step = 12;
assert.deepEqual(chapterProgressValue(chapter, { cave: { maxFloor: 3 } }), { value: 3, goal: 3 }, "Cave Floor 3 must complete the first descent objective");

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
  activeMobileChunks: mobileChunks.length,
  activeMobileResources: mobileResources.length,
  activeDangerMonsters: dangerMonsters.length,
  overworldDayMinutes: 14.4,
  chapterObjectives: CHAPTER_ONE_STEPS.length - 1,
  npcs: NPC_DEFS.length,
  caveFloors: 50,
  hubMerchants: hub.merchants.length,
}));
