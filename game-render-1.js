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
    this.openModal("How to Play Hearthvale v3.14", `<section class="help-section"><h3>Silvercrest Museum</h3><p>Enter Silvercrest Hall and use either illuminated museum display, or open Collections from the Adventure Menu. Donate requested crops, fish, ranch products, artisan goods, wild specimens, ores, monster materials, relics, and prepared meals across nine permanent galleries. Donations are permanent and bundle rewards are granted only once.</p></section><section class="help-section"><h3>Collections and Museum Ranks</h3><p>The museum tracks 45 display entries and 49 total donation units. Each completed gallery awards coins, Adventure XP, and a Museum Token. Reputation advances from Visitor to Continental Curator. Completing every gallery grants the Continental Curator Seal, while the Living Archive also requires every fish, region, and recipe.</p></section><section class="help-section"><h3>Continental Fishing</h3><p>Select the fishing rod and stand within two tiles of water. Fish species depend on region, season, weather, time, and Fishing Level. During a bite, press REEL, Space, or F while the fish crosses the highlighted zone. Land every required reel before the line slips three times.</p></section><section class="help-section"><h3>Fishing Journal, Bait, and Tackle</h3><p>Open the Fishing Journal to review 21 species, availability clues, quality records, largest sizes, streaks, treasures, and four legendary fish. Worm Bait improves uncommon catches, Glow Bait attracts night and legendary fish, the Silver Spinner widens the reel zone, and the Treasure Bobber improves quality and treasure chances.</p></section><section class="help-section"><h3>Farmhouse Cooking</h3><p>Enter the Farmhouse and use the stove to prepare known recipes. Standard cooking uses lower-quality ingredients first; Use Best Ingredients spends premium crops, fish, or ranch products for a stronger dish. Donated meals are removed from both inventory and the quality pantry.</p></section><section class="help-section"><h3>Meals and Buffs</h3><p>Prepared meals are stored by quality in the pantry and may be eaten anywhere. Food restores health and energy and grants one temporary meal effect. Eating another meal replaces the current effect.</p></section><section class="help-section"><h3>Relationships and Mailbox</h3><p>Talk to each resident once per day, discover gift preferences, remember birthdays, and attend heart events. Check the Farmstead mailbox for reminders, rewards, recipes, Tavi's angler journal, and Archivist Ves's museum invitation.</p></section><section class="help-section"><h3>Farming, Ranching, and Seasons</h3><p>Grow quality crops, forage, care for six animal species, upgrade the Coop, Barn, and Silo, process artisan goods, and prepare for four 28-day seasons and their annual festivals.</p></section><section class="help-section"><h3>Guided Story</h3><p>Follow the objective panel and golden marker through Chapter 1 and Chapter 2. Required story dialogue takes priority over ordinary relationship conversations.</p></section><section class="help-section"><h3>Directional Combat</h3><p>Select the sword, face an enemy, and press Space/F or the mobile A button. Watch telegraphs, dodge projectiles, collect loot, equip suitable gear, and use meal effects for difficult bosses.</p></section><section class="help-section"><h3>57,344-Tile Continent</h3><p>The 256 × 224 map streams only nearby 16 × 16 chunks. The Grand Depths contain 50 floors, milestone bosses, shortcuts, merchants, and deterministic 1% floor chests.</p></section><section class="help-section"><h3>Controls</h3><p>Desktop: WASD/arrows move, E interact, Space/F tool, attack, cast, or reel, 1–8 toolbar, Q seeds, M menu. Mobile: movement stick, A tool/attack/cast, B interact, and on-screen minigame buttons.</p></section>`, [{ label: "Close", action: () => this.closeModal() }]);
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
