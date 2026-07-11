import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock, $, clamp, keyOf, distance, randomChoice, safeParse, formatTime, randomInt, GUILD_RANKS, FORAGE_TYPES, AXE_TYPES, PICK_TYPES, forecastWeather } from "./game-shared.js";

export const game_services_1 = {
nextDay(passedOut) {
    const state = this.state;
    state.day += 1;
    state.stats.daysPlayed += 1;
    state.minutes = 360;
    state.weather = forecastWeather(state.day);
    state.tomorrowWeather = forecastWeather(state.day + 1);
    state.mode = "world";
    this.currentCave = null;
    state.player.x = 11.5; state.player.y = 15.5;
    state.player.energy = passedOut ? Math.floor(state.player.maxEnergy * .7) : state.player.maxEnergy;
    state.player.health = clamp(state.player.health + (passedOut ? 10 : 40), 0, state.player.maxHealth);
    for (const soil of Object.values(state.soil)) {
      if (soil.crop && soil.watered) soil.crop.growth += 1;
      soil.watered = state.weather === "Rain";
    }
    for (const placed of state.placed.filter((entry) => entry.type === "sprinkler")) {
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const soil = state.soil[keyOf(Math.floor(placed.x) + dx, Math.floor(placed.y) + dy)];
        if (soil) soil.watered = true;
      }
    }
    if (state.mote.unlocked) Object.values(state.soil).filter((soil) => soil.crop && !soil.watered).slice(0, 5 + Math.floor(state.mote.bond / 2)).forEach((soil) => { soil.watered = true; });
    state.questStats = { wood: 0, stone: 0, copper: 0, harvest: 0, fish: 0, talk: 0, monsters: 0, forage: 0, explore: 1, caveFloors: 0 };
    state.quests = generateQuests(state.day);
    state.guild.bounties = generateGuildBounties(state.day);
    state.guild.dailyKills = {};
    state.dayVisitedRegions = ["farm"];
    state.resources = generateResources(state.day);
    state.monsters = generateMonsters(state.day);
    this.rebuildResourceMap();
    state.cave.runSeed = randomInt(1000, 999999);
    state.cave.clearedMonsters = [];
    state.cave.minedNodes = [];
    state.cave.openedChests = [];
    state.journal.unshift(`Day ${state.day}: ${state.weather} weather. Guild Rank ${state.guild.rank}; deepest cave floor ${state.cave.maxFloor}.`);
    state.journal = state.journal.slice(0, 30);
    this.saveGame(true);
    this.toast(`Day ${state.day} begins — ${state.weather}.`);
  },

discoverLocation() {
    if (this.state.mode !== "world") return;
    const region = regionAt(this.state.player.x, this.state.player.y);
    if (this.currentRegion !== region.id) {
      this.currentRegion = region.id;
      this.showZoneBanner(region.name);
      if (!this.state.visitedRegions.includes(region.id)) {
        this.state.visitedRegions.push(region.id);
        this.state.stats.regionsVisited = this.state.visitedRegions.length;
        this.state.journal.unshift(`Discovered ${region.name}.`);
        this.checkAchievement("explorer", this.state.visitedRegions.length >= 10, "Continental Explorer", "Discover 10 regions.");
      }
      if (!this.state.dayVisitedRegions.includes(region.id)) {
        this.state.dayVisitedRegions.push(region.id);
        this.state.questStats.explore = this.state.dayVisitedRegions.length;
        this.checkQuests();
      }
      if (region.id === "city") this.state.tutorial.citySeen = true;
    }
    for (const stone of WAYSTONES) if (distance(this.state.player, stone) < 2 && !this.state.discoveredWaystones.includes(stone.id)) {
      this.state.discoveredWaystones.push(stone.id); this.toast(`Waystone awakened: ${stone.name}.`);
    }
  },

showZoneBanner(text) { this.zoneBanner = { text, timer: 3.2 }; },

updateCamera() {
    const player = this.state.player;
    const worldWidth = (this.state.mode === "cave" ? CAVE_W : WORLD_W) * TILE;
    const worldHeight = (this.state.mode === "cave" ? CAVE_H : WORLD_H) * TILE;
    const targetX = player.x * TILE - this.screen.width / 2;
    const targetY = player.y * TILE - this.screen.height / 2;
    this.camera.x += (clamp(targetX, 0, Math.max(0, worldWidth - this.screen.width)) - this.camera.x) * .14;
    this.camera.y += (clamp(targetY, 0, Math.max(0, worldHeight - this.screen.height)) - this.camera.y) * .14;
  },

openSeedShop() {
    const stock = [
      { id: "turnipSeed", amount: 5, price: 45 }, { id: "berrySeed", amount: 5, price: 85 },
      { id: "moonSeed", amount: 3, price: 120 }, { id: "snack", amount: 1, price: 35 },
    ];
    this.openShopModal("Mira's Seeds", stock);
  },

openMarket() {
    const stock = [
      { id: "turnipSeed", amount: 10, price: 80 }, { id: "berrySeed", amount: 10, price: 155 },
      { id: "moonSeed", amount: 6, price: 220 }, { id: "apple", amount: 3, price: 90 },
    ];
    this.openShopModal("Silvercrest Grand Market", stock, [
      { label: "Sell Produce & Fish", action: () => this.sellCategory(["turnip", "berry", "moonbean", "fish", "rareFish", "apple"], this.state.beacon.level >= 1 ? 1.1 : 1) },
    ]);
  },

openShopModal(title, stock, extraActions = []) {
    const html = stock.map((item) => `<article class="shop-item"><div><h3>${ITEMS[item.id].icon} ${ITEMS[item.id].name} ×${item.amount}</h3><p>${item.price} coins</p></div><button data-buy="${item.id}">Buy</button></article>`).join("");
    this.openModal(title, `<p>Your coins: <strong>${this.state.coins}</strong></p><div class="shop-list">${html}</div>`, [...extraActions, { label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-buy]").forEach((button) => button.onclick = () => {
      const item = stock.find((entry) => entry.id === button.dataset.buy);
      if (this.state.coins < item.price) return this.toast("Not enough coins.");
      this.state.coins -= item.price; this.addItem(item.id, item.amount, false); this.toast(`Bought ${ITEMS[item.id].name} ×${item.amount}.`); this.closeModal();
    });
  },

sellCategory(ids, multiplier = 1) {
    let total = 0;
    ids.forEach((id) => { const count = this.state.inventory[id] || 0; total += Math.floor(count * (ITEMS[id]?.value || 1) * multiplier); this.state.inventory[id] = 0; });
    if (total <= 0) return this.toast("You have nothing in that category to sell.");
    this.state.coins += total; this.state.stats.totalEarned += total; this.sound("coin"); this.closeModal(); this.toast(`Sold goods for ${total} coins.`);
  },

openInn(city) {
    const mealPrice = city ? 85 : 65;
    this.openModal(city ? "The Golden Griffin" : "The Hearth & Kettle", `<p>A full meal restores all energy and 30 health for ${mealPrice} coins.</p><p>You may also rent a room to end the day.</p>`, [
      { label: `Eat — ${mealPrice}`, action: () => { if (this.state.coins < mealPrice) return this.toast("Not enough coins."); this.state.coins -= mealPrice; this.state.player.energy = this.state.player.maxEnergy; this.state.player.health = clamp(this.state.player.health + 30, 0, this.state.player.maxHealth); this.closeModal(); this.toast("Fully refreshed."); } },
      { label: "Sleep", action: () => { this.closeModal(); this.nextDay(false); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
  },

openBlacksmith(city) {
    const toolPrice = 250 * this.state.upgrades.toolPower;
    const weaponPrice = 300 * this.state.upgrades.weaponPower;
    const armorPrice = 350 * (this.state.upgrades.armor + 1);
    this.openModal(city ? "Ironhart Smithy" : "Oren's Workshop", `<p>Upgrade tools, weapon, and armor. Silvercrest can temper equipment further than the village workshop.</p><p>Tool power ${this.state.upgrades.toolPower}/5 · Weapon ${this.state.upgrades.weaponPower}/6 · Armor ${this.state.upgrades.armor}/5</p>`, [
      { label: `Tool Upgrade — ${toolPrice}`, action: () => this.buyUpgrade("toolPower", toolPrice, city ? 5 : 3) },
      { label: `Weapon Upgrade — ${weaponPrice}`, action: () => this.buyUpgrade("weaponPower", weaponPrice, city ? 6 : 3) },
      { label: `Armor Upgrade — ${armorPrice}`, action: () => this.buyUpgrade("armor", armorPrice, city ? 5 : 2) },
      { label: "Sell Ores", action: () => this.sellCategory(["copper", "iron", "silver", "gold", "obsidian"], 1) },
      { label: "Close", action: () => this.closeModal() },
    ]);
  }
};
