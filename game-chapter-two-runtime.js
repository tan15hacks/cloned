import { CHAPTER_TWO_TARGETS, createChapterTwoState } from "./chapter-two-data.js";

function normalizeStoryDungeonSave(state) {
  if (!state || state.mode !== "storyDungeon") return state;
  state.mode = "world";
  state.player.x = CHAPTER_TWO_TARGETS.archive.x;
  state.player.y = CHAPTER_TWO_TARGETS.archive.y - 2;
  state.chapterTwo = createChapterTwoState(state.chapterTwo);
  state.journal ||= [];
  if (!state.journal.some((entry) => entry.includes("Archive expedition resumed"))) {
    state.journal.unshift("Chapter 2: Archive expedition resumed safely at the Suncleft entrance.");
    state.journal = state.journal.slice(0, 30);
  }
  return state;
}

export function installChapterTwoRuntime(GameClass) {
  const proto = GameClass.prototype;
  const originalMigrateState = proto.migrateState;
  const originalEnterGame = proto.enterGame;

  proto.migrateState = function migrateStateChapterTwoRuntime(data) {
    return normalizeStoryDungeonSave(originalMigrateState.call(this, data));
  };

  proto.enterGame = function enterGameChapterTwoRuntime() {
    normalizeStoryDungeonSave(this.state);
    originalEnterGame.call(this);
    this.currentStoryDungeon = null;
  };
}
