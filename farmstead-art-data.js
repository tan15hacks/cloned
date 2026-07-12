import { FARMSTEAD_ART_ATLAS_CHUNK_0 } from "./farmstead-art-atlas-chunk-0.js";
import { FARMSTEAD_ART_ATLAS_CHUNK_1 } from "./farmstead-art-atlas-chunk-1.js";
import { FARMSTEAD_ART_ATLAS_CHUNK_2 } from "./farmstead-art-atlas-chunk-2.js";
import { FARMSTEAD_ART_ATLAS_CHUNK_3 } from "./farmstead-art-atlas-chunk-3.js";
import { FARMSTEAD_ART_ATLAS_CHUNK_4 } from "./farmstead-art-atlas-chunk-4.js";

export const FARMSTEAD_ART_TILE = 32;
export const FARMSTEAD_ART_ATLAS_WIDTH = 512;
export const FARMSTEAD_ART_ATLAS_HEIGHT = 384;
export const FARMSTEAD_ART_MASKS = Object.freeze([0, 1, 2, 4, 8, 3, 19, 5, 6, 38, 9, 137, 10, 12, 76, 7, 23, 39, 55, 11, 27, 139, 155, 13, 77, 141, 205, 14, 46, 78, 110, 15, 31, 47, 79, 143, 63, 95, 111, 159, 175, 207, 127, 191, 223, 239, 255]);
export const FARMSTEAD_ART_MASK_INDEX = Object.freeze(Object.fromEntries(FARMSTEAD_ART_MASKS.map((mask, index) => [mask, index])));
export const FARMSTEAD_ART_BITS = Object.freeze({ N: 1, E: 2, S: 4, W: 8, NE: 16, SE: 32, SW: 64, NW: 128 });
export const FARMSTEAD_ART_SETS = Object.freeze({
  path: Object.freeze({ x: 0, y: 0 }),
  soilDry: Object.freeze({ x: 256, y: 0 }),
  soilWatered: Object.freeze({ x: 0, y: 192 }),
  grass: Object.freeze([
    Object.freeze({ x: 256, y: 192 }),
    Object.freeze({ x: 288, y: 192 }),
    Object.freeze({ x: 320, y: 192 }),
    Object.freeze({ x: 352, y: 192 }),
  ]),
  grassFlowers: Object.freeze({ x: 384, y: 192 }),
  flowerOverlay: Object.freeze({ x: 416, y: 192 }),
});

export const FARMSTEAD_ART_ATLAS_BASE64 = [
  FARMSTEAD_ART_ATLAS_CHUNK_0,
  FARMSTEAD_ART_ATLAS_CHUNK_1,
  FARMSTEAD_ART_ATLAS_CHUNK_2,
  FARMSTEAD_ART_ATLAS_CHUNK_3,
  FARMSTEAD_ART_ATLAS_CHUNK_4,
].join("");

export const FARMSTEAD_ART_ATLAS_URI = `data:image/png;base64,${FARMSTEAD_ART_ATLAS_BASE64}`;
