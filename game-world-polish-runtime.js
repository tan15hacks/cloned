import {
  WORLD_W,
  WORLD_H,
  isFarmableTile,
  isPathTile,
} from "./game-shared.js";

function nearestOpenTile(game, startX, startY, maxRadius = 12) {
  const candidates = [];
  const addCandidate = (x, y) => {
    if (x < 1 || y < 1 || x >= WORLD_W - 1 || y >= WORLD_H - 1) return;
    const px = x + .5;
    const py = y + .5;
    if (game.collides(px, py, .28)) return;
    candidates.push({ x: px, y: py, path: isPathTile(x, y) });
  };

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    candidates.length = 0;
    if (radius === 0) addCandidate(startX, startY);
    else {
      for (let offset = -radius; offset <= radius; offset += 1) {
        addCandidate(startX + offset, startY - radius);
        addCandidate(startX + offset, startY + radius);
        if (Math.abs(offset) !== radius) {
          addCandidate(startX - radius, startY + offset);
          addCandidate(startX + radius, startY + offset);
        }
      }
    }
    if (candidates.length) return candidates.find((candidate) => candidate.path) || candidates[0];
  }
  return { x: 11.5, y: 15.5, path: true };
}

export function installWorldPolishRuntime(GameClass) {
  const proto = GameClass.prototype;
  const originalEnterGame = proto.enterGame;

  proto.enterGame = function enterGameWithWorldPolishSafety() {
    originalEnterGame.call(this);
    if (!this.state || this.state.mode !== "world") return;

    let cleaned = 0;
    const validSoil = {};
    for (const [key, soil] of Object.entries(this.state.soil || {})) {
      const [x, y] = key.split(",").map(Number);
      if (Number.isInteger(x) && Number.isInteger(y) && isFarmableTile(x, y)) validSoil[key] = soil;
      else cleaned += 1;
    }
    this.state.soil = validSoil;

    const originalPlacedCount = Array.isArray(this.state.placed) ? this.state.placed.length : 0;
    this.state.placed = (this.state.placed || []).filter((placed) => isFarmableTile(Math.floor(placed.x), Math.floor(placed.y)));
    cleaned += originalPlacedCount - this.state.placed.length;

    let moved = false;
    const player = this.state.player;
    if (this.collides(player.x, player.y, .28)) {
      const destination = nearestOpenTile(this, Math.floor(player.x), Math.floor(player.y));
      player.x = destination.x;
      player.y = destination.y;
      moved = true;
    }

    if (moved || cleaned > 0) {
      this.rebuildResourceMap();
      this.saveGame(true);
      if (moved) this.toast("Your saved position was moved to the nearest clear tile after the world-polish update.");
      else this.toast("Old farm objects on newly aligned roads were safely cleared.");
    }
  };
}
