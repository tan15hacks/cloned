import { ITEMS, TILE, clamp, distance, $ } from "./game-shared.js";
import { INTERIOR_MAPS } from "./living-world-data.js";
import { RANCH_PRODUCT_IDS, RANCH_QUALITY, RANCH_QUALITY_ORDER } from "./ranch-data.js";
import { COOKING_RECIPE_MAP, COOKING_QUALITY } from "./cooking-data.js";
import {
  SHIPPING_BIN, STORAGE_CHESTS, STORAGE_QUALITY_ORDER, STORAGE_QUALITY_MULTIPLIERS,
  BACKPACK_STACK_LIMIT, STORAGE_STACK_LIMIT, BACKPACK_UPGRADES, INVENTORY_CATEGORIES,
  createStorageState, createStorageContainer, storageOccupiedSlots, backpackOccupiedSlots,
  inventoryCategoryForItem, preferredStorageChest, isShippableItem, isQualityTrackedItem,
  nextBackpackUpgrade, shipmentValueForItem, registerFarmhouseStorage, storageCostText,
} from "./inventory-storage-data.js";

const PROGRESSION_QUALITY_ITEMS = new Set(["turnip", "berry", "moonbean", "fish", "rareFish", "apple"]);
const QUALITY_LABELS = {
  normal: { icon: "●", name: "Normal" },
  silver: { icon: "🥈", name: "Silver" },
  gold: { icon: "🥇", name: "Gold" },
  iridium: { icon: "💠", name: "Iridium" },
};

function finiteInt(value, fallback = 0) {
  const numeric = Number(value);
  return Math.floor(Number.isFinite(numeric) ? numeric : fallback);
}

function emptyQuality() {
  return Object.fromEntries(STORAGE_QUALITY_ORDER.map((quality) => [quality, 0]));
}

function qualityRecord(state, id, create = false) {
  if (COOKING_RECIPE_MAP[id]) {
    if (!state.cooking) return null;
    if (create && !state.cooking.meals[id]) state.cooking.meals[id] = emptyQuality();
    return state.cooking.meals[id] || null;
  }
  if (RANCH_PRODUCT_IDS.includes(id)) {
    if (!state.ranch) return null;
    state.ranch.qualityInventory ||= {};
    if (create && !state.ranch.qualityInventory[id]) state.ranch.qualityInventory[id] = emptyQuality();
    return state.ranch.qualityInventory[id] || null;
  }
  if (PROGRESSION_QUALITY_ITEMS.has(id)) {
    if (!state.progression) return null;
    state.progression.qualityInventory ||= {};
    if (create && !state.progression.qualityInventory[id]) state.progression.qualityInventory[id] = emptyQuality();
    return state.progression.qualityInventory[id] || null;
  }
  return null;
}

export function backpackQualityCounts(state, id) {
  const total = clamp(finiteInt(state?.inventory?.[id]), 0, BACKPACK_STACK_LIMIT);
  const result = emptyQuality();
  const record = qualityRecord(state, id, false);
  if (!record) {
    result.normal = total;
    return result;
  }
  let recorded = 0;
  for (const quality of STORAGE_QUALITY_ORDER) {
    result[quality] = clamp(finiteInt(record[quality]), 0, total);
    recorded += result[quality];
  }
  if (recorded < total) result.normal += total - recorded;
  else if (recorded > total) {
    let excess = recorded - total;
    for (const quality of STORAGE_QUALITY_ORDER) {
      const remove = Math.min(excess, result[quality]);
      result[quality] -= remove;
      excess -= remove;
      if (excess <= 0) break;
    }
  }
  return result;
}

function syncQualityRecord(state, id, counts) {
  const record = qualityRecord(state, id, true);
  if (!record) return;
  for (const quality of STORAGE_QUALITY_ORDER) record[quality] = clamp(finiteInt(counts[quality]), 0, BACKPACK_STACK_LIMIT);
}

export function removeBackpackUnits(state, id, amount, highFirst = false) {
  const inventory = clamp(finiteInt(state?.inventory?.[id]), 0, BACKPACK_STACK_LIMIT);
  const take = Math.min(inventory, Math.max(0, finiteInt(amount)));
  if (take <= 0) return emptyQuality();
  const counts = backpackQualityCounts(state, id);
  const removed = emptyQuality();
  let remaining = take;
  const order = highFirst ? [...STORAGE_QUALITY_ORDER].reverse() : [...STORAGE_QUALITY_ORDER];
  for (const quality of order) {
    const count = Math.min(counts[quality], remaining);
    counts[quality] -= count;
    removed[quality] += count;
    remaining -= count;
    if (remaining <= 0) break;
  }
  state.inventory[id] = inventory - take;
  syncQualityRecord(state, id, counts);
  return removed;
}

function qualityTotal(counts) {
  return STORAGE_QUALITY_ORDER.reduce((sum, quality) => sum + Math.max(0, finiteInt(counts?.[quality])), 0);
}

function trimQualityToAmount(counts, amount) {
  const result = emptyQuality();
  let remaining = Math.max(0, finiteInt(amount));
  for (const quality of STORAGE_QUALITY_ORDER) {
    const take = Math.min(remaining, Math.max(0, finiteInt(counts?.[quality])));
    result[quality] = take;
    remaining -= take;
  }
  return result;
}

function containerRoom(container, id) {
  const current = Math.max(0, finiteInt(container.items[id]));
  if (current > 0) return Math.max(0, STORAGE_STACK_LIMIT - current);
  return storageOccupiedSlots(container) < container.capacity ? STORAGE_STACK_LIMIT : 0;
}

export function addQualitiesToContainer(container, id, qualities) {
  const requested = qualityTotal(qualities);
  const accepted = Math.min(requested, containerRoom(container, id));
  if (accepted <= 0) return 0;
  const addition = trimQualityToAmount(qualities, accepted);
  container.items[id] = Math.max(0, finiteInt(container.items[id])) + accepted;
  const record = container.qualities[id] ||= emptyQuality();
  for (const quality of STORAGE_QUALITY_ORDER) record[quality] = Math.max(0, finiteInt(record[quality])) + addition[quality];
  return accepted;
}

export function removeContainerUnits(container, id, amount, highFirst = false) {
  const inventory = Math.max(0, finiteInt(container?.items?.[id]));
  const take = Math.min(inventory, Math.max(0, finiteInt(amount)));
  if (take <= 0) return emptyQuality();
  const counts = { ...emptyQuality(), ...(container.qualities[id] || {}) };
  let recorded = qualityTotal(counts);
  if (recorded < inventory) counts.normal += inventory - recorded;
  const removed = emptyQuality();
  let remaining = take;
  const order = highFirst ? [...STORAGE_QUALITY_ORDER].reverse() : [...STORAGE_QUALITY_ORDER];
  for (const quality of order) {
    const count = Math.min(Math.max(0, finiteInt(counts[quality])), remaining);
    counts[quality] -= count;
    removed[quality] += count;
    remaining -= count;
    if (remaining <= 0) break;
  }
  container.items[id] = inventory - take;
  if (container.items[id] <= 0) {
    delete container.items[id];
    delete container.qualities[id];
  } else container.qualities[id] = counts;
  return removed;
}

export function backpackRoom(state, id) {
  const current = Math.max(0, finiteInt(state?.inventory?.[id]));
  if (current > 0) return Math.max(0, BACKPACK_STACK_LIMIT - current);
  const capacity = Math.max(1, finiteInt(state?.upgrades?.backpack, 40));
  return backpackOccupiedSlots(state) < capacity ? BACKPACK_STACK_LIMIT : 0;
}

export function addQualitiesToBackpack(state, id, qualities) {
  const requested = qualityTotal(qualities);
  const accepted = Math.min(requested, backpackRoom(state, id));
  if (accepted <= 0) return 0;
  const addition = trimQualityToAmount(qualities, accepted);
  state.inventory[id] = Math.max(0, finiteInt(state.inventory[id])) + accepted;
  const record = qualityRecord(state, id, true);
  if (record) for (const quality of STORAGE_QUALITY_ORDER) record[quality] = Math.max(0, finiteInt(record[quality])) + addition[quality];
  return accepted;
}

export function moveBackpackToContainer(state, id, amount, container) {
  const possible = Math.min(Math.max(0, finiteInt(state?.inventory?.[id])), containerRoom(container, id), Math.max(0, finiteInt(amount)));
  if (possible <= 0) return 0;
  const qualities = removeBackpackUnits(state, id, possible);
  return addQualitiesToContainer(container, id, qualities);
}

export function moveContainerToBackpack(state, id, amount, container) {
  const possible = Math.min(Math.max(0, finiteInt(container?.items?.[id])), backpackRoom(state, id), Math.max(0, finiteInt(amount)));
  if (possible <= 0) return 0;
  const qualities = removeContainerUnits(container, id, possible);
  return addQualitiesToBackpack(state, id, qualities);
}

function itemQualitySummary(qualities) {
  const parts = STORAGE_QUALITY_ORDER.filter((quality) => (qualities?.[quality] || 0) > 0).map((quality) => `${QUALITY_LABELS[quality].icon}${qualities[quality]}`);
  return parts.join(" · ") || "●0";
}

function sortedItems(items, sortMode, filter) {
  const entries = Object.entries(items || {}).filter(([id, count]) => ITEMS[id] && Number(count) > 0 && (filter === "all" || inventoryCategoryForItem(id) === filter));
  entries.sort((a, b) => {
    if (sortMode === "name") return ITEMS[a[0]].name.localeCompare(ITEMS[b[0]].name);
    if (sortMode === "count") return b[1] - a[1] || ITEMS[a[0]].name.localeCompare(ITEMS[b[0]].name);
    if (sortMode === "value") return (ITEMS[b[0]].value || 0) - (ITEMS[a[0]].value || 0) || ITEMS[a[0]].name.localeCompare(ITEMS[b[0]].name);
    return inventoryCategoryForItem(a[0]).localeCompare(inventoryCategoryForItem(b[0])) || ITEMS[a[0]].name.localeCompare(ITEMS[b[0]].name);
  });
  return entries;
}

function shippingBinBlocks(x, y, radius = .3) {
  const safeRadius = Math.max(0, Number(radius) || 0);
  return Math.abs(Number(x) - SHIPPING_BIN.x) < .5 + safeRadius && Math.abs(Number(y) - SHIPPING_BIN.y) < .42 + safeRadius;
}

export function clearShippingBinSpace(state) {
  if (!state || typeof state !== "object") return 0;
  let removed = 0;
  if (Array.isArray(state.resources)) {
    const before = state.resources.length;
    state.resources = state.resources.filter((resource) => Math.hypot(Number(resource.x) - SHIPPING_BIN.x, Number(resource.y) - SHIPPING_BIN.y) >= 1.15);
    removed += before - state.resources.length;
  }
  if (Array.isArray(state.placed)) {
    const before = state.placed.length;
    state.placed = state.placed.filter((placed) => Math.hypot(Number(placed.x) - SHIPPING_BIN.x, Number(placed.y) - SHIPPING_BIN.y) >= 1.15);
    removed += before - state.placed.length;
  }
  if (state.soil && typeof state.soil === "object") {
    for (const key of Object.keys(state.soil)) {
      const [x, y] = key.split(",").map(Number);
      if (x === Math.floor(SHIPPING_BIN.x) && y === Math.floor(SHIPPING_BIN.y)) {
        delete state.soil[key];
        removed += 1;
      }
    }
  }
  return removed;
}

function defaultContainer(game, id) {
  const chestId = preferredStorageChest(id);
  return { chestId, container: game.state.storage.chests[chestId] };
}

function adjustStoredQuality(container, id, quality, amount) {
  if (!container || amount <= 0) return;
  const record = container.qualities[id] ||= emptyQuality();
  const move = Math.min(Math.max(0, finiteInt(record.normal)), Math.max(0, finiteInt(amount)));
  record.normal -= move;
  record[quality] = Math.max(0, finiteInt(record[quality])) + move;
}

function upgradeMaterialsAvailable(state, upgrade) {
  return state.coins >= upgrade.coins && Object.entries(upgrade.cost || {}).every(([id, amount]) => (state.inventory[id] || 0) >= amount);
}

export function processShippingState(state, multiplier = 1) {
  const shipping = state.storage.shipping;
  const items = [];
  let total = 0;
  let count = 0;
  for (const [id, amount] of Object.entries(shipping.items)) {
    if (!ITEMS[id] || amount <= 0) continue;
    const value = shipmentValueForItem(id, shipping.qualities[id], multiplier);
    items.push({ id, count: amount, value });
    total += value;
    count += amount;
  }
  state.storage.shipping = createStorageContainer({}, shipping.capacity || 160);
  if (count <= 0) return null;
  state.storage.lastShipment = { day: state.day, total, items };
  state.storage.stats.itemsShipped += count;
  state.storage.stats.shippingRevenue += total;
  state.storage.stats.shipments += 1;
  return { day: state.day, total, count, items };
}

export function installStorageAndShipping(GameClass) {
  registerFarmhouseStorage();
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    addItem: proto.addItem,
    addRanchItem: proto.addRanchItem,
    recordQuality: proto.recordQuality,
    harvestCrop: proto.harvestCrop,
    finishFishingCatch: proto.finishFishingCatch,
    cookMeal: proto.cookMeal,
    sellCategory: proto.sellCategory,
    interact: proto.interact,
    interactInterior: proto.interactInterior,
    updateContextHint: proto.updateContextHint,
    drawBuildings: proto.drawBuildings,
    collides: proto.collides,
    toggleGameMenu: proto.toggleGameMenu,
    showInventory: proto.showInventory,
  };

  proto.defaultState = function defaultStateStorage() {
    const state = original.defaultState.call(this);
    state.storage = createStorageState({}, state);
    return state;
  };

  proto.migrateState = function migrateStateStorage(data) {
    const state = original.migrateState.call(this, data);
    state.storage = createStorageState(data?.storage || state.storage, state);
    state.upgrades ||= {};
    state.upgrades.backpack = clamp(finiteInt(state.upgrades.backpack, 40), 40, 200);
    const occupied = backpackOccupiedSlots(state);
    if (occupied > state.upgrades.backpack) state.upgrades.backpack = occupied;
    clearShippingBinSpace(state);
    return state;
  };

  proto.enterGame = function enterGameStorage() {
    this.state.storage = createStorageState(this.state.storage, this.state);
    const result = original.enterGame.call(this);
    registerFarmhouseStorage();
    this.state.storage = createStorageState(this.state.storage, this.state);
    const removed = clearShippingBinSpace(this.state);
    if (removed > 0) {
      this.rebuildResourceMap?.();
      this.refreshActiveWorldChunks?.(true);
    }
    if (!this.state.storage.introQueued && Array.isArray(this.state.social?.letters)) {
      this.state.storage.introQueued = true;
      if (!this.state.social.letters.some((letter) => letter.id === "storage-shipping-welcome")) this.state.social.letters.push({
        id: "storage-shipping-welcome",
        from: "Cass",
        subject: "Storage Chests and the Shipping Ledger",
        body: "The farmhouse pantry and adventure trunk are ready. Store supplies without losing crop, ranch, fish, or meal quality. I also placed a shipping bin east of your mailbox. Anything left there overnight sells automatically, and the ledger records the morning payout.",
        reward: { item: "wood", amount: 12, coins: 120 },
        read: false, claimed: false, eventKey: null, day: this.state.day,
      });
      this.toast?.("Cass sent instructions for storage and the Farmstead shipping bin.");
    }
    this.checkStorageAchievements?.();
    this.saveGame?.(true);
    return result;
  };

  proto.nextDay = function nextDayStorage(passedOut) {
    this.state.storage = createStorageState(this.state.storage, this.state);
    const multiplier = this.state.beacon?.level >= 1 ? 1.1 : 1;
    const shipment = processShippingState(this.state, multiplier);
    if (shipment) {
      this.state.coins += shipment.total;
      this.state.stats.totalEarned = (this.state.stats.totalEarned || 0) + shipment.total;
      this.state.journal.unshift(`Day ${shipment.day} shipping: ${shipment.count} item${shipment.count === 1 ? "" : "s"} sold for ${shipment.total} coins.`);
      this.state.journal = this.state.journal.slice(0, 30);
    }
    const result = original.nextDay.call(this, passedOut);
    this.state.storage = createStorageState(this.state.storage, this.state);
    const removed = clearShippingBinSpace(this.state);
    if (removed > 0) this.rebuildResourceMap?.();
    if (shipment) {
      this.sound?.("coin");
      this.toast(`Morning shipping payout: ${shipment.total} coins.`);
      this.checkStorageAchievements();
    }
    return result;
  };

  proto.addItem = function addItemStorage(id, amount = 1, announce = false) {
    this.state.storage = createStorageState(this.state.storage, this.state);
    const requested = Math.max(0, finiteInt(amount));
    if (!ITEMS[id] || requested <= 0) return { backpack: 0, stored: 0, chestId: null };
    const room = backpackRoom(this.state, id);
    const backpack = Math.min(requested, room);
    if (backpack > 0) original.addItem.call(this, id, backpack, false);
    let remaining = requested - backpack;
    let stored = 0;
    let chestId = null;
    if (remaining > 0) {
      const preferred = defaultContainer(this, id);
      chestId = preferred.chestId;
      const qualities = emptyQuality(); qualities.normal = remaining;
      stored = addQualitiesToContainer(preferred.container, id, qualities);
      remaining -= stored;
      if (stored > 0 && this.state.questStats?.[id] !== undefined) this.state.questStats[id] += stored;
    }
    if (remaining > 0) {
      original.addItem.call(this, id, remaining, false);
    }
    if (this._storageExpectProgressionQuality && PROGRESSION_QUALITY_ITEMS.has(id)) {
      this._storageQualityQueues ||= {};
      (this._storageQualityQueues[id] ||= []).push({ backpack: backpack + remaining, stored, chestId });
    }
    if (stored > 0) this.state.storage.stats.itemsStored += stored;
    if (stored > 0) this.checkQuests?.();
    if (announce) {
      const name = ITEMS[id].name;
      this.toast(stored > 0 ? `+${requested} ${name} · ${stored} sent to ${STORAGE_CHESTS[chestId].name}.` : `+${requested} ${name}`);
    }
    this.buildToolbar?.();
    return { backpack: backpack + remaining, stored, chestId };
  };

  if (original.recordQuality) proto.recordQuality = function recordQualityStorage(id, quality, amount = 1) {
    const safeQuality = STORAGE_QUALITY_ORDER.includes(quality) ? quality : "normal";
    let remaining = Math.max(0, finiteInt(amount));
    const queue = this._storageQualityQueues?.[id] || [];
    while (remaining > 0 && queue.length) {
      const entry = queue[0];
      if (entry.backpack > 0) {
        const take = Math.min(remaining, entry.backpack);
        original.recordQuality.call(this, id, safeQuality, take);
        entry.backpack -= take;
        remaining -= take;
      } else if (entry.stored > 0) {
        const take = Math.min(remaining, entry.stored);
        adjustStoredQuality(this.state.storage.chests[entry.chestId], id, safeQuality, take);
        entry.stored -= take;
        remaining -= take;
      }
      if (entry.backpack <= 0 && entry.stored <= 0) queue.shift();
    }
    if (remaining > 0) original.recordQuality.call(this, id, safeQuality, remaining);
  };

  if (original.harvestCrop) proto.harvestCrop = function harvestCropStorage(target, soil) {
    this._storageExpectProgressionQuality = true;
    try { return original.harvestCrop.call(this, target, soil); }
    finally { this._storageExpectProgressionQuality = false; }
  };

  if (original.finishFishingCatch) proto.finishFishingCatch = function finishFishingCatchStorage(...args) {
    this._storageExpectProgressionQuality = true;
    try { return original.finishFishingCatch.apply(this, args); }
    finally { this._storageExpectProgressionQuality = false; }
  };

  if (original.addRanchItem) proto.addRanchItem = function addRanchItemStorage(id, quality = "normal", amount = 1, announce = true) {
    const safeQuality = RANCH_QUALITY[quality] ? quality : "normal";
    const safeAmount = Math.max(1, finiteInt(amount, 1));
    const result = this.addItem(id, safeAmount, false);
    const record = qualityRecord(this.state, id, true);
    if (record && result.backpack > 0) record[safeQuality] = Math.max(0, finiteInt(record[safeQuality])) + result.backpack;
    if (result.stored > 0) adjustStoredQuality(this.state.storage.chests[result.chestId], id, safeQuality, result.stored);
    if (announce) this.toast(`+${safeAmount} ${RANCH_QUALITY[safeQuality].icon} ${RANCH_QUALITY[safeQuality].name} ${ITEMS[id]?.name || id}${result.stored ? ` · ${result.stored} stored` : ""}`);
    return result;
  };

  if (original.cookMeal) proto.cookMeal = function cookMealStorage(recipeId, ...args) {
    const before = Math.max(0, finiteInt(this.state.inventory?.[recipeId]));
    const result = original.cookMeal.call(this, recipeId, ...args);
    const gained = Math.max(0, finiteInt(this.state.inventory?.[recipeId]) - before);
    if (gained > 0 && backpackOccupiedSlots(this.state) > this.state.upgrades.backpack) {
      const chest = this.state.storage.chests.pantry;
      const moved = moveBackpackToContainer(this.state, recipeId, gained, chest);
      if (moved > 0) {
        this.state.storage.stats.itemsStored += moved;
        this.toast(`${ITEMS[recipeId].name} moved to the Farmhouse Pantry because the backpack was full.`);
        this.saveGame?.(true);
      }
    }
    return result;
  };

  proto.sellCategory = function sellCategoryStorage(ids, multiplier = 1) {
    let total = 0;
    let count = 0;
    for (const id of ids || []) {
      const amount = Math.max(0, finiteInt(this.state.inventory?.[id]));
      if (amount <= 0) continue;
      const qualities = removeBackpackUnits(this.state, id, amount);
      total += shipmentValueForItem(id, qualities, multiplier);
      count += amount;
    }
    if (total <= 0) return this.toast("You have nothing in that category to sell.");
    this.state.coins += total;
    this.state.stats.totalEarned += total;
    this.sound("coin");
    this.closeModal();
    this.toast(`Sold ${count} item${count === 1 ? "" : "s"} for ${total} coins.`);
    this.saveGame?.(true);
  };

  proto.interact = function interactStorage() {
    if (this.state.mode === "world" && distance(this.state.player, SHIPPING_BIN) < 1.8) return this.showShippingBin();
    return original.interact.call(this);
  };

  proto.interactInterior = function interactInteriorStorage() {
    if (this.state.mode === "interior" && this.state.living?.interiorId === "farmhouse") {
      const map = INTERIOR_MAPS.farmhouse;
      const interaction = map.interactions.find((entry) => distance(this.state.player, entry) < 1.6);
      if (interaction?.id === "storage") return this.showStorageChest("pantry");
      if (interaction?.id === "storageTrunk") return this.showStorageChest("trunk");
    }
    return original.interactInterior.call(this);
  };

  proto.updateContextHint = function updateContextHintStorage() {
    const result = original.updateContextHint.call(this);
    const hint = $("contextHint");
    if (this.state.mode === "world" && distance(this.state.player, SHIPPING_BIN) < 1.8) {
      const count = Object.values(this.state.storage.shipping.items).reduce((sum, value) => sum + value, 0);
      hint.textContent = `Interact: Shipping bin${count ? ` · ${count} queued` : ""}`;
      hint.classList.remove("hidden");
      return result;
    }
    if (this.state.mode === "interior" && this.state.living?.interiorId === "farmhouse") {
      const interaction = INTERIOR_MAPS.farmhouse.interactions.find((entry) => distance(this.state.player, entry) < 1.6);
      if (["storage", "storageTrunk"].includes(interaction?.id)) {
        hint.textContent = interaction.id === "storage" ? "Interact: Open Farmhouse Pantry" : "Interact: Open Adventure Trunk";
        hint.classList.remove("hidden");
      }
    }
    return result;
  };

  proto.drawBuildings = function drawBuildingsStorage(ctx, bounds) {
    original.drawBuildings.call(this, ctx, bounds);
    if (SHIPPING_BIN.x < bounds.startX - 1 || SHIPPING_BIN.x > bounds.endX + 1 || SHIPPING_BIN.y < bounds.startY - 1 || SHIPPING_BIN.y > bounds.endY + 1) return;
    const x = SHIPPING_BIN.x * TILE;
    const y = SHIPPING_BIN.y * TILE;
    const count = Object.values(this.state.storage?.shipping?.items || {}).reduce((sum, value) => sum + Math.max(0, finiteInt(value)), 0);
    ctx.save();
    ctx.fillStyle = "rgba(16,36,29,.22)"; ctx.beginPath(); ctx.ellipse(x, y + 13, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8b5c36"; ctx.fillRect(x - 17, y - 13, 34, 27);
    ctx.fillStyle = "#b9824e"; ctx.fillRect(x - 19, y - 16, 38, 7);
    ctx.strokeStyle = "#3b2b25"; ctx.lineWidth = 3; ctx.strokeRect(x - 17, y - 13, 34, 27); ctx.strokeRect(x - 19, y - 16, 38, 7);
    ctx.fillStyle = "#ead49d"; ctx.font = "bold 15px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText("⇧", x, y + 6);
    if (count > 0) {
      ctx.fillStyle = "#efb94a"; ctx.beginPath(); ctx.arc(x + 18, y - 18, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#10241d"; ctx.font = "bold 9px Trebuchet MS"; ctx.fillText(String(Math.min(99, count)), x + 18, y - 15);
    }
    ctx.restore();
  };

  if (original.collides) proto.collides = function collidesStorage(x, y, radius = .3) {
    if (this.state?.mode === "world" && shippingBinBlocks(x, y, radius)) return true;
    return original.collides.call(this, x, y, radius);
  };

  proto.toggleGameMenu = function toggleGameMenuStorage() {
    const result = original.toggleGameMenu.call(this);
    if (typeof document === "undefined") return result;
    const grid = document.querySelector("#modalBody .menu-grid");
    if (!grid || document.getElementById("storageMenu")) return result;
    const button = document.createElement("button");
    button.id = "storageMenu";
    button.textContent = "📦 Storage & Shipping";
    grid.appendChild(button);
    button.onclick = () => { this.closeModal(); this.showStorageOverview(); };
    return result;
  };

  proto.showInventory = function showInventoryStorage() {
    this.state.storage = createStorageState(this.state.storage, this.state);
    const storage = this.state.storage;
    const occupied = backpackOccupiedSlots(this.state);
    const capacity = this.state.upgrades.backpack;
    const categories = INVENTORY_CATEGORIES.map((category) => `<button data-inventory-filter="${category.id}" class="${storage.filter === category.id ? "active" : ""}">${category.icon} ${category.name}</button>`).join("");
    const cards = sortedItems(this.state.inventory, storage.sortMode, storage.filter).map(([id, count]) => {
      const qualities = backpackQualityCounts(this.state, id);
      const atFarmhouse = this.state.mode === "interior" && this.state.living?.interiorId === "farmhouse";
      return `<article class="storage-item-card"><span>${ITEMS[id].icon}</span><div><strong>${ITEMS[id].name}</strong><small>${inventoryCategoryForItem(id)} · ×${count} · ${itemQualitySummary(qualities)}</small><small>Base value ${ITEMS[id].value || 0}</small></div>${atFarmhouse ? `<button data-quick-store="${id}">Store All</button>` : ""}</article>`;
    }).join("");
    this.openModal("Backpack Inventory", `<section class="storage-capacity"><div><strong>${occupied}/${capacity}</strong><small>occupied item stacks</small></div><div><strong>${BACKPACK_STACK_LIMIT}</strong><small>maximum per stack</small></div><div><strong>${storage.stats.itemsStored}</strong><small>items stored</small></div></section><div class="storage-controls"><div>${categories}</div><label>Sort <select id="inventorySort"><option value="category" ${storage.sortMode === "category" ? "selected" : ""}>Category</option><option value="name" ${storage.sortMode === "name" ? "selected" : ""}>Name</option><option value="count" ${storage.sortMode === "count" ? "selected" : ""}>Quantity</option><option value="value" ${storage.sortMode === "value" ? "selected" : ""}>Value</option></select></label></div><div class="storage-item-list">${cards || "<p>No items match this category.</p>"}</div>`, [
      { label: "Storage Overview", action: () => { this.closeModal(); this.showStorageOverview(); } },
      { label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } },
    ]);
    document.querySelectorAll("[data-inventory-filter]").forEach((button) => { button.onclick = () => { storage.filter = button.dataset.inventoryFilter; this.closeModal(); this.showInventory(); }; });
    $("inventorySort").onchange = (event) => { storage.sortMode = event.target.value; this.closeModal(); this.showInventory(); };
    document.querySelectorAll("[data-quick-store]").forEach((button) => { button.onclick = () => {
      const id = button.dataset.quickStore;
      const chestId = preferredStorageChest(id);
      const moved = moveBackpackToContainer(this.state, id, this.state.inventory[id], this.state.storage.chests[chestId]);
      if (moved <= 0) return this.toast(`${STORAGE_CHESTS[chestId].name} has no room.`);
      storage.stats.itemsStored += moved;
      this.saveGame(true); this.closeModal(); this.showInventory();
    }; });
  };

  proto.showStorageOverview = function showStorageOverview() {
    this.state.storage = createStorageState(this.state.storage, this.state);
    const occupied = backpackOccupiedSlots(this.state);
    const upgrade = nextBackpackUpgrade(this.state.upgrades.backpack);
    const chestCards = Object.values(STORAGE_CHESTS).map((definition) => {
      const container = this.state.storage.chests[definition.id];
      const stacks = storageOccupiedSlots(container);
      const items = Object.values(container.items).reduce((sum, amount) => sum + amount, 0);
      return `<article class="storage-overview-card"><span>${definition.icon}</span><div><strong>${definition.name}</strong><small>${stacks}/${definition.capacity} stacks · ${items} total items</small><p>${definition.description}</p></div></article>`;
    }).join("");
    const shippingItems = Object.values(this.state.storage.shipping.items).reduce((sum, amount) => sum + amount, 0);
    const last = this.state.storage.lastShipment;
    this.openModal("Storage & Shipping", `<section class="storage-capacity"><div><strong>${occupied}/${this.state.upgrades.backpack}</strong><small>backpack stacks</small></div><div><strong>${shippingItems}</strong><small>items awaiting shipment</small></div><div><strong>${this.state.storage.stats.shippingRevenue}</strong><small>lifetime shipping coins</small></div></section><div class="storage-overview-grid">${chestCards}<article class="storage-overview-card"><span>📮</span><div><strong>Farmstead Shipping Bin</strong><small>${shippingItems} queued · ${this.state.storage.stats.shipments} completed shipments</small><p>${last ? `Last payout: ${last.total} coins from Day ${last.day}.` : "Leave goods in the outdoor bin before sleeping to sell them overnight."}</p></div></article></div><section class="backpack-upgrade"><h3>${upgrade ? `${upgrade.name} — ${upgrade.capacity} stacks` : "Maximum Backpack Capacity"}</h3><p>${upgrade ? storageCostText(upgrade) : "The Curator Pack already provides 96 item stacks."}</p>${upgrade ? `<button id="buyBackpackUpgrade" ${upgradeMaterialsAvailable(this.state, upgrade) ? "" : "disabled"}>Upgrade Backpack</button>` : ""}</section>`, [
      { label: "Backpack", action: () => { this.closeModal(); this.showInventory(); } },
      { label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } },
    ]);
    if ($("buyBackpackUpgrade")) $("buyBackpackUpgrade").onclick = () => this.buyBackpackUpgrade();
  };

  proto.buyBackpackUpgrade = function buyBackpackUpgrade() {
    if (!this.state.visitedRegions?.includes("city")) return this.toast("Discover Silvercrest City before ordering a larger backpack.");
    const upgrade = nextBackpackUpgrade(this.state.upgrades.backpack);
    if (!upgrade) return this.toast("Backpack capacity is already at the maximum tier.");
    if (!upgradeMaterialsAvailable(this.state, upgrade)) return this.toast(`Requires ${storageCostText(upgrade)}.`);
    this.state.coins -= upgrade.coins;
    for (const [id, amount] of Object.entries(upgrade.cost)) removeBackpackUnits(this.state, id, amount);
    this.state.upgrades.backpack = upgrade.capacity;
    this.state.storage.stats.upgradesBought += 1;
    this.sound("success");
    this.toast(`${upgrade.name} equipped: ${upgrade.capacity} backpack stacks.`);
    this.checkStorageAchievements();
    this.saveGame(true);
    this.closeModal();
    this.showStorageOverview();
  };

  proto.showStorageChest = function showStorageChest(chestId = "pantry") {
    this.state.storage = createStorageState(this.state.storage, this.state);
    const definition = STORAGE_CHESTS[chestId] || STORAGE_CHESTS.pantry;
    const container = this.state.storage.chests[definition.id];
    const backpackCards = sortedItems(this.state.inventory, this.state.storage.sortMode, "all").map(([id, count]) => `<article class="storage-transfer-row"><span>${ITEMS[id].icon}</span><div><strong>${ITEMS[id].name}</strong><small>Backpack ×${count} · ${itemQualitySummary(backpackQualityCounts(this.state, id))}</small></div><button data-store-one="${id}">+1</button><button data-store-all="${id}">All</button></article>`).join("");
    const chestCards = sortedItems(container.items, this.state.storage.sortMode, "all").map(([id, count]) => `<article class="storage-transfer-row"><span>${ITEMS[id].icon}</span><div><strong>${ITEMS[id].name}</strong><small>Stored ×${count} · ${itemQualitySummary(container.qualities[id])}</small></div><button data-take-one="${id}">+1</button><button data-take-all="${id}">All</button></article>`).join("");
    this.openModal(`${definition.icon} ${definition.name}`, `<section class="storage-capacity"><div><strong>${storageOccupiedSlots(container)}/${definition.capacity}</strong><small>storage stacks</small></div><div><strong>${backpackOccupiedSlots(this.state)}/${this.state.upgrades.backpack}</strong><small>backpack stacks</small></div><div><strong>${Object.values(container.items).reduce((sum, amount) => sum + amount, 0)}</strong><small>stored items</small></div></section><div class="storage-two-column"><section><h3>Backpack</h3><div class="storage-transfer-list">${backpackCards || "<p>Backpack empty.</p>"}</div></section><section><h3>${definition.name}</h3><div class="storage-transfer-list">${chestCards || "<p>This chest is empty.</p>"}</div></section></div>`, [
      { label: definition.id === "pantry" ? "Adventure Trunk" : "Farmhouse Pantry", action: () => { this.closeModal(); this.showStorageChest(definition.id === "pantry" ? "trunk" : "pantry"); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
    document.querySelectorAll("[data-store-one]").forEach((button) => { button.onclick = () => this.transferToStorage(definition.id, button.dataset.storeOne, 1); });
    document.querySelectorAll("[data-store-all]").forEach((button) => { button.onclick = () => this.transferToStorage(definition.id, button.dataset.storeAll, this.state.inventory[button.dataset.storeAll]); });
    document.querySelectorAll("[data-take-one]").forEach((button) => { button.onclick = () => this.transferFromStorage(definition.id, button.dataset.takeOne, 1); });
    document.querySelectorAll("[data-take-all]").forEach((button) => { button.onclick = () => this.transferFromStorage(definition.id, button.dataset.takeAll, container.items[button.dataset.takeAll]); });
  };

  proto.transferToStorage = function transferToStorage(chestId, id, amount) {
    const container = this.state.storage.chests[chestId];
    const moved = moveBackpackToContainer(this.state, id, amount, container);
    if (moved <= 0) return this.toast("That chest has no available stack space.");
    this.state.storage.stats.itemsStored += moved;
    this.saveGame(true);
    this.closeModal();
    this.showStorageChest(chestId);
  };

  proto.transferFromStorage = function transferFromStorage(chestId, id, amount) {
    const container = this.state.storage.chests[chestId];
    const moved = moveContainerToBackpack(this.state, id, amount, container);
    if (moved <= 0) return this.toast("The backpack has no room for that item stack.");
    this.state.storage.stats.itemsRetrieved += moved;
    this.saveGame(true);
    this.closeModal();
    this.showStorageChest(chestId);
  };

  proto.showShippingBin = function showShippingBin() {
    this.state.storage = createStorageState(this.state.storage, this.state);
    const shipping = this.state.storage.shipping;
    const queued = sortedItems(shipping.items, "category", "all").map(([id, count]) => `<article class="storage-transfer-row"><span>${ITEMS[id].icon}</span><div><strong>${ITEMS[id].name}</strong><small>Queued ×${count} · ${itemQualitySummary(shipping.qualities[id])} · Est. ${shipmentValueForItem(id, shipping.qualities[id], this.state.beacon?.level >= 1 ? 1.1 : 1)} coins</small></div><button data-unship-one="${id}">+1</button><button data-unship-all="${id}">All</button></article>`).join("");
    const backpack = sortedItems(this.state.inventory, "category", "all").filter(([id]) => isShippableItem(id)).map(([id, count]) => `<article class="storage-transfer-row"><span>${ITEMS[id].icon}</span><div><strong>${ITEMS[id].name}</strong><small>Backpack ×${count} · Base ${ITEMS[id].value || 0}</small></div><button data-ship-one="${id}">+1</button><button data-ship-all="${id}">All</button></article>`).join("");
    const multiplier = this.state.beacon?.level >= 1 ? 1.1 : 1;
    const estimate = Object.keys(shipping.items).reduce((sum, id) => sum + shipmentValueForItem(id, shipping.qualities[id], multiplier), 0);
    const last = this.state.storage.lastShipment;
    this.openModal("📮 Farmstead Shipping Bin", `<section class="shipping-summary"><div><strong>${Object.values(shipping.items).reduce((sum, amount) => sum + amount, 0)}</strong><small>items queued</small></div><div><strong>${estimate}</strong><small>estimated payout</small></div><div><strong>${multiplier > 1 ? "10%" : "0%"}</strong><small>Hearthlight market bonus</small></div></section><p>Goods are sold when the day ends. Quality increases value. Items may be retrieved before sleeping.</p>${last ? `<p class="shipping-last">Last shipment: Day ${last.day} · ${last.items.reduce((sum, entry) => sum + entry.count, 0)} items · ${last.total} coins.</p>` : ""}<div class="shipping-columns"><section><h3>Backpack Goods</h3><div class="storage-transfer-list">${backpack || "<p>No shippable goods.</p>"}</div></section><section><h3>Awaiting Shipment</h3><div class="storage-transfer-list">${queued || "<p>The bin is empty.</p>"}</div></section></div>`, [
      { label: "Ship All Produce", action: () => this.shipCategory(["crops", "forage", "fish"]) },
      { label: "Ship All Artisan", action: () => this.shipCategory(["ranch", "artisan", "meals"]) },
      { label: "Close", action: () => this.closeModal() },
    ]);
    document.querySelectorAll("[data-ship-one]").forEach((button) => { button.onclick = () => this.shipItem(button.dataset.shipOne, 1); });
    document.querySelectorAll("[data-ship-all]").forEach((button) => { button.onclick = () => this.shipItem(button.dataset.shipAll, this.state.inventory[button.dataset.shipAll]); });
    document.querySelectorAll("[data-unship-one]").forEach((button) => { button.onclick = () => this.retrieveShippedItem(button.dataset.unshipOne, 1); });
    document.querySelectorAll("[data-unship-all]").forEach((button) => { button.onclick = () => this.retrieveShippedItem(button.dataset.unshipAll, shipping.items[button.dataset.unshipAll]); });
  };

  proto.shipItem = function shipItem(id, amount) {
    if (!isShippableItem(id)) return this.toast("That item cannot be shipped.");
    const moved = moveBackpackToContainer(this.state, id, amount, this.state.storage.shipping);
    if (moved <= 0) return this.toast("No matching item could be moved into the shipping bin.");
    this.saveGame(true);
    this.closeModal();
    this.showShippingBin();
  };

  proto.retrieveShippedItem = function retrieveShippedItem(id, amount) {
    const moved = moveContainerToBackpack(this.state, id, amount, this.state.storage.shipping);
    if (moved <= 0) return this.toast("The backpack has no room for that shipment stack.");
    this.saveGame(true);
    this.closeModal();
    this.showShippingBin();
  };

  proto.shipCategory = function shipCategory(categories) {
    let moved = 0;
    for (const [id, count] of Object.entries(this.state.inventory)) {
      if (count <= 0 || !isShippableItem(id) || !categories.includes(inventoryCategoryForItem(id))) continue;
      moved += moveBackpackToContainer(this.state, id, count, this.state.storage.shipping);
    }
    if (moved <= 0) return this.toast("No matching goods were available to ship.");
    this.saveGame(true);
    this.closeModal();
    this.showShippingBin();
  };

  proto.checkStorageAchievements = function checkStorageAchievements() {
    const storedStacks = Object.values(this.state.storage.chests).reduce((sum, chest) => sum + storageOccupiedSlots(chest), 0);
    const last = this.state.storage.lastShipment;
    this.checkAchievement?.("storage-first-item", this.state.storage.stats.itemsStored >= 1, "Everything in Its Place", "Store the first item in a farmhouse chest.");
    this.checkAchievement?.("storage-organizer", storedStacks >= 25, "Farmhouse Organizer", "Maintain 25 different stored item stacks.");
    this.checkAchievement?.("storage-pack-upgrade", this.state.upgrades.backpack >= 56, "Packed and Ready", "Upgrade the backpack beyond its original capacity.");
    this.checkAchievement?.("shipping-first", this.state.storage.stats.shipments >= 1, "First Morning Market", "Complete the first overnight shipment.");
    this.checkAchievement?.("shipping-merchant", Boolean(last && last.total >= 5000), "Merchant's Morning", "Earn at least 5,000 coins from one overnight shipment.");
    this.checkAchievement?.("shipping-magnate", this.state.storage.stats.shippingRevenue >= 50000, "Continental Supplier", "Earn 50,000 coins through the Farmstead shipping bin.");
  };
}
