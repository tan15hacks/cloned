import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { SHIPPING_BIN } from "../inventory-storage-data.js";
import { hardenStorageState } from "../game-storage-runtime.js";

const inventory = Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0]));
for (const id of Object.keys(ITEMS).slice(0, 45)) inventory[id] = 1;
inventory.turnip = 1200;
inventory.wood = Number.POSITIVE_INFINITY;
inventory.injectedUnknownItem = 999;

const state = {
  day: 9,
  inventory,
  upgrades: { backpack: -500 },
  resources: [{ id: "shipping-rock", x: SHIPPING_BIN.x, y: SHIPPING_BIN.y, type: "rock" }],
  placed: [{ type: "lantern", x: SHIPPING_BIN.x, y: SHIPPING_BIN.y }],
  soil: { [`${Math.floor(SHIPPING_BIN.x)},${Math.floor(SHIPPING_BIN.y)}`]: { tilled: true } },
  storage: {
    sortMode: "forged-sort",
    filter: "forged-filter",
    chests: {
      pantry: { items: { berry: -20, missing: 999 }, qualities: { berry: { iridium: 50 } } },
      trunk: { items: { stone: Number.NaN }, qualities: {} },
    },
    shipping: {
      items: { curatorSeal: 1, turnip: 2, missing: 99 },
      qualities: { curatorSeal: { gold: 1 }, turnip: { silver: 2 } },
    },
    lastShipment: { day: 999, total: Number.POSITIVE_INFINITY, items: [{ id: "turnip", count: -4, value: 99 }, { id: "missing", count: 5, value: 999 }] },
    stats: { itemsStored: Number.POSITIVE_INFINITY, shipments: -8, upgradesBought: 99 },
  },
};

hardenStorageState(state);
assert.equal(state.inventory.injectedUnknownItem, undefined);
assert.equal(state.inventory.wood, 0);
assert.equal(state.inventory.turnip, 999);
assert.equal(state.storage.chests.pantry.items.turnip, 201, "Backpack overstack must be preserved in farmhouse storage");
assert.equal(state.upgrades.backpack >= 45, true, "Legacy unique stacks must not be deleted when capacity is smaller");
assert.equal(state.storage.sortMode, "category");
assert.equal(state.storage.filter, "all");
assert.equal(state.storage.chests.pantry.items.missing, undefined);
assert.equal(state.storage.chests.pantry.items.berry, undefined);
assert.equal(state.storage.shipping.items.curatorSeal, undefined, "Special collectibles cannot remain queued for sale");
assert.equal(state.storage.chests.trunk.items.curatorSeal, 1, "Rejected shipping collectibles should return to safe storage");
assert.equal(state.storage.shipping.items.turnip, 2);
assert.equal(state.storage.shipping.qualities.turnip.silver, 2);
assert.equal(state.storage.stats.itemsStored, 0);
assert.equal(state.storage.stats.shipments, 0);
assert.equal(state.storage.stats.upgradesBought, 3);
assert.equal(state.storage.lastShipment, null);
assert.equal(state.resources.length, 0);
assert.equal(state.placed.length, 0);
assert.deepEqual(state.soil, {});

const finite = {
  day: 4,
  inventory: { ...Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])) },
  upgrades: { backpack: 56 },
  resources: [], placed: [], soil: {},
  storage: {
    chests: { pantry: { items: { berry: 3 }, qualities: { berry: { normal: 1, silver: 1, gold: 1 } } } },
    shipping: { items: { milk: 2 }, qualities: { milk: { iridium: 2 } } },
    lastShipment: { day: 3, total: 500, items: [{ id: "milk", count: 2, value: 500 }] },
    stats: { itemsStored: 3, itemsShipped: 2, shippingRevenue: 500, shipments: 1 },
  },
};
hardenStorageState(finite);
assert.equal(finite.storage.chests.pantry.items.berry, 3);
assert.equal(finite.storage.chests.pantry.qualities.berry.gold, 1);
assert.equal(finite.storage.shipping.items.milk, 2);
assert.equal(finite.storage.lastShipment.total, 500);
assert.equal(finite.upgrades.backpack, 56);

console.log(JSON.stringify({
  ok: true,
  unknownItemsRemoved: true,
  backpackOverstackPreserved: true,
  legacyCapacityProtected: true,
  nonShippableRecovery: true,
  invalidCountersRejected: true,
  shippingBinSpaceCleared: true,
  validStoragePreserved: true,
}));
