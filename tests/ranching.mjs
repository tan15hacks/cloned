import assert from "node:assert/strict";
import {
  ANIMAL_SPECIES, HOUSING_UPGRADES, SILO_UPGRADES, MACHINE_DEFS,
  RANCH_PRODUCT_IDS, createAnimal, createRanchState, housingCapacity,
  speciesUnlocked, ranchQualityRoll, productForAnimal, siloCapacity,
} from "../ranch-data.js";
import { ITEMS } from "../game-shared.js";

assert.equal(Object.keys(ANIMAL_SPECIES).length, 6, "Ranching must include six animal species");
assert.equal(HOUSING_UPGRADES.coop.length, 4);
assert.equal(HOUSING_UPGRADES.barn.length, 4);
assert.equal(SILO_UPGRADES.length, 3);
assert.equal(Object.keys(MACHINE_DEFS).length, 4, "Four artisan machines are required");
assert.ok(RANCH_PRODUCT_IDS.includes("truffleOil"));
assert.equal(ITEMS.goatCheese.name, "Goat Cheese");
assert.equal(ITEMS.incubatorPack.name, "Incubator Heat Pack");

const state = createRanchState({}, 1);
assert.equal(state.animals.length, 0);
assert.equal(state.incubator, null);
assert.equal(housingCapacity(state, "coop"), 0);
state.buildings.coop.level = 1;
assert.equal(housingCapacity(state, "coop"), 4);
assert.equal(speciesUnlocked(state, "chicken", 1), true);
assert.equal(speciesUnlocked(state, "duck", 10), false);
state.buildings.coop.level = 2;
assert.equal(speciesUnlocked(state, "duck", 4), true);
assert.equal(siloCapacity(state), 40);
state.buildings.silo.level = 2;
assert.equal(siloCapacity(state), 480);

const chicken = createAnimal("chicken", "animal-1", 1, "Pip");
chicken.ageDays = 8;
chicken.friendship = 9;
chicken.happiness = 95;
const product = productForAnimal(chicken, {
  day: 8, fed: true, watered: true, wasOutside: true, weather: "Clear",
  seasonId: "spring", buildingLevel: 3, farmingLevel: 10, heated: true,
  qualityRoll: 0, productRoll: 1, doubleRoll: 0,
});
assert.equal(product.id, "egg");
assert.equal(product.quality, "iridium");
assert.equal(product.amount, 2);

const pig = createAnimal("pig", "animal-2", 1, "Mochi");
pig.ageDays = 12;
pig.happiness = 90;
assert.equal(productForAnimal(pig, {
  day: 12, fed: true, watered: true, wasOutside: false, weather: "Snow",
  seasonId: "winter", buildingLevel: 3, farmingLevel: 10,
  qualityRoll: .5, productRoll: .5, doubleRoll: .5,
}), null, "Pigs must not produce indoor winter truffles");

assert.equal(ranchQualityRoll({ friendship: 0, happiness: 20, buildingLevel: 1, farmingLevel: 1, heated: false, roll: .99 }), "normal");

const migrated = createRanchState({
  animals: [{ species: "cow", id: "animal-7", health: -20, happiness: 999 }],
  buildings: { barn: { level: 99 } },
  hay: 9999,
  stats: { artisanTypes: ["cheese", "not-real"] },
}, 25);
assert.equal(migrated.animals[0].health, 1);
assert.equal(migrated.animals[0].happiness, 100);
assert.equal(migrated.buildings.barn.level, 3);
assert.equal(migrated.hay, 40, "Hay must be clamped to the current silo capacity");
assert.deepEqual(migrated.stats.artisanTypes, ["cheese"]);

console.log(JSON.stringify({
  ok: true,
  animalSpecies: Object.keys(ANIMAL_SPECIES).length,
  coopTiers: HOUSING_UPGRADES.coop.length - 1,
  barnTiers: HOUSING_UPGRADES.barn.length - 1,
  artisanMachines: Object.keys(MACHINE_DEFS).length,
  ranchProducts: RANCH_PRODUCT_IDS.length,
}));
