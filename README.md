# Hearthvale

Hearthvale is an original responsive farming, ranching, cooking, fishing, relationship, exploration, guild-combat, and story-adventure game. It uses original characters, map design, dialogue, systems, and geometric cartoon rendering.

## Version 3.14 — Silvercrest Museum and Collections

Version 3.14 adds a permanent museum progression loop inside Silvercrest Hall and through the Adventure Menu.

### Nine museum galleries

The museum contains nine collection bundles with **45 display entries** and **49 total donation units**:

- First Harvest Gallery
- Continental Waters Exhibit
- Ranch Heritage Hall
- Artisan Traditions Wing
- Wildlands Herbarium
- Continental Geology Cabinet
- Monster Ecology Archive
- Ancient Depths Collection
- The Hearthvale Table

Donations connect crops, generic fish catches, ranch products, artisan goods, forage, ores, monster materials, relics, elemental cores, and six important prepared meals.

### Physical museum wing

Silvercrest Hall now contains two illuminated museum displays with collision-safe, reachable interaction points. Players may browse the same collection ledger from the Adventure Menu through **🏛️ Collections**.

### Donation rewards and ranks

Completing a gallery awards coins, Adventure XP, and a Silvercrest Museum Token exactly once. Museum reputation advances through:

- Visitor
- Contributor
- Patron
- Curator
- Continental Curator

Completing all nine galleries awards 5,000 coins, 400 Adventure XP, and the Continental Curator Seal.

### Cross-system synchronization

Museum donations safely synchronize with existing quality inventories. Donating crops, fish, or ranch goods removes the matching quality records. Donating prepared meals also removes the appropriate quality-aware pantry record so food cannot return after loading.

### Museum achievements

- **A Place in History** — make the first donation
- **Gallery Opening** — complete one museum collection
- **Patron of Silvercrest** — complete five galleries
- **Continental Curator** — complete all nine galleries
- **The Living Archive** — complete the museum, map every region, record all 21 fish, and cook all 16 recipes

### Save hardening

Existing saves receive an empty museum ledger and Archivist Ves's invitation. Migration validates bundle IDs, item counts, completed and rewarded galleries, museum rank, reputation, visit counters, donation days, special reward items, and non-finite imported values. Forged completion flags cannot grant missing displays or duplicate one-time rewards.

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
- **21 regional fish species**, bait, tackle, treasures, collection records, and four legendary fish
- **Nine museum galleries** integrating the game's long-term collection loops

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
```

## Controls

- Desktop: WASD/arrows move, E/Enter interact, Space/F uses the selected tool or casts/reels, 1–8 selects tools, Q cycles seeds, and M/Escape opens the Adventure Menu.
- Android/tablet: virtual movement stick, A tool/attack/cast, B interaction, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
