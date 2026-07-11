# Hearthvale

Hearthvale is an original, responsive farming, exploration, guild, combat, equipment, and cave-adventure game. It uses its own characters, story, map, dialogue, systems, and geometric cartoon rendering rather than copying Stardew Valley assets or content.

## Version 3.4 — World and Map Polish

The 256 × 224 overworld remains **57,344 tiles**, but its settlements, roads, collisions, cave entrances, regional scenery, and underground presentation have been rebuilt for clearer navigation and a more intentional world layout.

### Aligned settlements and travel routes

- Farmstead roads now connect the farmhouse, barn, crop field, pond route, and Farm Waystone.
- Hearthvale Village has a central green, aligned door aprons, gardens, benches, a well, lamps, and a readable route toward Moonlake.
- Silvercrest now has visible walls and open gates, a guild courtyard, market stalls, a central fountain plaza, wider boulevards, residential houses, district roads, banners, and connected service-building entrances.
- Every service door, Waystone, cave entrance, quest interaction point, and NPC home receives protected clearance so resources and monsters do not spawn over important locations.
- The five cave entrances now have wider approach zones and visible stone steps.

### Regional identity and animation

Every visible chunk can add deterministic region-specific decoration without loading the full continent. Examples include flowers and shrubs in Greenfield, reeds and bubbles in Murkfen, twisted roots and glowing mushrooms in the Lightless Wood, standing stones and drifting fog in Veilmoor, snowdrifts and pines in Frostpeak, bones and Void Crystals in Dreadwild, ash vents and embers in Cinderwake, shells and driftwood on the Suncoast, and broken pillars in Suncleft Ruins.

Water ripples, grass sways, fountains move, city banners flutter, snow falls, mist drifts, swamp bubbles rise, volcanic embers float, and cave accents flicker. The visuals retain the cozy flat-shaded 2D low-poly cartoon style.

### Cave readability

- Entry rooms, stairs, merchant counters, and exits are protected from nearby ore and monster spawns.
- Floor tiles, rock walls, ore nodes, safe pads, stairs, torches, crystals, fungal growth, ice cracks, lava cracks, and the Floor 50 arena have clearer silhouettes.
- Combat effects, Chapter 1 markers, loot drops, health bars, and boss UI continue to render over the polished cave layer.

### Connectivity and mobile performance

The world still uses deterministic **16 × 16 tile chunks**. Decorations are generated only for visible tiles, while resources and monsters remain limited to the current screen and preload margin. Automated validation confirms that every service-building door, Waystone, and cave entrance remains reachable from the Farmstead after the collision changes.

## Guided Chapter 1

Chapter 1 introduces farming, Hearthvale Village, Silvercrest City, the Adventurers’ Guild, Greenfield combat, and Cave Floor 3 through a persistent objective tracker, progress bars, world markers, cave markers, directional arrows, dialogue, rewards, and a completion screen.

## Combat and equipment

Combat includes directional sword arcs, attack cooldowns, critical hits, knockback, damage numbers, invulnerability frames, telegraphed enemy attacks, projectiles, status effects, physical loot drops, boss bars, and six equipment slots: weapon, armor, helmet, boots, ring, and charm.

## Regions

The continent contains 14 connected regions:

- Hearthvale Farmstead
- Hearthvale Village
- Silvercrest City
- Northwatch Foothills
- Greenfield Wilds
- Moonlake Basin
- Veilmoor
- Frostpeak Mountains
- The Lightless Wood
- Murkfen Swamp
- Dreadwild Expanse
- Cinderwake Caldera
- Suncoast Reach
- Suncleft Ruins

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

Validate JavaScript modules and smoke tests:

```bash
npm run check
node tests/smoke.mjs
```

## Controls

- Desktop: WASD/arrows to move, E/Enter to interact, Space/F to use the selected tool, 1–8 to select tools, Q to cycle seeds, and M/Escape for the menu.
- Android/tablet: virtual movement stick, A tool button, B interaction button, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
