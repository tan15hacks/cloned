# Hearthvale

Hearthvale is an original, responsive farming, exploration, guild, and cave-adventure game. It uses its own characters, story, maps, dialogue, systems, and geometric cartoon rendering rather than copying Stardew Valley assets or content.

## Version 3.1 — Streamed Continent and Slower Days

The overworld remains **256 × 224 tiles**, or **57,344 total tiles**, but the game no longer creates the entire continent's resource and monster population at once.

The runtime now uses deterministic **16 × 16 tile chunks**:

- Only chunks covering the player's current screen and a small preload margin are generated.
- Chunks outside the local area are released from the active resource and monster arrays.
- Harvested resources, defeated monsters, and partially damaged objects remain persistent when a chunk is revisited.
- Existing v1, v2, and v3 browser saves are migrated automatically.
- The desktop minimap is now a local-area radar instead of a full-continent renderer.

The in-game clock was also slowed:

- Overworld: **1.25 game minutes per real second**
- Cave: **0.75 game minutes per real second**
- A normal 6:00 AM-to-midnight overworld day lasts approximately **14.4 real minutes**

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

## Silvercrest City

Silvercrest includes the Adventurers' Guild, Grand Market, Ironhart Smithy, Blue Vial Apothecary, Moon & Rune arcane shop, Silvercrest Exchange, Golden Griffin inn, City Hall, Hunter's Provisioner, residents, friendship, quests, and guild ranks from F through S.

## Grand Depths — 50 Floors

Five surface entrances connect to the Grand Depths. Floor 1 is an expedition hub containing a merchant, trader, healer, and milestone floor gate.

- Floors 1–9 — Copper Galleries
- Floors 10–19 — Fungal Grotto
- Floors 20–29 — Prismatic Depths
- Floors 30–39 — Frozen Abyss
- Floors 40–49 — Infernal Rift
- Floor 50 — Heart of the Depths

Each non-hub floor independently has a deterministic 1% chest chance for the current expedition.

## Run locally

```bash
npm run start
```

Open `http://localhost:4173`.

Validate all JavaScript modules and smoke tests:

```bash
npm run check
node tests/smoke.mjs
```

## Controls

- Desktop: WASD/arrows to move, E/Enter to interact, Space/F to use tools, 1–8 to select tools, Q to cycle seeds, and M/Escape for the menu.
- Android/tablet: virtual movement stick, A tool button, B interaction button, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
