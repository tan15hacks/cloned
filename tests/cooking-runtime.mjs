import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { COOKING_RECIPE_MAP, COOKING_QUALITY_ORDER } from "../cooking-data.js";
import {
  installCooking, createCookingState, normalizeCookingRuntime,
  consumeCookingIngredients, syncCookingUnlocks, absoluteGameMinute,
} from "../game-cooking.js";

const qualityMap = (values = {}) => ({ normal: 0, silver: 0, gold: 0, iridium: 0, ...values });

class CookingHarness {
  constructor() {
    this.state = this.defaultState();
    this.achievementIds = [];
    this.lastToast = "";
  }
  defaultState() {
    return {
      day: 1,
      minutes: 600,
      mode: "world",
      player: { x: 11.5, y: 15.5, energy: 50, maxEnergy: 100, health: 50, maxHealth: 100 },
      living: { interiorId: null },
      inventory: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])),
      progression: { qualityInventory: {} },
      ranch: { qualityInventory: {} },
      social: { completedEvents: [], letters: [] },
      cooking: null,
      journal: [],
      achievements: [],
    };
  }
  migrateState(data) {
    const base = this.defaultState();
    return {
      ...base,
      ...data,
      player: { ...base.player, ...(data?.player || {}) },
      living: { ...base.living, ...(data?.living || {}) },
      inventory: { ...base.inventory, ...(data?.inventory || {}) },
      progression: { ...base.progression, ...(data?.progression || {}), qualityInventory: { ...(data?.progression?.qualityInventory || {}) } },
      ranch: { ...base.ranch, ...(data?.ranch || {}), qualityInventory: { ...(data?.ranch?.qualityInventory || {}) } },
      social: { ...base.social, ...(data?.social || {}), completedEvents: [...(data?.social?.completedEvents || [])], letters: [...(data?.social?.letters || [])] },
    };
  }
  enterGame() {}
  update(dt) { this.state.minutes += dt; }
  nextDay() { this.state.day += 1; this.state.minutes = 360; }
  spendEnergy(amount) { this.state.player.energy -= amount; }
  getCombatStats() { return { damage: 5, armor: 1, crit: .05, attackSpeed: 1, moveSpeed: 0, lootBonus: 0, statusResist: 0, maxHealth: 0 }; }
  updateHUD() {}
  interactInterior() {}
  updateContextHint() {}
  toggleGameMenu() {}
  completeSocialHeartEvent(key) { if (!this.state.social.completedEvents.includes(key)) this.state.social.completedEvents.push(key); }
  drawInteriorAmbience() {}
  applyEquipmentVitals() { this.vitalRefreshes = (this.vitalRefreshes || 0) + 1; }
  checkAchievement(id, condition) { if (condition && !this.achievementIds.includes(id)) this.achievementIds.push(id); }
  startActionAnimation() {}
  sound() {}
  saveGame() { this.saveCount = (this.saveCount || 0) + 1; }
  closeModal() {}
  toast(message) { this.lastToast = message; }
}

installCooking(CookingHarness);

const game = new CookingHarness();
game.state = game.defaultState();
game.showCooking = () => {};
game.updateCookingHud = () => {};
game.enterGame();
assert.ok(game.state.cooking);
assert.deepEqual(game.state.cooking.knownRecipes.sort(), ["herbOmelet", "sunberryCompote", "turnipBroth"].sort());
assert.ok(game.state.social.letters.some((letter) => letter.id === "cooking-welcome"));
assert.equal(game.state.cooking.level, 1);

const standardState = game.defaultState();
standardState.inventory.turnip = 2;
standardState.inventory.herb = 1;
standardState.progression.qualityInventory.turnip = qualityMap({ normal: 1, iridium: 1 });
const standardUse = consumeCookingIngredients(standardState, COOKING_RECIPE_MAP.turnipBroth, "standard");
assert.ok(standardUse);
assert.deepEqual(standardUse.qualities.sort(), ["normal", "normal", "iridium"].sort());
assert.equal(standardState.inventory.turnip, 0);
assert.equal(standardState.progression.qualityInventory.turnip.normal, 0);
assert.equal(standardState.progression.qualityInventory.turnip.iridium, 0);

const bestState = game.defaultState();
bestState.inventory.turnip = 2;
bestState.inventory.herb = 1;
bestState.progression.qualityInventory.turnip = qualityMap({ normal: 1, iridium: 1 });
bestState.progression.qualityInventory.herb = qualityMap({ gold: 1 });
const bestUse = consumeCookingIngredients(bestState, COOKING_RECIPE_MAP.turnipBroth, "best");
assert.ok(bestUse.average > standardUse.average);
assert.deepEqual(bestUse.qualities.sort(), ["gold", "normal", "iridium"].sort());

// Cook a standard farmhouse meal through the installed runtime.
game.state.mode = "interior";
game.state.living.interiorId = "farmhouse";
game.state.inventory.turnip = 2;
game.state.inventory.herb = 1;
game.state.progression.qualityInventory.turnip = qualityMap({ normal: 2 });
game.state.progression.qualityInventory.herb = qualityMap({ normal: 1 });
game.cookMeal("turnipBroth", "standard", 0);
assert.equal(game.state.inventory.turnipBroth, 1);
assert.equal(game.state.cooking.meals.turnipBroth.normal, 1);
assert.equal(game.state.cooking.stats.dishesCooked, 1);
assert.equal(game.achievementIds.includes("first-home-cooked-meal"), true);

const energyBeforeMeal = game.state.player.energy;
game.eatCookedMeal("turnipBroth", "normal");
assert.equal(game.state.inventory.turnipBroth, 0);
assert.equal(game.state.cooking.meals.turnipBroth.normal, 0);
assert.ok(game.state.player.energy > energyBeforeMeal);
assert.equal(game.state.cooking.activeBuff.buffId, "comfort");
const beforeSpend = game.state.player.energy;
game.spendEnergy(10);
assert.ok(Math.abs((beforeSpend - game.state.player.energy) - 8.2) < .0001, "Comfort buff must reduce energy spending by 18%");

const expiry = game.state.cooking.activeBuff.expiresAt;
assert.ok(expiry > absoluteGameMinute(game.state));
game.state.minutes = expiry + 1;
game.refreshCookingBuff(false);
assert.equal(game.state.cooking.activeBuff, null);

// A high-quality master meal must improve combat stats.
game.state.minutes = 700;
game.state.cooking.meals.depthsPlatter.iridium = 1;
game.state.inventory.depthsPlatter = 1;
game.eatCookedMeal("depthsPlatter", "iridium");
const buffed = game.getCombatStats();
assert.ok(buffed.damage > 5);
assert.ok(buffed.armor > 1);
assert.ok(buffed.moveSpeed > 0);
assert.ok(buffed.maxHealth > 0);

// Heart-event recipes unlock only after the friendship scene and required cooking level.
game.state.cooking.xp = 65;
game.state.cooking.level = 2;
assert.equal(game.state.cooking.knownRecipes.includes("riverStew"), false);
game.completeSocialHeartEvent("rowan:3");
assert.equal(game.state.cooking.knownRecipes.includes("riverStew"), true);
assert.ok(game.state.social.letters.some((letter) => letter.id === "recipe:riverStew"));

// Save migration removes invalid data and reconciles meal counts with inventory.
const migrated = normalizeCookingRuntime({
  day: 20,
  minutes: 600,
  inventory: { ...Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])), turnipBroth: 5 },
  social: { completedEvents: [] },
  cooking: {
    xp: 999999,
    knownRecipes: ["turnipBroth", "missing"],
    notifiedRecipes: ["missing"],
    meals: { turnipBroth: { normal: 1, silver: 1, gold: -9, iridium: 0 }, missing: { normal: 50 } },
    activeBuff: { recipeId: "missing", buffId: "master", quality: "iridium", expiresAt: 999999 },
    stats: { dishesCooked: -4, mealsEaten: 2, iridiumMeals: 1, uniqueRecipesCooked: ["turnipBroth", "missing"] },
  },
});
assert.equal(migrated.cooking.level, 10);
assert.equal(migrated.cooking.knownRecipes.includes("missing"), false);
assert.equal(migrated.cooking.activeBuff, null);
assert.equal(migrated.cooking.meals.turnipBroth.normal, 4);
assert.equal(migrated.cooking.meals.turnipBroth.silver, 1);
assert.equal(migrated.inventory.turnipBroth, 5);
assert.equal(migrated.cooking.stats.dishesCooked, 0);
assert.deepEqual(migrated.cooking.stats.uniqueRecipesCooked, ["turnipBroth"]);

// Level recipes unlock from XP without requiring a social event.
const levelGame = new CookingHarness();
levelGame.state = levelGame.defaultState();
levelGame.state.cooking = createCookingState({ xp: 65 });
levelGame.state.social.completedEvents = [];
syncCookingUnlocks(levelGame, false);
assert.equal(levelGame.state.cooking.knownRecipes.includes("glowcapSkillet"), true);
assert.equal(levelGame.state.cooking.knownRecipes.includes("riverStew"), false);

for (const quality of COOKING_QUALITY_ORDER) assert.ok(Number.isInteger(game.state.cooking.meals.turnipBroth[quality]));

console.log(JSON.stringify({
  ok: true,
  starterRecipes: 3,
  ingredientQualityStrategies: true,
  cookingAndEating: true,
  temporaryMealBuffs: true,
  heartRecipeUnlocks: true,
  levelRecipeUnlocks: true,
  saveMigration: true,
}));
