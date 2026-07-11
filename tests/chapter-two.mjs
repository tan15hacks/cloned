import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { EQUIPMENT_DEFS } from "../game-combat.js";
import {
  CHAPTER_TWO_STEPS,
  SURFACE_RUNES,
  STABILIZER_COST,
  STORY_DUNGEON_W,
  STORY_DUNGEON_H,
  chapterTwoEligible,
  chapterTwoProgress,
  createChapterTwoState,
  generateStoryDungeon,
} from "../chapter-two-data.js";

assert.equal(CHAPTER_TWO_STEPS.length, 18, "Chapter 2 must contain 17 objectives and a completion state");
assert.equal(SURFACE_RUNES.length, 3, "Suncleft must contain three surface rune objectives");
assert.equal(Object.keys(STABILIZER_COST).length, 4, "The stabilizer must require four material categories");
assert.equal(ITEMS.riftFragment.name, "Rift Fragment", "Chapter 2 must register Rift Fragments");
assert.equal(EQUIPMENT_DEFS.riftCompass.slot, "charm", "The Rift Compass must be a charm");

assert.equal(chapterTwoEligible({
  chapterOne: { completed: true },
  progression: { adventureLevel: 4, bossRewards: [10] },
}), true, "Chapter 2 should unlock after Chapter 1, Adventure Level 4, and Floor 10");
assert.equal(chapterTwoEligible({
  chapterOne: { completed: true },
  progression: { adventureLevel: 3, bossRewards: [10] },
}), false, "Adventure Level 3 must not unlock Chapter 2");

const chapter = createChapterTwoState();
assert.equal(chapter.started, false);
assert.equal(chapter.dungeon.switches.length, 0);
chapter.step = 3;
chapter.counters.mistKills = 2;
assert.deepEqual(chapterTwoProgress(chapter, { inventory: {} }), { value: 2, goal: 4 });

const dungeon = generateStoryDungeon(chapter.dungeon);
assert.equal(dungeon.width, STORY_DUNGEON_W);
assert.equal(dungeon.height, STORY_DUNGEON_H);
assert.equal(dungeon.switches.length, 3, "The Archive must contain three switches");
assert.equal(dungeon.gates.length, 4, "The Archive must contain three rune gates and one boss gate");
assert.equal(dungeon.notes.length, 3, "The Archive must contain environmental story notes");
assert.equal(dungeon.traps.length, 7, "The Archive must contain moving spike traps");
assert.ok(dungeon.monsters.some((monster) => monster.storyName === "Rift Slime"));
assert.ok(dungeon.monsters.some((monster) => monster.storyName === "Shattered Mage"));

for (const point of [dungeon.entry, dungeon.exit, dungeon.hiddenChest, dungeon.checkpoint, dungeon.finalPortal]) {
  assert.equal(dungeon.tiles[Math.floor(point.y)][Math.floor(point.x)], "floor", "Every key dungeon point must be walkable");
}

const withRunes = createChapterTwoState({
  dungeon: { switches: ["archive-moon", "archive-crown", "archive-ember"] },
});
const sentinelDungeon = generateStoryDungeon(withRunes.dungeon);
assert.ok(sentinelDungeon.monsters.some((monster) => monster.storyRole === "sentinel"), "All three switches must awaken the Riftbound Sentinel");

withRunes.dungeon.miniBossDefeated = true;
const finalDungeon = generateStoryDungeon(withRunes.dungeon);
assert.ok(finalDungeon.monsters.some((monster) => monster.storyRole === "cartographer"), "Defeating the Sentinel must reveal the Hollow Cartographer");

withRunes.dungeon.finalBossDefeated = true;
const completedDungeon = generateStoryDungeon(withRunes.dungeon);
assert.equal(completedDungeon.monsters.some((monster) => monster.storyRole === "cartographer"), false, "The final boss must remain defeated after reload");

console.log(JSON.stringify({
  ok: true,
  chapterObjectives: CHAPTER_TWO_STEPS.length - 1,
  surfaceRunes: SURFACE_RUNES.length,
  archiveSwitches: dungeon.switches.length,
  archiveGates: dungeon.gates.length,
  storyRooms: 5,
}));
