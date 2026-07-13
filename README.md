# Hearthvale

Hearthvale is an original responsive farming, ranching, cooking, fishing, collection, storage, construction, automation, relationship, exploration, guild-combat, and story-adventure game. It uses original characters, map design, dialogue, systems, and a growing hand-painted top-down visual identity backed by safe geometric Canvas fallbacks.

## Version 3.20 — Farmstead Farming and Automation Art

Version 3.20 completes the first working-farm art pass by upgrading crops, placed devices, construction services, and the objects that communicate daily Farmstead activity.

### Five-stage crop artwork

Turnips, Sunberries, and Moonbeans now display five readable stages:

1. Seed mound
2. Sprout
3. Developing plant
4. Flowering or fruit-forming plant
5. Harvest-ready crop

The crop renderer uses the existing growth value and crop duration; it does not alter growth speed, watering, quality, harvest output, seasonal affinity, XP, or save data. The same crop artwork is used on the outdoor Farmstead and inside the Hearthglass Greenhouse.

### Painted automation and service objects

The Farmstead now has distinct art and state indicators for:

- Basic and Quality Sprinklers
- Hearth Sprinklers
- Bee Houses with moving bees and output badges
- Spark Rods with charged effects
- Seed Makers with idle, processing, and ready states
- Lanterns
- The overnight shipping bin and current shipment count
- The Farmstead project board
- Construction scaffolding
- The completed Farm Workshop
- Basic and Deluxe Hearthglass Greenhouses

Production readiness, loaded inputs, charged outputs, construction state, and greenhouse upgrades are shown visually without changing the underlying simulation.

### Regression coverage

The v3.20 farming-art regression verifies:

- Every crop type maps through all five growth stages
- Invalid crop data falls back safely
- All seven placed-art targets are registered
- Shipping-bin and project-board coordinates are valid
- Workshop and Greenhouse art targets are present
- Crop, placed-device, and building renderer hooks install correctly

## Version 3.19 — Farmstead Buildings and Nature Art

Version 3.19 extended the visual direction beyond terrain with an embedded **448 × 232 PNG atlas** covering:

- The blue-roof Farmhouse
- Summer deciduous trees and fruit trees
- Layered farm rocks
- Wooden crates
- Horizontal and vertical wooden fences

The object atlas is embedded across three JavaScript chunks and decoded lazily. Only matching Farmstead objects are replaced. Building footprints, doors, collision, resource IDs, harvesting, respawning, chunk streaming, interactions, and save data remain unchanged. The original geometric renderer is used whenever the embedded atlas is unavailable.

## Version 3.18 — Hand-Painted Farmstead Terrain

The Farmstead terrain renderer includes:

- Four deterministic seamless grass variants
- Occasional flowered-grass clearings
- A complete 47-tile connected dirt-path set
- A complete 47-tile connected dry-soil set
- A complete 47-tile connected watered-soil set
- Existing crops drawn above the new soil artwork

The three connected terrain families provide **141 runtime atlas cells** selected through an eight-neighbor canonical bitmask. The **512 × 384 terrain atlas** is embedded in five validated JavaScript chunks and keeps the original geometric terrain renderer as a fallback.

## Version 3.17 — Farm Workshop and Field Automation

The Farm Workshop supports five permanent blueprints:

- **Quality Sprinkler** — waters all eight neighboring crop tiles
- **Bee House** — produces honey every two days
- **Spark Rod** — captures Hearth Batteries during Sparkfall
- **Seed Maker** — converts crops into seeds the following morning
- **Hearth Sprinkler** — waters all 24 surrounding tiles within two spaces

Automation devices use Farmstead placement limits, storage-connected crafting, direct interaction, weather-aware production, save validation, and chunk-stream protection.

## Version 3.16 — Farmstead Expansion and Hearthglass Greenhouse

The Farmstead project board manages five construction projects:

1. Restore the South Field
2. Build the Farm Workshop
3. Build the Hearthglass Greenhouse
4. Install the Irrigation Network
5. Expand the Greenhouse

The completed greenhouse contains up to 48 protected crop beds, automatic irrigation, independent soil, normal farming tools, quality harvests, skill XP, inventory overflow, and season-proof growth.

## Major systems

- **57,344-tile streamed continent** across 14 regions
- **Hand-painted Farmstead terrain, buildings, nature, crops, automation, and service objects**
- **Chapter 1 and Chapter 2** with persistent objectives and story dungeons
- **Directional combat**, equipment, bosses, status effects, and physical loot
- **50-floor Grand Depths** with milestone bosses, shortcuts, merchants, and deterministic 1% chests
- **Adventure Level 1–20** and five skills from Level 1–10
- **Four 28-day seasons** with annual festivals and deterministic weather
- **Six ranch animal species**, housing upgrades, quality products, and four artisan machines
- **Eleven playable interiors**, including the 48-plot Hearthglass Greenhouse
- **18 residents**, birthdays, gifts, mailbox letters, and 54 heart events
- **16 quality-aware recipes** with Cooking Levels and temporary meal effects
- **21 regional fish species**, bait, tackle, treasures, records, and legendary fish
- **Nine museum galleries** integrating long-term collection loops
- **Expandable backpack, two chests, and quality-aware overnight shipping**
- **Five Farmstead construction projects and five workshop automation blueprints**

## Run locally

```bash
npm run start
```

Open `http://localhost:4173`.

Run syntax and regression validation:

```bash
npm run check
node tests/smoke.mjs
node tests/farmstead-art.mjs
node tests/farmstead-prop-art.mjs
node tests/farmstead-object-art.mjs
node tests/farmstead-farming-art.mjs
```

## Controls

- Desktop: WASD/arrows move, E/Enter interact, Space/F uses the selected tool or casts/reels, 1–8 selects tools, Q cycles seeds, and M/Escape opens the Adventure Menu.
- Android/tablet: virtual movement stick, A tool/attack/cast, B interaction, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
