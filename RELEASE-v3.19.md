# Hearthvale v3.19 — Farmstead Building and Prop Art

Version 3.19 extends the Farmstead visual upgrade beyond terrain while preserving every existing collision, interaction, save, crop, building service, and world-generation rule.

## Updated Farmstead visuals

- Blue-roof Farmhouse with warm plaster walls, chimney, windows, flower greenery, layered roofing, and stronger ground shadow
- Rounded multi-cluster summer trees with highlighted foliage, visible trunks, and fruit-tree variants
- Layered farm rocks with painted highlights, cracks, and grounded shadows
- Detailed wooden crates with framed boards and diagonal braces
- Warm wooden fences with rounded rails, posts, outlines, and unchanged collision geometry

## Renderer safety

The visual renderer wraps existing drawing methods rather than changing game-state data. It applies only inside the Hearthvale Farmstead and delegates every unsupported resource, building, decoration, and structure to the previous renderer.

The Farmhouse is temporarily excluded from the existing building pass and redrawn in the new style at the same footprint and door position. Farm fences are overlaid at their authored coordinates without modifying collision data.

## Validation

`tests/farmstead-prop-art.mjs` verifies the Farmhouse target, Farmstead fence selection, renderer hooks, and preservation of the existing building and authored-structure definitions.

## Release state

- Version: 3.19.0
- Offline cache: `hearthvale-continent-v3-19-1`
- New module: `game-farmstead-prop-art.js`
- New test: `tests/farmstead-prop-art.mjs`
