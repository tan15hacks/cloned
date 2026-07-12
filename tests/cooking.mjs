import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { INTERIOR_MAPS } from "../living-world-data.js";
import {
  COOKING_RECIPES, COOKING_RECIPE_MAP, COOKING_STARTER_RECIPES,
  COOKING_QUALITY_ORDER, MEAL_BUFFS, cookingXpForLevel, cookingLevelFromXp,
  calculateMealQuality, mealBuffStats, registerFarmhouseKitchen, validateCookingData,
} from "../cooking-data.js";

registerFarmhouseKitchen();
assert.equal(validateCookingData(), true);
assert.equal(COOKING_RECIPES.length, 16);
assert.equal(new Set(COOKING_RECIPES.map((entry) => entry.id)).size, 16);
assert.equal(COOKING_STARTER_RECIPES.length, 3);
assert.deepEqual(COOKING_QUALITY_ORDER, ["normal", "silver", "gold", "iridium"]);

let heartRecipes = 0;
for (const recipe of COOKING_RECIPES) {
  assert.ok(ITEMS[recipe.item], `${recipe.id} output item must exist`);
  assert.ok(MEAL_BUFFS[recipe.buff], `${recipe.id} buff must exist`);
  assert.ok(recipe.energy > 0 && recipe.health >= 0 && recipe.duration > 0 && recipe.xp > 0);
  assert.ok(recipe.level >= 1 && recipe.level <= 10);
  for (const [id, amount] of Object.entries(recipe.ingredients)) {
    assert.ok(ITEMS[id], `${recipe.id} ingredient ${id} must exist`);
    assert.ok(Number.isInteger(amount) && amount > 0);
  }
  if (recipe.unlock.type === "heart") heartRecipes += 1;
}
assert.equal(heartRecipes, 10);
assert.equal(COOKING_RECIPE_MAP.hearthvaleFeast.level, 10);

const farmhouse = INTERIOR_MAPS.farmhouse;
const stove = farmhouse.objects.find((object) => object.id === "farmhouse-stove");
const shelf = farmhouse.objects.find((object) => object.id === "farmhouse-cookbook-shelf");
assert.ok(stove && shelf);
for (const id of ["kitchenStove", "cookbook"]) {
  const interaction = farmhouse.interactions.find((entry) => entry.id === id);
  assert.ok(interaction, `${id} interaction must exist`);
  const blocked = farmhouse.objects.some((object) => object.solid
    && interaction.x >= object.x && interaction.x < object.x + object.w
    && interaction.y >= object.y && interaction.y < object.y + object.h);
  assert.equal(blocked, false, `${id} must stand on a walkable tile`);
}

assert.equal(cookingXpForLevel(1), 0);
assert.equal(cookingXpForLevel(2), 65);
assert.equal(cookingLevelFromXp(0), 1);
assert.equal(cookingLevelFromXp(64), 1);
assert.equal(cookingLevelFromXp(65), 2);
assert.equal(cookingLevelFromXp(cookingXpForLevel(10)), 10);

assert.equal(calculateMealQuality(0, 1, 0), "normal");
assert.equal(calculateMealQuality(2, 1, 0), "silver");
assert.equal(calculateMealQuality(3, 10, .99), "iridium");
assert.ok(mealBuffStats("master", "iridium").damage > mealBuffStats("master", "normal").damage);
assert.ok(mealBuffStats("comfort", "gold").energyEfficiency > MEAL_BUFFS.comfort.energyEfficiency);

console.log(JSON.stringify({
  ok: true,
  recipes: COOKING_RECIPES.length,
  starterRecipes: COOKING_STARTER_RECIPES.length,
  friendshipRecipes: heartRecipes,
  kitchenInteractionsWalkable: true,
  qualityTiers: COOKING_QUALITY_ORDER.length,
  cookingLevels: 10,
}));
