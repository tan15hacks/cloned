import { createSeasonState, festivalKey } from "./seasons-data.js";

function normalizeSeasonRuntime(state) {
  if (!state) return state;
  state.seasons = createSeasonState(state.seasons, state.day);
  for (const [year, ids] of Object.entries(state.seasons.yearlySets || {})) {
    state.seasons.yearlySets[year] = Array.isArray(ids) ? [...new Set(ids)] : [];
  }
  for (const [key, score] of Object.entries(state.seasons.festivalScores || {})) {
    state.seasons.festivalScores[key] = Math.max(0, Math.min(100, Number(score) || 0));
  }
  return state;
}

export function installSeasonsRuntime(GameClass) {
  const proto = GameClass.prototype;
  const originalMigrateState = proto.migrateState;
  const originalEnterGame = proto.enterGame;
  const originalFinishFestival = proto.finishFestival;

  proto.migrateState = function migrateStateSeasonsRuntime(data) {
    return normalizeSeasonRuntime(originalMigrateState.call(this, data));
  };

  proto.enterGame = function enterGameSeasonsRuntime() {
    normalizeSeasonRuntime(this.state);
    originalEnterGame.call(this);
  };

  proto.finishFestival = function finishFestivalOncePerYear(festival, score) {
    const key = festivalKey(this.state.day, festival);
    if (key && this.state.seasons.completedFestivals.includes(key)) {
      this.clearFestivalTimer?.();
      this.toast("This festival result has already been recorded for the current year.");
      return this.openFestival(festival);
    }
    return originalFinishFestival.call(this, festival, score);
  };
}
