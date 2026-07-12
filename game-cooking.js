import { ITEMS, NPC_DEFS, clamp, distance, $ } from "./game-shared.js";
import { INTERIOR_MAPS } from "./living-world-data.js";
import {
  COOKING_RECIPES, COOKING_RECIPE_MAP, COOKING_STARTER_RECIPES,
  COOKING_QUALITY_ORDER, COOKING_QUALITY, MEAL_BUFFS,
  cookingXpForLevel, cookingLevelFromXp, calculateMealQuality,
  mealBuffStats, recipeSourceLabel, registerFarmhouseKitchen,
} from "./cooking-data.js";

const COOKING_VERSION = 1;
const QUALITY_INDEX = Object.fromEntries(COOKING_QUALITY_ORDER.map((id, index) => [id, index]));
const COOKING_MAX_RECORDS = 100;

export function absoluteGameMinute(state) {
  return (Math.max(1, Math.floor(Number(state?.day) || 1)) - 1) * 1440 + clamp(Number(state?.minutes) || 360, 0, 1440);
}

function emptyMealInventory() {
  return Object.fromEntries(COOKING_RECIPES.map((entry) => [entry.id, Object.fromEntries(COOKING_QUALITY_ORDER.map((quality) => [quality, 0]))]));
}

export function createCookingState(existing = {}) {
  const value = existing && typeof existing === "object" ? existing : {};
  const meals = emptyMealInventory();
  for (const entry of COOKING_RECIPES) {
    const source = value.meals?.[entry.id] || {};
    for (const quality of COOKING_QUALITY_ORDER) meals[entry.id][quality] = clamp(Math.floor(Number(source[quality]) || 0), 0, 9999);
  }
  const xp = Math.max(0, Math.floor(Number(value.xp) || 0));
  const level = cookingLevelFromXp(xp);
  const knownRecipes = [...new Set([
    ...COOKING_STARTER_RECIPES,
    ...(Array.isArray(value.knownRecipes) ? value.knownRecipes.filter((id) => COOKING_RECIPE_MAP[id]) : []),
  ])];
  const active = value.activeBuff && COOKING_RECIPE_MAP[value.activeBuff.recipeId] && MEAL_BUFFS[value.activeBuff.buffId]
    && COOKING_QUALITY[value.activeBuff.quality] && Number.isFinite(Number(value.activeBuff.expiresAt))
    ? {
      recipeId: value.activeBuff.recipeId,
      buffId: value.activeBuff.buffId,
      quality: value.activeBuff.quality,
      startedAt: Math.max(0, Number(value.activeBuff.startedAt) || 0),
      expiresAt: Math.max(0, Number(value.activeBuff.expiresAt) || 0),
    }
    : null;
  return {
    version: COOKING_VERSION,
    xp,
    level,
    knownRecipes,
    notifiedRecipes: Array.isArray(value.notifiedRecipes) ? [...new Set(value.notifiedRecipes.filter((id) => COOKING_RECIPE_MAP[id]))].slice(0, COOKING_RECIPES.length) : [...COOKING_STARTER_RECIPES],
    meals,
    activeBuff: active,
    introQueued: Boolean(value.introQueued),
    stats: {
      dishesCooked: Math.max(0, Math.floor(Number(value.stats?.dishesCooked) || 0)),
      mealsEaten: Math.max(0, Math.floor(Number(value.stats?.mealsEaten) || 0)),
      iridiumMeals: Math.max(0, Math.floor(Number(value.stats?.iridiumMeals) || 0)),
      uniqueRecipesCooked: Array.isArray(value.stats?.uniqueRecipesCooked) ? [...new Set(value.stats.uniqueRecipesCooked.filter((id) => COOKING_RECIPE_MAP[id]))] : [],
    },
  };
}

function trackedQualitySources(state, itemId) {
  const sources = [];
  const progression = state.progression?.qualityInventory?.[itemId];
  const ranch = state.ranch?.qualityInventory?.[itemId];
  for (const map of [progression, ranch]) {
    if (!map || typeof map !== "object") continue;
    for (const quality of COOKING_QUALITY_ORDER) {
      const count = Math.max(0, Math.floor(Number(map[quality]) || 0));
      if (count > 0) sources.push({ quality, count, map });
    }
  }
  return sources;
}

export function ingredientQualityCounts(state, itemId) {
  const inventoryCount = Math.max(0, Math.floor(Number(state?.inventory?.[itemId]) || 0));
  const counts = Object.fromEntries(COOKING_QUALITY_ORDER.map((quality) => [quality, 0]));
  const sources = trackedQualitySources(state, itemId);
  let tracked = 0;
  for (const source of sources) { counts[source.quality] += source.count; tracked += source.count; }
  counts.normal += Math.max(0, inventoryCount - tracked);
  return { total: inventoryCount, counts };
}

export function canCookRecipeState(state, recipe) {
  if (!recipe) return false;
  return Object.entries(recipe.ingredients).every(([id, amount]) => (state?.inventory?.[id] || 0) >= amount);
}

function consumeIngredient(state, itemId, amount, strategy) {
  const inventoryCount = Math.max(0, Math.floor(Number(state.inventory?.[itemId]) || 0));
  if (inventoryCount < amount) return null;
  const sources = trackedQualitySources(state, itemId);
  const trackedTotal = sources.reduce((sum, source) => sum + source.count, 0);
  const genericNormal = Math.max(0, inventoryCount - trackedTotal);
  if (genericNormal > 0) sources.push({ quality: "normal", count: genericNormal, map: null });
  const order = strategy === "best" ? [...COOKING_QUALITY_ORDER].reverse() : [...COOKING_QUALITY_ORDER];
  const consumed = [];
  let remaining = amount;
  for (const quality of order) {
    const qualitySources = sources.filter((source) => source.quality === quality).sort((a, b) => Number(Boolean(b.map)) - Number(Boolean(a.map)));
    for (const source of qualitySources) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, source.count);
      if (take <= 0) continue;
      if (source.map) source.map[quality] = Math.max(0, (Number(source.map[quality]) || 0) - take);
      source.count -= take;
      remaining -= take;
      for (let index = 0; index < take; index += 1) consumed.push(quality);
    }
    if (remaining <= 0) break;
  }
  if (remaining > 0) return null;
  state.inventory[itemId] = inventoryCount - amount;
  return consumed;
}

export function consumeCookingIngredients(state, recipe, strategy = "standard") {
  if (!canCookRecipeState(state, recipe)) return null;
  const snapshot = {};
  const maps = [];
  for (const [id] of Object.entries(recipe.ingredients)) {
    snapshot[id] = state.inventory[id];
    for (const map of [state.progression?.qualityInventory?.[id], state.ranch?.qualityInventory?.[id]]) {
      if (map && typeof map === "object") {
        const copy = { ...map };
        maps.push([map, copy]);
      }
    }
  }
  const qualities = [];
  for (const [id, amount] of Object.entries(recipe.ingredients)) {
    const consumed = consumeIngredient(state, id, amount, strategy);
    if (!consumed) {
      for (const [itemId, count] of Object.entries(snapshot)) state.inventory[itemId] = count;
      for (const [map, copy] of maps) Object.assign(map, copy);
      return null;
    }
    qualities.push(...consumed);
  }
  const average = qualities.length ? qualities.reduce((sum, quality) => sum + (QUALITY_INDEX[quality] || 0), 0) / qualities.length : 0;
  return { qualities, average };
}

function recipeUnlockSatisfied(state, recipe) {
  if (!recipe || (state.cooking?.level || 1) < recipe.level) return false;
  if (recipe.unlock.type === "starter" || recipe.unlock.type === "level") return true;
  return Boolean(state.social?.completedEvents?.includes(`${recipe.unlock.npcId}:${recipe.unlock.threshold}`));
}

function queueCookingLetter(game, letter) {
  const letters = game.state.social?.letters;
  if (!Array.isArray(letters) || letters.some((entry) => entry.id === letter.id)) return false;
  letters.push({ read: false, claimed: false, reward: null, eventKey: null, day: game.state.day, ...letter });
  game.state.social.letters = letters.slice(-COOKING_MAX_RECORDS);
  return true;
}

function sourceNpcName(recipe) {
  if (recipe.unlock.type !== "heart") return "Farmhouse Cookbook";
  return NPC_DEFS.find((npc) => npc.id === recipe.unlock.npcId)?.name || "A Hearthvale Friend";
}

export function syncCookingUnlocks(game, announce = false) {
  const cooking = game.state.cooking;
  const before = new Set(cooking.knownRecipes);
  const unlocked = [];
  for (const recipe of COOKING_RECIPES) {
    if (!recipeUnlockSatisfied(game.state, recipe) || before.has(recipe.id)) continue;
    cooking.knownRecipes.push(recipe.id);
    before.add(recipe.id);
    unlocked.push(recipe.id);
    if (!announce) {
      if (!cooking.notifiedRecipes.includes(recipe.id)) cooking.notifiedRecipes.push(recipe.id);
      continue;
    }
    if (!cooking.notifiedRecipes.includes(recipe.id)) {
      cooking.notifiedRecipes.push(recipe.id);
      const from = sourceNpcName(recipe);
      queueCookingLetter(game, {
        id: `recipe:${recipe.id}`,
        from,
        subject: `Recipe Learned — ${ITEMS[recipe.item].name}`,
        body: recipe.unlock.type === "heart"
          ? `I wrote down the recipe we discussed. Use the stove inside your farmhouse, and choose better-quality ingredients when the occasion deserves it. — ${from}`
          : `Your growing kitchen skill has revealed a new recipe in the farmhouse cookbook: ${ITEMS[recipe.item].name}.`,
      });
      game.state.journal.unshift(`Recipe learned: ${ITEMS[recipe.item].name} (${recipeSourceLabel(recipe)}).`);
      game.toast?.(`New recipe: ${ITEMS[recipe.item].name}.`);
    }
  }
  cooking.knownRecipes = [...new Set(cooking.knownRecipes)].slice(0, COOKING_RECIPES.length);
  cooking.notifiedRecipes = [...new Set(cooking.notifiedRecipes)].slice(0, COOKING_RECIPES.length);
  game.state.journal = game.state.journal.slice(0, 30);
  return unlocked;
}

function reconcileMealInventory(state) {
  for (const recipe of COOKING_RECIPES) {
    const meal = state.cooking.meals[recipe.id];
    const recorded = COOKING_QUALITY_ORDER.reduce((sum, quality) => sum + meal[quality], 0);
    const inventory = Math.max(0, Math.floor(Number(state.inventory?.[recipe.item]) || 0));
    if (inventory > recorded) meal.normal += inventory - recorded;
    state.inventory[recipe.item] = COOKING_QUALITY_ORDER.reduce((sum, quality) => sum + meal[quality], 0);
  }
}

export function normalizeCookingRuntime(state) {
  if (!state || typeof state !== "object") return state;
  state.cooking = createCookingState(state.cooking);
  state.cooking.level = cookingLevelFromXp(state.cooking.xp);
  reconcileMealInventory(state);
  if (state.cooking.activeBuff && state.cooking.activeBuff.expiresAt <= absoluteGameMinute(state)) state.cooking.activeBuff = null;
  return state;
}

function remainingBuffMinutes(state) {
  if (!state.cooking?.activeBuff) return 0;
  return Math.max(0, Math.ceil(state.cooking.activeBuff.expiresAt - absoluteGameMinute(state)));
}

function ingredientLine(state, recipe) {
  return Object.entries(recipe.ingredients).map(([id, amount]) => {
    const available = Math.max(0, Number(state.inventory[id]) || 0);
    const quality = ingredientQualityCounts(state, id).counts;
    const premium = quality.iridium ? ` · 💠${quality.iridium}` : quality.gold ? ` · 🥇${quality.gold}` : quality.silver ? ` · 🥈${quality.silver}` : "";
    return `${ITEMS[id].icon} ${ITEMS[id].name} ${available}/${amount}${premium}`;
  }).join("<br>");
}

function buffDescription(recipe, quality = "normal") {
  const buff = mealBuffStats(recipe.buff, quality);
  const parts = [];
  if (buff.damage) parts.push(`+${buff.damage.toFixed(1)} damage`);
  if (buff.armor) parts.push(`+${buff.armor.toFixed(1)} armor`);
  if (buff.crit) parts.push(`+${Math.round(buff.crit * 100)}% crit`);
  if (buff.attackSpeed) parts.push(`+${Math.round(buff.attackSpeed * 100)}% attack speed`);
  if (buff.moveSpeed) parts.push(`+${Math.round(buff.moveSpeed * 100)}% speed`);
  if (buff.lootBonus) parts.push(`+${Math.round(buff.lootBonus * 100)}% loot luck`);
  if (buff.statusResist) parts.push(`+${Math.round(buff.statusResist * 100)}% status resist`);
  if (buff.energyEfficiency) parts.push(`${Math.round(buff.energyEfficiency * 100)}% less energy spent`);
  if (buff.maxHealth) parts.push(`+${Math.round(buff.maxHealth)} max health`);
  return `${buff.icon} ${buff.name}: ${parts.join(" · ")}`;
}

export function installCooking(GameClass) {
  registerFarmhouseKitchen();
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    update: proto.update,
    nextDay: proto.nextDay,
    spendEnergy: proto.spendEnergy,
    getCombatStats: proto.getCombatStats,
    updateHUD: proto.updateHUD,
    interactInterior: proto.interactInterior,
    updateContextHint: proto.updateContextHint,
    toggleGameMenu: proto.toggleGameMenu,
    completeSocialHeartEvent: proto.completeSocialHeartEvent,
    drawInteriorAmbience: proto.drawInteriorAmbience,
  };

  proto.defaultState = function defaultStateCooking() {
    const state = original.defaultState.call(this);
    state.cooking = createCookingState();
    return state;
  };

  proto.migrateState = function migrateStateCooking(data) {
    const state = original.migrateState.call(this, data);
    state.cooking = createCookingState(data?.cooking || state.cooking);
    return normalizeCookingRuntime(state);
  };

  proto.enterGame = function enterGameCooking() {
    normalizeCookingRuntime(this.state);
    const result = original.enterGame.call(this);
    normalizeCookingRuntime(this.state);
    const unlocked = syncCookingUnlocks(this, false);
    if (!this.state.cooking.introQueued) {
      this.state.cooking.introQueued = true;
      queueCookingLetter(this, {
        id: "cooking-welcome",
        from: "Rowan",
        subject: "The Farmhouse Stove Is Ready",
        body: "I cleaned the old stove and left three basic recipes in your cookbook. Crops, fish, forage, eggs, milk, and artisan goods can all become meals. Better ingredients create stronger food and longer meal effects.",
        reward: { item: "turnip", amount: 2, coins: 60 },
      });
      this.toast?.("Rowan left a cooking letter in the Farmstead mailbox.");
    }
    this.refreshCookingBuff(false);
    if (unlocked.length || this.state.cooking.introQueued) this.saveGame?.(true);
    return result;
  };

  proto.update = function updateCooking(dt) {
    const result = original.update.call(this, dt);
    this.refreshCookingBuff(true);
    return result;
  };

  proto.nextDay = function nextDayCooking(passedOut) {
    const result = original.nextDay.call(this, passedOut);
    normalizeCookingRuntime(this.state);
    this.refreshCookingBuff(true);
    syncCookingUnlocks(this, true);
    return result;
  };

  proto.refreshCookingBuff = function refreshCookingBuff(announce = true) {
    const active = this.state.cooking?.activeBuff;
    if (!active || active.expiresAt > absoluteGameMinute(this.state)) return active;
    const name = ITEMS[COOKING_RECIPE_MAP[active.recipeId]?.item]?.name || "Meal";
    this.state.cooking.activeBuff = null;
    this.applyEquipmentVitals?.();
    if (announce) this.toast(`${name}'s meal effect has ended.`);
    this.updateCookingHud?.();
    return null;
  };

  proto.getCombatStats = function getCombatStatsCooking() {
    const stats = original.getCombatStats.call(this);
    const active = this.state?.cooking?.activeBuff;
    if (!active || active.expiresAt <= absoluteGameMinute(this.state)) return stats;
    const buff = mealBuffStats(active.buffId, active.quality);
    for (const key of ["damage", "armor", "crit", "attackSpeed", "moveSpeed", "lootBonus", "statusResist", "maxHealth"]) stats[key] = (Number(stats[key]) || 0) + (Number(buff[key]) || 0);
    stats.crit = clamp(stats.crit, 0, .75);
    stats.statusResist = clamp(stats.statusResist, 0, .9);
    stats.moveSpeed = clamp(stats.moveSpeed, 0, .8);
    return stats;
  };

  proto.spendEnergy = function spendEnergyCooking(amount) {
    const active = this.state?.cooking?.activeBuff;
    const buff = active && active.expiresAt > absoluteGameMinute(this.state) ? mealBuffStats(active.buffId, active.quality) : null;
    const adjusted = Math.max(0, Number(amount) || 0) * (1 - clamp(Number(buff?.energyEfficiency) || 0, 0, .6));
    return original.spendEnergy.call(this, adjusted);
  };

  proto.updateHUD = function updateHudCooking() {
    const result = original.updateHUD.call(this);
    this.updateCookingHud();
    return result;
  };

  proto.updateCookingHud = function updateCookingHud() {
    const hud = $("mealBuffHud");
    if (!hud || !this.state?.cooking) return;
    const active = this.state.cooking.activeBuff;
    const remaining = remainingBuffMinutes(this.state);
    if (!active || remaining <= 0) { hud.classList.add("hidden"); return; }
    const recipe = COOKING_RECIPE_MAP[active.recipeId];
    const quality = COOKING_QUALITY[active.quality];
    $("mealBuffIcon").textContent = ITEMS[recipe.item].icon;
    $("mealBuffName").textContent = `${quality.icon} ${ITEMS[recipe.item].name}`;
    $("mealBuffTime").textContent = `${Math.floor(remaining / 60)}h ${remaining % 60}m`;
    hud.title = buffDescription(recipe, active.quality);
    hud.classList.remove("hidden");
  };

  proto.interactInterior = function interactInteriorCooking() {
    if (this.state.mode === "interior" && this.state.living?.interiorId === "farmhouse") {
      const map = INTERIOR_MAPS.farmhouse;
      const interaction = map.interactions.find((entry) => distance(this.state.player, entry) < 1.6);
      if (interaction?.id === "kitchenStove") { this.startActionAnimation?.("interact"); return this.showCooking(true); }
      if (interaction?.id === "cookbook") { this.startActionAnimation?.("interact"); return this.showCooking(false); }
    }
    return original.interactInterior.call(this);
  };

  proto.updateContextHint = function updateContextHintCooking() {
    const result = original.updateContextHint.call(this);
    if (this.state.mode !== "interior" || this.state.living?.interiorId !== "farmhouse") return result;
    const hint = $("contextHint");
    const interaction = INTERIOR_MAPS.farmhouse.interactions.find((entry) => distance(this.state.player, entry) < 1.6);
    if (interaction?.id === "kitchenStove" || interaction?.id === "cookbook") {
      hint.textContent = interaction.id === "kitchenStove" ? "Interact: Cook at the farmhouse stove" : "Interact: Read the farmhouse cookbook";
      hint.classList.remove("hidden");
    }
    return result;
  };

  proto.toggleGameMenu = function toggleGameMenuCooking() {
    const result = original.toggleGameMenu.call(this);
    const crafting = $("craftingMenu");
    if (crafting && !$("cookingMenu")) {
      const button = document.createElement("button");
      button.id = "cookingMenu";
      button.textContent = "🍳 Cooking";
      crafting.insertAdjacentElement("afterend", button);
      button.onclick = () => this.showCooking(false);
    }
    return result;
  };

  if (original.completeSocialHeartEvent) proto.completeSocialHeartEvent = function completeSocialHeartEventCooking(key) {
    const known = new Set(this.state.cooking?.knownRecipes || []);
    const result = original.completeSocialHeartEvent.call(this, key);
    const unlocked = syncCookingUnlocks(this, true).filter((id) => !known.has(id));
    if (unlocked.length) this.saveGame(true);
    return result;
  };

  if (original.drawInteriorAmbience) proto.drawInteriorAmbience = function drawInteriorAmbienceCooking(ctx, map) {
    original.drawInteriorAmbience.call(this, ctx, map);
    if (map.id !== "farmhouse") return;
    const time = performance.now() / 1000;
    ctx.save();
    ctx.fillStyle = "rgba(245,238,210,.46)";
    for (let index = 0; index < 4; index += 1) {
      const x = (15 + Math.sin(time * .7 + index) * .25) * 32;
      const y = (8.8 - ((time * .45 + index * .55) % 1.8)) * 32;
      ctx.beginPath(); ctx.arc(x, y, 3 + index % 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  proto.showCooking = function showCooking(kitchenMode = false) {
    normalizeCookingRuntime(this.state);
    syncCookingUnlocks(this, false);
    const atKitchen = this.state.mode === "interior" && this.state.living?.interiorId === "farmhouse";
    const cooking = this.state.cooking;
    const nextXp = cooking.level < 10 ? cookingXpForLevel(cooking.level + 1) : cooking.xp;
    const currentThreshold = cookingLevelFromXp(cooking.xp) <= 1 ? 0 : cookingXpForLevel(cooking.level);
    const progress = cooking.level >= 10 ? 100 : clamp((cooking.xp - currentThreshold) / Math.max(1, nextXp - currentThreshold) * 100, 0, 100);
    const active = cooking.activeBuff;
    const activeHtml = active ? `<section class="cooking-active"><strong>${ITEMS[COOKING_RECIPE_MAP[active.recipeId].item].icon} ${COOKING_QUALITY[active.quality].icon} ${ITEMS[COOKING_RECIPE_MAP[active.recipeId].item].name}</strong><small>${buffDescription(COOKING_RECIPE_MAP[active.recipeId], active.quality)} · ${remainingBuffMinutes(this.state)} game minutes remaining</small></section>` : `<section class="cooking-active empty"><strong>No active meal effect</strong><small>Eat a cooked meal from the pantry to gain a temporary bonus.</small></section>`;
    const recipeCards = COOKING_RECIPES.map((recipe) => {
      const known = cooking.knownRecipes.includes(recipe.id);
      const ready = canCookRecipeState(this.state, recipe);
      const levelReady = cooking.level >= recipe.level;
      const actions = known && levelReady && atKitchen
        ? `<div class="cooking-actions"><button data-cook-standard="${recipe.id}" ${ready ? "" : "disabled"}>Cook Standard</button><button data-cook-best="${recipe.id}" ${ready ? "" : "disabled"}>Use Best Ingredients</button></div>`
        : `<small class="cooking-lock">${known ? (atKitchen ? `Requires Cooking Level ${recipe.level}` : "Cook this at the farmhouse stove") : `Locked · ${recipeSourceLabel(recipe)}`}</small>`;
      return `<article class="cooking-recipe ${known ? "known" : "locked"}"><header><span>${known ? ITEMS[recipe.item].icon : "❔"}</span><div><strong>${known ? ITEMS[recipe.item].name : "Unknown Recipe"}</strong><small>${known ? `Level ${recipe.level} · ${recipe.description}` : recipeSourceLabel(recipe)}</small></div></header>${known ? `<p>${ingredientLine(this.state, recipe)}</p><small>${buffDescription(recipe)} · Restores ${recipe.energy} energy / ${recipe.health} health</small>${actions}` : actions}</article>`;
    }).join("");
    const pantryCards = COOKING_RECIPES.flatMap((recipe) => COOKING_QUALITY_ORDER.map((quality) => ({ recipe, quality, count: cooking.meals[recipe.id][quality] })).filter((entry) => entry.count > 0)).map(({ recipe, quality, count }) => `<article class="cooking-pantry-item"><span>${ITEMS[recipe.item].icon}</span><div><strong>${COOKING_QUALITY[quality].icon} ${ITEMS[recipe.item].name}</strong><small>${COOKING_QUALITY[quality].name} · Owned ${count}</small></div><button data-eat-meal="${recipe.id}" data-meal-quality="${quality}">Eat</button></article>`).join("");
    this.openModal("Farmhouse Cookbook & Meal Pantry", `<section class="cooking-summary"><div><strong>Cooking Level ${cooking.level}/10</strong><small>${cooking.xp}/${nextXp} XP</small><div class="cooking-progress"><i style="width:${progress}%"></i></div></div><div><strong>${cooking.knownRecipes.length}/${COOKING_RECIPES.length}</strong><small>recipes learned</small></div><div><strong>${cooking.stats.dishesCooked}</strong><small>dishes cooked</small></div></section>${activeHtml}<p>${atKitchen ? "Choose ordinary ingredients for dependable food or spend premium ingredients for a stronger quality result." : "The cookbook can be reviewed anywhere. Return to the farmhouse stove to cook; prepared meals may be eaten anywhere."}</p><h3>Recipes</h3><div class="cooking-recipe-grid">${recipeCards}</div><h3>Prepared Meals</h3><div class="cooking-pantry">${pantryCards || "<p>No prepared meals are stored.</p>"}</div>`, [
      { label: kitchenMode || atKitchen ? "Close" : "Back", action: () => { this.closeModal(); if (!kitchenMode && !atKitchen) this.toggleGameMenu(); } },
    ]);
    document.querySelectorAll("[data-cook-standard]").forEach((button) => { button.onclick = () => this.cookMeal(button.dataset.cookStandard, "standard"); });
    document.querySelectorAll("[data-cook-best]").forEach((button) => { button.onclick = () => this.cookMeal(button.dataset.cookBest, "best"); });
    document.querySelectorAll("[data-eat-meal]").forEach((button) => { button.onclick = () => this.eatCookedMeal(button.dataset.eatMeal, button.dataset.mealQuality); });
  };

  proto.cookMeal = function cookMeal(recipeId, strategy = "standard", roll = Math.random()) {
    const recipe = COOKING_RECIPE_MAP[recipeId];
    const atKitchen = this.state.mode === "interior" && this.state.living?.interiorId === "farmhouse";
    if (!recipe || !this.state.cooking.knownRecipes.includes(recipeId)) return this.toast("That recipe has not been learned.");
    if (!atKitchen) return this.toast("Cooking requires the farmhouse stove.");
    if (this.state.cooking.level < recipe.level) return this.toast(`Cooking Level ${recipe.level} is required.`);
    const ingredients = consumeCookingIngredients(this.state, recipe, strategy);
    if (!ingredients) return this.toast("The required ingredients are not available.");
    const quality = calculateMealQuality(ingredients.average, this.state.cooking.level, roll);
    this.state.cooking.meals[recipe.id][quality] += 1;
    this.state.inventory[recipe.item] = (this.state.inventory[recipe.item] || 0) + 1;
    const previousLevel = this.state.cooking.level;
    this.state.cooking.xp += recipe.xp + QUALITY_INDEX[quality] * 4;
    this.state.cooking.level = cookingLevelFromXp(this.state.cooking.xp);
    this.state.cooking.stats.dishesCooked += 1;
    if (!this.state.cooking.stats.uniqueRecipesCooked.includes(recipe.id)) this.state.cooking.stats.uniqueRecipesCooked.push(recipe.id);
    if (quality === "iridium") this.state.cooking.stats.iridiumMeals += 1;
    this.startActionAnimation?.("interact");
    this.sound("success");
    if (this.state.cooking.level > previousLevel) {
      this.state.journal.unshift(`Cooking advanced to Level ${this.state.cooking.level}.`);
      this.toast(`Cooking Level ${this.state.cooking.level}!`);
    } else this.toast(`Cooked ${COOKING_QUALITY[quality].icon} ${COOKING_QUALITY[quality].name} ${ITEMS[recipe.item].name}.`);
    syncCookingUnlocks(this, true);
    this.checkCookingAchievements();
    this.saveGame(true);
    this.closeModal();
    this.showCooking(true);
  };

  proto.eatCookedMeal = function eatCookedMeal(recipeId, quality = "normal") {
    const recipe = COOKING_RECIPE_MAP[recipeId];
    if (!recipe || !COOKING_QUALITY[quality] || (this.state.cooking.meals[recipeId]?.[quality] || 0) <= 0) return this.toast("That prepared meal is no longer available.");
    this.state.cooking.meals[recipeId][quality] -= 1;
    this.state.inventory[recipe.item] = Math.max(0, (this.state.inventory[recipe.item] || 0) - 1);
    const multiplier = COOKING_QUALITY[quality].multiplier;
    const now = absoluteGameMinute(this.state);
    this.state.cooking.activeBuff = { recipeId, buffId: recipe.buff, quality, startedAt: now, expiresAt: now + Math.round(recipe.duration * multiplier) };
    this.applyEquipmentVitals?.();
    const energy = Math.round(recipe.energy * multiplier);
    const health = Math.round(recipe.health * multiplier);
    this.state.player.energy = clamp(this.state.player.energy + energy, 0, this.state.player.maxEnergy);
    this.state.player.health = clamp(this.state.player.health + health, 0, this.state.player.maxHealth);
    this.state.cooking.stats.mealsEaten += 1;
    this.startActionAnimation?.("snack");
    this.sound("eat");
    this.closeModal();
    this.toast(`${ITEMS[recipe.item].name}: +${energy} energy, +${health} health, ${MEAL_BUFFS[recipe.buff].name}.`);
    this.checkCookingAchievements();
    this.updateCookingHud();
    this.saveGame(true);
  };

  proto.checkCookingAchievements = function checkCookingAchievements() {
    const stats = this.state.cooking.stats;
    this.checkAchievement("first-home-cooked-meal", stats.dishesCooked >= 1, "Home-Cooked", "Prepare the first meal at the farmhouse stove.");
    this.checkAchievement("kitchen-hand", stats.dishesCooked >= 25, "Kitchen Hand", "Cook 25 meals.");
    this.checkAchievement("masterwork-meal", stats.iridiumMeals >= 1, "Masterwork Supper", "Cook an Iridium-quality meal.");
    this.checkAchievement("recipe-collector", this.state.cooking.knownRecipes.length >= COOKING_RECIPES.length, "Continental Cookbook", "Learn all 16 cooking recipes.");
    this.checkAchievement("continental-chef", stats.uniqueRecipesCooked.length >= COOKING_RECIPES.length, "Continental Chef", "Cook every Hearthvale recipe at least once.");
  };
}
