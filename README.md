# Hearthvale

Hearthvale is an original responsive farming, ranching, cooking, fishing, relationship, exploration, guild-combat, and story-adventure game. It uses its own characters, map, dialogue, systems, and geometric cartoon rendering rather than copying another game's assets or content.

## Version 3.13 — Continental Fishing Overhaul

Version 3.13 replaces the original one-roll fishing action with a continent-wide collection, equipment, and timing system.

### 21 regional fish species

Every one of Hearthvale's 14 overworld regions now has a fish pool and a reachable shoreline. Species availability can depend on:

- Region
- Season
- Weather
- Time of day
- Fishing Level
- Whether a legendary fish has already been landed

The collection includes settlement fish, mountain salmon, Moonlake night fish, swamp species, volcanic eels, Suncoast ocean fish, ruin-dwelling gar, and four one-time legendary catches.

### Four legendary fish

- **Star-Crowned Koi** — Moonlake during a Frostwane Sparkfall night
- **Aurora Char** — Frostpeak during a Frostwane Sparkfall night
- **Cinderheart Koi** — Cinderwake during a Suncrest Sparkfall night
- **Golden Dawn Marlin** — Suncoast during a clear Suncrest dawn

A first legendary catch awards 600 coins and an Angler's Token. Save hardening rebuilds the caught flag from valid journal records so a removed or malformed flag cannot replay the one-time reward.

### Multi-stage reel minigame

A hooked fish now requires several successful reels. The player must press **REEL** while the moving fish overlaps the highlighted zone before missing three times.

- Harder fish move faster and require more successful reels.
- Higher Fishing Levels widen the target and calm movement.
- Center hits improve quality and treasure chance.
- Perfect catches, escapes, daily streaks, and best streaks are recorded.
- Closing or abandoning the fishing modal safely ends the session and breaks the active streak.

Each cast is bound to the nearest actual water tile, not merely the player's current region. Border rivers therefore use the correct regional species pool.

### Bait and tackle

Tavi's Tackle Ledger sells daily-limited supplies:

- **Worm Bait** — improves uncommon and rare bite rates
- **Glow Bait** — strongly attracts nocturnal and legendary fish
- **Silver Spinner** — widens the reel zone and slightly reduces fish speed
- **Treasure Bobber** — improves treasure and high-quality catch chances

Bait is consumed per cast. Tackle has persistent remaining uses and daily shop stock resets after sleeping.

### Continental Fishing Journal

The Adventure Menu now includes a Fishing Journal showing:

- 21 species and four legends
- Current availability at the player's location
- Season, weather, time, and level clues
- Number caught
- Best quality
- Largest recorded size
- First and most recent catch days
- Catch streak, perfect catches, and treasure totals
- Selected bait and tackle with remaining stock or uses

### Fishing treasure

Accurate catches can recover coin purses, driftwood, copper caches, bait tins, Hearth Crystals, and Ancient Relics. Treasure odds improve with reel accuracy, perfect catches, and the Treasure Bobber.

### Fishing achievements

- **First Entry** — Record the first fish species
- **Continental Angler** — Catch 12 species
- **Living Waters** — Complete all 21 journal entries
- **Unbroken Line** — Land 10 catches in one day without an escape
- **Something Beneath** — Recover fishing treasure
- **Perfect Rhythm** — Land five perfect catches
- **Legend of Every Water** — Catch all four legendary fish

### Fishing save hardening

Existing saves automatically receive an empty journal, safe default gear, daily shop stock, and Tavi's welcome letter with starter bait. Migration validates species IDs, sizes, qualities, caught counts, legendary records, selected gear, tackle uses, streaks, counters, stock limits, and non-finite imported values.

World regression tests verify that all 14 regions have fishable water and same-region casting shorelines while building doors, Waystones, Waystone spawn points, and cave entrances remain dry.

## Version 3.12 — Farmhouse Cooking and Meal Buffs

Version 3.12 connects crops, fish, forage, ranch products, artisan goods, relationships, and combat through a complete cooking loop.

### Farmhouse kitchen

The Farmhouse contains two playable stations:

- **Farmhouse Stove** — prepare known recipes using inventory ingredients
- **Farmhouse Cookbook** — review recipes, unlock requirements, ingredient stock, Cooking XP, meal effects, and prepared food

The stove, cookbook shelf, interaction markers, warm light, and rising steam are rendered inside the Farmhouse interior.

### 16 original recipes

1. Hearth Turnip Broth
2. Sunberry Compote
3. Silverleaf Omelet
4. Glowcap Skillet
5. Hearth & Kettle River Stew
6. Orchard Apple Custard
7. Moonbean Curry
8. Golden Turnip Bake
9. Moonlake Fisher Pie
10. Frostmint Cream Tea
11. Murkfen Bloom Chowder
12. Starwatch Parfait
13. Grand Market Truffle Risotto
14. Cinderwake Ember Hotpot
15. Grand Depths Victory Platter
16. Hearthvale Continental Feast

Recipes use crops, fish, forage, eggs, milk, cheese, goat products, truffles, and artisan goods. Three recipes are available immediately, three unlock through Cooking Levels, and ten are learned from completed resident heart events after reaching the required Cooking Level.

### Ingredient quality and meal effects

Players may choose **Cook Standard** to use lower-quality ingredients first or **Use Best Ingredients** to prioritize premium ingredients. Meals can become Homestyle, Refined, Gourmet, or Masterwork quality.

Only one meal effect may be active at a time. Food can improve energy efficiency, movement, damage, armor, critical chance, attack speed, loot luck, maximum health, and status resistance.

### Cooking achievements

- **Home-Cooked** — Prepare the first meal
- **Kitchen Hand** — Cook 25 meals
- **Masterwork Supper** — Cook a Masterwork meal
- **Continental Cookbook** — Learn all 16 recipes
- **Continental Chef** — Cook every recipe

## Version 3.11 — Relationships, Heart Events, Gifts, and Mailbox

All 18 named residents have unique birthdays, loved and disliked gifts, conversation streaks, friendship tiers, and three authored heart events at 3, 6, and 9 friendship—54 scenes in total.

Players may give one gift per resident each day and two per seven-day week. Birthday gifts receive stronger bonuses. The Residents menu shows friendship, profession, known preferences, gift usage, talk streaks, completed scenes, and pending invitations.

A physical Farmstead mailbox receives birthday reminders, heart-event invitations, recipe letters, system introductions, and claim-once item or coin enclosures. Imported letter text is escaped before rendering.

## Version 3.10 — Expanded Building Interiors

Hearthvale contains ten playable lightweight interiors:

- Farmhouse
- Silvercrest Adventurers' Guild
- Mira's Seeds
- Hearth & Kettle
- Ironhart Smithy
- Blue Vial Apothecary
- The Golden Griffin
- Silvercrest Grand Market
- Starwatch Observatory
- Silvercrest Hall

Interiors include collision-safe furniture, service counters, local lighting, weather-aware windows, indoor NPC schedules, independent camera bounds, and save-safe exterior return points.

## Version 3.9 — Farm Animals and Artisan Machines

Six animal species support long-term ranch progression:

- Chickens producing Eggs
- Cows producing Milk
- Ducks producing Duck Eggs and Feathers
- Goats producing Goat Milk
- Sheep producing Wool
- Pigs finding Truffles

The Coop and Barn progress through Basic, Large, and Deluxe tiers. The Silo expands hay storage. Feeding, petting, health, weather, housing, friendship, happiness, and Farming Level affect Normal, Silver, Gold, and Iridium products.

Four machines create Mayonnaise, Cheese, Cloth, and Truffle Oil.

## Version 3.8 — Seasons and Festivals

The continuous calendar uses four 28-day seasons and a repeating 112-day year:

- Springbloom
- Suncrest
- Emberfall
- Frostwane

Each season has deterministic weather, crop affinity, ambient effects, and an annual festival with a unique minigame, tokens, XP, keepsakes, friendship rewards, and collectible equipment.

## Version 3.7 — Chapter 2: The Fractured Waystones

Chapter 2 contains seventeen objectives connecting Aria, Sora, Veilmoor, Oren, Bram, Mei, Suncleft Ruins, and the hidden Waystone Archive.

The 52 × 34 Archive includes rune switches, gates, traps, inscriptions, a hidden cache, a checkpoint, the Riftbound Sentinel, and the Hollow Cartographer. Completion unlocks the Rift Compass, a second equipment preset, free stabilized Waystone travel, backpack expansion, XP, and the Pathfinder achievement.

## Version 3.6 — Progression and Cave Milestones

The player has Adventure Level 1–20 and Farming, Mining, Combat, Fishing, and Foraging skills from 1–10. Activities, quests, bounties, bosses, cooking, and fishing award experience and permanent progression.

Crops, fish, and ranch products use four quality tiers. Shops have daily stock, blacksmith upgrades require depth-appropriate materials, equipment can be enhanced to +3, and progression bosses guard Floors 10, 20, 30, 40, and 50.

## Version 3.5 — Living World

All 18 named NPCs have time- and weather-aware routines. Hearthvale and Silvercrest include moving citizens, shop hours, evening lights, umbrellas, contextual dialogue, friendship milestones, and indoor work schedules.

Characters use animated geometric body parts for walking, blinking, tools, fishing, combat, and weather reactions.

## Version 3.4 — World and Map Polish

The 256 × 224 overworld contains **57,344 tiles** across 14 connected regions. Authored roads, settlement gates, protected entrances, regional decorations, water, snow, fog, embers, swamp bubbles, and cave atmosphere improve readability without increasing world size.

The world uses deterministic 16 × 16 chunks. Only nearby terrain, resources, monsters, decorations, citizens, ranch animals, and effects are active.

## Story and combat

Chapter 1 introduces farming, Hearthvale Village, Silvercrest City, the Adventurers' Guild, Greenfield combat, and Cave Floor 3 through a persistent objective tracker and world markers.

Combat includes directional sword arcs, cooldowns, critical hits, knockback, damage numbers, invulnerability, telegraphed attacks, projectiles, status effects, physical loot, boss bars, and six equipment slots.

## Grand Depths — 50 Floors

Five surface entrances connect to the Grand Depths. Floor 1 is an expedition hub with a merchant, trader, healer, and milestone gate.

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

Run syntax and regression validation:

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
node tests/interiors-hardening.mjs
node tests/relationships.mjs
node tests/relationships-runtime.mjs
node tests/cooking.mjs
node tests/cooking-runtime.mjs
node tests/cooking-hardening.mjs
node tests/fishing.mjs
node tests/fishing-runtime.mjs
node tests/fishing-world.mjs
```

## Controls

- Desktop: WASD/arrows move, E/Enter interact, Space/F uses the selected tool or casts/reels, 1–8 selects tools, Q cycles seeds, and M/Escape opens the Adventure Menu.
- Android/tablet: virtual movement stick, A tool/attack/cast, B interaction, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
