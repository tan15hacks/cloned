import assert from "node:assert/strict";
import { buildingAtTile, isWaterTile } from "../world.js";
import { structureAtTile } from "../world-polish-data.js";
import { INTERIOR_MAPS } from "../living-world-data.js";
import {
  FARM_BUILDINGS, FARM_PROJECT_BOARD, GREENHOUSE_BASIC_SLOTS, GREENHOUSE_DELUXE_SLOTS,
  farmBuildingAtTile,
} from "../farmstead-expansion-data.js";

const expansion = { completed: ["southField", "workshop", "greenhouse", "irrigation", "greenhouseDeluxe"], project: null };
const key = (x, y) => `${x},${y}`;
const queue = [[11, 14]];
const reached = new Set([key(11, 14)]);
const blocked = (x, y) => x < 1 || y < 1 || x >= 55 || y >= 63 || isWaterTile(x, y) || Boolean(buildingAtTile(x + .5, y + .5)) || Boolean(structureAtTile(x, y)) || Boolean(farmBuildingAtTile(x + .5, y + .5, expansion));
while (queue.length) {
  const [x, y] = queue.shift();
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx = x + dx; const ny = y + dy; const id = key(nx, ny);
    if (reached.has(id) || blocked(nx, ny)) continue;
    reached.add(id); queue.push([nx, ny]);
  }
}

const goals = [
  [Math.floor(FARM_PROJECT_BOARD.x), 16, "project board"],
  [Math.floor(FARM_BUILDINGS.workshop.door.x), 62, "workshop entrance"],
  [Math.floor(FARM_BUILDINGS.greenhouse.door.x), 62, "greenhouse entrance"],
];
for (const [x, y, label] of goals) assert.equal(reached.has(key(x, y)), true, `${label} must remain reachable from the farmhouse`);
assert.equal(reached.has(key(24, 51)), true, "Workshop fence gate must be open");
assert.equal(reached.has(key(41, 51)), true, "Greenhouse fence gate must be open");

const map = INTERIOR_MAPS.greenhouse;
const interiorQueue = [[Math.floor(map.exit.x), Math.floor(map.exit.y - 1)]];
const interiorReached = new Set([key(...interiorQueue[0])]);
const interiorBlocked = (x, y) => x < 1 || y < 1 || x >= map.width - 1 || y >= map.height - 1 || map.objects.some((object) => object.solid && x >= object.x && x < object.x + object.w && y >= object.y && y < object.y + object.h);
while (interiorQueue.length) {
  const [x, y] = interiorQueue.shift();
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx = x + dx; const ny = y + dy; const id = key(nx, ny);
    if (interiorReached.has(id) || interiorBlocked(nx, ny)) continue;
    interiorReached.add(id); interiorQueue.push([nx, ny]);
  }
}
for (const slot of [...GREENHOUSE_BASIC_SLOTS, ...GREENHOUSE_DELUXE_SLOTS]) {
  const adjacent = [[slot.x+1,slot.y],[slot.x-1,slot.y],[slot.x,slot.y+1],[slot.x,slot.y-1]];
  assert.equal(adjacent.some(([x, y]) => interiorReached.has(key(x, y))), true, `Greenhouse plot ${slot.x},${slot.y} must be reachable`);
}
for (const interaction of map.interactions) assert.equal(interiorReached.has(key(Math.floor(interaction.x), Math.floor(interaction.y))), true, `${interaction.label} must be reachable`);

console.log(JSON.stringify({
  ok: true,
  worldReachableTiles: reached.size,
  greenhouseReachableTiles: interiorReached.size,
  worldGoals: goals.length,
  greenhousePlots: GREENHOUSE_BASIC_SLOTS.length + GREENHOUSE_DELUXE_SLOTS.length,
}));
