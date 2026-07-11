# Hearthvale

Hearthvale is a complete, original, responsive farming-and-village-life game inspired by the broader cozy farming simulation genre. It does not copy Stardew Valley's copyrighted characters, art, dialogue, maps, music, or story.

## Play

The project has no build step and no external runtime dependencies.

```bash
npm run start
```

Open `http://localhost:4173` in a browser. The game also works from any static web host, including GitHub Pages, Cloudflare Pages, Netlify, Vercel static hosting, or a WebView wrapper.

## Controls

- Desktop: WASD or arrow keys to move, E/Enter to interact, Space/F to use the selected tool, 1–8 to select tools, Q to cycle seed types, M/Escape for the menu.
- Android/tablet: virtual movement stick, A tool button, B interaction button, and tappable toolbar/menu.

## Complete systems

- Farm clearing, tilling, watering, three crop types, crop growth, harvesting, and selling
- Weather, day/night clock, sleep, pass-out recovery, energy, health, and autosave
- Original Harmony crop-resonance mechanic with mixed-field yield bonuses
- Hearthlight restoration progression with three permanent valley-wide tiers
- Mote spirit companion that waters crops after being awakened
- Fishing timing minigame with common and rare fish
- Mine zone, ore, crystals, enemies, sword combat, health, and tool upgrades
- Four scheduled villagers, friendship, favorite gifts, dialogue, and community quests
- Crafting for sprinklers, snacks, and resonance lanterns
- Shop, inn, achievements, statistics, journal, inventory, export/import saves, fullscreen, sound, and vibration settings
- Responsive desktop, tablet, and Android layouts
- Installable offline PWA with a service worker and local save data

## Android packaging

The game is already mobile-browser and PWA compatible. For Google Play distribution, wrap the static build with Capacitor or a Trusted Web Activity. The game uses only standard browser APIs and does not require Three.js because a lightweight Canvas 2D renderer is better suited to its pixel-art top-down gameplay and lower-end Android devices.

## Credits and license

Code and original visual rendering are released under the MIT License. The included app icon is original to this repository.
