# Hearthvale

Hearthvale is an original, responsive farming, exploration, guild, combat, and cave-adventure game. It uses its own characters, story, maps, dialogue, systems, and geometric cartoon rendering rather than copying Stardew Valley assets or content.

## Version 3.3 — Combat Overhaul

Combat is now directional, readable, and equipment-driven instead of damaging every nearby enemy at once.

### Player combat

- Sword attacks follow the player's facing direction and use a visible attack arc.
- Weapons have damage, attack speed, range, critical-hit chance, knockback, and optional elemental effects.
- Hits produce damage numbers, critical-hit feedback, knockback, enemy flashes, vibration, and short death animations.
- The player receives invulnerability frames after direct damage.
- Poison, burn, and slow effects have visible timers and can be resisted or cured with equipment and consumables.
- Enemy projectiles, attack warnings, boss health bars, and status indicators are rendered on the game canvas.

### Monster behaviors

Monster families now behave differently:

- Slimes leap.
- Bats, wolves, hounds, moths, gulls, and similar hunters circle and dash.
- Mages, wisps, spirits, imps, elementals, and wraiths fire projectiles.
- Golems, sentinels, brutes, knights, and bosses use slow telegraphed heavy attacks.
- Fog and prism wraiths teleport.
- Dark-forest monsters remain partially hidden until approached.
- Swamp and venomous monsters inflict poison, frost monsters inflict slow, and volcanic monsters inflict burn.

### Loot and equipment

Defeated monsters now leave physical loot orbs that move toward the player when approached. Coins, Guild XP, materials, and rare equipment are collected from the ground rather than awarded invisibly.

There are six equipment slots:

- Weapon
- Armor
- Helmet
- Boots
- Ring
- Charm

The initial equipment pool contains 15 items across common, uncommon, rare, epic, and legendary tiers. Equipment can be purchased from the blacksmith and Hunter's Provisioner, unlocked by Guild Rank, or found as rare regional and cave drops. The Adventure Menu includes a complete equipment screen with calculated combat statistics.

## Guided Chapter 1

The opening chapter introduces farming, Hearthvale Village, Silvercrest City, the Adventurers' Guild, Greenfield combat, and the first three Grand Depths floors.

Chapter 1 objectives:

1. Meet Mira and receive starter seeds.
2. Till three farm tiles.
3. Water the prepared soil.
4. Plant three crops.
5. Reach Hearthvale Village.
6. Awaken the village Waystone.
7. Travel to Silvercrest City.
8. Register with the Adventurers' Guild.
9. Accept the Greenfield Patrol contract.
10. Defeat three Greenfield monsters.
11. Claim the guild reward and weapon upgrade.
12. Enter the Grand Depths.
13. Reach Cave Floor 3.
14. Return to the farmhouse and complete the chapter.

The chapter includes a persistent objective HUD, progress bars, animated world and cave markers, off-screen directional arrows with distance, NPC-specific dialogue, automatic progression, journal entries, rewards, an achievement, and a completion screen. Existing browser saves receive Chapter 1 and combat state automatically.

## Streamed continent and slower days

The overworld remains **256 × 224 tiles**, or **57,344 total tiles**, but the game does not create the entire continent's resource and monster population at once.

The runtime uses deterministic **16 × 16 tile chunks**:

- Only chunks covering the player's current screen and a small preload margin are generated.
- Chunks outside the local area are released from the active resource and monster arrays.
- Harvested resources, defeated monsters, partially damaged objects, equipment, loot drops, and status progression remain compatible with local saves.
- Existing v1, v2, and v3 browser saves are migrated automatically.
- The desktop minimap is a local-area radar instead of a full-continent renderer.

The in-game clock uses:

- Overworld: **1.25 game minutes per real second**
- Cave: **0.75 game minutes per real second**
- A normal 6:00 AM-to-midnight overworld day lasts approximately **14.4 real minutes**

## Regions

The continent contains 14 connected regions: Hearthvale Farmstead, Hearthvale Village, Silvercrest City, Northwatch Foothills, Greenfield Wilds, Moonlake Basin, Veilmoor, Frostpeak Mountains, The Lightless Wood, Murkfen Swamp, Dreadwild Expanse, Cinderwake Caldera, Suncoast Reach, and Suncleft Ruins.

Every hostile surface region has three region-exclusive monster species.

## Silvercrest City

Silvercrest includes the Adventurers' Guild, Grand Market, Ironhart Smithy, Blue Vial Apothecary, Moon & Rune arcane shop, Silvercrest Exchange, Golden Griffin inn, City Hall, Hunter's Provisioner, residents, friendship, quests, equipment shops, and guild ranks from F through S.

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

- Desktop: WASD/arrows to move, E/Enter to interact, Space/F to use tools or attack, 1–8 to select tools, Q to cycle seeds, and M/Escape for the menu.
- Android/tablet: virtual movement stick, A tool/attack button, B interaction button, and tappable toolbar/menu controls.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
