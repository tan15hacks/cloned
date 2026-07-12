import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock, $, clamp, keyOf, distance, randomChoice, safeParse, formatTime, randomInt, GUILD_RANKS, FORAGE_TYPES, AXE_TYPES, PICK_TYPES, forecastWeather } from "./game-shared.js";

export const game_render_1 = {
  importSave(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = safeParse(String(reader.result));
      if (!parsed) return this.toast("Invalid save file.");
      this.state = this.migrateState(parsed); this.rebuildResourceMap(); this.saveGame(true); this.closeModal(); this.toast("Save imported successfully.");
    };
    reader.readAsText(file);
  },

  showHowToPlay() {
    this.openModal("How to Play Hearthvale v3.16", `<section class="help-section"><h3>Farmstead Expansion</h3><p>Use the project board beside the Old Barn or open Farmstead from the Adventure Menu. Complete five projects in order: restore the south field, build the Farm Workshop, construct the Hearthglass Greenhouse, install irrigation, and expand the greenhouse. Construction may use materials from the backpack, Farmhouse Pantry, and Adventure Trunk.</p></section><section class="help-section"><h3>Hearthglass Greenhouse</h3><p>Enter the completed greenhouse from the lower Farmstead. The basic wing contains 24 protected plots; the deluxe east wing raises the total to 48 and increases growth by 25%. Select the hoe, watering can, and seed tool exactly as on the outdoor farm. Protected crops grow at full speed in every season.</p></section><section class="help-section"><h3>Irrigation and Workshop</h3><p>The restored south field automatically waters up to 16 outdoor crops. The completed irrigation network waters every greenhouse bed and up to 48 outdoor crops before daily growth. The Farm Workshop provides crafting, construction records, and an estate report.</p></section><section class="help-section"><h3>Backpack and Item Stacks</h3><p>The backpack begins with 40 unique item stacks. Existing stacks may hold up to 999 items. Open Inventory to filter items by category and sort by category, name, quantity, or value. Silvercrest backpack upgrades expand capacity to 56, 72, and finally 96 stacks.</p></section><section class="help-section"><h3>Farmhouse Storage</h3><p>The Farmhouse Pantry stores food, crops, forage, fish, ranch goods, and meals. The Adventure Trunk stores materials, monster drops, equipment, supplies, and collectibles. Use +1 or All to transfer items. Quality records move with crops, fish, ranch products, artisan goods, and prepared meals.</p></section><section class="help-section"><h3>Shipping Bin</h3><p>The wooden shipping bin stands east of the Farmstead mailbox. Place shippable goods inside before sleeping. Every quality tier increases sale value, Hearthlight Beacon Level 1 adds its market bonus, and the payout is delivered when the next day begins. Goods may be retrieved before sleeping.</p></section><section class="help-section"><h3>Silvercrest Museum</h3><p>Enter Silvercrest Hall or open Collections from the Adventure Menu. Donate crops, fish, ranch products, artisan goods, wild specimens, ores, monster materials, relics, and prepared meals across nine permanent galleries. Donations and gallery rewards are permanent.</p></section><section class="help-section"><h3>Continental Fishing</h3><p>Select the rod and stand within two tiles of water. Fish depend on region, season, weather, time, and Fishing Level. Press REEL, Space, or F while the fish crosses the highlighted zone. Bait, tackle, quality catches, treasures, and 21 journal species support long-term progression.</p></section><section class="help-section"><h3>Farmhouse Cooking</h3><p>Use the farmhouse stove to prepare 16 recipes. Standard cooking uses lower-quality ingredients first; Use Best Ingredients spends premium ingredients for stronger meals. Prepared dishes retain their quality when moved into storage or the shipping bin.</p></section><section class="help-section"><h3>Relationships and Mailbox</h3><p>Talk once per day, discover gift preferences, remember birthdays, and attend heart events. Check the mailbox for reminders, rewards, recipes, fishing information, museum invitations, storage instructions, and the Farmstead expansion plan.</p></section><section class="help-section"><h3>Farming, Ranching, and Seasons</h3><p>Grow quality crops, forage, care for six animal species, upgrade the Coop, Barn, and Silo, process artisan goods, and prepare for four 28-day seasons and annual festivals.</p></section><section class="help-section"><h3>Story, Combat, and Caves</h3><p>Follow Chapter 1 and Chapter 2 objectives, use directional combat and equipment, prepare meals for difficult encounters, and explore all 50 floors of the Grand Depths.</p></section><section class="help-section"><h3>Controls</h3><p>Desktop: WASD/arrows move, E interact, Space/F tool, attack, cast, or reel, 1–8 toolbar, Q seeds, M menu. Mobile: movement stick, A tool/attack/cast, B interact, and on-screen minigame buttons.</p></section>`, [{ label: "Close", action: () => this.closeModal() }]);
  },

  render() {
    const ctx = this.ctx;
    const width = this.screen.width;
    const height = this.screen.height;
    ctx.save(); ctx.setTransform(this.screen.dpr, 0, 0, this.screen.dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    if (!this.running || !this.state) { ctx.fillStyle = "#75ad65"; ctx.fillRect(0, 0, width, height); this.drawTitleBackdrop(ctx, width, height); ctx.restore(); return; }
    ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));
    if (this.state.mode === "cave") this.drawCave(ctx); else this.drawWorld(ctx);
    ctx.restore();
    if (this.state.mode === "world") this.drawWeatherAndRegionOverlay(ctx, width, height);
    else this.drawCaveOverlay(ctx, width, height);
    if (this.settings.minimap && innerWidth > 800) this.drawMinimap(ctx, width, height);
    if (this.zoneBanner.timer > 0) this.drawZoneBanner(ctx, width);
  },

  visibleBounds(maxW, maxH) {
    return {
      startX: clamp(Math.floor(this.camera.x / TILE) - 2, 0, maxW),
      endX: clamp(Math.ceil((this.camera.x + this.screen.width) / TILE) + 2, 0, maxW),
      startY: clamp(Math.floor(this.camera.y / TILE) - 2, 0, maxH),
      endY: clamp(Math.ceil((this.camera.y + this.screen.height) / TILE) + 2, 0, maxH),
    };
  },

  drawTitleBackdrop(ctx, width, height) {
    ctx.fillStyle = "#8ec6d8"; ctx.fillRect(0, 0, width, height * .44);
    ctx.fillStyle = "#4f8b53";
    for (let i = 0; i < width + 100; i += 90) { ctx.beginPath(); ctx.moveTo(i - 30, height * .47); ctx.lineTo(i + 35, height * .28); ctx.lineTo(i + 100, height * .47); ctx.fill(); }
  },

  drawWorld(ctx) {
    const bounds = this.visibleBounds(WORLD_W, WORLD_H);
    for (let y = bounds.startY; y < bounds.endY; y += 1) for (let x = bounds.startX; x < bounds.endX; x += 1) this.drawTerrainTile(ctx, x, y);
    this.drawSoil(ctx, bounds);
    this.drawPlaced(ctx, bounds);
    this.drawResources(ctx, bounds);
    this.drawBuildings(ctx, bounds);
    this.drawLandmarks(ctx, bounds);
    this.drawNPCs(ctx, bounds);
    this.drawMonsters(ctx, this.state.monsters, bounds, false);
    if (this.state.mote.unlocked) this.drawMote(ctx);
    this.drawPlayer(ctx);
    this.drawTarget(ctx);
  },

  drawTerrainTile(ctx, x, y) {
    const terrain = terrainAt(x, y);
    const colors = { farm: "#6fa85e", field: "#75a95e", village: "#83ae68", city: "#9ca77b", highland: "#7c9585", meadow: "#75ad65", lake: "#6fa589", mist: "#718d82", snow: "#c5d6da", darkforest: "#294b3b", swamp: "#566e49", dread: "#4b455b", volcano: "#68483e", coast: "#d2bd7b", ruins: "#a88c67", path: "#c5aa73", bridge: "#8a6744", water: "#4e9cbc", lava: "#d55a2c" };
    ctx.fillStyle = colors[terrain] || "#6fa85e"; ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
    const variant = (x * 17 + y * 29) % 11;
    if (terrain === "water") { ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x * TILE + 5 + variant, y * TILE + 13, 11, 2); }
    else if (terrain === "lava") { ctx.fillStyle = "#ff9b42"; ctx.fillRect(x * TILE + 4 + variant, y * TILE + 12, 13, 3); }
    else if (terrain === "snow") { ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fillRect(x * TILE + 6, y * TILE + 7, 4, 3); }
    else if (terrain === "path" || terrain === "bridge") { ctx.fillStyle = "rgba(70,50,34,.14)"; ctx.fillRect(x * TILE + 3, y * TILE + 8 + variant, 6, 3); }
    else if (variant === 0) { ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(x * TILE + 7, y * TILE + 8, 3, 3); }
  },

  drawSoil(ctx, bounds) {
    for (const [key, soil] of Object.entries(this.state.soil)) {
      const [x, y] = key.split(",").map(Number);
      if (x < bounds.startX || x >= bounds.endX || y < bounds.startY || y >= bounds.endY) continue;
      ctx.fillStyle = soil.watered ? "#594b40" : "#7b5d3d"; ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = soil.watered ? "#8aa8ba" : "#4f3627"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x * TILE + 5, y * TILE + 10); ctx.lineTo(x * TILE + TILE - 5, y * TILE + 8); ctx.moveTo(x * TILE + 5, y * TILE + 20); ctx.lineTo(x * TILE + TILE - 5, y * TILE + 18); ctx.stroke();
      if (soil.crop) this.drawCrop(ctx, x, y, soil.crop);
    }
  },

  drawCrop(ctx, x, y, cropState) {
    const crop = CROPS[cropState.type]; const ratio = clamp(cropState.growth / crop.days, 0, 1); const cx = x * TILE + TILE / 2; const base = y * TILE + TILE - 5;
    ctx.strokeStyle = crop.colors[1]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, base); ctx.lineTo(cx, base - 8 - ratio * 10); ctx.stroke();
    ctx.fillStyle = crop.colors[1]; ctx.beginPath(); ctx.ellipse(cx - 4, base - 8 - ratio * 6, 6, 3, -.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + 4, base - 11 - ratio * 7, 6, 3, .5, 0, Math.PI * 2); ctx.fill();
    if (ratio >= 1) { ctx.fillStyle = crop.colors[2]; ctx.beginPath(); ctx.arc(cx, base - 17, 7, 0, Math.PI * 2); ctx.fill(); }
  },

  drawPlaced(ctx, bounds) {
    for (const placed of this.state.placed) {
      if (placed.x < bounds.startX || placed.x > bounds.endX || placed.y < bounds.startY || placed.y > bounds.endY) continue;
      const x = placed.x * TILE, y = placed.y * TILE;
      if (placed.type === "sprinkler") { ctx.fillStyle = "#6f7e87"; ctx.fillRect(x - 5, y - 12, 10, 22); ctx.fillStyle = "#8ec6d8"; ctx.fillRect(x - 12, y - 14, 24, 6); }
      else { ctx.fillStyle = "#6c432c"; ctx.fillRect(x - 5, y - 5, 10, 18); ctx.fillStyle = "#efb94a"; ctx.shadowColor = "#ffe69b"; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(x, y - 12, 9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    }
  }
};
