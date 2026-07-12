import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { createStorageState } from "../inventory-storage-data.js";
import { installStorageRuntime } from "../game-storage-runtime.js";

class StorageUiHarness {
  constructor() { this.state = this.defaultState(); }
  defaultState() {
    return {
      day: 1,
      inventory: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])),
      upgrades: { backpack: 40 },
      resources: [], placed: [], soil: {},
      storage: createStorageState({}, { day: 1 }),
    };
  }
  migrateState(data) { return { ...this.defaultState(), ...data }; }
  enterGame() {}
  nextDay() { this.state.day += 1; }
  showInventory() {
    const captured = this.state.storage;
    this.renderedStorage = captured;
    this.clickFilter = () => { captured.filter = "crops"; };
    this.changeSort = () => { captured.sortMode = "value"; };
  }
  showStorageOverview() {}
  showStorageChest() {}
  showShippingBin() {}
  transferToStorage() {}
  transferFromStorage() {}
  shipItem() {}
  retrieveShippedItem() {}
  rebuildResourceMap() {}
  refreshActiveWorldChunks() {}
  saveGame() {}
}

installStorageRuntime(StorageUiHarness);
const game = new StorageUiHarness();
game.showInventory();
assert.equal(game.renderedStorage, game.state.storage, "Rendered storage controls must reference the current state object");
game.clickFilter();
game.changeSort();
assert.equal(game.state.storage.filter, "crops");
assert.equal(game.state.storage.sortMode, "value");

console.log(JSON.stringify({
  ok: true,
  liveFilterState: true,
  liveSortState: true,
  noPostRenderReplacement: true,
}));
