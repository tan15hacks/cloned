import { ITEMS, CROPS, clamp } from "./game-shared.js";
import { INTERIOR_MAPS } from "./living-world-data.js";
import "./ranch-data.js";
import { AUTHORED_STRUCTURES, POLISHED_PATH_RECTS } from "./world-polish-data.js";

export const FARM_EXPANSION_VERSION = 1;
export const FARM_PROJECT_BOARD = { x: 34.5, y: 14.5, label: "Farmstead Project Board" };

export const FARM_BUILDINGS = {
  workshop: {
    id: "farmWorkshop", name: "Farm Workshop", x: 19, y: 54, w: 11, h: 7,
    door: { x: 24.5, y: 61.5 }, wall: "#b98b5c", roof: "#5f6670",
  },
  greenhouse: {
    id: "farmGreenhouse", name: "Hearthglass Greenhouse", x: 35, y: 53, w: 13, h: 8,
    door: { x: 41.5, y: 61.5 }, wall: "#9bc8b0", roof: "#75abc0",
  },
};

export const FARM_PATH_RECTS = [
  [23, 53, 4, 10],
  [40, 53, 4, 10],
  [23, 60, 21, 3],
];

export const FARM_PROJECTS = [
  {
    id: "southField", name: "Restore the South Field", icon: "🌱", days: 1,
    coins: 1500, cost: { wood: 40, stone: 24 }, requires: [],
    description: "Survey the lower farm and install simple channels that automatically water 16 outdoor crop tiles each morning.",
  },
  {
    id: "workshop", name: "Build the Farm Workshop", icon: "🛠️", days: 2,
    coins: 3400, cost: { wood: 90, stone: 50, copper: 12 }, requires: ["southField"],
    description: "Construct a dedicated shed for crafting, project planning, and estate records.",
  },
  {
    id: "greenhouse", name: "Build the Hearthglass Greenhouse", icon: "🏡", days: 3,
    coins: 7600, cost: { wood: 120, stone: 80, iron: 16, crystal: 4 }, requires: ["workshop"],
    description: "Unlock 24 protected crop plots that grow at full speed in every season.",
  },
  {
    id: "irrigation", name: "Install the Irrigation Network", icon: "💧", days: 2,
    coins: 9200, cost: { copper: 24, iron: 20, crystal: 8 }, requires: ["greenhouse"],
    description: "Automatically water every greenhouse plot and up to 48 outdoor crop tiles each morning.",
  },
  {
    id: "greenhouseDeluxe", name: "Expand the Greenhouse", icon: "🌿", days: 4,
    coins: 16800, cost: { wood: 100, gold: 8, crystal: 12, cloth: 4 }, requires: ["irrigation"],
    description: "Open the east growing wing for 48 total plots and increase protected-crop growth by 25%.",
  },
];

export const FARM_PROJECT_MAP = Object.fromEntries(FARM_PROJECTS.map((project) => [project.id, project]));
export const FARM_PROJECT_ORDER = FARM_PROJECTS.map((project) => project.id);

export const GREENHOUSE_MAP = {
  id: "greenhouse", name: "Hearthglass Greenhouse", width: 28, height: 20,
  floor: "#b7c99b", wall: "#46705e", trim: "#d6e6c4", ambience: "greenhouse",
  exit: { x: 14.5, y: 18.5, world: { x: 41.5, y: 62.5 } },
  objects: [
    { id: "greenhouse-tank", type: "waterTank", x: 2, y: 2, w: 3, h: 3, solid: true },
    { id: "greenhouse-bench", type: "workbench", x: 10, y: 2, w: 8, h: 2, solid: true },
    { id: "greenhouse-shelf", type: "shelf", x: 23, y: 2, w: 2, h: 5, solid: true },
    { id: "greenhouse-rug", type: "rug", x: 12, y: 14, w: 4, h: 3, solid: false },
  ],
  interactions: [
    { id: "greenhouseControls", x: 5.5, y: 5.5, label: "Irrigation Controls" },
    { id: "greenhouseLedger", x: 14.5, y: 5.5, label: "Growing Ledger" },
  ],
  residents: [],
  lights: [
    { x: 7, y: 8, radius: 7, color: "#d7ffd2" },
    { x: 21, y: 8, radius: 7, color: "#d7f1ff" },
  ],
};

export const GREENHOUSE_BASIC_SLOTS = [];
export const GREENHOUSE_DELUXE_SLOTS = [];
for (let y = 7; y <= 10; y += 1) {
  for (let x = 4; x <= 9; x += 1) GREENHOUSE_BASIC_SLOTS.push({ x, y });
  for (let x = 18; x <= 23; x += 1) GREENHOUSE_DELUXE_SLOTS.push({ x, y });
}

export function registerFarmsteadExpansion() {
  INTERIOR_MAPS.greenhouse = GREENHOUSE_MAP;
  const reserveRects = [
    ...FARM_PATH_RECTS,
    [FARM_BUILDINGS.workshop.x - 1, FARM_BUILDINGS.workshop.y - 1, FARM_BUILDINGS.workshop.w + 2, FARM_BUILDINGS.workshop.h + 3],
    [FARM_BUILDINGS.greenhouse.x - 1, FARM_BUILDINGS.greenhouse.y - 1, FARM_BUILDINGS.greenhouse.w + 2, FARM_BUILDINGS.greenhouse.h + 3],
    [33, 13, 3, 2],
  ];
  for (const reserve of reserveRects) {
    const exists = POLISHED_PATH_RECTS.some((entry) => entry.length === reserve.length && entry.every((value, index) => value === reserve[index]));
    if (!exists) POLISHED_PATH_RECTS.push(reserve);
  }
  const southFence = AUTHORED_STRUCTURES.findIndex((structure) => structure.id === "farm-fence-s");
  if (southFence >= 0) {
    AUTHORED_STRUCTURES.splice(southFence, 1,
      { id: "farm-fence-s-west", type: "fenceH", x: 17, y: 50, w: 6, h: 1, solid: true },
      { id: "farm-fence-s-center", type: "fenceH", x: 27, y: 50, w: 13, h: 1, solid: true },
      { id: "farm-fence-s-east", type: "fenceH", x: 44, y: 50, w: 4, h: 1, solid: true },
    );
  }
  return GREENHOUSE_MAP;
}

export function greenhouseSlotsForState(expansion) {
  const slots = [...GREENHOUSE_BASIC_SLOTS];
  if (expansion?.completed?.includes("greenhouseDeluxe")) slots.push(...GREENHOUSE_DELUXE_SLOTS);
  return slots;
}

export function greenhouseSlotSet(expansion) {
  return new Set(greenhouseSlotsForState(expansion).map((slot) => `${slot.x},${slot.y}`));
}

export function createFarmExpansionState(existing = {}, state = null) {
  const value = existing && typeof existing === "object" ? existing : {};
  const completed = Array.isArray(value.completed)
    ? [...new Set(value.completed.filter((id) => FARM_PROJECT_MAP[id]))]
    : [];
  const soil = value.greenhouseSoil && typeof value.greenhouseSoil === "object" && !Array.isArray(value.greenhouseSoil)
    ? { ...value.greenhouseSoil }
    : {};
  const project = value.project && FARM_PROJECT_MAP[value.project.id]
    ? {
      id: value.project.id,
      daysRemaining: clamp(Math.floor(Number(value.project.daysRemaining) || FARM_PROJECT_MAP[value.project.id].days), 1, FARM_PROJECT_MAP[value.project.id].days),
      startedDay: clamp(Math.floor(Number(value.project.startedDay) || state?.day || 1), 1, Math.max(1, Math.floor(Number(state?.day) || 1))),
    }
    : null;
  return {
    version: FARM_EXPANSION_VERSION,
    introQueued: Boolean(value.introQueued),
    completed,
    project,
    greenhouseSoil: soil,
    stats: {
      projectsCompleted: clamp(Math.floor(Number(value.stats?.projectsCompleted) || completed.length), 0, FARM_PROJECTS.length),
      greenhouseHarvests: clamp(Math.floor(Number(value.stats?.greenhouseHarvests) || 0), 0, 999999999),
      greenhouseCropsPlanted: clamp(Math.floor(Number(value.stats?.greenhouseCropsPlanted) || 0), 0, 999999999),
      autoWateredTiles: clamp(Math.floor(Number(value.stats?.autoWateredTiles) || 0), 0, 999999999),
    },
  };
}

export function projectAvailable(expansion, projectId) {
  const project = FARM_PROJECT_MAP[projectId];
  if (!project || expansion.completed.includes(projectId) || expansion.project) return false;
  return project.requires.every((id) => expansion.completed.includes(id));
}

export function outdoorIrrigationCapacity(expansion) {
  if (expansion?.completed?.includes("irrigation")) return 48;
  if (expansion?.completed?.includes("southField")) return 16;
  return 0;
}

export function greenhouseGrowthMultiplier(expansion) {
  return expansion?.completed?.includes("greenhouseDeluxe") ? 1.25 : 1;
}

export function farmBuildingAtTile(x, y, expansion, includeConstruction = true) {
  const active = new Set(expansion?.completed || []);
  const constructionId = includeConstruction ? expansion?.project?.id : null;
  const candidates = [];
  if (active.has("workshop") || constructionId === "workshop") candidates.push(FARM_BUILDINGS.workshop);
  if (active.has("greenhouse") || active.has("greenhouseDeluxe") || constructionId === "greenhouse") candidates.push(FARM_BUILDINGS.greenhouse);
  return candidates.find((building) => x >= building.x && x < building.x + building.w && y >= building.y && y < building.y + building.h) || null;
}

export function farmPathTile(x, y, expansion) {
  if (!expansion?.completed?.includes("southField") && !expansion?.project) return false;
  return FARM_PATH_RECTS.some(([px, py, w, h]) => x >= px && x < px + w && y >= py && y < py + h);
}

export function projectCostText(project) {
  const materials = Object.entries(project?.cost || {}).map(([id, amount]) => `${ITEMS[id]?.icon || "📦"} ${amount} ${ITEMS[id]?.name || id}`);
  return [`${project?.coins || 0} coins`, ...materials].join(" · ");
}

export function validateFarmsteadExpansionData() {
  registerFarmsteadExpansion();
  if (FARM_PROJECTS.length !== 5 || GREENHOUSE_BASIC_SLOTS.length !== 24 || GREENHOUSE_DELUXE_SLOTS.length !== 24) return false;
  if (new Set(FARM_PROJECT_ORDER).size !== FARM_PROJECT_ORDER.length) return false;
  if (FARM_PROJECTS.some((project) => !project.name || project.days < 1 || project.requires.some((id) => !FARM_PROJECT_MAP[id]))) return false;
  if (FARM_PROJECTS.some((project) => Object.keys(project.cost).some((id) => !ITEMS[id]))) return false;
  if (GREENHOUSE_BASIC_SLOTS.some((slot) => GREENHOUSE_DELUXE_SLOTS.some((other) => other.x === slot.x && other.y === slot.y))) return false;
  return Boolean(INTERIOR_MAPS.greenhouse && CROPS.turnip && FARM_BUILDINGS.greenhouse.door.y < 64);
}

registerFarmsteadExpansion();
