import { FARMSTEAD_OBJECT_ATLAS_CHUNK_0 } from "./farmstead-object-art-atlas-chunk-0.js";
import { FARMSTEAD_OBJECT_ATLAS_CHUNK_1 } from "./farmstead-object-art-atlas-chunk-1.js";
import { FARMSTEAD_OBJECT_ATLAS_CHUNK_2 } from "./farmstead-object-art-atlas-chunk-2.js";

export const FARMSTEAD_OBJECT_ATLAS_WIDTH = 448;
export const FARMSTEAD_OBJECT_ATLAS_HEIGHT = 232;
export const FARMSTEAD_OBJECT_SPRITES = Object.freeze({
  farmhouse: Object.freeze({ x: 0, y: 0, width: 320, height: 232 }),
  tree: Object.freeze({ x: 320, y: 0, width: 80, height: 112 }),
  rock: Object.freeze({ x: 400, y: 0, width: 48, height: 48 }),
  crate: Object.freeze({ x: 400, y: 48, width: 28, height: 28 }),
  fenceH: Object.freeze({ x: 320, y: 112, width: 56, height: 28 }),
  fenceV: Object.freeze({ x: 376, y: 112, width: 28, height: 56 }),
});
export const FARMSTEAD_OBJECT_ATLAS_URI = "data:image/png;base64," + FARMSTEAD_OBJECT_ATLAS_CHUNK_0 + FARMSTEAD_OBJECT_ATLAS_CHUNK_1 + FARMSTEAD_OBJECT_ATLAS_CHUNK_2;
