import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock, $, clamp, keyOf, distance, randomChoice, safeParse, formatTime, randomInt, GUILD_RANKS, FORAGE_TYPES, AXE_TYPES, PICK_TYPES, forecastWeather } from "./game-shared.js";

export const game_render_3 = {
drawCaveDoor(ctx, door, label) {
    const x = door.x * TILE, y = door.y * TILE; ctx.fillStyle = "#1d1c21"; ctx.fillRect(x - 15, y - 20, 30, 36); ctx.strokeStyle = this.currentCave.tier.accent; ctx.lineWidth = 3; ctx.strokeRect(x - 15, y - 20, 30, 36); ctx.fillStyle = "#fff1c8"; ctx.font = "bold 8px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(label, x, y + 5);
  },

drawWeatherAndRegionOverlay(ctx, width, height) {
    const region = regionAt(this.state.player.x, this.state.player.y).id;
    if (this.state.weather === "Rain") { ctx.strokeStyle = "rgba(205,230,244,.55)"; const time = performance.now() / 12; for (let i = 0; i < 80; i += 1) { const x = (i * 83 + time * .9) % (width + 50) - 25; const y = (i * 47 + time * 1.8) % (height + 50) - 25; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 14); ctx.stroke(); } }
    if (region === "veilmoor") { for (let i = 0; i < 6; i += 1) { const gradient = ctx.createRadialGradient((i * 211 + performance.now() / 25) % width, (i * 97) % height, 0, (i * 211 + performance.now() / 25) % width, (i * 97) % height, 190); gradient.addColorStop(0, "rgba(220,235,229,.2)"); gradient.addColorStop(1, "rgba(220,235,229,0)"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height); } }
    if (region === "darkforest") { ctx.fillStyle = "rgba(5,18,13,.34)"; ctx.fillRect(0, 0, width, height); }
    if (region === "frostpeak") { const time = performance.now() / 30; ctx.fillStyle = "rgba(255,255,255,.7)"; for (let i = 0; i < 55; i += 1) ctx.fillRect((i * 97 + time) % width, (i * 59 + time * .6) % height, 3, 3); }
    if (region === "volcano") { const time = performance.now() / 24; ctx.fillStyle = "rgba(255,130,55,.6)"; for (let i = 0; i < 32; i += 1) ctx.fillRect((i * 113 + time) % width, height - ((i * 79 + time * 1.8) % height), 3, 5); }
    const hour = this.state.minutes / 60; let darkness = 0; if (hour < 6) darkness = .55; else if (hour < 8) darkness = (8 - hour) * .12; else if (hour > 18) darkness = clamp((hour - 18) * .09, 0, .62);
    if (darkness > 0) { ctx.fillStyle = `rgba(19,28,55,${darkness})`; ctx.fillRect(0, 0, width, height); }
  },

drawCaveOverlay(ctx, width, height) {
    const tier = this.currentCave?.tier; if (!tier) return;
    ctx.fillStyle = tier.id === "infernal" ? "rgba(120,35,20,.13)" : tier.id === "frozen" ? "rgba(170,220,235,.1)" : "rgba(16,12,25,.12)"; ctx.fillRect(0, 0, width, height);
  },

drawMinimap(ctx, width, height) {
    const mapW = 192, mapH = 150, x = width - mapW - 14, y = height - mapH - 84;
    ctx.save(); ctx.globalAlpha = .92; ctx.fillStyle = "#10241d"; ctx.fillRect(x - 4, y - 4, mapW + 8, mapH + 8); ctx.fillStyle = "#f5dca7"; ctx.fillRect(x, y, mapW, mapH);
    if (this.state.mode === "world") {
      for (const region of REGIONS) { ctx.fillStyle = region.color; ctx.fillRect(x + region.x / WORLD_W * mapW, y + region.y / WORLD_H * mapH, region.w / WORLD_W * mapW + 1, region.h / WORLD_H * mapH + 1); }
      ctx.fillStyle = "#d95e52"; ctx.beginPath(); ctx.arc(x + this.state.player.x / WORLD_W * mapW, y + this.state.player.y / WORLD_H * mapH, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = this.currentCave.tier.floor; ctx.fillRect(x + 5, y + 5, mapW - 10, mapH - 10); ctx.fillStyle = "#d95e52"; ctx.beginPath(); ctx.arc(x + this.state.player.x / CAVE_W * mapW, y + this.state.player.y / CAVE_H * mapH, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#10241d"; ctx.font = "bold 14px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(`Floor ${this.currentCave.floor}/50`, x + mapW / 2, y + 20);
    }
    ctx.restore();
  },

drawZoneBanner(ctx, width) {
    const alpha = clamp(this.zoneBanner.timer < .5 ? this.zoneBanner.timer * 2 : 1, 0, 1); ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "rgba(16,36,29,.9)"; ctx.fillRect(width / 2 - 190, 92, 380, 54); ctx.strokeStyle = "#f5dca7"; ctx.lineWidth = 2; ctx.strokeRect(width / 2 - 190, 92, 380, 54); ctx.fillStyle = "#fff1c8"; ctx.font = "bold 21px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(this.zoneBanner.text, width / 2, 126); ctx.restore();
  },

showDialogue(npc, text, choices = []) {
    this.dialogueOpen = true; this.paused = true; $("dialogueName").textContent = npc.name; $("dialoguePortrait").textContent = npc.emoji || "🙂"; $("dialogueText").textContent = text; const box = $("dialogueChoices"); box.innerHTML = "";
    choices.forEach((choice) => { const button = document.createElement("button"); button.textContent = choice.label; button.addEventListener("click", choice.action); box.appendChild(button); });
    $("dialogue").classList.remove("hidden");
  },

closeDialogue() { this.dialogueOpen = false; this.paused = false; $("dialogue").classList.add("hidden"); },

openModal(title, body, actions = []) {
    this.modalOpen = true; this.paused = true; $("modalTitle").textContent = title; $("modalBody").innerHTML = body; const area = $("modalActions"); area.innerHTML = "";
    actions.forEach((action) => { const button = document.createElement("button"); button.textContent = action.label; if (action.danger) button.style.background = "#d95e52"; button.addEventListener("click", action.action); area.appendChild(button); });
    $("modal").classList.remove("hidden");
  }
};
