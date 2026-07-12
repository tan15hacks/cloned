import { ITEMS, clamp, isWaterTile, regionAt } from "./game-shared.js";
import {
  FISH_SPECIES_MAP, LEGENDARY_FISH, FISH_QUALITY_ORDER,
  BAIT_DEFS, TACKLE_DEFS, FISHING_SHOP_STOCK, selectFishSpecies,
} from "./fishing-data.js";
import { createFishingState, ensureFishingShopState } from "./game-fishing.js";

const MAX_RECORD_COUNT = 999999;
const MAX_TACKLE_USES = 999;
const MAX_COUNTER = 9999999;
const finiteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const finiteInt = (value, fallback = 0) => Math.floor(finiteNumber(value, fallback));

function clearFishingInput(game) {
  if (game?.fishingKeyHandler && typeof window !== "undefined") window.removeEventListener("keydown", game.fishingKeyHandler);
  if (game) game.fishingKeyHandler = null;
}

function bindFishingInput(game) {
  clearFishingInput(game);
  if (typeof window === "undefined" || typeof document === "undefined") return;
  game.fishingKeyHandler = (event) => {
    if (!game.activeFishingSession || event.repeat || !["Space", "KeyF"].includes(event.code)) return;
    event.preventDefault();
    event.stopPropagation();
    document.getElementById("reelButton")?.click();
  };
  window.addEventListener("keydown", game.fishingKeyHandler);
}

export function nearestFishableWater(state, radius = 2) {
  if (!state?.player) return null;
  const playerX = Number(state.player.x) || 0;
  const playerY = Number(state.player.y) || 0;
  const safeRadius = clamp(Math.floor(Number(radius) || 2), 1, 4);
  let nearest = null;
  for (let dy = -safeRadius; dy <= safeRadius; dy += 1) {
    for (let dx = -safeRadius; dx <= safeRadius; dx += 1) {
      const x = Math.floor(playerX + dx);
      const y = Math.floor(playerY + dy);
      if (!isWaterTile(x, y)) continue;
      const distance = Math.hypot(x + .5 - playerX, y + .5 - playerY);
      if (!nearest || distance < nearest.distance) nearest = {
        x,
        y,
        distance,
        regionId: regionAt(x + .5, y + .5).id,
      };
    }
  }
  return nearest;
}

function resolvedFishingGear(state) {
  const bait = BAIT_DEFS[state.fishing.selectedBait] || BAIT_DEFS.none;
  const tackle = TACKLE_DEFS[state.fishing.selectedTackle] || TACKLE_DEFS.none;
  return {
    bait: !bait.item || (state.inventory[bait.item] || 0) > 0 ? bait : BAIT_DEFS.none,
    tackle: tackle.id === "none" || (state.fishing.tackleUses[tackle.id] || 0) > 0 ? tackle : TACKLE_DEFS.none,
  };
}

function consumeResolvedFishingGear(state, gear) {
  if (gear.bait.item) state.inventory[gear.bait.item] = Math.max(0, (state.inventory[gear.bait.item] || 0) - 1);
  if (gear.tackle.id !== "none") state.fishing.tackleUses[gear.tackle.id] = Math.max(0, (state.fishing.tackleUses[gear.tackle.id] || 0) - 1);
}

export function hardenFishingState(state) {
  if (!state || typeof state !== "object") return state;
  state.inventory = state.inventory && typeof state.inventory === "object" ? state.inventory : {};
  state.fishing = createFishingState(state.fishing);
  const fishing = state.fishing;
  const currentDay = Math.max(1, finiteInt(state.day, 1));

  for (const [id, record] of Object.entries(fishing.journal)) {
    const species = FISH_SPECIES_MAP[id];
    if (!species || !record || typeof record !== "object") {
      delete fishing.journal[id];
      continue;
    }
    record.count = clamp(finiteInt(record.count), 0, MAX_RECORD_COUNT);
    if (record.count <= 0) {
      delete fishing.journal[id];
      continue;
    }
    record.bestQuality = FISH_QUALITY_ORDER.includes(record.bestQuality) ? record.bestQuality : "normal";
    record.largestSize = clamp(finiteNumber(record.largestSize, species.minSize), species.minSize, species.maxSize * 1.15);
    record.firstDay = clamp(finiteInt(record.firstDay, 1), 1, currentDay);
    record.lastDay = clamp(finiteInt(record.lastDay, record.firstDay), record.firstDay, currentDay);
  }

  const recordedLegends = LEGENDARY_FISH.filter((species) => fishing.journal[species.id]?.count > 0).map((species) => species.id);
  fishing.legendaryCaught = [...new Set([
    ...fishing.legendaryCaught.filter((id) => FISH_SPECIES_MAP[id]?.legendary && fishing.journal[id]?.count > 0),
    ...recordedLegends,
  ])].slice(0, LEGENDARY_FISH.length);
  fishing.selectedBait = BAIT_DEFS[fishing.selectedBait] ? fishing.selectedBait : "none";
  fishing.selectedTackle = TACKLE_DEFS[fishing.selectedTackle] ? fishing.selectedTackle : "none";
  fishing.tackleUses.spinner = clamp(finiteInt(fishing.tackleUses.spinner), 0, MAX_TACKLE_USES);
  fishing.tackleUses.lucky = clamp(finiteInt(fishing.tackleUses.lucky), 0, MAX_TACKLE_USES);
  fishing.streak = clamp(finiteInt(fishing.streak), 0, 10000);
  fishing.bestStreak = clamp(Math.max(fishing.streak, finiteInt(fishing.bestStreak)), 0, 10000);
  fishing.lastCatchDay = clamp(finiteInt(fishing.lastCatchDay), 0, currentDay);
  fishing.totalEscapes = clamp(finiteInt(fishing.totalEscapes), 0, MAX_COUNTER);
  fishing.treasuresFound = clamp(finiteInt(fishing.treasuresFound), 0, MAX_COUNTER);
  fishing.perfectCatches = clamp(finiteInt(fishing.perfectCatches), 0, MAX_COUNTER);
  const recordedCatches = Object.values(fishing.journal).reduce((sum, record) => sum + record.count, 0);
  fishing.totalCasts = clamp(Math.max(finiteInt(fishing.totalCasts), recordedCatches + fishing.totalEscapes), 0, MAX_COUNTER);

  ensureFishingShopState(state);
  for (const entry of FISHING_SHOP_STOCK) fishing.shopStock[entry.id] = clamp(finiteInt(fishing.shopStock[entry.id]), 0, entry.daily);
  for (const id of Object.keys(fishing.shopStock)) if (!FISHING_SHOP_STOCK.some((entry) => entry.id === id)) delete fishing.shopStock[id];

  for (const id of ["wormBait", "glowBait", "spinnerTackle", "luckyTackle", "anglerToken"]) {
    if (ITEMS[id]) state.inventory[id] = clamp(finiteInt(state.inventory[id]), 0, 999999);
  }
  return state;
}

export function installFishingRuntime(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    beginFishing: proto.beginFishing,
    openFishingGame: proto.openFishingGame,
    finishFishingCatch: proto.finishFishingCatch,
    closeModal: proto.closeModal,
    leaveToTitle: proto.leaveToTitle,
  };

  proto.migrateState = function migrateStateFishingRuntime(data) {
    return hardenFishingState(original.migrateState.call(this, data));
  };

  proto.enterGame = function enterGameFishingRuntime() {
    hardenFishingState(this.state);
    const result = original.enterGame.call(this);
    hardenFishingState(this.state);
    clearFishingInput(this);
    this.activeFishingSession = null;
    return result;
  };

  proto.nextDay = function nextDayFishingRuntime(passedOut) {
    clearFishingInput(this);
    const result = original.nextDay.call(this, passedOut);
    hardenFishingState(this.state);
    this.state.fishing.streak = 0;
    this.activeFishingSession = null;
    this.saveGame?.(true);
    return result;
  };

  proto.beginFishing = function beginFishingNearestWater() {
    if (this.state.mode !== "world") return this.toast("Fishing requires open continental water.");
    this.state.fishing = createFishingState(this.state.fishing);
    const water = nearestFishableWater(this.state, 2);
    if (!water) return this.toast("Stand beside water to cast the fishing rod.");
    const gear = resolvedFishingGear(this.state);
    const species = selectFishSpecies(this.state, water.regionId, gear.bait.id);
    if (!species) return this.toast("No fish are biting here under the current season, weather, time, and Fishing Level. Check the Fishing Journal.");
    if (this.state.fishing.selectedBait !== "none" && gear.bait.id === "none") this.toast(`${BAIT_DEFS[this.state.fishing.selectedBait].name} is empty; casting without bait.`);
    if (this.state.fishing.selectedTackle !== "none" && gear.tackle.id === "none") this.toast(`${TACKLE_DEFS[this.state.fishing.selectedTackle].name} has no uses remaining.`);
    consumeResolvedFishingGear(this.state, gear);
    this.spendEnergy(2);
    this.state.fishing.totalCasts += 1;
    return this.openFishingGame(species, water.regionId, gear);
  };

  proto.openFishingGame = function openFishingGameRuntime(species, regionId, gear) {
    this.activeFishingSession = { speciesId: species?.id || null, regionId: regionId || null };
    const result = original.openFishingGame.call(this, species, regionId, gear);
    bindFishingInput(this);
    return result;
  };

  proto.finishFishingCatch = function finishFishingCatchRuntime(species, regionId, gear, accuracy, perfect) {
    clearFishingInput(this);
    this.activeFishingSession = null;
    const result = original.finishFishingCatch.call(this, species, regionId, gear, accuracy, perfect);
    hardenFishingState(this.state);
    return result;
  };

  proto.closeModal = function closeModalFishingRuntime() {
    const interrupted = Boolean(this.activeFishingSession);
    clearFishingInput(this);
    this.activeFishingSession = null;
    const result = original.closeModal.call(this);
    if (interrupted && this.state?.fishing) {
      this.state.fishing.streak = 0;
      hardenFishingState(this.state);
      this.saveGame?.(true);
    }
    return result;
  };

  proto.leaveToTitle = function leaveToTitleFishingRuntime() {
    clearFishingInput(this);
    if (this.fishingTimer) clearInterval(this.fishingTimer);
    this.fishingTimer = null;
    this.activeFishingSession = null;
    return original.leaveToTitle.call(this);
  };
}
