import { BUILDINGS, regionAt } from "./game-shared.js";
import { AUTHORED_STRUCTURES } from "./world-polish-data.js";
import {
  farmsteadObjectDestination,
  installFarmsteadObjectArt,
  isFarmsteadFence,
  isFarmsteadObjectResource,
} from "./game-farmstead-object-art.js";

const FARM_REGION_ID = "farm";

export {
  farmsteadObjectDestination,
  isFarmsteadFence,
  isFarmsteadObjectResource,
};

export function farmsteadPropArtTargets() {
  return {
    farmhouse: BUILDINGS.find((entry) => entry.id === "farmhouse") || null,
    fences: AUTHORED_STRUCTURES.filter((entry) => entry.type?.startsWith("fence") && regionAt(entry.x, entry.y).id === FARM_REGION_ID),
  };
}

export function installFarmsteadPropArt(GameClass) {
  installFarmsteadObjectArt(GameClass);
}
