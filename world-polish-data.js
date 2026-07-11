import { BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, REGIONS, WORLD_W, WORLD_H } from "./world-data.js";

const rect = (x, y, rx, ry, rw, rh) => x >= rx && x < rx + rw && y >= ry && y < ry + rh;
const near = (x, y, px, py, radius) => Math.hypot(x + .5 - px, y + .5 - py) <= radius;
const hash = (x, y, seed = 0) => {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
};

// Extra authored roads and plazas. These are deliberately tile-aligned and connect
// every important door, gate, Waystone and cave approach to a main travel corridor.
export const POLISHED_PATH_RECTS = [
  // Farmstead: farmhouse court, field loop and barn connector.
  [8, 13, 7, 4], [13, 15, 4, 18], [17, 19, 31, 3], [17, 47, 31, 3],
  [17, 21, 3, 28], [45, 21, 3, 28], [26, 13, 5, 8], [38, 29, 10, 4],
  // Village: central green, door aprons and dock road.
  [58, 29, 49, 7], [64, 13, 9, 5], [83, 13, 9, 5], [65, 31, 8, 5],
  [85, 31, 8, 5], [78, 34, 5, 53], [96, 29, 11, 5],
  // Silvercrest: city gates, main boulevard, market plaza, guild court and districts.
  [112, 28, 80, 8], [112, 39, 80, 8], [112, 60, 80, 8],
  [126, 17, 9, 47], [148, 16, 9, 49], [168, 16, 9, 49], [182, 28, 10, 41],
  [118, 18, 24, 6], [142, 18, 20, 6], [162, 18, 24, 6],
  [118, 37, 20, 5], [140, 37, 20, 5], [162, 37, 22, 5],
  [118, 58, 22, 6], [142, 58, 26, 6], [169, 58, 18, 6],
  // Northwatch observatory approach.
  [190, 30, 35, 5], [218, 17, 5, 18],
  // Wilderness Waystone and cave entrance clear approaches.
  [39, 86, 10, 7], [45, 101, 11, 7], [98, 85, 10, 7],
  [160, 108, 11, 8], [214, 101, 11, 8], [47, 143, 10, 8],
  [104, 147, 10, 8], [159, 184, 11, 9], [218, 178, 12, 9],
  [46, 195, 11, 9], [103, 197, 11, 9], [185, 65, 10, 9],
  [87, 161, 10, 9], [238, 108, 8, 9], [236, 201, 9, 9],
];

export function isPolishPathTile(x, y) {
  return POLISHED_PATH_RECTS.some(([px, py, pw, ph]) => rect(x, y, px, py, pw, ph));
}

export const AUTHORED_STRUCTURES = [
  // Farmstead details.
  { id: "farm-fence-n", type: "fenceH", x: 17, y: 18, w: 31, h: 1, solid: true },
  { id: "farm-fence-s", type: "fenceH", x: 17, y: 50, w: 31, h: 1, solid: true },
  { id: "farm-fence-w1", type: "fenceV", x: 16, y: 18, w: 1, h: 13, solid: true },
  { id: "farm-fence-w2", type: "fenceV", x: 16, y: 35, w: 1, h: 16, solid: true },
  { id: "farm-fence-e1", type: "fenceV", x: 48, y: 18, w: 1, h: 12, solid: true },
  { id: "farm-fence-e2", type: "fenceV", x: 48, y: 34, w: 1, h: 17, solid: true },
  { id: "hay-1", type: "hay", x: 34, y: 9, w: 2, h: 2, solid: true },
  { id: "hay-2", type: "hay", x: 37, y: 10, w: 2, h: 2, solid: true },
  { id: "farm-cart", type: "cart", x: 19, y: 9, w: 3, h: 2, solid: true },

  // Village green and gardens.
  { id: "village-well", type: "well", x: 76, y: 26, w: 3, h: 3, solid: true },
  { id: "village-garden-a", type: "garden", x: 58, y: 18, w: 4, h: 6, solid: false },
  { id: "village-garden-b", type: "garden", x: 96, y: 18, w: 5, h: 6, solid: false },
  { id: "village-bench-a", type: "bench", x: 72, y: 37, w: 3, h: 1, solid: true },
  { id: "village-bench-b", type: "bench", x: 92, y: 37, w: 3, h: 1, solid: true },

  // Silvercrest city walls with three open gates.
  { id: "city-wall-n1", type: "cityWallH", x: 112, y: 1, w: 18, h: 2, solid: true },
  { id: "city-wall-n2", type: "cityWallH", x: 136, y: 1, w: 24, h: 2, solid: true },
  { id: "city-wall-n3", type: "cityWallH", x: 166, y: 1, w: 26, h: 2, solid: true },
  { id: "city-wall-w1", type: "cityWallV", x: 112, y: 3, w: 2, h: 25, solid: true },
  { id: "city-wall-w2", type: "cityWallV", x: 112, y: 36, w: 2, h: 44, solid: true },
  { id: "city-wall-e1", type: "cityWallV", x: 190, y: 3, w: 2, h: 28, solid: true },
  { id: "city-wall-e2", type: "cityWallV", x: 190, y: 47, w: 2, h: 33, solid: true },
  { id: "city-wall-s1", type: "cityWallH", x: 112, y: 78, w: 18, h: 2, solid: true },
  { id: "city-wall-s2", type: "cityWallH", x: 136, y: 78, w: 24, h: 2, solid: true },
  { id: "city-wall-s3", type: "cityWallH", x: 166, y: 78, w: 26, h: 2, solid: true },
  { id: "city-fountain", type: "fountain", x: 149, y: 43, w: 7, h: 6, solid: true },
  { id: "market-stall-a", type: "stall", x: 140, y: 24, w: 4, h: 3, solid: true },
  { id: "market-stall-b", type: "stall", x: 146, y: 24, w: 4, h: 3, solid: true },
  { id: "market-stall-c", type: "stall", x: 152, y: 24, w: 4, h: 3, solid: true },
  { id: "market-stall-d", type: "stall", x: 158, y: 24, w: 4, h: 3, solid: true },
  { id: "guild-dummy-a", type: "dummy", x: 116, y: 24, w: 1, h: 2, solid: true },
  { id: "guild-dummy-b", type: "dummy", x: 120, y: 24, w: 1, h: 2, solid: true },
  { id: "city-house-a", type: "house", x: 115, y: 68, w: 7, h: 6, solid: true, roof: "#6c5b75", wall: "#c7aa7a" },
  { id: "city-house-b", type: "house", x: 124, y: 68, w: 7, h: 6, solid: true, roof: "#4f6f69", wall: "#d0b27e" },
  { id: "city-house-c", type: "house", x: 174, y: 68, w: 7, h: 6, solid: true, roof: "#80564b", wall: "#c8a36e" },
  { id: "city-house-d", type: "house", x: 183, y: 68, w: 6, h: 6, solid: true, roof: "#516a79", wall: "#c2ad84" },
];

export function structureAtTile(x, y) {
  return AUTHORED_STRUCTURES.find((structure) => structure.solid && rect(x, y, structure.x, structure.y, structure.w, structure.h));
}

function buildingClearance(x, y, building) {
  // Keep one clear tile around walls and a wider, three-tile-deep apron at doors.
  if (rect(x, y, building.x - 1, building.y - 1, building.w + 2, building.h + 2)) return true;
  return rect(x, y, building.door.x - 2, building.door.y, 5, 4);
}

export function isWorldClearanceTile(x, y) {
  if (x < 1 || y < 1 || x >= WORLD_W - 1 || y >= WORLD_H - 1) return true;
  if (isPolishPathTile(x, y)) return true;
  if (BUILDINGS.some((building) => buildingClearance(x, y, building))) return true;
  if (WAYSTONES.some((stone) => near(x, y, stone.x, stone.y, 2.2))) return true;
  if (CAVE_ENTRANCES.some((entry) => near(x, y, entry.x, entry.y, 3.1))) return true;
  if (Object.values(INTERACTIONS).some((point) => near(x, y, point.x, point.y, 1.8))) return true;
  if (NPC_DEFS.some((npc) => near(x, y, npc.home.x, npc.home.y, 1.25))) return true;
  return Boolean(structureAtTile(x, y));
}

const REGION_ACCENTS = {
  farm: ["flower", "clover", "pebble"],
  village: ["flower", "shrub", "lamp"],
  city: ["banner", "lamp", "crate"],
  northwatch: ["pine", "stone", "windGrass"],
  greenfields: ["flower", "tallGrass", "shrub"],
  moonlake: ["reed", "lily", "flower"],
  veilmoor: ["paleFlower", "standingStone", "fogTuft"],
  frostpeak: ["snowdrift", "pine", "iceShard"],
  darkforest: ["root", "deadSapling", "glowMushroom"],
  swamp: ["reed", "mireBubble", "mangroveKnee"],
  dreadwild: ["bone", "voidCrystal", "deadSapling"],
  volcano: ["ashRock", "emberVent", "charredStump"],
  suncoast: ["shell", "driftwood", "beachGrass"],
  ruins: ["brokenPillar", "rubble", "ancientTile"],
};

export function regionAtPolish(x, y) {
  return REGIONS.find((region) => rect(x, y, region.x, region.y, region.w, region.h)) || REGIONS[0];
}

export function decorationForTile(x, y) {
  if (isWorldClearanceTile(x, y)) return null;
  const region = regionAtPolish(x, y);
  // Keep the working crop field visually clean and fully usable.
  if (region.id === "farm" && rect(x, y, 4, 15, 48, 38)) return null;
  const r = hash(x, y, 3407);
  const chance = region.safe ? .965 : .91;
  if (r < chance) return null;
  const types = REGION_ACCENTS[region.id] || REGION_ACCENTS.farm;
  const type = types[Math.floor(hash(x, y, 7711) * types.length) % types.length];
  const solidTypes = new Set(["pine", "standingStone", "deadSapling", "voidCrystal", "ashRock", "charredStump", "driftwood", "brokenPillar"]);
  return { id: `decor:${x}:${y}:${type}`, type, x, y, solid: solidTypes.has(type) };
}

export function solidDecorationAtTile(x, y) {
  const decor = decorationForTile(x, y);
  return decor?.solid ? decor : null;
}

export function transitionInfo(x, y) {
  const region = regionAtPolish(x, y);
  const localX = x - region.x;
  const localY = y - region.y;
  const edge = Math.min(localX, localY, region.w - 1 - localX, region.h - 1 - localY);
  if (edge > 4) return null;
  const strength = (5 - Math.max(0, edge)) / 5;
  const neighborOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const neighbor = neighborOffsets
    .map(([dx, dy]) => regionAtPolish(x + dx * 5, y + dy * 5))
    .find((candidate) => candidate.id !== region.id);
  if (!neighbor) return null;
  return { from: region, to: neighbor, strength: strength * (.35 + hash(x, y, 908) * .35) };
}

export function visibleDecorations(bounds) {
  const items = [];
  for (let y = Math.max(0, bounds.startY - 1); y < Math.min(WORLD_H, bounds.endY + 1); y += 1) {
    for (let x = Math.max(0, bounds.startX - 1); x < Math.min(WORLD_W, bounds.endX + 1); x += 1) {
      const decor = decorationForTile(x, y);
      if (decor) items.push(decor);
    }
  }
  return items;
}
