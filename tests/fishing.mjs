import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import {
  FISH_SPECIES, FISH_SPECIES_MAP, LEGENDARY_FISH, FISH_QUALITY_ORDER,
  BAIT_DEFS, TACKLE_DEFS, FISHING_SHOP_STOCK,
  fishAvailability, availableFish, selectFishSpecies, fishSize,
  fishingTimeMatches, validateFishingData,
} from "../fishing-data.js";

assert.equal(validateFishingData(), true);
assert.equal(FISH_SPECIES.length, 21);
assert.equal(new Set(FISH_SPECIES.map((entry) => entry.id)).size, 21);
assert.equal(LEGENDARY_FISH.length, 4);
assert.deepEqual(FISH_QUALITY_ORDER, ["normal", "silver", "gold", "iridium"]);
assert.deepEqual(Object.keys(BAIT_DEFS), ["none", "worm", "glow"]);
assert.deepEqual(Object.keys(TACKLE_DEFS), ["none", "spinner", "lucky"]);
assert.equal(FISHING_SHOP_STOCK.length, 4);

for (const id of ["wormBait", "glowBait", "spinnerTackle", "luckyTackle", "anglerToken"]) assert.ok(ITEMS[id], `${id} must be registered`);

const expectedRegions = ["farm", "village", "city", "northwatch", "greenfields", "moonlake", "veilmoor", "frostpeak", "darkforest", "swamp", "dread", "volcano", "coast", "ruins"];
const coveredRegions = new Set(FISH_SPECIES.flatMap((entry) => entry.regions));
for (const region of expectedRegions) assert.equal(coveredRegions.has(region), true, `${region} requires at least one fish species`);

for (const species of FISH_SPECIES) {
  assert.ok(species.name && species.description);
  assert.ok(species.regions.length >= 1);
  assert.ok(species.seasons.length >= 1);
  assert.ok(species.minSize > 0 && species.maxSize > species.minSize);
  assert.ok(species.difficulty > 0 && species.difficulty <= 4);
  assert.ok(["fish", "rareFish"].includes(species.category));
  for (const roll of [0, .25, .5, .75, .999]) {
    const size = fishSize(species, 10, .8, roll);
    assert.ok(size >= species.minSize && size <= species.maxSize, `${species.id} size must stay in range`);
  }
}

assert.equal(fishingTimeMatches({ start: 360, end: 540 }, 420), true);
assert.equal(fishingTimeMatches({ start: 360, end: 540 }, 900), false);
assert.equal(fishingTimeMatches({ start: 1200, end: 240 }, 60), true);
assert.equal(fishingTimeMatches({ start: 1200, end: 240 }, 900), false);

const winterSparkfall = {
  day: 85,
  minutes: 1200,
  weather: "Sparkfall",
  progression: { skillLevels: { fishing: 10 } },
  fishing: { legendaryCaught: [] },
};
assert.equal(fishAvailability(FISH_SPECIES_MAP.starKoi, winterSparkfall, "moonlake").available, true);
assert.equal(availableFish(winterSparkfall, "moonlake").some((entry) => entry.id === "starKoi"), true);

const caughtLegend = structuredClone(winterSparkfall);
caughtLegend.fishing.legendaryCaught = ["starKoi"];
assert.equal(fishAvailability(FISH_SPECIES_MAP.starKoi, caughtLegend, "moonlake").available, false);
assert.equal(availableFish(caughtLegend, "moonlake").some((entry) => entry.id === "starKoi"), false);

const summerDawn = {
  day: 29,
  minutes: 420,
  weather: "Clear",
  progression: { skillLevels: { fishing: 10 } },
  fishing: { legendaryCaught: [] },
};
assert.equal(fishAvailability(FISH_SPECIES_MAP.goldenMarlin, summerDawn, "coast").available, true);
summerDawn.minutes = 900;
assert.equal(fishAvailability(FISH_SPECIES_MAP.goldenMarlin, summerDawn, "coast").available, false);

const lowLevel = {
  day: 85,
  minutes: 1200,
  weather: "Sparkfall",
  progression: { skillLevels: { fishing: 2 } },
  fishing: { legendaryCaught: [] },
};
assert.equal(fishAvailability(FISH_SPECIES_MAP.starKoi, lowLevel, "moonlake").available, false);

const normalSelection = selectFishSpecies({
  day: 1,
  minutes: 600,
  weather: "Clear",
  progression: { skillLevels: { fishing: 1 } },
  fishing: { legendaryCaught: [] },
}, "farm", "none", 0);
assert.ok(normalSelection.regions.includes("farm"));

const glowingSelection = selectFishSpecies(winterSparkfall, "moonlake", "glow", .999);
assert.ok(glowingSelection.regions.includes("moonlake"));
assert.equal(fishAvailability(glowingSelection, winterSparkfall, "moonlake").available, true);

console.log(JSON.stringify({
  ok: true,
  species: FISH_SPECIES.length,
  legendaryFish: LEGENDARY_FISH.length,
  regionsCovered: coveredRegions.size,
  baitTypes: Object.keys(BAIT_DEFS).length,
  tackleTypes: Object.keys(TACKLE_DEFS).length,
  seasonalAvailability: true,
  weatherAvailability: true,
  timeWindows: true,
}));
