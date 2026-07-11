import assert from "node:assert/strict";
import { INTERIOR_MAPS } from "../living-world-data.js";
import {
  EXPANDED_INTERIOR_MAPS, BUILDING_INTERIOR_MAP, registerExpandedInteriors,
  activeInteriorResidents, interiorAssignmentForNpc,
} from "../expanded-interiors-data.js";

registerExpandedInteriors();
assert.equal(Object.keys(EXPANDED_INTERIOR_MAPS).length, 8, "Eight new playable interiors are required");
assert.equal(Object.keys(BUILDING_INTERIOR_MAP).length, 8);
assert.equal(Object.keys(INTERIOR_MAPS).length, 10, "Farmhouse and Guild plus eight new interiors should be registered");

function contains(object, x, y) {
  return x >= object.x && x < object.x + object.w && y >= object.y && y < object.y + object.h;
}
function walkable(map, x, y) {
  if (x < 1 || y < 1 || x >= map.width - 1 || y >= map.height - 1) return false;
  return !map.objects.some((object) => object.solid && contains(object, x + .5, y + .5));
}
function reachableTiles(map) {
  const start = [Math.floor(map.exit.x), Math.floor(map.exit.y - 1.2)];
  const queue = [start];
  const seen = new Set([start.join(",")]);
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (seen.has(key) || !walkable(map, nx, ny)) continue;
      seen.add(key); queue.push([nx, ny]);
    }
  }
  return seen;
}

for (const map of Object.values(EXPANDED_INTERIOR_MAPS)) {
  assert.ok(map.width >= 20 && map.height >= 15, `${map.id} must be a useful playable size`);
  assert.ok(map.objects.length >= 6, `${map.id} must contain furnished objects`);
  assert.ok(map.interactions.length >= 3, `${map.id} must contain at least three interactions`);
  const reachable = reachableTiles(map);
  for (const interaction of map.interactions) {
    const x = Math.floor(interaction.x), y = Math.floor(interaction.y);
    assert.equal(walkable(map, x, y), true, `${map.id}:${interaction.id} must not be inside furniture`);
    assert.equal(reachable.has(`${x},${y}`), true, `${map.id}:${interaction.id} must be reachable from the exit`);
  }
}

const state = { minutes: 420, weather: "Clear" };
assert.equal(activeInteriorResidents(INTERIOR_MAPS.seedshop, state)[0].id, "mira");
assert.equal(interiorAssignmentForNpc("mira", state).interiorId, "seedshop");
assert.equal(interiorAssignmentForNpc("bram", state).interiorId, "blacksmith");
assert.equal(interiorAssignmentForNpc("rowan", state), null, "Rowan starts the inn shift later");
state.minutes = 1100;
assert.equal(interiorAssignmentForNpc("mira", state), null);
assert.equal(interiorAssignmentForNpc("rowan", state).interiorId, "cityInn");

console.log(JSON.stringify({
  ok: true,
  totalInteriors: Object.keys(INTERIOR_MAPS).length,
  expandedInteriors: Object.keys(EXPANDED_INTERIOR_MAPS).length,
  buildingMappings: Object.keys(BUILDING_INTERIOR_MAP).length,
  allInteractionsReachable: true,
}));
