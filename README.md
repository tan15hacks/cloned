# Hearthvale

Hearthvale is an original, responsive farming, exploration, guild, and cave-adventure game. It uses its own characters, story, maps, dialogue, systems, and geometric cartoon rendering rather than copying Stardew Valley assets or content.

## Version 3.0 — Continental Adventure

The overworld is now **256 × 224 tiles**, or **57,344 total tiles**. Terrain is drawn only around the camera, keeping the much larger continent practical on Android phones, tablets, and desktop browsers.

### Regions

The continent contains 14 connected regions:

- Hearthvale Farmstead
- Hearthvale Village
- Silvercrest City
- Northwatch Foothills
- Greenfield Wilds — beginner monsters and low rewards
- Moonlake Basin — beginner aquatic monsters and fishing
- Veilmoor — mist creatures and Mist Pearls
- Frostpeak Mountains — snow monsters, silver, and Frost Cores
- The Lightless Wood — an entirely dark forest
- Murkfen Swamp — bog monsters and swamp forage
- Dreadwild Expanse — elite surface monsters and the highest surface rewards
- Cinderwake Caldera — lava, fire monsters, obsidian, and Ember Cores
- Suncoast Reach — coast monsters and fishing
- Suncleft Ruins — sentinels, mages, gold, and relics

Every hostile surface region has **three region-exclusive monster species**, for 30 surface monster types in total.

## Silvercrest City

Silvercrest is a large second settlement with:

- Adventurers' Guild and daily regional bounties
- Grand Market
- Ironhart Smithy
- Blue Vial Apothecary
- Moon & Rune arcane shop
- Silvercrest Exchange
- Golden Griffin inn
- City Hall
- Hunter's Provisioner
- Multiple named residents, friendship, favorite gifts, dialogue, and quests

The guild tracks XP and ranks from **F through S**.

## Grand Depths — 50 Floors

Five surface entrances connect to the Grand Depths. Floor 1 is an expedition hub containing a merchant, trader, healer, and milestone floor gate.

Cave environments change at major depths:

- Floors 1–9 — Copper Galleries
- Floors 10–19 — Fungal Grotto
- Floors 20–29 — Prismatic Depths
- Floors 30–39 — Frozen Abyss
- Floors 40–49 — Infernal Rift
- Floor 50 — Heart of the Depths and its boss

Each tier has different monsters, ores, loot, hazards, colors, and rewards. Every non-hub floor independently receives a deterministic **1% chest chance** for the current expedition. Reaching milestone floors unlocks floor-gate travel and matching surface shortcuts.

## Other complete systems

- Farming, tilling, watering, three crops, crop growth, harvesting, selling, and crop Harmony
- Fishing timing minigame
- Surface and cave combat
- Health, energy, armor, weapon and tool upgrades
- Regional resources, forage, monster materials, ores, relics, and consumables
- Crafting, Hearthlight restoration, Waystones, Mote companion, weather, day/night, quests, achievements, statistics, and journal
- Autosave, manual save, export, import, and automatic v1/v2 save migration
- Responsive keyboard, mouse, and touch controls
- Offline PWA support

## Run locally

```bash
npm run start
```

Open `http://localhost:4173`.

Validate every JavaScript module:

```bash
npm run check
```

## Controls

Desktop: WASD or arrows to move, E/Enter to interact, Space/F to use the selected tool, 1–8 to select tools, Q to cycle seeds, and M/Escape for the menu.

Android and tablet: virtual movement stick, A to use a tool, B to interact, and direct toolbar/menu tapping.

## Rendering

Hearthvale uses Canvas 2D with a cozy flat-shaded, low-poly-inspired cartoon style. The renderer culls off-screen tiles and objects rather than drawing the entire 57,344-tile world every frame.

## License

Code and original visual rendering are released under the MIT License.
