import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { INTERIOR_MAPS } from "../living-world-data.js";
import {
  BACKPACK_UPGRADES, STORAGE_CHESTS, SHIPPING_BIN, INVENTORY_CATEGORIES,
  BACKPACK_STACK_LIMIT, STORAGE_STACK_LIMIT, createStorageState,
  storageOccupiedSlots, backpackOccupiedSlots, inventoryCategoryForItem,
  preferredStorageChest, isShippableItem, shipmentValueForItem,
  registerFarmhouseStorage, validateStorageData,
} from "../inventory-storage-data.js";

assert.equal(validateStorageData(), true);
assert.deepEqual(BACKPACK_UPGRADES.map((entry) => entry.capacity), [40, 56, 72, 96]);
assert.equal(STORAGE_CHESTS.pantry.capacity, 80);
assert.equal(STORAGE_CHESTS.trunk.capacity, 120);
assert.equal(BACKPACK_STACK_LIMIT, 999);
assert.equal(STORAGE_STACK_LIMIT, 9999);
assert.ok(Number.isFinite(SHIPPING_BIN.x) && Number.isFinite(SHIPPING_BIN.y));
assert.ok(INVENTORY_CATEGORIES.length >= 10);
assert.equal(inventoryCategoryForItem("turnip"), "crops");
assert.equal(inventoryCategoryForItem("rareFish"), "fish");
assert.equal(inventoryCategoryForItem("milk"), "ranch");
assert.equal(inventoryCategoryForItem("cheese"), "artisan");
assert.equal(inventoryCategoryForItem("turnipBroth"), "meals");
assert.equal(preferredStorageChest("turnipBroth"), "pantry");
assert.equal(preferredStorageChest("voidshard"), "trunk");
assert.equal(isShippableItem("turnip"), true);
assert.equal(isShippableItem("curatorSeal"), false);

const storage = createStorageState({
  chests: {
    pantry: { items: { turnip: 3, missing: 99 }, qualities: { turnip: { normal: 1, silver: 1, gold: 1, iridium: 0 } } },
    trunk: { items: { wood: 8 }, qualities: {} },
  },
  shipping: { items: { berry: 2 }, qualities: { berry: { gold: 2 } } },
  sortMode: "value",
  filter: "crops",
  stats: { itemsStored: 7 },
}, { day: 5 });
assert.equal(storage.chests.pantry.items.missing, undefined);
assert.equal(storageOccupiedSlots(storage.chests.pantry), 1);
assert.equal(storage.chests.pantry.qualities.turnip.normal, 1);
assert.equal(storage.shipping.qualities.berry.gold, 2);
assert.equal(storage.sortMode, "value");
assert.equal(storage.filter, "crops");

const inventoryState = { inventory: { ...Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])), turnip: 3, wood: 2 } };
assert.equal(backpackOccupiedSlots(inventoryState), 2);
assert.equal(shipmentValueForItem("turnip", { normal: 1, silver: 1, gold: 1, iridium: 1 }), Math.floor(ITEMS.turnip.value * (1 + 1.25 + 1.6 + 2.2)));

const farmhouse = registerFarmhouseStorage();
registerFarmhouseStorage();
assert.equal(farmhouse, INTERIOR_MAPS.farmhouse);
assert.equal(farmhouse.objects.filter((object) => object.id === "farmhouse-adventure-trunk").length, 1);
assert.equal(farmhouse.interactions.filter((entry) => entry.id === "storageTrunk").length, 1);

const contains = (object, x, y) => x >= object.x && x < object.x + object.w && y >= object.y && y < object.y + object.h;
const walkable = (x, y) => x >= 1 && y >= 1 && x < farmhouse.width - 1 && y < farmhouse.height - 1
  && !farmhouse.objects.some((object) => object.solid && contains(object, x + .5, y + .5));
const start = [Math.floor(farmhouse.exit.x), Math.floor(farmhouse.exit.y - 1.2)];
const queue = [start];
const reachable = new Set([start.join(",")]);
for (let index = 0; index < queue.length; index += 1) {
  const [x, y] = queue[index];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx;
    const ny = y + dy;
    const key = `${nx},${ny}`;
    if (reachable.has(key) || !walkable(nx, ny)) continue;
    reachable.add(key);
    queue.push([nx, ny]);
  }
}
for (const id of ["storage", "storageTrunk"]) {
  const interaction = farmhouse.interactions.find((entry) => entry.id === id);
  const x = Math.floor(interaction.x);
  const y = Math.floor(interaction.y);
  assert.equal(walkable(x, y), true, `${id} must be on a walkable tile`);
  assert.equal(reachable.has(`${x},${y}`), true, `${id} must be reachable from the farmhouse entrance`);
}

console.log(JSON.stringify({
  ok: true,
  backpackTiers: BACKPACK_UPGRADES.length,
  maximumBackpack: BACKPACK_UPGRADES.at(-1).capacity,
  pantryStacks: STORAGE_CHESTS.pantry.capacity,
  trunkStacks: STORAGE_CHESTS.trunk.capacity,
  categories: INVENTORY_CATEGORIES.length,
  chestInteractionsReachable: true,
  shippingQualityValue: true,
}));
