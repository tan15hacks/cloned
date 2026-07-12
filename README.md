# Hearthvale

Hearthvale is an original responsive farming, ranching, cooking, fishing, collection, storage, construction, relationship, exploration, guild-combat, and story-adventure game. It uses original characters, map design, dialogue, systems, and geometric cartoon rendering.

## Version 3.16 — Farmstead Expansion and Hearthglass Greenhouse

Version 3.16 turns the lower Farmstead into a permanent construction and protected-farming progression loop.

### Five construction projects

The project board beside the Old Barn manages a dependency-safe sequence:

1. **Restore the South Field** — unlock morning irrigation for up to 16 outdoor crops
2. **Build the Farm Workshop** — add a crafting, project-planning, and estate-report station
3. **Build the Hearthglass Greenhouse** — unlock 24 protected crop beds
4. **Install the Irrigation Network** — water every greenhouse bed and up to 48 outdoor crops automatically
5. **Expand the Greenhouse** — open 24 additional beds and increase greenhouse growth by 25%

Only one construction project may run at a time. Each project requires coins, materials, and completed prerequisites. Construction materials may be drawn from the backpack, Farmhouse Pantry, and Adventure Trunk.

### Season-proof greenhouse farming

The greenhouse is a fully playable interior with independent soil, tool interactions, crop growth, irrigation controls, and a growing ledger.

- Basic greenhouse — 24 plots
- Expanded greenhouse — 48 plots
- All three crop types grow at full speed in every season
- Hoe, watering can, seed selection, harvesting, quality rolls, skill XP, inventory overflow, and storage remain connected to the existing farming systems
- The deluxe greenhouse grows protected crops at ×1.25 speed

### Farmstead layout and safety

The lower Farmstead now contains two open fence gates, aligned construction paths, prepared workshop and greenhouse sites, and a permanent project board. Construction-site rectangles are reserved from deterministic chunk resources and decorative obstacles. Existing players trapped inside a completed building are moved to a nearby clear path.

Migration validates project order, prerequisites, remaining construction days, greenhouse plots, crop IDs, crop growth, planted days, counters, world conflicts, and non-finite imported values.

### Farmstead achievements

- **Breaking New Ground** — complete the first project
- **A Place to Build** — construct the Farm Workshop
- **Under Hearthglass** — construct the greenhouse
- **Water Finds a Way** — install the irrigation network
- **Protected Harvest** — harvest 50 greenhouse crops
- **Master of the Farmstead** — complete all five projects

## Version 3.15 — Storage, Shipping, and Inventory Management

Version 3.15 adds a quality-safe inventory-management loop connecting farming, fishing, ranching, cooking, the museum, shops, and daily income.

### Expandable backpack

The backpack tracks unique item stacks rather than total units. Each stack holds up to 999 items.

- Field Pack — 40 stacks
- Explorer Pack — 56 stacks
- Expedition Pack — 72 stacks
- Curator Pack — 96 stacks

Silvercrest upgrades require coins and progression materials. Existing saves with more unique stacks than their recorded capacity preserve those items safely during migration.

### Two farmhouse storage chests

The Farmhouse contains two independent, reachable storage stations:

- **Farmhouse Pantry** — 80 stacks for crops, forage, fish, ranch goods, artisan products, consumables, and prepared meals
- **Adventure Trunk** — 120 stacks for materials, monster drops, equipment, supplies, and collectibles

Players can move one item or an entire stack in either direction. The Inventory screen also supports quick storage while inside the Farmhouse.

### Quality-safe transfers

Normal, Silver, Gold, and Iridium records move with crops, fishing inventory, ranch products, artisan goods, and prepared meals. When the backpack is full, newly collected goods use their preferred chest and then the alternate chest.

### Farmstead shipping bin

A physical shipping bin stands east of the Farmstead mailbox. Goods remain retrievable until the day ends. Sleeping or passing out processes the shipment exactly once and records quality-aware values, bonuses, total payout, lifetime revenue, and shipment count. Important equipment, tokens, seals, quest tools, and collectibles cannot be shipped.

## Version 3.14 — Silvercrest Museum and Collections

The Silvercrest Museum contains nine permanent galleries with **45 display entries** and **49 donation units**. Completing galleries awards coins, Adventure XP, and Museum Tokens. Completing the museum grants the Continental Curator Seal. Donations synchronize with crop, fish, ranch, artisan, and meal-quality records.

## Major systems

- **57,344-tile streamed continent** across 14 regions
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
- **Five Farmstead construction projects**, a workshop, and automatic irrigation

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
node tests/museum.mjs
node tests/museum-runtime.mjs
node tests/museum-hardening.mjs
node tests/storage.mjs
node tests/storage-runtime.mjs
node tests/storage-hardening.mjs
node tests/storage-overflow.mjs
node tests/storage-ui-runtime.mjs
node tests/farmstead-expansion.mjs
node tests/farmstead-expansion-runtime.mjs
node tests/farmstead-expansion-world.mjs
node tests/farmstead-expansion-stream.mjs
```

## Controls

- Desktop: WASD/arrows move, E/Enter interact, Space/F uses the selected tool or casts/reels, 1–8 selects tools, Q cycles seeds, and M/Escape opens the Adventure Menu.
- Android/tablet: virtual movement stick, A tool/attack/cast, B interaction, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
