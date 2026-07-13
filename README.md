# Hearthvale

Hearthvale is an original responsive farming, ranching, cooking, fishing, collection, storage, construction, automation, relationship, exploration, guild-combat, and story-adventure game. It uses original characters, map design, dialogue, systems, and a growing hand-painted top-down visual identity backed by a safe geometric Canvas fallback.

## Version 3.19 — Farmstead Buildings and Nature Art

Version 3.19 extends the approved visual direction beyond terrain and into the objects that define the opening Farmstead.

### Embedded object artwork

The Farmstead now uses a compact hand-painted raster atlas for:

- The blue-roof Farmhouse
- Summer deciduous trees and fruit trees
- Layered farm rocks
- Wooden crates
- Horizontal and vertical wooden fences

The optimized **448 × 232 PNG atlas** is embedded across three JavaScript chunks. It is decoded lazily at runtime and cached with the offline PWA, so the visual upgrade does not require a separate image request.

### Safe renderer replacement

Only matching Farmstead objects are replaced. Existing renderers remain active for other regions and unsupported object types.

- Building footprints, doors, collisions, services, and interior entry points are unchanged.
- Resource IDs, health, harvesting, respawning, chunk streaming, and save data are unchanged.
- Fence collision rectangles continue to come from the authored world structures.
- The original geometric renderer is used immediately when the embedded atlas is unavailable or fails to decode.
- The object layer is installed through the existing `game-farmstead-prop-art.js` compatibility entry point, preventing duplicate wrappers.

### Art validation

The Farmstead object-art regression verifies:

- PNG signature, dimensions, and ending
- All six sprite rectangles fit inside the atlas
- Farm-only resource and fence selection
- Tree, rock, and crate destination geometry
- Farmhouse, tree, rock, crate, and fence coverage
- Geometric fallback behavior without a browser `Image` implementation

## Version 3.18 — Hand-Painted Farmstead Terrain

Version 3.18 began Hearthvale's production art transition by replacing the Farmstead's flat terrain with the approved cozy hand-painted environment style.

The Farmstead terrain renderer includes:

- Four deterministic seamless grass variants
- Occasional flowered-grass clearings
- A complete 47-tile connected dirt-path set
- A complete 47-tile connected dry-soil set
- A complete 47-tile connected watered-soil set
- Existing crops drawn above the new soil artwork

The three connected terrain families provide **141 runtime atlas cells**. Roads and farm plots select their correct edge, corner, junction, isolated, and interior tile through an eight-neighbor canonical bitmask.

The **512 × 384 terrain atlas** is embedded in five validated JavaScript chunks and decoded lazily. Water, bridges, other regions, characters, and unsupported effects retain their existing renderers. Save data, collision, pathfinding, farming state, and world generation remain unchanged.

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
- **Hand-painted Farmstead terrain, Farmhouse, trees, rocks, crates, and fences**
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
```

## Controls

- Desktop: WASD/arrows move, E/Enter interact, Space/F uses the selected tool or casts/reels, 1–8 selects tools, Q cycles seeds, and M/Escape opens the Adventure Menu.
- Android/tablet: virtual movement stick, A tool/attack/cast, B interaction, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
