# Hearthvale v3.21 — Characters, Residents, and Ranch Animals

Version 3.21 brings the living cast into the same cozy hand-painted visual language as the upgraded Farmstead while preserving movement, schedules, relationships, combat, ranching, collision geometry, and save data.

## Player character art

The player now has:

- Four-direction character rendering
- Smoother walking bob and limb motion
- Equipment-aware armor, helmet, and weapon overlays
- Existing farming-tool animations layered on top
- Combat status rings for poison, burn, and slow
- Existing invulnerability flicker and sword attack arcs preserved

## Named residents and citizens

All eighteen named residents receive deterministic appearances with individual combinations of:

- Skin tone
- Hair color and hairstyle
- Outfit color
- Accent color
- Hats, caps, glasses, aprons, scarves, satchels, goggles, circlets, runes, or other signature details

Wandering citizens use stable ID-based palettes, so their appearance does not change between frames or sessions. Rain and snow umbrella behavior remains connected to the existing weather system.

## Ranch animals

Dedicated painted forms now cover all six species:

- Chickens
- Ducks
- Cows
- Goats
- Sheep
- Pigs

Animals visibly scale from juvenile to mature size using their existing age data. Rare color variants, movement direction, shadows, names, sickness, feeding, petting, and product-ready indicators remain supported.

## Renderer safety

The new renderer wraps only `drawAnimatedCharacter` and `drawRanchAnimal`. Invalid or unsupported entities fall back to the previous render methods.

No schedules, movement speeds, interaction ranges, combat hitboxes, friendship values, animal production, health, housing, or save structures were modified.

## Validation

`tests/character-art.mjs` verifies:

- Appearance coverage for all eighteen named residents
- All six ranch-animal species
- Four facing directions
- Deterministic citizen appearance
- Juvenile-to-adult animal scaling
- Unknown-species fallback
- Both renderer hooks

## Release state

- Version: 3.21.0
- Offline cache: `hearthvale-continent-v3-21-1`
- New module: `game-character-art.js`
- New test: `tests/character-art.mjs`
