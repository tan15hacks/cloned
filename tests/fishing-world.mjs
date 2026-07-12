import assert from "node:assert/strict";
import "../fishing-region-data.js";
import { FISH_SPECIES } from "../fishing-data.js";
import {
  WORLD_W, WORLD_H, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES,
  isWaterTile, buildingAtTile, regionAt,
} from "../game-shared.js";

const regionIds = new Set(REGIONS.map((region) => region.id));
const speciesRegions = new Set(FISH_SPECIES.flatMap((species) => species.regions));
for (const id of speciesRegions) assert.equal(regionIds.has(id), true, `Fishing species references unknown region ${id}`);

const waterByRegion = Object.fromEntries(REGIONS.map((region) => [region.id, []]));
for (let y = 0; y < WORLD_H; y += 1) {
  for (let x = 0; x < WORLD_W; x += 1) {
    if (!isWaterTile(x, y)) continue;
    waterByRegion[regionAt(x + .5, y + .5).id].push({ x, y });
  }
}

const shorelineByRegion = {};
for (const region of REGIONS) {
  assert.ok(waterByRegion[region.id].length > 0, `${region.name} requires fishable water`);
  const shoreline = waterByRegion[region.id].find(({ x, y }) => [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 1 || ny < 1 || nx >= WORLD_W - 1 || ny >= WORLD_H - 1) return false;
    if (isWaterTile(nx, ny) || buildingAtTile(nx + .5, ny + .5)) return false;
    return regionAt(nx + .5, ny + .5).id === region.id;
  }));
  assert.ok(shoreline, `${region.name} requires a same-region shoreline within casting range`);
  shorelineByRegion[region.id] = shoreline;
}

for (const building of BUILDINGS) {
  const doorX = Math.floor(building.door.x);
  const doorY = Math.floor(building.door.y);
  assert.equal(isWaterTile(doorX, doorY), false, `${building.name} door must not be submerged`);
}

for (const stone of WAYSTONES) {
  assert.equal(isWaterTile(Math.floor(stone.x), Math.floor(stone.y)), false, `${stone.name} Waystone must not be submerged`);
  assert.equal(isWaterTile(Math.floor(stone.spawn.x), Math.floor(stone.spawn.y)), false, `${stone.name} Waystone spawn must not be submerged`);
}

for (const entrance of CAVE_ENTRANCES) assert.equal(isWaterTile(Math.floor(entrance.x), Math.floor(entrance.y)), false, `${entrance.name} entrance must not be submerged`);

for (const region of REGIONS) {
  assert.equal(speciesRegions.has(region.id), true, `${region.name} requires at least one assigned fish species`);
}

console.log(JSON.stringify({
  ok: true,
  worldTilesChecked: WORLD_W * WORLD_H,
  regionsWithWater: Object.values(waterByRegion).filter((tiles) => tiles.length > 0).length,
  regionsWithCastingShoreline: Object.keys(shorelineByRegion).length,
  speciesRegionsValid: true,
  doorsDry: true,
  waystonesDry: true,
  caveEntrancesDry: true,
}));
