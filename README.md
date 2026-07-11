# Hearthvale

Hearthvale is an original, responsive seasonal farming, farm-animal ranching, expanded-interior, exploration, living-world, guild, combat, progression, and story-adventure game. It uses its own characters, story, map, dialogue, systems, and geometric cartoon rendering rather than copying Stardew Valley assets or content.

## Version 3.10 — Expanded Building Interiors and Town Life

Version 3.10 expands the lightweight interior system from two maps to **ten playable buildings** without increasing the 57,344-tile overworld.

### Eight new furnished interiors

- Mira's Seeds
- Hearth & Kettle
- Ironhart Smithy
- Blue Vial Apothecary
- The Golden Griffin
- Silvercrest Grand Market
- Starwatch Observatory
- Silvercrest Hall

These join the existing Farmhouse and Silvercrest Adventurers' Guild interiors.

Every new map contains collision-safe furniture, a clear entrance and exit, at least three reachable service or lore interactions, indoor lighting, windows that reflect time and rain, and a building-specific visual identity. Examples include seed displays, market stalls, smithing equipment, brewing tables, guest beds, a piano, civic records, a continental map, and the Great Telescope.

### Indoor NPC schedules

Named residents now move indoors during their working hours:

- Mira works behind the Seed Shop counter.
- Bram works inside Ironhart Smithy.
- Pella operates the Apothecary.
- Cass and Eno work inside the Grand Market.
- Rowan manages the Golden Griffin.
- Sora observes from Starwatch.
- Mei and Ves work inside Silvercrest Hall.
- Oren visits Hearth & Kettle during the evening.

NPCs assigned to an interior are hidden from the street and remain available for normal quest-safe dialogue indoors. Rain and Snow extend several sheltered work schedules.

### Playable counters and furnishings

Indoor interactions connect directly to existing game systems:

- Seed purchases and seasonal crop information
- Village and city inn meals, room rental, and sleep
- Blacksmith upgrades and tempering information
- Apothecary remedies and brewing notes
- Grand Market buying, selling, and price records
- Starwatch forecasts and seasonal star charts
- City Hall services, world map, and civic statistics

The Adventure Menu now includes a **Buildings & Interiors** directory showing which mapped buildings have been visited, how many times each has been entered, and whether each business is currently open.

### Rendering and performance

Interiors use small independent maps with their own camera bounds. The overworld, monsters, resources, citizens, and ranch animals are not rendered while indoors. Interior lighting, forge sparks, alchemy bubbles, and star effects remain local to the current room.

### Save compatibility

Existing saves receive an interior discovery log, visit counters, civic record flags, and safe last-interior metadata. Invalid map references are removed during migration. Saves made inside unsupported or outdated interior data safely return to the overworld through the existing living-world migration layer.

## Version 3.9 — Farm Animals and Barn Progression

Version 3.9 turns the Farmstead into a long-term ranch and artisan-production loop while preserving the streamed continent.

### Six animal species

- Chickens producing Eggs
- Cows producing Milk
- Ducks producing Duck Eggs and occasional Feathers
- Goats producing Goat Milk
- Sheep producing Wool
- Pigs finding Truffles outdoors

Every animal stores a name, age, friendship, happiness, health, sickness state, daily feeding and petting records, outdoor state, product readiness, product quality, and a rare-color variant. Animals can become temporarily sick after serious neglect, but they never permanently die.

### Coop, barn, and silo progression

The Coop progresses from Basic to Large and Deluxe tiers. Capacity increases from 4 to 8 and then 12 animals. Large Coops unlock Ducks and incubation; Deluxe Coops add automatic feeding and a quality bonus.

The Barn progresses from Basic to Large and Deluxe tiers. Capacity increases from 4 to 8 and then 12 animals. Large Barns unlock Goats and Sheep; Deluxe Barns unlock Pigs, automatic feeding, improved product quality, and winter protection.

Hay storage progresses from a 40-hay stack to a 240-hay Farm Silo and a 480-hay Expanded Silo. Every building project requires coins and materials and completes after multiple in-game days.

### Daily care, products, and artisan machines

Players can pet, rename, feed, water, clean, heat, treat, and collect from animals. Animals graze during clear weather, and off-screen grazing is simulated while the player is away. The Ranch Scythe converts mature pasture grass into Hay.

Animal and artisan goods use Normal, Silver, Gold, and Iridium quality. Friendship, happiness, Farming Level, housing tier, heating, and daily care affect quality and possible double products.

Four machines process quality goods over game time:

- Egg or Duck Egg → Mayonnaise
- Milk or Goat Milk → Cheese
- Wool or Feather → Cloth
- Truffle → Truffle Oil

## Version 3.8 — Seasons and Festivals

The continuous Day counter maps into four 28-day seasons and a repeating 112-day year: Springbloom, Suncrest, Emberfall, and Frostwane. Existing saves automatically enter the correct year and season based on their saved Day number.

Each season has deterministic weather, lightweight screen-local effects, and crop affinity. Favored crops grow 25% faster; other crops grow 25% slower but never wither.

Four annual festivals provide unique minigames, Festival Tokens, Adventure and skill XP, keepsakes, friendship bonuses, and collectible equipment:

- Springbloom Day 7 — Hearthvale Bloomfair
- Suncrest Day 14 — Moonlake Regatta
- Emberfall Day 21 — Silvercrest Harvest Crown
- Frostwane Day 28 — Starfall Vigil

## Version 3.7 — Chapter 2: The Fractured Waystones

Chapter 2 contains seventeen objectives connecting Guildmaster Aria, Sora, Veilmoor, Oren, Bram, Mei, Suncleft Ruins, and the hidden Waystone Archive.

The separate 52 × 34 Archive contains five room groups, three rune switches, progression gates, spike traps, environmental inscriptions, a hidden cache, a checkpoint, the Riftbound Sentinel, and the Hollow Cartographer. Dungeon progress and bosses persist safely across saves.

Completing Chapter 2 unlocks the Rift Compass, a second equipment preset, free stabilized Waystone travel, backpack expansion, experience rewards, and the Pathfinder of Hearthvale achievement.

## Version 3.6 — Economy, Skills, and Cave Progression

The player has an Adventure Level from 1–20 and Farming, Mining, Combat, Fishing, and Foraging skills from 1–10. Activities, quests, bounties, and milestone bosses award experience and unlock permanent perks.

Crops and fish use Normal, Silver, Gold, and Iridium quality. Shops use daily stock, blacksmith upgrades require depth-appropriate materials, equipment can be enhanced to +3, and progression bosses guard Floors 10, 20, 30, 40, and 50.

## Version 3.5 — Living World

All 18 named NPCs have time- and weather-aware routines. Hearthvale and Silvercrest contain moving citizens, shop hours, evening lights, umbrellas, contextual dialogue, friendship milestones, and the original Farmhouse and Adventurers' Guild interiors.

Characters use animated geometric body parts for walking, blinking, tool actions, fishing, combat, and weather reactions.

## Version 3.4 — World and Map Polish

The 256 × 224 overworld remains **57,344 tiles**, with authored settlement roads, protected door clearances, city walls and gates, regional decorations, animated environmental effects, safer cave entrances, and improved underground presentation.

The world uses deterministic 16 × 16 tile chunks. Only nearby terrain, resources, monsters, decorations, citizens, animals, and effects are active at runtime.

## Guided Chapter 1

Chapter 1 introduces farming, Hearthvale Village, Silvercrest City, the Adventurers' Guild, Greenfield combat, and Cave Floor 3 through a persistent objective tracker, progress bars, world markers, cave markers, directional arrows, dialogue, rewards, and a completion screen.

## Combat and equipment

Combat includes directional sword arcs, attack cooldowns, critical hits, knockback, damage numbers, invulnerability frames, telegraphed attacks, projectiles, status effects, physical loot drops, boss bars, and six equipment slots: weapon, armor, helmet, boots, ring, and charm.

## Regions

The continent contains 14 connected regions: Hearthvale Farmstead, Hearthvale Village, Silvercrest City, Northwatch Foothills, Greenfield Wilds, Moonlake Basin, Veilmoor, Frostpeak Mountains, The Lightless Wood, Murkfen Swamp, Dreadwild Expanse, Cinderwake Caldera, Suncoast Reach, and Suncleft Ruins.

Every hostile surface region has three region-exclusive monster species.

## Grand Depths — 50 Floors

Five surface entrances connect to the Grand Depths. Floor 1 is an expedition hub with a merchant, trader, healer, and milestone floor gate.

- Floors 1–9 — Copper Galleries
- Floors 10–19 — Fungal Grotto
- Floors 20–29 — Prismatic Depths
- Floors 30–39 — Frozen Abyss
- Floors 40–49 — Infernal Rift
- Floor 50 — Heart of the Depths

Each non-hub floor independently has a deterministic 1% chest chance for the current expedition.

## Time and streaming

- Overworld clock: **1.25 game minutes per real second**
- Cave clock: **0.75 game minutes per real second**
- A normal 6:00 AM-to-midnight overworld day lasts approximately **14.4 real minutes**
- Only nearby 16 × 16 chunks are active at runtime

## Run locally

```bash
npm run start
```

Open `http://localhost:4173`.

Validate JavaScript modules and regression tests:

```bash
npm run check
node tests/smoke.mjs
node tests/living-world.mjs
node tests/progression.mjs
node tests/chapter-two.mjs
node tests/seasons.mjs
node tests/seasons-runtime.mjs
node tests/ranching.mjs
node tests/ranching-runtime.mjs
node tests/ranching-hardening.mjs
node tests/interiors.mjs
node tests/interiors-runtime.mjs
```

## Controls

- Desktop: WASD/arrows to move, E/Enter to interact, Space/F to use the selected tool, 1–8 to select tools, Q to cycle seeds, and M/Escape for the menu.
- Android/tablet: virtual movement stick, A tool button, B interaction button, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
