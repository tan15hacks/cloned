# Hearthvale v3.20 — Crops, Farm Services, and Automation Art

Version 3.20 completes the visible Farmstead farming loop with richer crop stages, painted machines, and upgraded service structures while preserving all existing mechanics and save data.

## Painted crop growth

Turnips, Sunberries, and Moonbeans now render through five clear visual stages:

1. Seed mound
2. Sprout
3. Young plant
4. Flowering or developing crop
5. Harvest-ready crop

Mature Turnips expose their bulb, Sunberries display fruit clusters, and Moonbeans gain softly glowing pods. The same crop art works outdoors and inside the Hearthglass Greenhouse.

## Painted automation devices

The Farmstead now has dedicated art for:

- Dewdrop Sprinkler
- Quality Sprinkler
- Hearth Sprinkler
- Bee House with orbiting bees
- Spark Rod with charged crystal effects
- Seed Maker with hopper, gear, and status lamp
- Glow Lantern with animated light pulse

Ready outputs display a clear badge without altering machine state or collection rules.

## Farmstead service objects

- Redesigned shipping bin with queued-item counter
- Blueprint-covered Farmstead project board
- Detailed timber Farm Workshop
- Glass-panel Hearthglass Greenhouse
- Deluxe greenhouse glow treatment
- Painted construction scaffolding for active projects

## Renderer safety

The new module wraps the existing crop, placed-object, and building render methods. It applies only to Farmstead crops, the greenhouse, supported Farmstead devices, and Farmstead service structures. Unsupported objects continue through the previous renderer.

No collision boxes, inventory records, machine timers, crop growth values, project requirements, or save structures were changed.

## Validation

`tests/farmstead-farming-art.mjs` verifies:

- All three crop definitions
- Five growth-stage boundaries
- Unknown-crop fallback
- Seven painted placed-object types
- Workshop and greenhouse targets
- Shipping-bin and project-board coordinates
- Three renderer hooks

## Release state

- Version: 3.20.0
- Offline cache: `hearthvale-continent-v3-20-1`
- New module: `game-farmstead-farming-art.js`
- New test: `tests/farmstead-farming-art.mjs`
