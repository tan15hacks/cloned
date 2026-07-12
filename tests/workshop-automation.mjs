import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import {
  WORKSHOP_BLUEPRINTS, WORKSHOP_BLUEPRINT_MAP, AUTOMATION_TYPES,
  SEED_MAKER_RECIPES, sprinklerOffsets, createAutomationState,
  createAutomationDevice, blueprintUnlocked, validateWorkshopAutomationData,
} from "../workshop-automation-data.js";

assert.equal(validateWorkshopAutomationData(), true);
assert.equal(WORKSHOP_BLUEPRINTS.length, 5);
assert.equal(AUTOMATION_TYPES.size, 5);
assert.equal(sprinklerOffsets("qualitySprinkler").length, 8);
assert.equal(sprinklerOffsets("hearthSprinkler").length, 24);
assert.equal(new Set(sprinklerOffsets("hearthSprinkler").map(([x, y]) => `${x},${y}`)).size, 24);
assert.equal(ITEMS.qualitySprinklerKit.name, "Quality Sprinkler");
assert.equal(ITEMS.wildHoney.value > 0, true);
assert.equal(ITEMS.sparkHoney.value > ITEMS.wildHoney.value, true);
assert.equal(ITEMS.batteryCell.value > 0, true);
assert.deepEqual(Object.keys(SEED_MAKER_RECIPES), ["turnip", "berry", "moonbean"]);

const expansion = { completed: ["southField", "workshop"] };
assert.equal(blueprintUnlocked(expansion, WORKSHOP_BLUEPRINT_MAP.qualitySprinkler), true);
assert.equal(blueprintUnlocked(expansion, WORKSHOP_BLUEPRINT_MAP.beeHouse), true);
assert.equal(blueprintUnlocked(expansion, WORKSHOP_BLUEPRINT_MAP.lightningRod), false);
expansion.completed.push("greenhouse");
assert.equal(blueprintUnlocked(expansion, WORKSHOP_BLUEPRINT_MAP.lightningRod), true);
assert.equal(blueprintUnlocked(expansion, WORKSHOP_BLUEPRINT_MAP.seedMaker), true);
assert.equal(blueprintUnlocked(expansion, WORKSHOP_BLUEPRINT_MAP.hearthSprinkler), false);
expansion.completed.push("irrigation");
assert.equal(blueprintUnlocked(expansion, WORKSHOP_BLUEPRINT_MAP.hearthSprinkler), true);

const automation = createAutomationState({
  knownBlueprints: ["beeHouse", "beeHouse", "forged"],
  stats: { crafted: 3, tilesWatered: 12 },
});
assert.deepEqual(automation.knownBlueprints, ["beeHouse"]);
assert.equal(automation.stats.crafted, 3);
assert.equal(automation.stats.tilesWatered, 12);

const bee = createAutomationDevice("beeHouse", 9, 20, 5, "test");
assert.equal(bee.type, "beeHouse");
assert.equal(bee.x, 9.5);
assert.equal(bee.nextReadyDay, 7);
assert.equal(bee.output, null);
const seedMaker = createAutomationDevice("seedMaker", 10, 20, 5, "test");
assert.equal(seedMaker.readyDay, 0);
assert.equal(createAutomationDevice("forged", 10, 20, 5), null);

console.log(JSON.stringify({
  ok: true,
  blueprints: WORKSHOP_BLUEPRINTS.length,
  qualityCoverage: sprinklerOffsets("qualitySprinkler").length,
  hearthCoverage: sprinklerOffsets("hearthSprinkler").length,
  seedRecipes: Object.keys(SEED_MAKER_RECIPES).length,
}));
