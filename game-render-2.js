import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock, $, clamp, keyOf, distance, randomChoice, safeParse, formatTime, randomInt, GUILD_RANKS, FORAGE_TYPES, AXE_TYPES, PICK_TYPES, forecastWeather } from "./game-shared.js";

export const game_render_2 = {
drawResources(ctx, bounds) {
    for (const resource of this.state.resources) {
      if (resource.hp <= 0 || resource.x < bounds.startX - 1 || resource.x > bounds.endX + 1 || resource.y < bounds.startY - 1 || resource.y > bounds.endY + 1) continue;
      this.drawResource(ctx, resource);
    }
  },

drawResource(ctx, resource) {
    const x = resource.x * TILE, y = resource.y * TILE; const type = resource.type;
    if (["tree", "darkTree", "mangrove", "palm", "fruitTree", "mistTree"].includes(type)) {
      const trunk = type === "mangrove" ? "#5c4533" : "#5f3c2a"; const crown = type === "darkTree" ? "#173126" : type === "mangrove" ? "#52673e" : type === "palm" ? "#3e8551" : type === "mistTree" ? "#6f8d82" : "#245c3a";
      ctx.fillStyle = trunk; ctx.fillRect(x - 5, y - 2, 10, 22); ctx.fillStyle = crown; ctx.beginPath(); ctx.arc(x, y - 12, type === "palm" ? 16 : 20, 0, Math.PI * 2); ctx.fill();
      if (type === "fruitTree") { ctx.fillStyle = "#d95e52"; ctx.beginPath(); ctx.arc(x - 8, y - 15, 3, 0, Math.PI * 2); ctx.arc(x + 8, y - 8, 3, 0, Math.PI * 2); ctx.fill(); }
    } else if (type === "grass") {
      ctx.strokeStyle = "#245c3a"; ctx.lineWidth = 2; for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(x + i * 3, y + 10); ctx.lineTo(x + i * 4, y - 4 - Math.abs(i)); ctx.stroke(); }
    } else if (FORAGE_TYPES.has(type)) {
      ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.fillText(ITEMS[type].icon, x, y + 7);
    } else {
      const oreColors = { silverOre: "#b9c2c8", goldOre: "#d7a83d", obsidianOre: "#2e2935", relicNode: "#b68a59", voidNode: "#624b85", frostcore: "#bce7ef", embercore: "#e56432", volcanicGlass: "#d46c45", mistPearl: "#d5e2df" };
      ctx.fillStyle = oreColors[type] || (type.includes("volcanic") ? "#7b4135" : type.includes("snow") ? "#91aab3" : type.includes("dread") ? "#373345" : "#777b7d");
      ctx.beginPath(); ctx.moveTo(x - 13, y + 10); ctx.lineTo(x - 16, y - 5); ctx.lineTo(x - 6, y - 14); ctx.lineTo(x + 11, y - 10); ctx.lineTo(x + 15, y + 7); ctx.closePath(); ctx.fill();
    }
  },

drawBuildings(ctx, bounds) {
    for (const building of BUILDINGS) {
      if (building.x + building.w < bounds.startX || building.x > bounds.endX || building.y + building.h < bounds.startY || building.y > bounds.endY) continue;
      const x = building.x * TILE, y = building.y * TILE;
      ctx.fillStyle = building.wall; ctx.fillRect(x, y + TILE, building.w * TILE, (building.h - 1) * TILE);
      ctx.fillStyle = building.roof; ctx.beginPath(); ctx.moveTo(x - 10, y + TILE * 1.2); ctx.lineTo(x + building.w * TILE / 2, y - 18); ctx.lineTo(x + building.w * TILE + 10, y + TILE * 1.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#563c32"; ctx.fillRect((building.door.x + .5) * TILE - 12, (building.door.y + 1) * TILE - 30, 24, 30);
      ctx.fillStyle = "#8ec6d8"; ctx.fillRect(x + 20, y + TILE * 2.2, 22, 18); ctx.fillRect(x + building.w * TILE - 42, y + TILE * 2.2, 22, 18);
      ctx.font = "bold 12px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillStyle = "#10241d"; ctx.fillText(building.name, x + building.w * TILE / 2, y + TILE * 1.58);
    }
  },

drawLandmarks(ctx, bounds) {
    for (const stone of WAYSTONES) {
      if (stone.x < bounds.startX || stone.x > bounds.endX || stone.y < bounds.startY || stone.y > bounds.endY) continue;
      const x = stone.x * TILE, y = stone.y * TILE; const active = this.state.discoveredWaystones.includes(stone.id);
      ctx.fillStyle = "#5b4b3b"; ctx.fillRect(x - 8, y - 2, 16, 28); ctx.fillStyle = active ? "#efb94a" : "#777"; ctx.shadowColor = active ? "#ffe69b" : "transparent"; ctx.shadowBlur = active ? 10 : 0; ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x + 14, y - 5); ctx.lineTo(x, y + 3); ctx.lineTo(x - 14, y - 5); ctx.fill(); ctx.shadowBlur = 0;
    }
    for (const cave of CAVE_ENTRANCES) {
      if (cave.x < bounds.startX - 2 || cave.x > bounds.endX + 2 || cave.y < bounds.startY - 2 || cave.y > bounds.endY + 2) continue;
      const x = cave.x * TILE, y = cave.y * TILE; ctx.fillStyle = "#454249"; ctx.beginPath(); ctx.arc(x, y + 8, 24, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 24, y + 8, 48, 18); ctx.fillStyle = "#1d1c21"; ctx.beginPath(); ctx.arc(x, y + 10, 14, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 14, y + 10, 28, 12);
      ctx.font = "bold 10px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillStyle = "#fff1c8"; ctx.fillText(cave.name, x, y - 20);
    }
  },

drawNPCs(ctx, bounds) {
    for (const npc of this.state.npcs) if (npc.x >= bounds.startX - 1 && npc.x <= bounds.endX + 1 && npc.y >= bounds.startY - 1 && npc.y <= bounds.endY + 1) this.drawCharacter(ctx, npc.x, npc.y, npc.color, npc.name);
  },

drawMonsters(ctx, monsters, bounds, caveMode) {
    for (const monster of monsters) {
      if (monster.hp <= 0 || monster.x < bounds.startX - 1 || monster.x > bounds.endX + 1 || monster.y < bounds.startY - 1 || monster.y > bounds.endY + 1) continue;
      const def = caveMode ? CAVE_MONSTERS[monster.type] : MONSTER_TYPES[monster.type]; const x = monster.x * TILE, y = monster.y * TILE;
      ctx.fillStyle = "rgba(16,36,29,.25)"; ctx.beginPath(); ctx.ellipse(x, y + 11, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = def.color; ctx.beginPath(); ctx.ellipse(x, y, 13, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff1c8"; ctx.fillRect(x - 6, y - 4, 3, 3); ctx.fillRect(x + 3, y - 4, 3, 3);
      if (monster.hp < monster.maxHp) { ctx.fillStyle = "#10241d"; ctx.fillRect(x - 15, y - 23, 30, 5); ctx.fillStyle = "#d95e52"; ctx.fillRect(x - 14, y - 22, 28 * monster.hp / monster.maxHp, 3); }
    }
  },

drawPlayer(ctx) { this.drawCharacter(ctx, this.state.player.x, this.state.player.y, "#2e6f57", ""); },

drawCharacter(ctx, x, y, color, name) {
    const px = x * TILE, py = y * TILE; ctx.fillStyle = "rgba(16,36,29,.22)"; ctx.beginPath(); ctx.ellipse(px, py + 12, 11, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = color; ctx.fillRect(px - 9, py - 7, 18, 21); ctx.fillStyle = "#e9c7a0"; ctx.beginPath(); ctx.arc(px, py - 13, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#10241d"; ctx.fillRect(px - 5, py - 15, 3, 3); ctx.fillRect(px + 2, py - 15, 3, 3);
    if (name) { ctx.font = "bold 10px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillStyle = "#fff1c8"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3; ctx.strokeText(name, px, py - 28); ctx.fillText(name, px, py - 28); }
  },

drawMote(ctx) {
    const player = this.state.player; const time = performance.now() / 500; const x = (player.x - .65 + Math.cos(time) * .25) * TILE; const y = (player.y - .65 + Math.sin(time * 1.2) * .18) * TILE;
    ctx.shadowColor = "#fff3a8"; ctx.shadowBlur = 14; ctx.fillStyle = "#fff3a8"; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  },

drawTarget(ctx) {
    const target = this.targetTile(); ctx.strokeStyle = this.attackFlash > 0 ? "#d95e52" : "rgba(255,241,200,.85)"; ctx.lineWidth = 2; ctx.strokeRect(target.x * TILE + 3, target.y * TILE + 3, TILE - 6, TILE - 6);
  },

drawCave(ctx) {
    if (!this.currentCave) return;
    const bounds = this.visibleBounds(CAVE_W, CAVE_H); const tier = this.currentCave.tier;
    for (let y = bounds.startY; y < bounds.endY; y += 1) for (let x = bounds.startX; x < bounds.endX; x += 1) {
      const wall = this.currentCave.tiles[y][x] === "wall"; ctx.fillStyle = wall ? tier.wall : tier.floor; ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
      if (wall) { ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fillRect(x * TILE + 4, y * TILE + 5, 8, 4); }
      else if ((x * 13 + y * 7) % 11 === 0) { ctx.fillStyle = tier.accent; ctx.globalAlpha = .28; ctx.fillRect(x * TILE + 13, y * TILE + 12, 5, 5); ctx.globalAlpha = 1; }
    }
    for (const node of this.currentCave.nodes) if (node.x >= bounds.startX - 1 && node.x <= bounds.endX + 1 && node.y >= bounds.startY - 1 && node.y <= bounds.endY + 1) {
      const x = node.x * TILE, y = node.y * TILE; ctx.fillStyle = tier.accent; ctx.beginPath(); ctx.moveTo(x, y - 15); ctx.lineTo(x + 13, y + 9); ctx.lineTo(x - 13, y + 9); ctx.closePath(); ctx.fill();
    }
    if (this.currentCave.chest && !this.currentCave.chest.opened) { const x = this.currentCave.chest.x * TILE, y = this.currentCave.chest.y * TILE; ctx.fillStyle = "#8b5c2f"; ctx.fillRect(x - 14, y - 8, 28, 20); ctx.fillStyle = "#efb94a"; ctx.fillRect(x - 14, y - 4, 28, 5); ctx.fillRect(x - 3, y - 8, 6, 20); }
    for (const merchant of this.currentCave.merchants) this.drawCharacter(ctx, merchant.x, merchant.y, merchant.color, merchant.name);
    this.drawMonsters(ctx, this.currentCave.monsters, bounds, true);
    this.drawCaveDoor(ctx, this.currentCave.entry, "UP"); this.drawCaveDoor(ctx, this.currentCave.exit, this.currentCave.floor === 50 ? "EXIT" : "DOWN");
    this.drawPlayer(ctx); this.drawTarget(ctx);
  }
};
