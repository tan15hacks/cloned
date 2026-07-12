# Hearthvale

Hearthvale is an original responsive farming, ranching, cooking, fishing, collection, storage, construction, automation, relationship, exploration, guild-combat, and story-adventure game. It uses original characters, map design, dialogue, systems, and a growing hand-painted top-down visual identity backed by a geometric Canvas renderer.

## Version 3.18 — Hand-Painted Farmstead Terrain

Version 3.18 begins Hearthvale's production art transition by replacing the Farmstead's flat terrain with the approved cozy hand-painted environment style.

### Farmstead terrain art

The Farmstead now renders with:

- Four deterministic seamless grass variants
- Occasional flowered-grass clearings
- A complete 47-tile connected dirt-path set
- A complete 47-tile connected dry-soil set
- A complete 47-tile connected watered-soil set
- Existing crops drawn above the new soil artwork

The three connected terrain families provide **141 authored runtime atlas cells**. Roads and farm plots select their correct edge, corner, junction, isolated, and interior tile through an eight-neighbor canonical bitmask.

### Offline embedded atlas

The 512 × 384 runtime atlas is embedded in validated JavaScript chunks rather than fetched as a separate network image. This keeps the first visual upgrade available to the offline PWA without adding another binary request.

The renderer decodes the atlas lazily when the game starts. Grass variation is deterministic, so the same map position keeps the same appearance after loading, sleeping, or revisiting the Farmstead.

### Safe staged rollout

Only the Hearthvale Farmstead uses the new terrain artwork in this release.

- Water, bridges, other regions, buildings, resources, characters, and effects retain their existing renderers.
- The original geometric terrain renderer remains available as an immediate fallback.
- If the embedded atlas cannot decode on a browser or Android device, gameplay continues without a blocked or blank world.
- Save data, collision, pathfinding, farming state, and world generation are unchanged.

This staged approach lets the new visual direction be tested on desktop, Android, and tablet before it expands to buildings, vegetation, water, cliffs, and other biomes.

### Art validation

The Farmstead art regression verifies:

- All 47 unique blob-autotile masks
- Canonical cardinal and diagonal-neighbor rules
- Atlas coordinates for path, dry soil, and watered soil
- Embedded PNG signature, exact decoded size, and valid PNG ending
- Deterministic grass variation and flower placement

## Version 3.17 — Farm Workshop and Field Automation

Version 3.17 turns the Farm Workshop into a permanent field-production system connected to storage, crop growth, weather, and the Farmstead expansion chain.

### Five automation blueprints

- **Quality Sprinkler** — waters all eight neighboring crop tiles before morning growth
- **Bee House** — produces honey every two days; four nearby mature crops double the output
- **Spark Rod** — captures one Hearth Battery during Sparkfall weather
- **Seed Maker** — converts one harvested crop into fresh seeds the following morning
- **Hearth Sprinkler** — waters all 24 surrounding tiles within a two-tile radius

Blueprints unlock through the Farmstead project chain. The workshop may draw crafting materials from the backpack, Farmhouse Pantry, and Adventure Trunk.

### Placement and interaction

Automation devices are placed on empty, untilled Farmstead crop-field tiles. Players can interact directly with machines to collect outputs, load Seed Makers, inspect production timers, or return idle devices to storage.

- 40-device total Farmstead limit
- Per-blueprint placement limits
- Device-specific geometric rendering and ready-output markers
- Adventure Menu and Farm Workshop access
- Context-sensitive interaction hints on desktop and mobile

### Daily automation order

Advanced sprinklers water soil before the existing daily crop-growth step. This means crops receive growth correctly on the same morning rather than waiting an extra day.

Bee Houses, Spark Rods, and Seed Makers process their production before the new day begins. Overlapping sprinkler coverage counts each watered tile once for statistics.

### Production outputs

- **Wildflower Honey** — standard Bee House output
- **Spark Honey** — premium honey produced during Sparkfall
- **Hearth Battery** — required by the advanced Hearth Sprinkler blueprint
- Turnip, Sunberry, and Moonbean seeds from Seed Makers

### Save and streaming safety

Migration validates device types, Farmstead coordinates, per-device limits, unique IDs, machine inputs, outputs, quantities, production dates, duplicate tiles, and conflicting soil. Forged outputs, zero-sized outputs, invalid crops, non-finite positions, and excess devices are rejected.

Chunk streaming removes newly generated resources or monsters that occupy an automation device tile while preserving unrelated streamed objects.

### Automation achievements

- **First Circuit** — place the first automation device
- **Rainmaker** — operate eight advanced sprinklers
- **Sweet Industry** — collect 25 jars of honey
- **Bottled Spark** — capture 10 Hearth Batteries
- **Seed Sovereignty** — produce 50 seeds
- **Master Mechanist** — craft every automation blueprint

## Version 3.16 — Farmstead Expansion and Hearthglass Greenhouse

Version 3.16 turns the lower Farmstead into a permanent construction and protected-farming progression loop.

1. **Restore the South Field** — morning irrigation for up to 16 outdoor crops
2. **Build the Farm Workshop** — crafting, planning, and estate reports
3. **Build the Hearthglass Greenhouse** — 24 protected crop beds
4. **Install the Irrigation Network** — every greenhouse bed and up to 48 outdoor crops
5. **Expand the Greenhouse** — 48 total beds and 25% faster protected growth

The greenhouse remains a fully playable interior with independent soil, normal farming tools, quality harvests, skill XP, inventory overflow, and season-proof crop growth.

## Version 3.15 — Storage, Shipping, and Inventory Management

Version 3.15 adds an expandable 40–96-stack backpack, an 80-stack Farmhouse Pantry, a 120-stack Adventure Trunk, quality-safe transfers, and overnight shipping with morning payouts.

## Version 3.14 — Silvercrest Museum and Collections

The Silvercrest Museum contains nine permanent galleries with 45 display entries and 49 donation units. Gallery completion awards coins, Adventure XP, Museum Tokens, and the Continental Curator Seal.

## Major systems

- **57,344-tile streamed continent** across 14 regions
- **Hand-painted Farmstead terrain** with 4 grass variants and 141 connected path/soil cells
- **Chapter 1 and Chapter 2** with persistent objectives and story dungeons
- **Directional combat**, equipment, bosses, status effects, and physical loot
- **50-floor Grand Depths** with milestone bosses, shortcuts, merchants, and deterministic 1% chests
- **Adventure Level 1–20** and five skills from Level 1–10
- **Four 28-day seasons** with annual festivals and deterministic weather
- **Six ranch animal species**, housing upgrades, quality products, and four artisan machines
- **Eleven playable interiors**, including the 48-plot Hearthglass Greenhouse
- **18 residents**, birthdays, gifts, mailbox letters, and 54 heart events
- **16 quality-aware recipes** with Cooking Levels and temporary meal effects
- **21 regional fish species**, bait, tackle, treasures, records, and four legendary fish
- **Nine museum galleries** integrating long-term collection loops
- **Expandable backpack, two chests, and quality-aware overnight shipping**
- **Five Farmstead construction projects** and protected farming
- **Five workshop automation blueprints** with honey, batteries, seeds, and advanced irrigation

## Run locally

```bash
npm run start
```

Open `http://localhost:4173`.

Run syntax and regression validation:

```bash
npm run check
node tests/smoke.mjs
node tests/workshop-automation.mjs
node tests/workshop-automation-gameplay.mjs
node tests/workshop-automation-runtime.mjs
node tests/workshop-automation-stream.mjs
node tests/farmstead-art.mjs
```

## Controls

- Desktop: WASD/arrows move, E/Enter interact, Space/F uses the selected tool or casts/reels, 1–8 selects tools, Q cycles seeds, and M/Escape opens the Adventure Menu.
- Android/tablet: virtual movement stick, A tool/attack/cast, B interaction, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
