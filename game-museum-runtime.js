import { ITEMS, clamp } from "./game-shared.js";
import {
  MUSEUM_BUNDLES, MUSEUM_BUNDLE_MAP, MUSEUM_TOTAL_UNITS,
  createMuseumState, museumOverallProgress, museumRankForReputation,
} from "./museum-data.js";
import { registerMuseumWing } from "./game-museum.js";

const MAX_COUNTER = 999999;
const finiteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const finiteInt = (value, fallback = 0) => Math.floor(finiteNumber(value, fallback));

export function hardenMuseumState(state) {
  if (!state || typeof state !== "object") return state;
  state.inventory = state.inventory && typeof state.inventory === "object" ? state.inventory : {};
  state.museum = createMuseumState(state.museum);
  const museum = state.museum;
  const day = Math.max(1, finiteInt(state.day, 1));

  for (const bundleEntry of MUSEUM_BUNDLES) {
    const donated = museum.donated[bundleEntry.id];
    for (const requirement of bundleEntry.requirements) {
      donated[requirement.item] = clamp(finiteInt(donated[requirement.item]), 0, requirement.amount);
      state.inventory[requirement.item] = clamp(finiteInt(state.inventory[requirement.item]), 0, MAX_COUNTER);
    }
  }
  for (const id of ["museumToken", "curatorSeal"]) state.inventory[id] = clamp(finiteInt(state.inventory[id]), 0, MAX_COUNTER);

  const completed = MUSEUM_BUNDLES.filter((bundleEntry) => bundleEntry.requirements.every((requirement) => museum.donated[bundleEntry.id][requirement.item] >= requirement.amount)).map((bundleEntry) => bundleEntry.id);
  museum.completedBundles = completed;
  museum.rewardedBundles = [...new Set(museum.rewardedBundles.filter((id) => completed.includes(id) && MUSEUM_BUNDLE_MAP[id]))].slice(0, MUSEUM_BUNDLES.length);
  museum.allRewardClaimed = Boolean(museum.allRewardClaimed && completed.length === MUSEUM_BUNDLES.length);
  museum.visits = clamp(finiteInt(museum.visits), 0, MAX_COUNTER);
  museum.lastDonationDay = clamp(finiteInt(museum.lastDonationDay), 0, day);
  const progress = museumOverallProgress(state);
  museum.reputation = clamp(progress.units + completed.length * 2, 0, MUSEUM_TOTAL_UNITS + MUSEUM_BUNDLES.length * 2);
  museum.rank = museumRankForReputation(museum.reputation).name;
  museum.introQueued = Boolean(museum.introQueued);
  return state;
}

export function installMuseumRuntime(GameClass) {
  registerMuseumWing();
  const proto = GameClass.prototype;
  const original = {
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    showMuseumCollections: proto.showMuseumCollections,
    donateMuseumItem: proto.donateMuseumItem,
    donateMuseumAvailable: proto.donateMuseumAvailable,
  };

  proto.migrateState = function migrateStateMuseumRuntime(data) {
    return hardenMuseumState(original.migrateState.call(this, data));
  };

  proto.enterGame = function enterGameMuseumRuntime() {
    registerMuseumWing();
    hardenMuseumState(this.state);
    const result = original.enterGame.call(this);
    hardenMuseumState(this.state);
    this.checkMuseumAchievements?.();
    return result;
  };

  proto.nextDay = function nextDayMuseumRuntime(passedOut) {
    const result = original.nextDay.call(this, passedOut);
    hardenMuseumState(this.state);
    return result;
  };

  proto.showMuseumCollections = function showMuseumCollectionsRuntime() {
    hardenMuseumState(this.state);
    return original.showMuseumCollections.call(this);
  };

  proto.donateMuseumItem = function donateMuseumItemRuntime(bundleId, itemId, amount) {
    hardenMuseumState(this.state);
    const result = original.donateMuseumItem.call(this, bundleId, itemId, amount);
    hardenMuseumState(this.state);
    return result;
  };

  proto.donateMuseumAvailable = function donateMuseumAvailableRuntime(bundleId) {
    hardenMuseumState(this.state);
    const result = original.donateMuseumAvailable.call(this, bundleId);
    hardenMuseumState(this.state);
    return result;
  };
}
