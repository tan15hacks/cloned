# Hearthvale

Hearthvale is an original responsive farming, ranching, cooking, relationship, exploration, guild-combat, and story-adventure game. It uses its own characters, map, dialogue, systems, and geometric cartoon rendering rather than copying another game's assets or content.

## Version 3.12 — Farmhouse Cooking and Meal Buffs

Version 3.12 connects crops, fish, forage, ranch products, artisan goods, relationships, and combat through a complete cooking loop.

### Farmhouse kitchen

The Farmhouse now contains two playable stations:

- **Farmhouse Stove** — prepare known recipes using ingredients from the player's inventory.
- **Farmhouse Cookbook** — review recipes, unlock requirements, ingredient stock, Cooking XP, meal effects, and prepared food.

The stove, cookbook shelf, interaction markers, warm light, and rising steam are rendered inside the existing lightweight Farmhouse interior.

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

Recipes use existing crops, fish, forage, eggs, milk, cheese, goat products, truffles, and artisan goods. Three recipes are available immediately, three unlock through Cooking Levels, and ten are learned from completed resident heart events after reaching the recipe's required Cooking Level.

### Ingredient and meal quality

Cooking understands the existing crop, fish, and ranch quality inventories. Players may choose:

- **Cook Standard** — uses lower-quality ingredients first.
- **Use Best Ingredients** — spends premium ingredients first for a better final dish.

Prepared meals can become Homestyle, Refined, Gourmet, or Masterwork quality. Higher-quality food restores more health and energy and keeps its meal effect active longer.

### Cooking Levels

Cooking has a dedicated progression path from Level 1 to Level 10. Cooking food awards XP, unlocks advanced cookbook entries, and records:

- Total dishes cooked
- Total meals eaten
- Masterwork meals prepared
- Unique recipes completed
- Recipe collection progress

### Temporary meal effects

Only one meal effect may be active at a time. Eating another prepared meal replaces the current effect. Effects use game time and remain consistent across overworld travel, interiors, caves, sleeping, saving, and loading.

Meal effects can improve:

- Tool and attack energy efficiency
- Movement speed
- Damage and armor
- Critical chance and attack speed
- Equipment-drop luck
- Maximum health
- Status resistance

The HUD displays the active meal, quality, and remaining game time.

### Relationship recipe letters

Completing selected 3-, 6-, and 9-heart events can unlock personal recipes from Rowan, Lumi, Mira, Tavi, Pella, Niva, Sora, Cass, Bram, and Guildmaster Aria. New recipes are recorded in the journal and delivered through the secure Farmstead mailbox.

Rowan also sends a first-day cooking letter with starter ingredients and explains the restored farmhouse stove.

### Cooking achievements

- **Home-Cooked** — Prepare the first meal at the farmhouse stove
- **Kitchen Hand** — Cook 25 meals
- **Masterwork Supper** — Cook a Masterwork-quality meal
- **Continental Cookbook** — Learn all 16 recipes
- **Continental Chef** — Cook every recipe at least once

### Save hardening

Existing saves automatically receive Cooking Level 1, the starter cookbook, an empty quality-aware pantry, and the kitchen welcome letter. Migration validates recipe IDs, quality counts, XP, statistics, meal inventory, active effects, expiration times, and imported inventory records.

Forged or malformed effects cannot grant unrelated bonuses, imported meal durations are capped to one game day, expired effects are removed, and non-finite XP values are rejected.

## Version 3.11 — Relationships, Heart Events, Gifts, and Mailbox

All 18 named residents have unique birthdays, loved and disliked gifts, conversation streaks, friendship tiers, and three authored heart events at 3, 6, and 9 friendship—54 scenes in total.

Players may give one gift per resident each day and two per seven-day week. Birthday gifts receive stronger bonuses. The Residents menu shows friendship, profession, known preferences, gift usage, talk streaks, completed scenes, and pending invitations.

A physical Farmstead mailbox receives birthday reminders, heart-event invitations, recipe letters, and claim-once item or coin enclosures. Imported letter text is escaped before rendering.

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

The Coop and Barn progress through Basic, Large, and Deluxe tiers. The Silo expands hay storage. Daily feeding, petting, health, weather, housing, friendship, happiness, and Farming Level affect Normal, Silver, Gold, and Iridium products.

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

The player has Adventure Level 1–20 and Farming, Mining, Combat, Fishing, and Foraging skills from 1–10. Activities, quests, bounties, and bosses award experience and permanent perks.

Crops and fish use four quality tiers. Shops have daily stock, blacksmith upgrades require depth-appropriate materials, equipment can be enhanced to +3, and progression bosses guard Floors 10, 20, 30, 40, and 50.

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
```

## Controls

- Desktop: WASD/arrows move, E/Enter interact, Space/F uses the selected tool, 1–8 selects tools, Q cycles seeds, and M/Escape opens the Adventure Menu.
- Android/tablet: virtual movement stick, A tool/attack, B interaction, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
