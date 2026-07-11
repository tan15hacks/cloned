import assert from "node:assert/strict";
import { NPC_DEFS } from "../world.js";
import {
  INTERIOR_MAPS,
  NPC_SCHEDULES,
  CITIZEN_ROUTES,
  scheduleForNpc,
  shopIsOpen,
} from "../living-world-data.js";

assert.deepEqual(Object.keys(INTERIOR_MAPS).sort(), ["farmhouse", "guild"], "v3.5 must provide Farmhouse and Guild interiors");
for (const map of Object.values(INTERIOR_MAPS)) {
  assert.ok(map.width >= 20 && map.height >= 14, `${map.name} must be a usable lightweight interior`);
  assert.ok(map.objects.some((object) => object.solid), `${map.name} must contain solid furniture`);
  assert.ok(map.interactions.length >= 3, `${map.name} must contain meaningful interactions`);
  assert.ok(map.exit.x > 0 && map.exit.y > 0, `${map.name} must have an exit`);
}

for (const npc of NPC_DEFS) {
  assert.ok(Array.isArray(NPC_SCHEDULES[npc.id]) && NPC_SCHEDULES[npc.id].length > 0, `${npc.name} must have a daily schedule`);
  const morning = scheduleForNpc(npc.id, 540, "Clear");
  assert.ok(morning && Number.isFinite(morning.x) && Number.isFinite(morning.y), `${npc.name} morning schedule must resolve to coordinates`);
}

assert.equal(scheduleForNpc("mira", 780, "Clear").activity, "Tending the village garden");
assert.equal(scheduleForNpc("aria", 420, "Clear").activity, "Morning guild training");
assert.equal(scheduleForNpc("sora", 1080, "Clear").activity, "Observing the night sky");
assert.match(scheduleForNpc("mira", 780, "Rain").activity, /Sheltering/, "Rain must alter ordinary NPC routines");
assert.equal(scheduleForNpc("sora", 1080, "Rain").activity, "Observing the night sky", "Sora keeps the observatory routine in rain");

assert.ok(CITIZEN_ROUTES.length >= 5, "Village and city must contain background citizen routes");
for (const route of CITIZEN_ROUTES) {
  assert.ok(route.points.length >= 4, `${route.id} must contain a useful walking circuit`);
  assert.equal(route.points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), true);
}

assert.equal(shopIsOpen("seedshop", 600), true);
assert.equal(shopIsOpen("seedshop", 1200), false);
assert.equal(shopIsOpen("guild", 420), true);
assert.equal(shopIsOpen("observatory", 600), false);
assert.equal(shopIsOpen("observatory", 1080), true);
assert.equal(shopIsOpen("sleep", 60), true);

console.log(JSON.stringify({
  ok: true,
  interiors: Object.keys(INTERIOR_MAPS).length,
  scheduledNpcs: Object.keys(NPC_SCHEDULES).length,
  citizenRoutes: CITIZEN_ROUTES.length,
  farmhouseInteractions: INTERIOR_MAPS.farmhouse.interactions.length,
  guildInteractions: INTERIOR_MAPS.guild.interactions.length,
}));
