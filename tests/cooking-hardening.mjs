import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { cookingXpForLevel } from "../cooking-data.js";
import { absoluteGameMinute } from "../game-cooking.js";
import { hardenCookingState } from "../game-cooking-runtime.js";

const inventory = Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0]));
const state = {
  day: 12,
  minutes: 600,
  inventory: {
    ...inventory,
    turnipBroth: 7,
    riverStew: -9,
    injectedUnknownItem: 999,
  },
  cooking: {
    xp: Number.POSITIVE_INFINITY,
    knownRecipes: ["turnipBroth", "turnipBroth", "missing"],
    notifiedRecipes: ["riverStew", "missing", "riverStew"],
    meals: {
      turnipBroth: { normal: 1, silver: 2, gold: 0, iridium: 0 },
      riverStew: { normal: -6, silver: 0, gold: 0, iridium: 0 },
    },
    activeBuff: {
      recipeId: "turnipBroth",
      buffId: "master",
      quality: "gold",
      startedAt: -500,
      expiresAt: 999999999,
    },
    stats: {
      dishesCooked: 4,
      mealsEaten: -10,
      iridiumMeals: 999,
      uniqueRecipesCooked: ["turnipBroth", "missing", "turnipBroth"],
    },
  },
};

hardenCookingState(state);
assert.equal(state.cooking.level, 1, "Non-finite XP should normalize safely instead of becoming a forged maximum level");
assert.equal(state.cooking.xp, 0);
assert.deepEqual(state.cooking.knownRecipes.sort(), ["herbOmelet", "sunberryCompote", "turnipBroth"].sort());
assert.deepEqual(state.cooking.notifiedRecipes, ["riverStew"]);
assert.deepEqual(state.cooking.stats.uniqueRecipesCooked, ["turnipBroth"]);
assert.equal(state.cooking.stats.mealsEaten, 0);
assert.equal(state.cooking.stats.iridiumMeals, 4);
assert.equal(state.inventory.injectedUnknownItem, undefined);
assert.equal(state.cooking.meals.turnipBroth.normal, 5);
assert.equal(state.cooking.meals.turnipBroth.silver, 2);
assert.equal(state.inventory.turnipBroth, 7);
assert.equal(state.cooking.meals.riverStew.normal, 0);
assert.equal(state.inventory.riverStew, 0);

const now = absoluteGameMinute(state);
assert.equal(state.cooking.activeBuff.buffId, "comfort", "A forged buff id must be replaced by the recipe's real buff");
assert.equal(state.cooking.activeBuff.startedAt, 0);
assert.equal(state.cooking.activeBuff.expiresAt, now + 1440, "Imported effects must be capped to one game day");

const expired = {
  day: 5,
  minutes: 800,
  inventory: { ...inventory },
  cooking: {
    xp: cookingXpForLevel(6),
    knownRecipes: [],
    activeBuff: { recipeId: "turnipBroth", buffId: "comfort", quality: "normal", startedAt: 1, expiresAt: 10 },
  },
};
hardenCookingState(expired);
assert.equal(expired.cooking.level, 6);
assert.equal(expired.cooking.activeBuff, null);

const mismatched = {
  day: 2,
  minutes: 700,
  inventory: { ...inventory },
  cooking: {
    activeBuff: { recipeId: "missing", buffId: "master", quality: "iridium", startedAt: 0, expiresAt: 99999 },
  },
};
hardenCookingState(mismatched);
assert.equal(mismatched.cooking.activeBuff, null);

console.log(JSON.stringify({
  ok: true,
  finiteXp: true,
  mealInventoryReconciled: true,
  unknownItemsRemoved: true,
  forgedBuffCorrected: true,
  durationCapped: true,
  expiredBuffRemoved: true,
}));
