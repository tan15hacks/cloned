import { ITEMS, clamp } from "./game-shared.js";
import {
  COOKING_RECIPES, COOKING_RECIPE_MAP, COOKING_QUALITY_ORDER,
  COOKING_QUALITY, MEAL_BUFFS, cookingLevelFromXp,
} from "./cooking-data.js";
import { absoluteGameMinute, createCookingState } from "./game-cooking.js";

const MAX_COOKING_XP = 2_000_000;
const MAX_ACTIVE_DURATION = 1440;

export function removePreparedMealRecords(state, recipeId, amount = 1) {
  const recipe = COOKING_RECIPE_MAP[recipeId];
  const meal = state?.cooking?.meals?.[recipeId];
  if (!recipe || !meal) return 0;
  let remaining = Math.max(0, Math.floor(Number(amount) || 0));
  let removed = 0;
  for (const quality of COOKING_QUALITY_ORDER) {
    if (remaining <= 0) break;
    const available = Math.max(0, Math.floor(Number(meal[quality]) || 0));
    const take = Math.min(available, remaining);
    meal[quality] = available - take;
    remaining -= take;
    removed += take;
  }
  return removed;
}

function addPreparedMealRecords(state, recipeId, amount = 1) {
  const meal = state?.cooking?.meals?.[recipeId];
  if (!COOKING_RECIPE_MAP[recipeId] || !meal) return 0;
  const added = Math.max(0, Math.floor(Number(amount) || 0));
  meal.normal = clamp((Number(meal.normal) || 0) + added, 0, 9999);
  return added;
}

export function hardenCookingState(state) {
  if (!state || typeof state !== "object") return state;
  state.inventory = state.inventory && typeof state.inventory === "object" ? state.inventory : {};
  state.cooking = createCookingState(state.cooking);
  const rawXp = Number(state.cooking.xp);
  state.cooking.xp = clamp(Math.floor(Number.isFinite(rawXp) ? rawXp : 0), 0, MAX_COOKING_XP);
  state.cooking.level = cookingLevelFromXp(state.cooking.xp);

  for (const recipe of COOKING_RECIPES) {
    const meal = state.cooking.meals[recipe.id];
    let total = 0;
    for (const quality of COOKING_QUALITY_ORDER) {
      meal[quality] = clamp(Math.floor(Number(meal[quality]) || 0), 0, 9999);
      total += meal[quality];
    }
    const inventory = clamp(Math.floor(Number(state.inventory[recipe.item]) || 0), 0, 39996);
    if (inventory > total) meal.normal = clamp(meal.normal + inventory - total, 0, 9999);
    state.inventory[recipe.item] = COOKING_QUALITY_ORDER.reduce((sum, quality) => sum + meal[quality], 0);
  }

  const now = absoluteGameMinute(state);
  const active = state.cooking.activeBuff;
  if (active) {
    const recipe = COOKING_RECIPE_MAP[active.recipeId];
    if (!recipe || !MEAL_BUFFS[recipe.buff] || !COOKING_QUALITY[active.quality] || active.expiresAt <= now) state.cooking.activeBuff = null;
    else {
      const rawStartedAt = Number(active.startedAt);
      const rawExpiresAt = Number(active.expiresAt);
      active.buffId = recipe.buff;
      active.startedAt = clamp(Number.isFinite(rawStartedAt) ? rawStartedAt : now, 0, now);
      active.expiresAt = clamp(Number.isFinite(rawExpiresAt) ? rawExpiresAt : now, now + 1, now + MAX_ACTIVE_DURATION);
    }
  }

  state.cooking.knownRecipes = [...new Set(state.cooking.knownRecipes.filter((id) => COOKING_RECIPE_MAP[id]))].slice(0, COOKING_RECIPES.length);
  const knownRecipes = new Set(state.cooking.knownRecipes);
  state.cooking.notifiedRecipes = [...new Set(state.cooking.notifiedRecipes.filter((id) => knownRecipes.has(id)))].slice(0, COOKING_RECIPES.length);
  state.cooking.stats.uniqueRecipesCooked = [...new Set(state.cooking.stats.uniqueRecipesCooked.filter((id) => COOKING_RECIPE_MAP[id]))].slice(0, COOKING_RECIPES.length);
  state.cooking.stats.dishesCooked = clamp(Math.floor(Number(state.cooking.stats.dishesCooked) || 0), 0, 999999);
  state.cooking.stats.mealsEaten = clamp(Math.floor(Number(state.cooking.stats.mealsEaten) || 0), 0, 999999);
  state.cooking.stats.iridiumMeals = clamp(Math.floor(Number(state.cooking.stats.iridiumMeals) || 0), 0, state.cooking.stats.dishesCooked);

  for (const id of Object.keys(state.inventory)) {
    if (!ITEMS[id]) delete state.inventory[id];
    else state.inventory[id] = clamp(Math.floor(Number(state.inventory[id]) || 0), 0, 999999);
  }
  return state;
}

export function installCookingRuntime(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    leaveToTitle: proto.leaveToTitle,
    addItem: proto.addItem,
    giveSocialGift: proto.giveSocialGift,
    sellCategory: proto.sellCategory,
  };

  proto.migrateState = function migrateStateCookingRuntime(data) {
    return hardenCookingState(original.migrateState.call(this, data));
  };

  proto.enterGame = function enterGameCookingRuntime() {
    hardenCookingState(this.state);
    const result = original.enterGame.call(this);
    hardenCookingState(this.state);
    this.applyEquipmentVitals?.();
    this.updateCookingHud?.();
    return result;
  };

  proto.nextDay = function nextDayCookingRuntime(passedOut) {
    const result = original.nextDay.call(this, passedOut);
    hardenCookingState(this.state);
    this.applyEquipmentVitals?.();
    this.updateCookingHud?.();
    return result;
  };

  proto.leaveToTitle = function leaveToTitleCookingRuntime() {
    if (typeof document !== "undefined") document.getElementById("mealBuffHud")?.classList.add("hidden");
    return original.leaveToTitle.call(this);
  };

  if (original.addItem) proto.addItem = function addItemCookingRuntime(id, amount = 1, announce = false) {
    const before = Math.max(0, Number(this.state?.inventory?.[id]) || 0);
    const result = original.addItem.call(this, id, amount, announce);
    const after = Math.max(0, Number(this.state?.inventory?.[id]) || 0);
    if (after > before && COOKING_RECIPE_MAP[id]) addPreparedMealRecords(this.state, id, after - before);
    return result;
  };

  if (original.giveSocialGift) proto.giveSocialGift = function giveSocialGiftCookingRuntime(npcId, itemId) {
    const before = Math.max(0, Number(this.state?.inventory?.[itemId]) || 0);
    const result = original.giveSocialGift.call(this, npcId, itemId);
    const after = Math.max(0, Number(this.state?.inventory?.[itemId]) || 0);
    const consumed = Math.max(0, before - after);
    if (consumed > 0 && COOKING_RECIPE_MAP[itemId]) {
      removePreparedMealRecords(this.state, itemId, consumed);
      this.saveGame?.(true);
    }
    return result;
  };

  if (original.sellCategory) proto.sellCategory = function sellCategoryCookingRuntime(ids, multiplier = 1) {
    const mealCounts = Object.fromEntries((ids || []).filter((id) => COOKING_RECIPE_MAP[id]).map((id) => [id, Math.max(0, Number(this.state?.inventory?.[id]) || 0)]));
    const result = original.sellCategory.call(this, ids, multiplier);
    let synchronized = false;
    for (const [id, before] of Object.entries(mealCounts)) {
      const after = Math.max(0, Number(this.state?.inventory?.[id]) || 0);
      const consumed = Math.max(0, before - after);
      if (consumed > 0) {
        removePreparedMealRecords(this.state, id, consumed);
        synchronized = true;
      }
    }
    if (synchronized) this.saveGame?.(true);
    return result;
  };
}
