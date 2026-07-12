import { CROPS, ITEMS, clamp } from "./game-shared.js";
import {
  FARM_PROJECT_ORDER, FARM_PROJECT_MAP, FARM_BUILDINGS,
  createFarmExpansionState, greenhouseSlotSet,
} from "./farmstead-expansion-data.js";
import { clearFarmsteadExpansionSpace } from "./game-farmstead-expansion.js";

const MAX_COUNTER = 999999999;

function finiteInt(value, fallback = 0) {
  const numeric = Number(value);
  return Math.floor(Number.isFinite(numeric) ? numeric : fallback);
}

function normalizeCompleted(raw) {
  const requested = new Set(Array.isArray(raw) ? raw.filter((id) => FARM_PROJECT_MAP[id]) : []);
  const completed = [];
  for (const id of FARM_PROJECT_ORDER) {
    if (!requested.has(id)) break;
    completed.push(id);
  }
  return completed;
}

function playerInsideBuilding(player, building) {
  return Number(player?.x) >= building.x && Number(player?.x) < building.x + building.w
    && Number(player?.y) >= building.y && Number(player?.y) < building.y + building.h;
}

function normalizeGreenhouseSoil(expansion) {
  if (!expansion.completed.includes("greenhouse")) {
    expansion.greenhouseSoil = {};
    return;
  }
  const slots = greenhouseSlotSet(expansion);
  const result = {};
  for (const [key, raw] of Object.entries(expansion.greenhouseSoil || {})) {
    if (!slots.has(key) || !raw || typeof raw !== "object") continue;
    const cropType = CROPS[raw.crop?.type] ? raw.crop.type : null;
    const soil = {
      tilled: Boolean(raw.tilled || cropType),
      watered: expansion.completed.includes("irrigation") ? true : Boolean(raw.watered),
      crop: null,
    };
    if (cropType) soil.crop = {
      type: cropType,
      growth: clamp(Number.isFinite(Number(raw.crop.growth)) ? Number(raw.crop.growth) : 0, 0, CROPS[cropType].days),
      plantedDay: clamp(finiteInt(raw.crop.plantedDay, 1), 1, 999999999),
      greenhouse: true,
    };
    if (soil.tilled) result[key] = soil;
  }
  expansion.greenhouseSoil = result;
}

export function hardenFarmsteadExpansionState(state) {
  if (!state || typeof state !== "object") return state;
  const expansion = createFarmExpansionState(state.farmExpansion, state);
  expansion.completed = normalizeCompleted(expansion.completed);
  if (expansion.project) {
    const project = FARM_PROJECT_MAP[expansion.project.id];
    const dependenciesReady = project && project.requires.every((id) => expansion.completed.includes(id));
    if (!project || !dependenciesReady || expansion.completed.includes(project.id)) expansion.project = null;
    else {
      expansion.project.daysRemaining = clamp(finiteInt(expansion.project.daysRemaining, project.days), 1, project.days);
      expansion.project.startedDay = clamp(finiteInt(expansion.project.startedDay, state.day || 1), 1, Math.max(1, finiteInt(state.day, 1)));
    }
  }
  normalizeGreenhouseSoil(expansion);
  expansion.stats.projectsCompleted = expansion.completed.length;
  for (const key of ["greenhouseHarvests", "greenhouseCropsPlanted", "autoWateredTiles"]) expansion.stats[key] = clamp(finiteInt(expansion.stats[key]), 0, MAX_COUNTER);
  state.farmExpansion = expansion;
  clearFarmsteadExpansionSpace(state);
  return state;
}

function rescueFarmsteadPlayer(game) {
  if (game.state?.mode !== "world") return false;
  const expansion = game.state.farmExpansion;
  const player = game.state.player;
  let target = null;
  if ((expansion.completed.includes("workshop") || expansion.project?.id === "workshop") && playerInsideBuilding(player, FARM_BUILDINGS.workshop)) target = { x: 24.5, y: 62.5 };
  if ((expansion.completed.includes("greenhouse") || expansion.project?.id === "greenhouse") && playerInsideBuilding(player, FARM_BUILDINGS.greenhouse)) target = { x: 41.5, y: 62.5 };
  if (!target && Math.hypot(Number(player.x) - 34.5, Number(player.y) - 14.5) < .55) target = { x: 34.5, y: 16.5 };
  if (!target) return false;
  player.x = target.x; player.y = target.y;
  return true;
}

export function installFarmsteadExpansionRuntime(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    showFarmsteadPlan: proto.showFarmsteadPlan,
    showFarmsteadReport: proto.showFarmsteadReport,
    startFarmProject: proto.startFarmProject,
    openGreenhouseControls: proto.openGreenhouseControls,
  };

  proto.migrateState = function migrateStateFarmsteadRuntime(data) {
    return hardenFarmsteadExpansionState(original.migrateState.call(this, data));
  };

  proto.enterGame = function enterGameFarmsteadRuntime() {
    hardenFarmsteadExpansionState(this.state);
    const result = original.enterGame.call(this);
    hardenFarmsteadExpansionState(this.state);
    const rescued = rescueFarmsteadPlayer(this);
    const removed = clearFarmsteadExpansionSpace(this.state);
    if (rescued || removed > 0) {
      this.rebuildResourceMap?.();
      this.refreshActiveWorldChunks?.(true);
      this.saveGame?.(true);
      if (rescued) this.toast?.("The Farmstead expansion moved you to a clear path.");
    }
    return result;
  };

  proto.nextDay = function nextDayFarmsteadRuntime(passedOut) {
    hardenFarmsteadExpansionState(this.state);
    const result = original.nextDay.call(this, passedOut);
    hardenFarmsteadExpansionState(this.state);
    const rescued = rescueFarmsteadPlayer(this);
    const removed = clearFarmsteadExpansionSpace(this.state);
    if (rescued || removed > 0) {
      this.rebuildResourceMap?.();
      this.refreshActiveWorldChunks?.(true);
      this.saveGame?.(true);
    }
    return result;
  };

  for (const name of ["showFarmsteadPlan", "showFarmsteadReport", "startFarmProject", "openGreenhouseControls"]) {
    if (!original[name]) continue;
    proto[name] = function hardenedFarmsteadAction(...args) {
      hardenFarmsteadExpansionState(this.state);
      return original[name].apply(this, args);
    };
  }

  proto.farmsteadMaterialCount = function farmsteadMaterialCount(id) {
    if (!ITEMS[id]) return 0;
    let total = Math.max(0, finiteInt(this.state.inventory?.[id]));
    for (const chest of Object.values(this.state.storage?.chests || {})) total += Math.max(0, finiteInt(chest.items?.[id]));
    return total;
  };
}
