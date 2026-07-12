import assert from "node:assert/strict";
import { INTERIOR_MAPS } from "../living-world-data.js";
import { AUTHORED_STRUCTURES, POLISHED_PATH_RECTS } from "../world-polish-data.js";
import {
  FARM_PROJECTS, FARM_PROJECT_ORDER, FARM_BUILDINGS, FARM_PATH_RECTS,
  GREENHOUSE_BASIC_SLOTS, GREENHOUSE_DELUXE_SLOTS,
  createFarmExpansionState, greenhouseSlotsForState, projectAvailable,
  outdoorIrrigationCapacity, greenhouseGrowthMultiplier,
  validateFarmsteadExpansionData,
} from "../farmstead-expansion-data.js";

assert.equal(validateFarmsteadExpansionData(), true);
assert.equal(FARM_PROJECTS.length, 5);
assert.deepEqual(FARM_PROJECT_ORDER, ["southField", "workshop", "greenhouse", "irrigation", "greenhouseDeluxe"]);
assert.equal(GREENHOUSE_BASIC_SLOTS.length, 24);
assert.equal(GREENHOUSE_DELUXE_SLOTS.length, 24);
assert.equal(new Set([...GREENHOUSE_BASIC_SLOTS, ...GREENHOUSE_DELUXE_SLOTS].map(({ x, y }) => `${x},${y}`)).size, 48);
assert.equal(INTERIOR_MAPS.greenhouse.width, 28);
assert.equal(INTERIOR_MAPS.greenhouse.height, 20);
assert.equal(FARM_BUILDINGS.greenhouse.y + FARM_BUILDINGS.greenhouse.h < 64, true);
assert.equal(FARM_BUILDINGS.workshop.y + FARM_BUILDINGS.workshop.h < 64, true);
assert.equal(FARM_PATH_RECTS.length >= 3, true);
assert.equal(FARM_PATH_RECTS.every(([, y]) => y >= 53), true, "New construction paths must not replace legacy crop rows");
assert.equal(POLISHED_PATH_RECTS.some(([x, y, w, h]) => x <= FARM_BUILDINGS.workshop.x && y <= FARM_BUILDINGS.workshop.y && x + w >= FARM_BUILDINGS.workshop.x + FARM_BUILDINGS.workshop.w && y + h >= FARM_BUILDINGS.workshop.y + FARM_BUILDINGS.workshop.h), true);
assert.equal(POLISHED_PATH_RECTS.some(([x, y, w, h]) => x <= FARM_BUILDINGS.greenhouse.x && y <= FARM_BUILDINGS.greenhouse.y && x + w >= FARM_BUILDINGS.greenhouse.x + FARM_BUILDINGS.greenhouse.w && y + h >= FARM_BUILDINGS.greenhouse.y + FARM_BUILDINGS.greenhouse.h), true);

const fresh = createFarmExpansionState({}, { day: 1 });
assert.equal(projectAvailable(fresh, "southField"), true);
assert.equal(projectAvailable(fresh, "workshop"), false);
fresh.completed.push("southField");
assert.equal(projectAvailable(fresh, "workshop"), true);
assert.equal(outdoorIrrigationCapacity(fresh), 16);
fresh.completed.push("workshop", "greenhouse", "irrigation");
assert.equal(outdoorIrrigationCapacity(fresh), 48);
assert.equal(greenhouseSlotsForState(fresh).length, 24);
fresh.completed.push("greenhouseDeluxe");
assert.equal(greenhouseSlotsForState(fresh).length, 48);
assert.equal(greenhouseGrowthMultiplier(fresh), 1.25);

assert.equal(AUTHORED_STRUCTURES.some((entry) => entry.id === "farm-fence-s"), false);
assert.equal(AUTHORED_STRUCTURES.some((entry) => entry.id === "farm-fence-s-center"), true);
assert.equal(AUTHORED_STRUCTURES.some((entry) => entry.y === 50 && entry.x <= 24 && entry.x + entry.w > 24), false, "Workshop gate must remain open");
assert.equal(AUTHORED_STRUCTURES.some((entry) => entry.y === 50 && entry.x <= 41 && entry.x + entry.w > 41), false, "Greenhouse gate must remain open");

console.log(JSON.stringify({
  ok: true,
  projects: FARM_PROJECTS.length,
  basicPlots: GREENHOUSE_BASIC_SLOTS.length,
  deluxePlots: GREENHOUSE_BASIC_SLOTS.length + GREENHOUSE_DELUXE_SLOTS.length,
  fenceGates: 2,
  reservedConstructionSites: 2,
}));
