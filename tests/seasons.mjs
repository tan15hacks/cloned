import assert from "node:assert/strict";
import {
  DAYS_PER_SEASON, DAYS_PER_YEAR, SEASONS, FESTIVALS, CROP_SEASON_TABLE,
  calendarForDay, festivalForDay, festivalKey, seasonalWeather,
  seasonalGrowthMultiplier, createSeasonState, festivalRewardTier,
} from "../seasons-data.js";
import { ITEMS } from "../game-shared.js";
import { EQUIPMENT_DEFS } from "../game-combat.js";

assert.equal(SEASONS.length, 4);
assert.equal(FESTIVALS.length, 4);
assert.equal(DAYS_PER_SEASON, 28);
assert.equal(DAYS_PER_YEAR, 112);
assert.deepEqual(calendarForDay(1), { absoluteDay:1, year:1, dayOfYear:1, seasonIndex:0, seasonDay:1, season:SEASONS[0] });
assert.equal(calendarForDay(28).season.id, "spring");
assert.equal(calendarForDay(29).season.id, "summer");
assert.equal(calendarForDay(113).year, 2);
assert.equal(calendarForDay(113).season.id, "spring");
assert.equal(festivalForDay(7).id, "bloomfair");
assert.equal(festivalForDay(42).id, "regatta");
assert.equal(festivalForDay(77).id, "harvestCrown");
assert.equal(festivalForDay(112).id, "starfallVigil");
assert.equal(festivalKey(119), "y2:bloomfair");
assert.equal(seasonalWeather(50), seasonalWeather(50), "Weather must be deterministic");
assert.equal(seasonalGrowthMultiplier("berry", "summer"), 1.25);
assert.equal(seasonalGrowthMultiplier("turnip", "winter"), .75);
assert.ok(CROP_SEASON_TABLE.moonbean.includes("winter"));
assert.equal(createSeasonState({}, 113).year, 2);
assert.equal(festivalRewardTier(80).id, "gold");
assert.equal(festivalRewardTier(55).id, "silver");
assert.equal(festivalRewardTier(10).id, "bronze");
assert.equal(ITEMS.festivalToken.name, "Festival Token");
for (const id of ["bloomCharm", "tidecallRing", "harvestBoots", "starCrown"]) assert.ok(EQUIPMENT_DEFS[id]);
console.log(JSON.stringify({ ok:true, seasons:SEASONS.length, festivals:FESTIVALS.length, daysPerYear:DAYS_PER_YEAR, festivalGear:4 }));
