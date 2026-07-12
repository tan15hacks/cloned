import { ITEMS } from "./game-shared.js";
import { RANCH_PRODUCT_IDS, RANCH_QUALITY } from "./ranch-data.js";
import { COOKING_RECIPE_MAP } from "./cooking-data.js";
import {
  BACKPACK_STACK_LIMIT, preferredStorageChest,
  backpackOccupiedSlots, createStorageState,
} from "./inventory-storage-data.js";
import { moveBackpackToContainer } from "./game-storage.js";

const PROGRESSION_QUALITY_ITEMS = new Set(["turnip", "berry", "moonbean", "fish", "rareFish", "apple"]);
const QUALITY_ORDER = ["normal", "silver", "gold", "iridium"];

function finiteInt(value, fallback = 0) {
  const numeric = Number(value);
  return Math.floor(Number.isFinite(numeric) ? numeric : fallback);
}

function shiftStoredQuality(container, id, quality, amount) {
  if (!container || amount <= 0 || quality === "normal") return;
  const record = container.qualities[id];
  if (!record) return;
  let remaining = Math.max(0, finiteInt(amount));
  for (const source of QUALITY_ORDER) {
    if (source === quality || remaining <= 0) continue;
    const take = Math.min(remaining, Math.max(0, finiteInt(record[source])));
    record[source] -= take;
    record[quality] = Math.max(0, finiteInt(record[quality])) + take;
    remaining -= take;
  }
}

function externalQualitySnapshot(state, id) {
  if (COOKING_RECIPE_MAP[id]) return null;
  const record = RANCH_PRODUCT_IDS.includes(id)
    ? state.ranch?.qualityInventory?.[id]
    : PROGRESSION_QUALITY_ITEMS.has(id)
      ? state.progression?.qualityInventory?.[id]
      : null;
  if (!record) return null;
  const inventory = Math.max(0, finiteInt(state.inventory?.[id]));
  const recorded = QUALITY_ORDER.reduce((sum, quality) => sum + Math.max(0, finiteInt(record[quality])), 0);
  return { record, untrackedNormal: Math.max(0, inventory - recorded) };
}

function consumeExternalQuality(snapshot, amount) {
  if (!snapshot || amount <= 0) return;
  let remaining = Math.max(0, finiteInt(amount));
  const generic = Math.min(remaining, snapshot.untrackedNormal);
  remaining -= generic;
  for (const quality of QUALITY_ORDER) {
    if (remaining <= 0) break;
    const available = Math.max(0, finiteInt(snapshot.record[quality]));
    const take = Math.min(remaining, available);
    snapshot.record[quality] = available - take;
    remaining -= take;
  }
}

function appendQualityQueueSegments(game, id, movedSegments) {
  if (!game._storageExpectProgressionQuality || !PROGRESSION_QUALITY_ITEMS.has(id) || !movedSegments.length) return;
  const queue = game._storageQualityQueues?.[id];
  if (!Array.isArray(queue) || !queue.length) return;
  let moved = movedSegments.reduce((sum, segment) => sum + segment.count, 0);
  for (let index = queue.length - 1; index >= 0 && moved > 0; index -= 1) {
    const entry = queue[index];
    const take = Math.min(moved, Math.max(0, finiteInt(entry.backpack)));
    entry.backpack -= take;
    moved -= take;
  }
  for (const segment of movedSegments) queue.push({ backpack: 0, stored: segment.count, chestId: segment.chestId });
}

function routeBackpackOverflow(game, id, amount) {
  let remaining = Math.max(0, finiteInt(amount));
  const segments = [];
  if (remaining <= 0) return segments;
  const preferred = preferredStorageChest(id);
  const order = [preferred === "pantry" ? "trunk" : "pantry", preferred];
  for (const chestId of order) {
    if (remaining <= 0) break;
    const moved = moveBackpackToContainer(game.state, id, remaining, game.state.storage.chests[chestId]);
    if (moved > 0) {
      segments.push({ chestId, count: moved });
      remaining -= moved;
    }
  }
  if (segments.length) game.state.storage.stats.itemsStored += segments.reduce((sum, segment) => sum + segment.count, 0);
  return segments;
}

function overflowAmount(state, id, beforeCount, beforeSlots) {
  const after = Math.max(0, finiteInt(state.inventory?.[id]));
  const stackOverflow = Math.max(0, after - BACKPACK_STACK_LIMIT);
  const capacity = Math.max(1, finiteInt(state.upgrades?.backpack, 40));
  const newStackOverflow = beforeCount <= 0 && beforeSlots >= capacity ? after : 0;
  return Math.max(stackOverflow, newStackOverflow);
}

export function installStorageOverflowRuntime(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    addItem: proto.addItem,
    addRanchItem: proto.addRanchItem,
    cookMeal: proto.cookMeal,
    giveSocialGift: proto.giveSocialGift,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
  };

  proto.addItem = function addItemStorageOverflow(id, amount = 1, announce = false) {
    this.state.storage = createStorageState(this.state.storage, this.state);
    const beforeCount = Math.max(0, finiteInt(this.state.inventory?.[id]));
    const beforeSlots = backpackOccupiedSlots(this.state);
    const result = original.addItem.call(this, id, amount, false) || { backpack: Math.max(0, finiteInt(amount)), stored: 0, chestId: null };
    const overflow = overflowAmount(this.state, id, beforeCount, beforeSlots);
    const segments = routeBackpackOverflow(this, id, overflow);
    appendQualityQueueSegments(this, id, segments);
    const moved = segments.reduce((sum, segment) => sum + segment.count, 0);
    const finalCount = Math.max(0, finiteInt(this.state.inventory?.[id]));
    const finalResult = {
      ...result,
      backpack: Math.max(0, finalCount - beforeCount),
      stored: Math.max(0, finiteInt(result.stored)) + moved,
      chestId: segments.length === 1 && !result.stored ? segments[0].chestId : result.chestId,
      storageSegments: [
        ...(result.stored && result.chestId ? [{ chestId: result.chestId, count: result.stored }] : []),
        ...segments,
      ],
    };
    if (announce) {
      const stored = finalResult.stored;
      this.toast(stored > 0 ? `+${amount} ${ITEMS[id]?.name || id} · ${stored} stored automatically.` : `+${amount} ${ITEMS[id]?.name || id}`);
    }
    return finalResult;
  };

  if (original.addRanchItem) proto.addRanchItem = function addRanchItemStorageOverflow(id, quality = "normal", amount = 1, announce = true) {
    const safeQuality = RANCH_QUALITY[quality] ? quality : "normal";
    const safeAmount = Math.max(1, finiteInt(amount, 1));
    const result = this.addItem(id, safeAmount, false);
    const record = this.state.ranch?.qualityInventory?.[id];
    if (record && result.backpack > 0) record[safeQuality] = Math.max(0, finiteInt(record[safeQuality])) + result.backpack;
    for (const segment of result.storageSegments || []) shiftStoredQuality(this.state.storage.chests[segment.chestId], id, safeQuality, segment.count);
    if (announce) this.toast(`+${safeAmount} ${RANCH_QUALITY[safeQuality].icon} ${RANCH_QUALITY[safeQuality].name} ${ITEMS[id]?.name || id}${result.stored ? ` · ${result.stored} stored` : ""}`);
    return result;
  };

  if (original.cookMeal) proto.cookMeal = function cookMealStorageOverflow(recipeId, ...args) {
    const result = original.cookMeal.call(this, recipeId, ...args);
    const occupied = backpackOccupiedSlots(this.state);
    const capacity = Math.max(1, finiteInt(this.state.upgrades?.backpack, 40));
    if (occupied > capacity && (this.state.inventory?.[recipeId] || 0) > 0) {
      const segments = routeBackpackOverflow(this, recipeId, 1);
      if (segments.length) {
        this.toast(`${ITEMS[recipeId]?.name || recipeId} moved to farmhouse storage because the backpack was full.`);
        this.saveGame?.(true);
      }
    }
    return result;
  };

  if (original.giveSocialGift) proto.giveSocialGift = function giveSocialGiftStorageQuality(npcId, itemId) {
    const before = Math.max(0, finiteInt(this.state.inventory?.[itemId]));
    const quality = externalQualitySnapshot(this.state, itemId);
    const result = original.giveSocialGift.call(this, npcId, itemId);
    const after = Math.max(0, finiteInt(this.state.inventory?.[itemId]));
    consumeExternalQuality(quality, Math.max(0, before - after));
    return result;
  };

  proto.enterGame = function enterGameStorageOverflow() {
    const result = original.enterGame.call(this);
    this.state.storage = createStorageState(this.state.storage, this.state);
    return result;
  };

  proto.nextDay = function nextDayStorageOverflow(passedOut) {
    const result = original.nextDay.call(this, passedOut);
    this.state.storage = createStorageState(this.state.storage, this.state);
    return result;
  };
}
