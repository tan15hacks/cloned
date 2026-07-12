import { ITEMS, clamp } from "./game-shared.js";
import {
  BACKPACK_STACK_LIMIT, STORAGE_STACK_LIMIT, STORAGE_CHESTS,
  createStorageState, backpackOccupiedSlots, preferredStorageChest, isShippableItem,
} from "./inventory-storage-data.js";
import {
  addQualitiesToContainer, addQualitiesToBackpack, removeContainerUnits,
  clearShippingBinSpace,
} from "./game-storage.js";

const MAX_COUNTER = 999999999;
const QUALITY_ORDER = ["normal", "silver", "gold", "iridium"];
const finiteInt = (value, fallback = 0) => {
  const numeric = Number(value);
  return Math.floor(Number.isFinite(numeric) ? numeric : fallback);
};
const normalQuality = (amount) => ({ normal: Math.max(0, finiteInt(amount)), silver: 0, gold: 0, iridium: 0 });

function qualityTotal(qualities) {
  return QUALITY_ORDER.reduce((sum, quality) => sum + Math.max(0, finiteInt(qualities?.[quality])), 0);
}

function qualitiesAfterConsumed(qualities, consumed) {
  const remaining = Object.fromEntries(QUALITY_ORDER.map((quality) => [quality, Math.max(0, finiteInt(qualities?.[quality]))]));
  let amount = Math.max(0, finiteInt(consumed));
  for (const quality of QUALITY_ORDER) {
    const take = Math.min(amount, remaining[quality]);
    remaining[quality] -= take;
    amount -= take;
    if (amount <= 0) break;
  }
  return remaining;
}

export function hardenStorageState(state) {
  if (!state || typeof state !== "object") return state;
  state.inventory = state.inventory && typeof state.inventory === "object" ? state.inventory : {};
  state.upgrades = state.upgrades && typeof state.upgrades === "object" ? state.upgrades : {};
  state.upgrades.backpack = clamp(finiteInt(state.upgrades.backpack, 40), 40, 200);
  state.storage = createStorageState(state.storage, state);

  for (const id of Object.keys(state.inventory)) {
    if (!ITEMS[id]) {
      delete state.inventory[id];
      continue;
    }
    const raw = finiteInt(state.inventory[id]);
    const safe = clamp(raw, 0, BACKPACK_STACK_LIMIT);
    state.inventory[id] = safe;
    const overflow = Math.max(0, raw - safe);
    if (overflow > 0) {
      const preferred = preferredStorageChest(id);
      const alternate = preferred === "pantry" ? "trunk" : "pantry";
      let remaining = overflow;
      remaining -= addQualitiesToContainer(state.storage.chests[preferred], id, normalQuality(remaining));
      if (remaining > 0) remaining -= addQualitiesToContainer(state.storage.chests[alternate], id, normalQuality(remaining));
      // Imported quantities beyond the backpack and both 9,999-unit chest stacks are malformed and are intentionally rejected.
    }
  }

  const occupied = backpackOccupiedSlots(state);
  if (occupied > state.upgrades.backpack) state.upgrades.backpack = clamp(occupied, 40, 200);

  for (const [id, count] of Object.entries({ ...state.storage.shipping.items })) {
    if (isShippableItem(id)) continue;
    const qualities = removeContainerUnits(state.storage.shipping, id, count);
    const total = qualityTotal(qualities);
    const preferred = preferredStorageChest(id);
    const alternate = preferred === "pantry" ? "trunk" : "pantry";
    const firstMoved = addQualitiesToContainer(state.storage.chests[preferred], id, qualities);
    let remainingQualities = qualitiesAfterConsumed(qualities, firstMoved);
    const secondMoved = addQualitiesToContainer(state.storage.chests[alternate], id, remainingQualities);
    remainingQualities = qualitiesAfterConsumed(remainingQualities, secondMoved);
    const recovered = firstMoved + secondMoved;
    if (recovered < total) addQualitiesToBackpack(state, id, remainingQualities);
  }

  for (const chestId of Object.keys(STORAGE_CHESTS)) {
    const chest = state.storage.chests[chestId];
    chest.capacity = STORAGE_CHESTS[chestId].capacity;
    for (const id of Object.keys(chest.items)) chest.items[id] = clamp(finiteInt(chest.items[id]), 0, STORAGE_STACK_LIMIT);
  }
  for (const id of Object.keys(state.storage.shipping.items)) state.storage.shipping.items[id] = clamp(finiteInt(state.storage.shipping.items[id]), 0, STORAGE_STACK_LIMIT);

  for (const key of ["itemsStored", "itemsRetrieved", "itemsShipped", "shippingRevenue", "shipments", "upgradesBought"]) {
    state.storage.stats[key] = clamp(finiteInt(state.storage.stats[key]), 0, MAX_COUNTER);
  }
  state.storage.stats.upgradesBought = clamp(state.storage.stats.upgradesBought, 0, 3);
  state.storage.lastShipment = state.storage.lastShipment && state.storage.lastShipment.total > 0 ? state.storage.lastShipment : null;
  clearShippingBinSpace(state);
  return state;
}

export function installStorageRuntime(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    showInventory: proto.showInventory,
    showStorageOverview: proto.showStorageOverview,
    showStorageChest: proto.showStorageChest,
    showShippingBin: proto.showShippingBin,
    transferToStorage: proto.transferToStorage,
    transferFromStorage: proto.transferFromStorage,
    shipItem: proto.shipItem,
    retrieveShippedItem: proto.retrieveShippedItem,
  };

  proto.migrateState = function migrateStateStorageRuntime(data) {
    return hardenStorageState(original.migrateState.call(this, data));
  };

  proto.enterGame = function enterGameStorageRuntime() {
    hardenStorageState(this.state);
    const result = original.enterGame.call(this);
    hardenStorageState(this.state);
    const removed = clearShippingBinSpace(this.state);
    if (removed > 0) {
      this.rebuildResourceMap?.();
      this.refreshActiveWorldChunks?.(true);
      this.saveGame?.(true);
    }
    return result;
  };

  proto.nextDay = function nextDayStorageRuntime(passedOut) {
    hardenStorageState(this.state);
    const result = original.nextDay.call(this, passedOut);
    hardenStorageState(this.state);
    const removed = clearShippingBinSpace(this.state);
    if (removed > 0) {
      this.rebuildResourceMap?.();
      this.refreshActiveWorldChunks?.(true);
      this.saveGame?.(true);
    }
    return result;
  };

  for (const name of ["showInventory", "showStorageOverview", "showStorageChest", "showShippingBin", "transferToStorage", "transferFromStorage", "shipItem", "retrieveShippedItem"]) {
    if (!original[name]) continue;
    proto[name] = function storageHardenedAction(...args) {
      hardenStorageState(this.state);
      const result = original[name].apply(this, args);
      hardenStorageState(this.state);
      return result;
    };
  }
}
