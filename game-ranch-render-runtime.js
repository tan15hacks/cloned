import { TILE } from "./game-shared.js";
import { HOUSING_UPGRADES, PASTURE, COOP_SITE, siloCapacity } from "./ranch-data.js";

export function installRanchingRenderRuntime(GameClass) {
  const proto = GameClass.prototype;
  const originalDrawTerrainTile = proto.drawTerrainTile;
  const originalDrawBuildings = proto.drawBuildings;
  const originalDrawNPCs = proto.drawNPCs;
  const originalDrawRanchAnimals = proto.drawRanchAnimals;

  proto.drawRanchPasture = function skipPreTerrainRanchPass() {};

  proto.drawTerrainTile = function drawTerrainTileWithVisiblePasture(ctx, x, y) {
    originalDrawTerrainTile.call(this, ctx, x, y);
    if (!this.state?.ranch || x < PASTURE.x || x >= PASTURE.x + PASTURE.w || y < PASTURE.y || y >= PASTURE.y + PASTURE.h) return;
    ctx.fillStyle = "rgba(45,91,55,.09)";
    ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
    const patch = this.state.ranch.grass.find((entry) => entry.growth > .05 && Math.floor(entry.x) === x && Math.floor(entry.y) === y);
    if (!patch) return;
    const px = patch.x * TILE; const py = patch.y * TILE;
    ctx.strokeStyle = patch.growth > .75 ? "#2f7b45" : "#4f8d54";
    ctx.lineWidth = 2 + patch.growth;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath(); ctx.moveTo(px + i * 3, py + 8); ctx.lineTo(px + i * 4, py + 8 - 13 * patch.growth - Math.abs(i)); ctx.stroke();
    }
  };

  proto.drawBuildings = function drawBuildingsWithRanchStructures(ctx, bounds) {
    originalDrawBuildings.call(this, ctx, bounds);
    if (!this.state?.ranch) return;
    if (!(bounds.endX < PASTURE.x || bounds.startX > PASTURE.x + PASTURE.w || bounds.endY < PASTURE.y || bounds.startY > PASTURE.y + PASTURE.h)) {
      const left = PASTURE.x * TILE; const right = (PASTURE.x + PASTURE.w) * TILE;
      const top = PASTURE.y * TILE; const bottom = (PASTURE.y + PASTURE.h) * TILE;
      ctx.save(); ctx.strokeStyle = "#72553b"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(right, top); ctx.moveTo(left, bottom); ctx.lineTo(right, bottom);
      ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.moveTo(right, top); ctx.lineTo(right, PASTURE.y * TILE + 12 * TILE); ctx.moveTo(right, PASTURE.y * TILE + 15 * TILE); ctx.lineTo(right, bottom); ctx.stroke();
      ctx.restore();
    }
    const coopLevel = this.state.ranch.buildings.coop.level;
    if (coopLevel > 0 && !(COOP_SITE.x + COOP_SITE.w < bounds.startX || COOP_SITE.x > bounds.endX || COOP_SITE.y + COOP_SITE.h < bounds.startY || COOP_SITE.y > bounds.endY)) {
      const x = COOP_SITE.x * TILE; const y = COOP_SITE.y * TILE;
      ctx.fillStyle = coopLevel >= 3 ? "#ead9a7" : "#d7b074";
      ctx.fillRect(x, y + TILE, COOP_SITE.w * TILE, (COOP_SITE.h - 1) * TILE);
      ctx.fillStyle = coopLevel >= 2 ? "#5f754d" : "#8a5143";
      ctx.beginPath(); ctx.moveTo(x - 8, y + TILE * 1.2); ctx.lineTo(x + COOP_SITE.w * TILE / 2, y - 15); ctx.lineTo(x + COOP_SITE.w * TILE + 8, y + TILE * 1.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#563c32"; ctx.fillRect(COOP_SITE.door.x * TILE - 11, COOP_SITE.door.y * TILE - 28, 22, 28);
      ctx.fillStyle = "#fff1c8"; ctx.font = "bold 11px Trebuchet MS"; ctx.textAlign = "center"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3;
      const label = HOUSING_UPGRADES.coop[coopLevel].name; ctx.strokeText(label, x + COOP_SITE.w * TILE / 2, y + 49); ctx.fillText(label, x + COOP_SITE.w * TILE / 2, y + 49);
    }
    if (this.state.ranch.buildings.silo.level > 0 && bounds.startX <= 6 && bounds.endX >= 3 && bounds.startY <= 19 && bounds.endY >= 14) {
      const x = 4.5 * TILE; const y = 16.5 * TILE;
      ctx.fillStyle = "#a85a47"; ctx.fillRect(x - 18, y - 35, 36, 52);
      ctx.fillStyle = "#6b463a"; ctx.beginPath(); ctx.arc(x, y - 35, 18, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#fff1c8"; ctx.font = "bold 9px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(`${this.state.ranch.hay}/${siloCapacity(this.state.ranch)}`, x, y - 7);
    }
  };

  proto.drawRanchAnimals = function drawRanchAnimalsOnlyInEntityPass(ctx) {
    if (this.ranchEntityPass) originalDrawRanchAnimals.call(this, ctx);
  };

  proto.drawNPCs = function drawNPCsWithRanchAnimals(ctx, bounds) {
    originalDrawNPCs.call(this, ctx, bounds);
    this.ranchEntityPass = true;
    try { this.drawRanchAnimals(ctx); } finally { this.ranchEntityPass = false; }
  };
}
