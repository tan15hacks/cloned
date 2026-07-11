# Hearthvale

Hearthvale is an original, responsive farming-and-village-life game inspired by the broader cozy farming simulation genre. It does not copy Stardew Valley's copyrighted characters, art, dialogue, maps, music, or story.

## Version 2.0 — Expanded Valley

The world has been rebuilt around an authored, tile-aligned layout and expanded to **104 × 78 tiles**. Roads, bridges, building entrances, interaction points, water, fences, collision boundaries, and farming tiles now share the same grid.

Major explorable regions:

- **Farmstead** — farmhouse, barn, fenced crop field, pond, and the first Waystone
- **Hearthvale Village** — seed shop, inn, workshop, community hall, request board, and Hearthlight Beacon
- **Moonlake Meadow** — orchard fruit, herbs, dock fishing, and rarer fish
- **Whisperwood** — dense timber, Silverleaf, Glowcaps, and a daily restorative grove
- **Ember Ridge** — mine entrance, copper, crystals, cave creatures, and combat
- **Northwatch Ridge** — Starwatch Observatory and tomorrow's weather forecast

Existing version 1 browser saves are automatically migrated to the expanded map while preserving inventory, coins, crops that still fit valid farm tiles, achievements, Beacon progress, upgrades, and other important progress.

## Play locally

The project has no build step and no external runtime dependencies.

```bash
npm run start
```

Open `http://localhost:4173` in a browser.

Validate both JavaScript modules with:

```bash
npm run check
```

The static project can also be deployed with GitHub Pages, Cloudflare Pages, Netlify, Vercel static hosting, or an Android WebView/Capacitor wrapper.

## Controls

### Desktop

- WASD or arrow keys — move
- E or Enter — interact
- Space or F — use the selected tool
- 1–8 — select a tool
- Q — cycle available seed types
- M or Escape — open/close the valley menu

### Android and tablet

- Virtual movement stick
- A — use the selected tool
- B — interact
- Tap toolbar slots and menu controls directly

## Gameplay systems

- Clearing, tilling, watering, planting, crop growth, harvesting, and selling
- Three crop types with different growth times and values
- Original crop-Harmony system for mixed-field yield bonuses
- Day/night clock, deterministic forecast, Clear, Cloudy, Rain, and Sparkfall weather
- Energy, health, sleep, pass-out recovery, autosave, export, and import
- Fishing timing minigame across the farm pond, river, and Moonlake
- Mining, ore, crystals, enemies, sword combat, health damage, and tool upgrades
- Five scheduled villagers, dialogue, friendship, favorite gifts, and community requests
- Foraging for Silverleaf, Glowcaps, and orchard apples
- Crafting for sprinklers, snacks, Glow Lanterns, and Forest Tea
- Three-tier Hearthlight restoration with permanent valley-wide upgrades
- Mote spirit companion that waters crops after being awakened
- Discoverable Waystones and fast travel after Hearthlight Tier 2
- World map, desktop minimap, zone discovery, journal, achievements, and statistics
- Responsive desktop, tablet, and Android layouts
- Installable offline PWA with local save data and refreshed service-worker caching

## Rendering and visual style

Hearthvale uses a lightweight Canvas 2D renderer rather than Three.js. Its visual direction is a **cozy flat-shaded 2D low-poly-inspired cartoon style** made from simple geometric forms, chunky proportions, warm colors, subtle tile variation, and crisp silhouettes. This approach keeps the game efficient on lower-powered Android devices while preserving the style established in the original prototype.

## Android packaging

The game already supports mobile browsers and installation as a PWA. For Google Play distribution, wrap the static project with Capacitor or a Trusted Web Activity, then add the Android package metadata, signing configuration, store graphics, privacy disclosures, and device testing required for release.

## License

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
