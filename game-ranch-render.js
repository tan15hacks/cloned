import { TILE, ITEMS, regionAt } from "./game-shared.js";
import { ANIMAL_SPECIES, HOUSING_UPGRADES, PASTURE, COOP_SITE, siloCapacity } from "./ranch-data.js";

export function installRanchingRender(GameClass) {
  const proto = GameClass.prototype;
  const originalDrawWorld = proto.drawWorld;
  proto.drawWorld = function drawWorldRanching(ctx) {
    this.drawRanchPasture(ctx);
    originalDrawWorld.call(this, ctx);
    this.drawRanchAnimals(ctx);
  };

  proto.drawRanchPasture = function drawRanchPasture(ctx) {
    if (!this.state?.ranch) return;
    const bounds = this.visibleBounds(256, 224);
    if (bounds.endX < PASTURE.x || bounds.startX > PASTURE.x + PASTURE.w || bounds.endY < PASTURE.y || bounds.startY > PASTURE.y + PASTURE.h) return;
    ctx.save();
    ctx.fillStyle = "rgba(45,91,55,.10)";
    ctx.fillRect(PASTURE.x * TILE, PASTURE.y * TILE, PASTURE.w * TILE, PASTURE.h * TILE);
    for (const patch of this.state.ranch.grass) {
      if (patch.growth <= .05 || patch.x < bounds.startX || patch.x > bounds.endX || patch.y < bounds.startY || patch.y > bounds.endY) continue;
      const x = patch.x * TILE; const y = patch.y * TILE;
      ctx.strokeStyle = patch.growth > .75 ? "#2f7b45" : "#4f8d54";
      ctx.lineWidth = 2 + patch.growth;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath(); ctx.moveTo(x + i * 3, y + 8); ctx.lineTo(x + i * 4, y + 8 - 13 * patch.growth - Math.abs(i)); ctx.stroke();
      }
    }
    const coopLevel = this.state.ranch.buildings.coop.level;
    if (coopLevel > 0) {
      const x = COOP_SITE.x * TILE; const y = COOP_SITE.y * TILE;
      ctx.fillStyle = coopLevel >= 3 ? "#ead9a7" : "#d7b074";
      ctx.fillRect(x, y + TILE, COOP_SITE.w * TILE, (COOP_SITE.h - 1) * TILE);
      ctx.fillStyle = coopLevel >= 2 ? "#5f754d" : "#8a5143";
      ctx.beginPath(); ctx.moveTo(x - 8, y + TILE * 1.2); ctx.lineTo(x + COOP_SITE.w * TILE / 2, y - 15); ctx.lineTo(x + COOP_SITE.w * TILE + 8, y + TILE * 1.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#563c32"; ctx.fillRect(COOP_SITE.door.x * TILE - 11, COOP_SITE.door.y * TILE - 28, 22, 28);
      ctx.fillStyle = "#fff1c8"; ctx.font = "bold 11px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(HOUSING_UPGRADES.coop[coopLevel].name, x + COOP_SITE.w * TILE / 2, y + 49);
    }
    if (this.state.ranch.buildings.silo.level > 0) {
      const x = 4.5 * TILE; const y = 16.5 * TILE;
      ctx.fillStyle = "#a85a47"; ctx.fillRect(x - 18, y - 35, 36, 52);
      ctx.fillStyle = "#6b463a"; ctx.beginPath(); ctx.arc(x, y - 35, 18, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#fff1c8"; ctx.font = "bold 9px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(`${this.state.ranch.hay}/${siloCapacity(this.state.ranch)}`, x, y - 7);
    }
    ctx.restore();
  };

  proto.drawRanchAnimals = function drawRanchAnimals(ctx) {
    if (!this.state?.ranch || regionAt(this.state.player.x, this.state.player.y).id !== "farm") return;
    const bounds = this.visibleBounds(256, 224);
    for (const animal of this.state.ranch.animals) {
      if (!animal.outside || animal.x < bounds.startX - 1 || animal.x > bounds.endX + 1 || animal.y < bounds.startY - 1 || animal.y > bounds.endY + 1) continue;
      this.drawRanchAnimal(ctx, animal);
    }
  };

  proto.drawRanchAnimal = function drawRanchAnimal(ctx, animal) {
    const species = ANIMAL_SPECIES[animal.species];
    if (!species) return;
    const x = animal.x * TILE; const bounce = Math.sin((animal.walkTime || 0)) * 1.3; const y = animal.y * TILE + bounce;
    const scale = ["cow", "goat", "sheep", "pig"].includes(animal.species) ? 1.08 : .82;
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(16,36,29,.22)"; ctx.beginPath(); ctx.ellipse(0, 11, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = animal.colorVariant === "rare" ? "#d8b7ef" : species.color;
    if (animal.species === "chicken" || animal.species === "duck") {
      ctx.beginPath(); ctx.ellipse(0, 1, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(7, -7, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = animal.species === "duck" ? "#d89d45" : "#d95e52"; ctx.beginPath(); ctx.moveTo(13, -7); ctx.lineTo(20, -4); ctx.lineTo(13, -1); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(0, 1, 16, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(12, -5, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
      if (animal.species === "cow") { ctx.fillStyle = "#55483f"; ctx.beginPath(); ctx.arc(-5, -1, 4, 0, Math.PI * 2); ctx.arc(5, 4, 3, 0, Math.PI * 2); ctx.fill(); }
      if (animal.species === "sheep") { ctx.strokeStyle = "#d6d2c7"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-7, -1, 8, 0, Math.PI * 2); ctx.stroke(); }
      if (animal.species === "goat") { ctx.strokeStyle = "#7c694f"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(13, -11); ctx.lineTo(17, -18); ctx.moveTo(8, -11); ctx.lineTo(7, -18); ctx.stroke(); }
      if (animal.species === "pig") { ctx.fillStyle = "#bb7778"; ctx.beginPath(); ctx.arc(20, -3, 4, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.fillStyle = "#10241d"; ctx.fillRect(13, -7, 2, 2);
    ctx.restore();
    ctx.save(); ctx.font = "bold 10px Trebuchet MS"; ctx.textAlign = "center"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3; ctx.fillStyle = "#fff1c8";
    ctx.strokeText(animal.name, x, y - 27); ctx.fillText(animal.name, x, y - 27);
    const indicator = animal.sick ? "✚" : animal.productReady ? ITEMS[animal.productReady.id]?.icon || "📦" : animal.pettedDay === this.state.day ? "♥" : !animal.fedToday ? "…" : "";
    if (indicator) { ctx.font = "15px serif"; ctx.fillText(indicator, x, y - 40); }
    ctx.restore();
  };
}
