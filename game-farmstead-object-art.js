import {
  TILE, BUILDINGS, regionAt,
} from "./game-shared.js";
import { AUTHORED_STRUCTURES } from "./world-polish-data.js";
import {
  FARMSTEAD_OBJECT_ATLAS_URI, FARMSTEAD_OBJECT_SPRITES,
} from "./farmstead-object-art-data.js";

const FARM_REGION_ID = "farm";
const TREE_TYPES = new Set(["tree", "fruitTree"]);
const ROCK_TYPES = new Set(["rock"]);

function tileVisible(item, bounds, pad = 2) {
  return item.x + (item.w || 1) >= bounds.startX - pad
    && item.x <= bounds.endX + pad
    && item.y + (item.h || 1) >= bounds.startY - pad
    && item.y <= bounds.endY + pad;
}

function drawSprite(ctx, image, sprite, dx, dy, dw = sprite.width, dh = sprite.height) {
  ctx.drawImage(
    image,
    sprite.x, sprite.y, sprite.width, sprite.height,
    dx, dy, dw, dh,
  );
}

function createAtlasState(game) {
  if (game.farmsteadObjectAtlas) return game.farmsteadObjectAtlas;
  const state = { image: null, ready: false, failed: false };
  game.farmsteadObjectAtlas = state;
  if (typeof Image === "undefined") return state;

  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    state.ready = image.naturalWidth > 0;
    state.failed = !state.ready;
    game.activeChunkSignature = "";
  };
  image.onerror = () => {
    state.ready = false;
    state.failed = true;
  };
  image.src = FARMSTEAD_OBJECT_ATLAS_URI;
  state.image = image;
  if (image.complete && image.naturalWidth > 0) state.ready = true;
  return state;
}

function temporarilyRemove(array, predicate, action) {
  const removed = [];
  for (let index = array.length - 1; index >= 0; index -= 1) {
    if (!predicate(array[index])) continue;
    removed.push({ index, value: array[index] });
    array.splice(index, 1);
  }

  try {
    return action(removed.map((entry) => entry.value));
  } finally {
    removed.sort((a, b) => a.index - b.index);
    for (const entry of removed) array.splice(entry.index, 0, entry.value);
  }
}

export function isFarmsteadObjectResource(resource) {
  return Boolean(resource
    && regionAt(resource.x, resource.y).id === FARM_REGION_ID
    && (TREE_TYPES.has(resource.type) || ROCK_TYPES.has(resource.type)));
}

export function isFarmsteadFence(structure) {
  return Boolean(structure
    && structure.type?.startsWith("fence")
    && regionAt(structure.x, structure.y).id === FARM_REGION_ID);
}

export function farmsteadObjectDestination(kind, x, y) {
  if (kind === "tree") return { x: x * TILE - TILE * 1.5, y: y * TILE - TILE * 3.35, width: TILE * 3, height: TILE * 4 };
  if (kind === "rock") return { x: x * TILE - TILE * .78, y: y * TILE - TILE * .82, width: TILE * 1.55, height: TILE * 1.55 };
  if (kind === "crate") return { x: x * TILE - TILE * .5, y: y * TILE - TILE * .5, width: TILE, height: TILE };
  return null;
}

function drawFarmResource(game, ctx, resource, image) {
  const isTree = TREE_TYPES.has(resource.type);
  const sprite = FARMSTEAD_OBJECT_SPRITES[isTree ? "tree" : "rock"];
  const destination = farmsteadObjectDestination(isTree ? "tree" : "rock", resource.x, resource.y);
  const hitRatio = Math.max(0, Math.min(1, Number(resource.hp) / Math.max(1, Number(resource.maxHp) || Number(resource.hp) || 1)));

  ctx.save();
  if (hitRatio < 1) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const shake = Math.sin(now / 45 + Number(resource.id || 0)) * 1.6;
    destination.x += shake;
    ctx.globalAlpha = .78 + hitRatio * .22;
  }
  drawSprite(ctx, image, sprite, destination.x, destination.y, destination.width, destination.height);
  ctx.restore();
}

function drawFarmCrate(ctx, decor, image) {
  const sprite = FARMSTEAD_OBJECT_SPRITES.crate;
  const destination = farmsteadObjectDestination("crate", decor.x + .5, decor.y + .5);
  drawSprite(ctx, image, sprite, destination.x, destination.y, destination.width, destination.height);
}

function drawFarmFence(ctx, structure, image) {
  const horizontal = structure.type === "fenceH";
  const sprite = FARMSTEAD_OBJECT_SPRITES[horizontal ? "fenceH" : "fenceV"];
  const total = horizontal ? structure.w : structure.h;
  let offset = 0;

  while (offset < total) {
    const remaining = total - offset;
    const segmentTiles = Math.min(2, remaining);
    const sourceWidth = horizontal ? sprite.width * (segmentTiles / 2) : sprite.width;
    const sourceHeight = horizontal ? sprite.height : sprite.height * (segmentTiles / 2);
    const destinationX = (structure.x + (horizontal ? offset : 0)) * TILE;
    const destinationY = (structure.y + (horizontal ? 0 : offset)) * TILE;
    const destinationWidth = horizontal ? segmentTiles * TILE : TILE;
    const destinationHeight = horizontal ? TILE : segmentTiles * TILE;

    ctx.drawImage(
      image,
      sprite.x, sprite.y, sourceWidth, sourceHeight,
      destinationX, destinationY, destinationWidth, destinationHeight,
    );
    offset += segmentTiles;
  }
}

function drawFarmhouse(ctx, building, image) {
  const sprite = FARMSTEAD_OBJECT_SPRITES.farmhouse;
  drawSprite(
    ctx,
    image,
    sprite,
    building.x * TILE,
    building.y * TILE,
    building.w * TILE,
    building.h * TILE,
  );
}

export function installFarmsteadObjectArt(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    enterGame: proto.enterGame,
    drawResource: proto.drawResource,
    drawWorldDecorations: proto.drawWorldDecorations,
    drawAuthoredStructures: proto.drawAuthoredStructures,
    drawBuildings: proto.drawBuildings,
  };

  proto.ensureFarmsteadObjectAtlas = function ensureFarmsteadObjectAtlas() {
    return createAtlasState(this);
  };

  proto.isFarmsteadObjectArtReady = function isFarmsteadObjectArtReady() {
    const atlas = this.ensureFarmsteadObjectAtlas();
    return Boolean(atlas.ready && atlas.image);
  };

  proto.enterGame = function enterGameFarmsteadObjectArt() {
    this.ensureFarmsteadObjectAtlas();
    return original.enterGame.call(this);
  };

  proto.drawResource = function drawResourceFarmsteadObjectArt(ctx, resource) {
    const atlas = this.ensureFarmsteadObjectAtlas();
    if (!atlas.ready || !atlas.image || !isFarmsteadObjectResource(resource)) {
      return original.drawResource.call(this, ctx, resource);
    }
    drawFarmResource(this, ctx, resource, atlas.image);
  };

  if (original.drawWorldDecorations) {
    proto.drawWorldDecorations = function drawWorldDecorationsFarmsteadObjectArt(ctx, decorations, solidLayer) {
      const atlas = this.ensureFarmsteadObjectAtlas();
      if (!atlas.ready || !atlas.image) return original.drawWorldDecorations.call(this, ctx, decorations, solidLayer);

      const artCrates = decorations.filter((decor) => decor.type === "crate" && regionAt(decor.x, decor.y).id === FARM_REGION_ID);
      const remaining = decorations.filter((decor) => !artCrates.includes(decor));
      original.drawWorldDecorations.call(this, ctx, remaining, solidLayer);
      for (const crate of artCrates) drawFarmCrate(ctx, crate, atlas.image);
    };
  }

  if (original.drawAuthoredStructures) {
    proto.drawAuthoredStructures = function drawAuthoredStructuresFarmsteadObjectArt(ctx, bounds) {
      const atlas = this.ensureFarmsteadObjectAtlas();
      if (!atlas.ready || !atlas.image) return original.drawAuthoredStructures.call(this, ctx, bounds);

      temporarilyRemove(AUTHORED_STRUCTURES, isFarmsteadFence, (fences) => {
        original.drawAuthoredStructures.call(this, ctx, bounds);
        for (const fence of fences) {
          if (!tileVisible(fence, bounds, 2)) continue;
          drawFarmFence(ctx, fence, atlas.image);
        }
      });
    };
  }

  proto.drawBuildings = function drawBuildingsFarmsteadObjectArt(ctx, bounds) {
    const atlas = this.ensureFarmsteadObjectAtlas();
    if (!atlas.ready || !atlas.image) return original.drawBuildings.call(this, ctx, bounds);

    temporarilyRemove(BUILDINGS, (building) => building.id === "farmhouse", (removed) => {
      original.drawBuildings.call(this, ctx, bounds);
      const farmhouse = removed[0];
      if (farmhouse && tileVisible(farmhouse, bounds, 2)) drawFarmhouse(ctx, farmhouse, atlas.image);
    });
  };
}
