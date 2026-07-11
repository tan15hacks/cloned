import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock, $, clamp, keyOf, distance, randomChoice, safeParse, formatTime, randomInt, GUILD_RANKS, FORAGE_TYPES, AXE_TYPES, PICK_TYPES, forecastWeather } from "./game-shared.js";

export const game_actions_2 = {
talkToNPC(npc) {
    const firstToday = npc.talkedDay !== this.state.day;
    if (firstToday) {
      npc.talkedDay = this.state.day;
      npc.friendship = clamp(npc.friendship + 1, 0, 10);
      this.state.questStats.talk += 1;
      this.checkQuests();
    }
    const choices = [{ label: "Goodbye", action: () => this.closeDialogue() }];
    if ((this.state.inventory[npc.favorite] || 0) > 0) choices.unshift({ label: `Gift ${ITEMS[npc.favorite].name}`, action: () => {
      this.state.inventory[npc.favorite] -= 1;
      npc.friendship = clamp(npc.friendship + 2, 0, 10);
      this.showDialogue(npc, `This is wonderful. Friendship with ${npc.name}: ${npc.friendship}/10.`, [{ label: "You're welcome", action: () => this.closeDialogue() }]);
      this.checkAchievement("friend", npc.friendship >= 8, "Trusted Friend", "Reach 8 friendship with a resident.");
    }});
    this.showDialogue(npc, `${randomChoice(npc.lines)}${firstToday ? ` Friendship: ${npc.friendship}/10.` : ""}`, choices);
  },

openCaveEntrance(entrance) {
    const shortcutUnlocked = this.state.cave.maxFloor >= entrance.shortcut;
    const text = `<p>${entrance.description}</p><p>Deepest floor reached: <strong>${this.state.cave.maxFloor}</strong>/50.</p>${entrance.shortcut > 1 ? `<p>Shortcut requirement: Floor ${entrance.shortcut} — <strong>${shortcutUnlocked ? "Unlocked" : "Locked"}</strong>.</p>` : ""}`;
    const actions = [
      { label: "Enter Floor 1 Hub", action: () => { this.closeModal(); this.enterCave(1); } },
      { label: "Cancel", action: () => this.closeModal() },
    ];
    if (entrance.shortcut > 1 && shortcutUnlocked) actions.unshift({ label: `Use Floor ${entrance.shortcut} Shortcut`, action: () => { this.closeModal(); this.enterCave(entrance.shortcut); } });
    this.openModal(entrance.name, text, actions);
  },

enterCave(floor = 1) {
    floor = clamp(floor, 1, Math.min(50, this.state.cave.maxFloor));
    this.state.mode = "cave";
    this.state.cave.currentFloor = floor;
    this.loadCaveFloor(floor);
    this.state.player.x = this.currentCave.entry.x;
    this.state.player.y = this.currentCave.entry.y;
    this.camera.x = 0; this.camera.y = 0;
    this.state.tutorial.caveSeen = true;
    this.showZoneBanner(`Floor ${floor} — ${this.currentCave.tier.name}`);
    this.toast(floor === 1 ? "Grand Depths Expedition Hub" : `Entered Cave Floor ${floor}.`);
  },

loadCaveFloor(floor) {
    const data = generateCaveFloor(floor, this.state.cave.runSeed);
    const cleared = new Set(this.state.cave.clearedMonsters);
    const mined = new Set(this.state.cave.minedNodes);
    const opened = new Set(this.state.cave.openedChests);
    data.monsters = data.monsters.filter((monster) => !cleared.has(monster.id));
    data.nodes = data.nodes.filter((node) => !mined.has(node.id));
    if (data.chest && opened.has(data.chest.id)) data.chest.opened = true;
    this.currentCave = data;
  },

leaveCave() {
    this.state.mode = "world";
    this.currentCave = null;
    this.state.player.x = 187.5;
    this.state.player.y = 69.5;
    this.camera.x = 0; this.camera.y = 0;
    this.toast("Returned to the Grand Depths entrance near Silvercrest.");
  },

interactCave() {
    const player = this.state.player;
    const cave = this.currentCave;
    const merchant = cave.merchants.find((entry) => distance(player, entry) < 1.6);
    if (merchant) return this.openCaveMerchant(merchant);
    if (cave.chest && !cave.chest.opened && distance(player, cave.chest) < 1.6) return this.openCaveChest(cave.chest);
    if (distance(player, cave.entry) < 1.7) {
      if (cave.floor === 1) return this.leaveCave();
      return this.changeCaveFloor(cave.floor - 1);
    }
    if (distance(player, cave.exit) < 1.7) {
      if (cave.floor === 50 && cave.monsters.some((monster) => monster.type === "depthWarden" && monster.hp > 0)) return this.toast("The Warden seals the final gate.");
      if (cave.floor >= 50) return this.completeCave();
      return this.changeCaveFloor(cave.floor + 1);
    }
    this.toast("No cave feature is close enough to interact with.");
  },

changeCaveFloor(floor) {
    floor = clamp(floor, 1, 50);
    const firstVisit = !this.state.cave.visitedFloors.includes(floor);
    if (firstVisit) {
      this.state.cave.visitedFloors.push(floor);
      this.state.questStats.caveFloors += 1;
      this.state.cave.maxFloor = Math.max(this.state.cave.maxFloor, floor);
      this.state.stats.deepestFloor = Math.max(this.state.stats.deepestFloor, floor);
      this.checkQuests();
      if ([10, 20, 30, 40, 50].includes(floor)) this.toast(`New cave environment unlocked: ${caveTier(floor).name}.`);
    }
    this.state.cave.currentFloor = floor;
    this.loadCaveFloor(floor);
    this.state.player.x = this.currentCave.entry.x;
    this.state.player.y = this.currentCave.entry.y;
    this.showZoneBanner(`Floor ${floor} — ${this.currentCave.tier.name}`);
    this.saveGame(true);
  },

openCaveChest(chest) {
    const loot = chestLoot(this.currentCave.floor, this.state.cave.runSeed);
    chest.opened = true;
    this.state.cave.openedChests.push(chest.id);
    this.state.stats.chestsFound += 1;
    loot.forEach((entry) => this.addItem(entry.id, entry.amount, false));
    this.sound("success");
    this.openModal("Rare Depths Chest", `<p>A chest spawned on this floor with the expedition's <strong>1% floor chance</strong>.</p>${loot.map((entry) => `<p>${ITEMS[entry.id].icon} ${ITEMS[entry.id].name} ×${entry.amount}</p>`).join("")}`, [{ label: "Collect", action: () => this.closeModal() }]);
    this.checkAchievement("lucky-chest", true, "One in a Hundred", "Find a 1% cave chest.");
  },

openCaveMerchant(merchant) {
    if (merchant.id === "delver") {
      const stock = caveMerchantStock(this.state.cave.maxFloor);
      const html = stock.map((item) => `<article class="shop-item"><div><h3>${ITEMS[item.id].icon} ${item.label}</h3><p>${item.price} coins</p></div><button data-cave-buy="${item.id}">Buy</button></article>`).join("");
      this.openModal("Delver Merchant", `<p>Supplies improve as you reach deeper milestone floors.</p><div class="shop-list">${html}</div>`, [{ label: "Close", action: () => this.closeModal() }]);
      document.querySelectorAll("[data-cave-buy]").forEach((button) => button.onclick = () => {
        const item = stock.find((entry) => entry.id === button.dataset.caveBuy);
        if (this.state.coins < item.price) return this.toast("Not enough coins.");
        this.state.coins -= item.price; this.addItem(item.id, item.amount, false); this.toast(`Bought ${item.label}.`); this.closeModal();
      });
    } else if (merchant.id === "trader") {
      this.openModal("Depths Trader", "<p>I buy ores, crystals, monster parts, and relics at a 15% expedition premium.</p>", [
        { label: "Sell Cave Loot", action: () => this.sellCategory(["copper", "iron", "silver", "gold", "obsidian", "crystal", "frostcore", "embercore", "voidshard", "relic", "slimeGel", "fang", "venom", "hide", "ash"], 1.15) },
        { label: "Close", action: () => this.closeModal() },
      ]);
    } else if (merchant.id === "healer") {
      this.openModal("Expedition Healer", "<p>Full health and energy restoration costs 60 coins.</p>", [
        { label: "Restore — 60", action: () => { if (this.state.coins < 60) return this.toast("Not enough coins."); this.state.coins -= 60; this.state.player.health = this.state.player.maxHealth; this.state.player.energy = this.state.player.maxEnergy; this.closeModal(); this.toast("Fully restored."); } },
        { label: "Close", action: () => this.closeModal() },
      ]);
    } else this.openFloorGate();
  },

openFloorGate() {
    const milestones = [1, 10, 20, 30, 40, 50].filter((floor) => floor <= this.state.cave.maxFloor);
    this.openModal("Grand Depths Floor Gate", `<p>Choose an unlocked milestone floor. Ordinary floors remain accessible by their stairs.</p><div class="menu-grid">${milestones.map((floor) => `<button data-floor="${floor}">Floor ${floor}<br><small>${caveTier(floor).name}</small></button>`).join("")}</div>`, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-floor]").forEach((button) => button.onclick = () => { const floor = Number(button.dataset.floor); this.closeModal(); this.enterCave(floor); });
  },

completeCave() {
    if (!this.state.flags.caveBossDefeated) return this.toast("The Heart of the Depths remains unstable.");
    this.state.coins += 2000;
    this.state.guild.xp += 500;
    this.updateGuildRank();
    this.addItem("voidshard", 5, false);
    this.addItem("relic", 3, false);
    this.checkAchievement("depths-master", true, "Master of the Grand Depths", "Defeat the Floor 50 Warden.");
    this.openModal("Grand Depths Conquered", "<p>You cleared all 50 floors and stabilized the Heart of the Depths.</p><p><strong>Rewards:</strong> 2,000 coins, 500 Guild XP, 5 Void Shards, and 3 Ancient Relics.</p>", [{ label: "Return to Silvercrest", action: () => { this.closeModal(); this.leaveCave(); } }]);
  }
};
