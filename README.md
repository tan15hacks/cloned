# Hearthvale

Hearthvale is an original responsive farming, ranching, cooking, fishing, collection, storage, relationship, exploration, guild-combat, and story-adventure game. It uses original characters, map design, dialogue, systems, and geometric cartoon rendering.

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

The Farmhouse now contains two independent, reachable storage stations:

- **Farmhouse Pantry** — 80 stacks for crops, forage, fish, ranch goods, artisan products, consumables, and prepared meals
- **Adventure Trunk** — 120 stacks for materials, monster drops, equipment, supplies, and collectibles

Players can move one item or an entire stack in either direction. The Inventory screen also supports quick storage while inside the Farmhouse.

### Quality-safe transfers

Normal, Silver, Gold, and Iridium records move with their items. This includes:

- Crops and orchard produce
- Generic fishing inventory
- Ranch products and artisan goods
- Prepared meals

When the backpack is full, newly collected goods first use their preferred chest and then the alternate chest. This prevents quality catches, ranch products, or harvests from being forced into an invalid backpack stack.

### Inventory organization

The redesigned Inventory screen includes:

- Occupied-stack and capacity counters
- Category filters
- Sorting by category, name, quantity, or value
- Quality summaries
- Base sale values
- Storage and shipping shortcuts

Categories cover seeds, crops, forage, fish, ranch products, artisan goods, meals, materials, monster drops, consumables, special items, and miscellaneous goods.

### Farmstead shipping bin

A physical shipping bin stands east of the Farmstead mailbox. Players can queue goods individually, move complete stacks, or use bulk produce and artisan buttons.

Goods remain retrievable until the day ends. Sleeping or passing out processes the shipment exactly once and records:

- Items sold
- Quality-aware values
- Hearthlight market bonus
- Total morning payout
- Lifetime shipping revenue
- Number of completed shipments

Special equipment, tokens, seals, quest tools, and important collectibles cannot be shipped.

### Storage achievements

- **Everything in Its Place** — store the first item
- **Farmhouse Organizer** — maintain 25 stored item stacks
- **Packed and Ready** — purchase a backpack upgrade
- **First Morning Market** — complete the first overnight shipment
- **Merchant's Morning** — earn at least 5,000 coins from one shipment
- **Continental Supplier** — earn 50,000 coins through shipping

### Save hardening

Migration validates backpack capacity, stack limits, both chests, shipping contents, quality ledgers, shipment history, counters, and item IDs. Unknown items and non-finite values are rejected. Overstacked legacy goods route into farmhouse storage, non-shippable goods are recovered from the shipping bin, and the physical bin's world tile remains clear after daily resource regeneration.

## Version 3.14 — Silvercrest Museum and Collections

The Silvercrest Museum contains nine permanent galleries with **45 display entries** and **49 donation units**:

- First Harvest Gallery
- Continental Waters Exhibit
- Ranch Heritage Hall
- Artisan Traditions Wing
- Wildlands Herbarium
- Continental Geology Cabinet
- Monster Ecology Archive
- Ancient Depths Collection
- The Hearthvale Table

Completing galleries awards coins, Adventure XP, and Museum Tokens. Completing the museum grants the Continental Curator Seal. Donations synchronize with crop, fish, ranch, artisan, and meal-quality records.

## Major systems

- **57,344-tile streamed continent** across 14 regions
- **Chapter 1 and Chapter 2** with persistent objectives and story dungeons
- **Directional combat**, equipment, bosses, status effects, and physical loot
- **50-floor Grand Depths** with milestone bosses, shortcuts, merchants, and deterministic 1% chests
- **Adventure Level 1–20** and five skills from Level 1–10
- **Four 28-day seasons** with annual festivals and deterministic weather
- **Six ranch animal species**, housing upgrades, quality products, and four artisan machines
- **Ten playable interiors** with schedules, furniture collision, services, and local lighting
- **18 residents**, birthdays, gifts, mailbox letters, and 54 heart events
- **16 quality-aware recipes** with Cooking Levels and temporary meal effects
- **21 regional fish species**, bait, tackle, treasures, records, and four legendary fish
- **Nine museum galleries** integrating long-term collection loops
- **Expandable backpack, two chests, and quality-aware overnight shipping**

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
```

## Controls

- Desktop: WASD/arrows move, E/Enter interact, Space/F uses the selected tool or casts/reels, 1–8 selects tools, Q cycles seeds, and M/Escape opens the Adventure Menu.
- Android/tablet: virtual movement stick, A tool/attack/cast, B interaction, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
