import {
  CHAPTER_TWO_TARGETS,
  chapterTwoEligible,
  createChapterTwoState,
} from "./chapter-two-data.js";

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
  const originalGuildScene = proto.showChapterTwoGuildScene;
  const originalTalkToNPC = proto.talkToNPC;

  proto.migrateState = function migrateStateChapterTwoRuntime(data) {
    return normalizeStoryDungeonSave(originalMigrateState.call(this, data));
  };

  proto.enterGame = function enterGameChapterTwoRuntime() {
    normalizeStoryDungeonSave(this.state);
    originalEnterGame.call(this);
    this.currentStoryDungeon = null;
  };

  proto.showChapterTwoGuildScene = function showChapterTwoGuildSceneGated() {
    const chapter = this.state?.chapterTwo;
    if (!chapter?.started && !chapterTwoEligible(this.state)) {
      this.toast("Chapter 2 requires Chapter 1, Adventure Level 4, and the Floor 10 guardian reward.");
      return false;
    }
    return originalGuildScene.call(this);
  };

  proto.talkToNPC = function talkToNPCCampaignGated(npc) {
    const chapter = this.state?.chapterTwo;
    if (npc?.id === "aria" && chapter && !chapter.started && chapter.step === 0 && !chapterTwoEligible(this.state)) {
      chapter.step = -1;
      try {
        return originalTalkToNPC.call(this, npc);
      } finally {
        chapter.step = 0;
      }
    }
    return originalTalkToNPC.call(this, npc);
  };
}
