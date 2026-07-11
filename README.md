# Hearthvale

Hearthvale is an original, responsive seasonal farming, exploration, living-world, guild, combat, progression, and story-adventure game. It uses its own characters, story, map, dialogue, systems, and geometric cartoon rendering rather than copying Stardew Valley assets or content.

## Version 3.8 — Seasons and Festivals

The continuous Day counter now maps into four **28-day seasons** and a repeating **112-day year**:

- Springbloom
- Suncrest
- Emberfall
- Frostwane

The HUD displays the current year, season icon, and season day. Existing saves automatically enter the correct year and season based on their saved Day number.

### Seasonal world and weather

Each season has deterministic weather probabilities and a lightweight visual identity. Spring adds petals and stronger rain chances, summer adds warm motes and clear skies, autumn adds drifting copper leaves, and winter adds snow particles and frequent Snow weather. These visuals remain screen-local and do not increase the streamed world size.

Crop affinity changes through the year:

- Springbloom favors Turnips and Sunberries
- Suncrest favors Sunberries
- Emberfall favors Turnips and Moonbeans
- Frostwane favors Moonbeans

Favored crops gain 25% faster watered growth. Other crops grow 25% slower but never wither, protecting old saves and long-running farms.

### Four annual festivals

- Springbloom Day 7 — **Hearthvale Bloomfair** at the Village Green
- Suncrest Day 14 — **Moonlake Regatta** at Moonlake Dock
- Emberfall Day 21 — **Silvercrest Harvest Crown** at the city plaza
- Frostwane Day 28 — **Starfall Vigil** at the city plaza

Festival sites are visibly decorated from 8:00 AM until 10:00 PM. NPC dialogue responds to both the current season and active festival.

### Festival minigames and rewards

Each festival has a different activity:

- Enchanted Seed Sort
- Moonlake River Dash
- Quality-aware Produce Judging
- Starfall Lantern Memory

Bronze, Silver, and Gold results award Festival Tokens, Adventure XP, related skill XP, seasonal keepsakes, and friendship bonuses. Gold results can award four unique equipment pieces: Bloomfair Charm, Tidecall Ring, Harveststep Boots, and Starfall Crown. Festival Tokens can also purchase consumables or the current festival equipment from the festival shop.

Completing all four festivals in one year unlocks the **A Year of Celebration** achievement. The calendar and Festival Album are available through the Adventure Menu.

## Version 3.7 — Chapter 2: The Fractured Waystones

Chapter 2 uses the existing continent, NPCs, progression systems, and regions to deliver a connected story campaign without expanding the 57,344-tile overworld again.

The chapter unlocks after Chapter 1 is complete, Adventure Level 4 is reached, and the Floor 10 Mycelial Behemoth reward has been earned.

### Seventeen-objective campaign

The campaign sends the player from Guildmaster Aria to Starwatch Observatory, the fractured Veilmoor Waystone, Oren, Bram, Mei, Suncleft Ruins, and the hidden Waystone Archive.

Major objectives include:

- Investigating the Veilmoor fracture
- Defeating corrupted mist creatures
- Gathering Mist Pearls, Iron, Hearth Crystals, and Rift Fragments
- Forging the Waystone Stabilizer
- Escorting Mei and defending her repair ritual
- Activating three Suncleft surface runes
- Solving three archive switches
- Defeating the Riftbound Sentinel
- Defeating the Hollow Cartographer
- Returning to Silvercrest for the chapter conclusion

### Waystone Archive story dungeon

The Waystone Archive is a separate **52 × 34** lightweight map containing five handcrafted room groups, three rune switches, three progression gates, a boss gate, animated spike traps, environmental inscriptions, a hidden treasure cache, a checkpoint, a mini-boss, and a final boss.

Dungeon switches, opened treasure, defeated enemies, the checkpoint, and both boss states persist in the Chapter 2 save data. Saves closed inside the Archive resume safely at its Suncleft entrance without losing dungeon progress.

### Story presentation

Chapter 2 adds purple objective styling, multiple active rune markers, off-screen navigation, camera-focused cutscene overlays, choice-based dialogue, boss introductions, journal recap entries, special world encounters, and post-chapter NPC dialogue.

### Chapter rewards

Completing Chapter 2 awards:

- 1,200 coins and 250 Guild XP
- Adventure, Combat, and Mining XP
- 8 permanent backpack spaces
- The epic Rift Compass charm
- A second equipment preset
- Every continental Waystone route
- Free stabilized Waystone travel
- The **Pathfinder of Hearthvale** achievement

## Version 3.6 — Economy, Skills, and Cave Progression

The player has an Adventure Level from 1–20 and five skills from 1–10: Farming, Mining, Combat, Fishing, and Foraging. Activities, quests, bounties, and milestone bosses award experience and unlock permanent perks.

Turnips, Sunberries, Moonbeans, fish, rare fish, and apples can be Normal, Silver, Gold, or Iridium quality. Shops use daily stock, blacksmith upgrades require depth-appropriate materials, and equipment can be enhanced to +3.

Progression bosses guard Floors 10, 20, 30, 40, and 50. Ordinary equipment respects region and cave difficulty and uses a pity system.

## Version 3.5 — Living World

All 18 named NPCs have time- and weather-aware routines. Hearthvale and Silvercrest contain moving background citizens, shop hours, open/closed signs, evening lights, umbrellas, contextual dialogue, friendship milestones, and playable Farmhouse and Adventurers’ Guild interiors.

Characters use animated geometric body parts for walking, blinking, tool actions, fishing, combat, and weather reactions.

## Version 3.4 — World and Map Polish

The 256 × 224 overworld remains **57,344 tiles**, with authored settlement roads, protected door clearances, city walls and gates, regional decorations, animated environmental effects, safer cave entrances, and improved underground presentation.

The world uses deterministic **16 × 16 tile chunks**. Only nearby terrain, resources, monsters, decorations, citizens, and effects are active at runtime.

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

## Save compatibility

Existing v1–v3.7 browser saves automatically receive seasonal calendar state, festival records, yearly score storage, deterministic seasonal weather forecasts, and festival minigame safety state. Inventory, farms, story progress, relationships, equipment, cave progress, and Chapter 2 dungeon persistence remain intact.

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
```

## Controls

- Desktop: WASD/arrows to move, E/Enter to interact, Space/F to use the selected tool, 1–8 to select tools, Q to cycle seeds, and M/Escape for the menu.
- Android/tablet: virtual movement stick, A tool button, B interaction button, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
