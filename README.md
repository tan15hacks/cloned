# Hearthvale

Hearthvale is an original, responsive seasonal farming, farm-animal ranching, exploration, living-world, guild, combat, progression, and story-adventure game. It uses its own characters, story, map, dialogue, systems, and geometric cartoon rendering rather than copying Stardew Valley assets or content.

## Version 3.9 — Farm Animals and Barn Progression

Version 3.9 turns the Farmstead into a long-term ranch and artisan-production loop while preserving the streamed 57,344-tile continent.

### Six animal species

The ranch supports:

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

### Daily care and grazing

Players can:

- Pet and rename individual animals
- Feed animals manually or through Deluxe automatic feeders
- Refill the water trough
- Clean the housing
- Open or close Coop and Barn doors
- Install winter heaters
- Treat sick animals with medicine
- Install Deluxe auto-collectors
- Collect products by hand using the required ranch tools

Animals graze from the fenced pasture during clear weather when their housing door is open. Off-screen grazing is simulated even when the player spends the day away from the farm. Rain, Snow, festivals, winter, sickness, and nighttime keep animals indoors.

The Ranch Scythe cuts mature pasture grass into Hay. Grass regrows through Springbloom, Suncrest, and Emberfall but remains dormant during Frostwane.

Farming progression improves product quality, can produce double products, unlocks rare-colored animals, conserves Hay at higher levels, and accelerates artisan-machine processing.

### Animal products and quality

Animal and artisan goods use four quality levels:

- Normal — 1× value
- Silver — 1.25× value
- Gold — 1.6× value
- Iridium — 2.2× value

Friendship, happiness, Farming Level, housing tier, heating, and daily care affect the final quality. Flat inventory counts remain compatible with existing systems while ranch quality is stored separately for accurate processing and selling.

### Incubation and ranch supplies

The Meadow & Manger Ranch Supply counter sells animals, Hay, Animal Medicine, heaters, Incubator Heat Packs, a Ranch Scythe, a Milking Pail, and Wool Shears. Species availability depends on Farming Level, housing tier, and remaining capacity.

Large Coops can incubate Chicken or Duck Eggs. Incubation pauses safely when the Coop is full and hatches automatically after space becomes available.

### Artisan machines

Four machines convert quality animal products into more valuable goods over game time:

- Egg or Duck Egg → Mayonnaise
- Milk or Goat Milk → Cheese
- Wool or Feather → Cloth
- Truffle → Truffle Oil

Up to two of each machine can be built. Input quality carries into the artisan output, high Farming Level speeds processing, and Farming Level 9 can improve the finished quality.

### Ranch achievements

- **First Flock** — Welcome the first animal
- **Happy Herd** — Raise four deeply bonded and happy animals
- **Master Rancher** — Build Deluxe housing and care for twelve animals
- **Artisan of Hearthvale** — Produce four different artisan goods

### Performance and save compatibility

Animals update and render only while the Farmstead is active. Daily care, off-screen grazing, construction, incubation, and artisan processing are resolved through compact save-state calculations.

Existing browser saves automatically receive an empty ranch, default housing state, pasture grass, quality storage, machine slots, Hay capacity, and care records. Crops, inventory, Chapter 1 and Chapter 2 progress, friendships, equipment, seasons, festivals, cave progress, and Waystone state remain intact.

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

All 18 named NPCs have time- and weather-aware routines. Hearthvale and Silvercrest contain moving citizens, shop hours, evening lights, umbrellas, contextual dialogue, friendship milestones, and playable Farmhouse and Adventurers’ Guild interiors.

Characters use animated geometric body parts for walking, blinking, tool actions, fishing, combat, and weather reactions.

## Version 3.4 — World and Map Polish

The 256 × 224 overworld remains **57,344 tiles**, with authored settlement roads, protected door clearances, city walls and gates, regional decorations, animated environmental effects, safer cave entrances, and improved underground presentation.

The world uses deterministic 16 × 16 tile chunks. Only nearby terrain, resources, monsters, decorations, citizens, animals, and effects are active at runtime.

## Guided Chapter 1

Chapter 1 introduces farming, Hearthvale Village, Silvercrest City, the Adventurers’ Guild, Greenfield combat, and Cave Floor 3 through a persistent objective tracker, progress bars, world markers, cave markers, directional arrows, dialogue, rewards, and a completion screen.

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
```

## Controls

- Desktop: WASD/arrows to move, E/Enter to interact, Space/F to use the selected tool, 1–8 to select tools, Q to cycle seeds, and M/Escape for the menu.
- Android/tablet: virtual movement stick, A tool button, B interaction button, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
