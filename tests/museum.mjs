import assert from "node:assert/strict";
import { ITEMS } from "../game-shared.js";
import { INTERIOR_MAPS } from "../living-world-data.js";
import {
  MUSEUM_BUNDLES, MUSEUM_BUNDLE_MAP, MUSEUM_TOTAL_ENTRIES, MUSEUM_TOTAL_UNITS,
  createMuseumState, museumBundleProgress, museumOverallProgress,
  museumRankForReputation, validateMuseumData,
} from "../museum-data.js";
import { registerMuseumWing } from "../game-museum.js";

assert.equal(validateMuseumData(), true);
assert.equal(MUSEUM_BUNDLES.length, 9);
assert.equal(MUSEUM_TOTAL_ENTRIES, 45);
assert.equal(MUSEUM_TOTAL_UNITS, 49);
assert.equal(new Set(MUSEUM_BUNDLES.map((entry) => entry.id)).size, 9);
assert.ok(ITEMS.museumToken);
assert.ok(ITEMS.curatorSeal);

for (const bundle of MUSEUM_BUNDLES) {
  assert.ok(bundle.name && bundle.description && bundle.icon);
  assert.ok(bundle.requirements.length >= 2);
  assert.ok(bundle.reward.coins > 0 && bundle.reward.xp > 0 && bundle.reward.token === 1);
  assert.equal(new Set(bundle.requirements.map((entry) => entry.item)).size, bundle.requirements.length);
  for (const requirement of bundle.requirements) {
    assert.ok(ITEMS[requirement.item], `${bundle.id}:${requirement.item} must be a registered item`);
    assert.ok(Number.isInteger(requirement.amount) && requirement.amount > 0);
  }
}

const state = { museum: createMuseumState() };
let overall = museumOverallProgress(state);
assert.deepEqual(overall, { units: 0, totalUnits: 49, entries: 0, totalEntries: 45, bundles: 0, totalBundles: 9 });
state.museum.donated.firstHarvest.turnip = 1;
state.museum.donated.firstHarvest.berry = 1;
state.museum.donated.firstHarvest.moonbean = 1;
state.museum.donated.firstHarvest.apple = 1;
state.museum = createMuseumState(state.museum);
assert.equal(museumBundleProgress(state, MUSEUM_BUNDLE_MAP.firstHarvest).complete, true);
overall = museumOverallProgress(state);
assert.equal(overall.bundles, 1);
assert.equal(overall.entries, 4);
assert.equal(museumRankForReputation(0).name, "Visitor");
assert.equal(museumRankForReputation(10).name, "Contributor");
assert.equal(museumRankForReputation(25).name, "Patron");
assert.equal(museumRankForReputation(45).name, "Curator");
assert.equal(museumRankForReputation(60).name, "Continental Curator");

const cityHall = registerMuseumWing();
assert.equal(cityHall, INTERIOR_MAPS.cityHall);
registerMuseumWing();
assert.equal(cityHall.objects.filter((object) => object.id === "museum-left-display").length, 1);
assert.equal(cityHall.objects.filter((object) => object.id === "museum-right-display").length, 1);
assert.equal(cityHall.interactions.filter((entry) => entry.id === "museumGallery").length, 1);
assert.equal(cityHall.interactions.filter((entry) => entry.id === "museumLedger").length, 1);

const contains = (object, x, y) => x >= object.x && x < object.x + object.w && y >= object.y && y < object.y + object.h;
const walkable = (x, y) => x >= 1 && y >= 1 && x < cityHall.width - 1 && y < cityHall.height - 1
  && !cityHall.objects.some((object) => object.solid && contains(object, x + .5, y + .5));
const start = [Math.floor(cityHall.exit.x), Math.floor(cityHall.exit.y - 1.2)];
const queue = [start];
const reachable = new Set([start.join(",")]);
for (let index = 0; index < queue.length; index += 1) {
  const [x, y] = queue[index];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx;
    const ny = y + dy;
    const key = `${nx},${ny}`;
    if (reachable.has(key) || !walkable(nx, ny)) continue;
    reachable.add(key);
    queue.push([nx, ny]);
  }
}

for (const id of ["museumGallery", "museumLedger"]) {
  const interaction = cityHall.interactions.find((entry) => entry.id === id);
  const x = Math.floor(interaction.x);
  const y = Math.floor(interaction.y);
  assert.equal(walkable(x, y), true, `${id} must stand on a walkable tile`);
  assert.equal(reachable.has(`${x},${y}`), true, `${id} must be reachable from the City Hall exit`);
}

console.log(JSON.stringify({
  ok: true,
  bundles: MUSEUM_BUNDLES.length,
  displayEntries: MUSEUM_TOTAL_ENTRIES,
  donationUnits: MUSEUM_TOTAL_UNITS,
  museumRanks: 5,
  galleryInteractionsReachable: true,
}));
