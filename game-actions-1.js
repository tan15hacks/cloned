import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock, $, clamp, keyOf, distance, randomChoice, safeParse, formatTime, randomInt, GUILD_RANKS, FORAGE_TYPES, AXE_TYPES, PICK_TYPES, forecastWeather } from "./game-shared.js";

export const game_actions_1 = {
spendEnergy(amount) {
    const discount = this.state.beacon.level >= 2 ? .85 : 1;
    this.state.player.energy = clamp(this.state.player.energy - amount * discount, 0, this.state.player.maxEnergy);
  },

useHoe(target) {
    if (this.state.mode !== "world" || !isFarmableTile(target.x, target.y)) return this.toast("The hoe works only on the Farmstead crop field.");
    if (this.currentResourceAt(target.x, target.y) || this.placedAt(target.x, target.y)) return this.toast("Clear this tile first.");
    const key = keyOf(target.x, target.y);
    const soil = this.state.soil[key];
    if (soil?.crop) return this.toast("A crop is already growing here.");
    this.state.soil[key] = { tilled: true, watered: soil?.watered || false, crop: null };
    this.spendEnergy(2);
    this.sound("dig");
  },

useWater(target) {
    if (this.state.mode !== "world") return this.toast("There is no farm soil underground.");
    const soil = this.state.soil[keyOf(target.x, target.y)];
    if (!soil?.tilled) return this.toast("Till the ground before watering it.");
    soil.watered = true;
    this.spendEnergy(1);
    this.sound("water");
  },

plantSeed(target) {
    if (this.state.mode !== "world") return this.toast("Seeds cannot grow inside the cave.");
    const soil = this.state.soil[keyOf(target.x, target.y)];
    const crop = CROPS[this.state.selectedCrop];
    if (!soil?.tilled) return this.toast("Till the ground before planting.");
    if (soil.crop) return this.toast("Something is already planted here.");
    if ((this.state.inventory[crop.seed] || 0) <= 0) return this.toast(`You have no ${ITEMS[crop.seed].name}.`);
    this.state.inventory[crop.seed] -= 1;
    soil.crop = { type: this.state.selectedCrop, growth: 0, plantedDay: this.state.day };
    this.state.tutorial.planted = true;
    this.spendEnergy(1);
    this.sound("plant");
    this.toast(`${crop.name} planted. Press Q to cycle seed types.`);
  },

cycleSeed() {
    const order = ["turnip", "berry", "moonbean"];
    const current = order.indexOf(this.state.selectedCrop);
    for (let i = 1; i <= order.length; i += 1) {
      const next = order[(current + i) % order.length];
      if ((this.state.inventory[CROPS[next].seed] || 0) > 0) {
        this.state.selectedCrop = next;
        this.toast(`${CROPS[next].name} seeds selected.`);
        this.buildToolbar();
        return;
      }
    }
    this.toast("Buy more seeds from Mira or Silvercrest Market.");
  },

placedAt(x, y) { return this.state.placed.find((placed) => Math.floor(placed.x) === x && Math.floor(placed.y) === y); },

hitResource(target, tool) {
    const resource = this.currentResourceAt(target.x, target.y);
    if (!resource) return this.toast(tool === "axe" ? "Face a tree, grass, or plant resource." : "Face a rock or ore node.");
    const allowed = tool === "axe" ? AXE_TYPES.has(resource.type) : this.state.mode === "cave" || PICK_TYPES.has(resource.type);
    if (!allowed) return this.toast(`The ${tool} cannot gather that resource.`);
    resource.hp -= this.state.upgrades.toolPower;
    this.spendEnergy(resource.type === "grass" ? 1 : 2);
    this.sound("hit");
    if (resource.hp > 0) return;
    this.collectResource(resource);
    if (this.state.mode === "cave") {
      if (!this.state.cave.minedNodes.includes(resource.id)) this.state.cave.minedNodes.push(resource.id);
      this.currentCave.nodes = this.currentCave.nodes.filter((node) => node.id !== resource.id);
    } else {
      this.state.resources = this.state.resources.filter((item) => item.id !== resource.id);
      this.resourceMap.delete(keyOf(Math.floor(resource.x), Math.floor(resource.y)));
    }
  },

collectResource(resource) {
    const type = resource.type;
    if (["tree", "darkTree", "mangrove", "palm", "mistTree"].includes(type)) this.addItem("wood", randomInt(4, 7), true);
    else if (type === "fruitTree") { this.addItem("wood", 3, false); this.addItem("apple", randomInt(2, 4), true); }
    else if (type === "grass") this.addItem("fiber", randomInt(1, 2), true);
    else if (["rock", "snowRock", "volcanicRock", "dreadRock", "ruinStone"].includes(type)) this.addItem("stone", randomInt(2, 4), true);
    else if (type === "silverOre") this.addItem("silver", randomInt(2, 3), true);
    else if (type === "goldOre") this.addItem("gold", randomInt(2, 3), true);
    else if (type === "obsidianOre") this.addItem("obsidian", randomInt(2, 3), true);
    else if (type === "relicNode") this.addItem("relic", 1, true);
    else if (type === "voidNode") this.addItem("voidshard", 1, true);
    else if (type === "frostcore") this.addItem("frostcore", 1, true);
    else if (type === "embercore") this.addItem("embercore", 1, true);
    else if (type === "mistPearl") this.addItem("mistPearl", 1, true);
    else if (type === "volcanicGlass") this.addItem("volcanicGlass", 1, true);
    else if (type.endsWith("Node") && resource.ore) this.addItem(resource.ore, randomInt(2, 4), true);
    else this.addItem("copper", randomInt(2, 4), true);
  },

addItem(id, amount = 1, announce = false) {
    this.state.inventory[id] = (this.state.inventory[id] || 0) + amount;
    if (this.state.questStats[id] !== undefined) this.state.questStats[id] += amount;
    if (announce) this.toast(`+${amount} ${ITEMS[id]?.name || id}`);
    this.checkQuests();
    this.buildToolbar();
  },

interact() {
    if (!this.running || this.paused || this.modalOpen || this.dialogueOpen) return;
    if (this.state.mode === "cave") return this.interactCave();
    const player = this.state.player;
    const npc = this.state.npcs.find((entry) => distance(player, entry) < 1.5);
    if (npc) return this.talkToNPC(npc);
    const target = this.targetTile(.9);
    const soil = this.state.soil[keyOf(target.x, target.y)];
    if (soil?.crop && soil.crop.growth >= CROPS[soil.crop.type].days) return this.harvestCrop(target, soil);
    const resource = this.currentResourceAt(target.x, target.y);
    if (resource && FORAGE_TYPES.has(resource.type)) return this.gatherForage(resource);
    const building = BUILDINGS.find((entry) => distance(player, { x: entry.door.x + .5, y: entry.door.y + .5 }) < 2.2);
    if (building) return this.openBuildingService(building);
    const cave = CAVE_ENTRANCES.find((entry) => distance(player, entry) < 2);
    if (cave) return this.openCaveEntrance(cave);
    const waystone = WAYSTONES.find((entry) => distance(player, entry) < 1.8);
    if (waystone) return this.openWaystone(waystone);
    if (distance(player, INTERACTIONS.questBoard) < 1.8) return this.openQuestBoard();
    if (distance(player, INTERACTIONS.guildBoard) < 1.8) return this.openGuild();
    if (distance(player, INTERACTIONS.beacon) < 2.2) return this.openBeacon();
    this.toast("Nothing nearby to interact with.");
  },

gatherForage(resource) {
    this.addItem(resource.type, 1, true);
    this.state.questStats.forage += 1;
    this.state.resources = this.state.resources.filter((item) => item.id !== resource.id);
    this.resourceMap.delete(keyOf(Math.floor(resource.x), Math.floor(resource.y)));
    this.checkQuests();
  },

harvestCrop(target, soil) {
    const crop = CROPS[soil.crop.type];
    const resonance = this.calculateCropResonance(target.x, target.y, soil.crop.type);
    const lanternBonus = this.state.placed.some((placed) => placed.type === "lantern" && Math.hypot(placed.x - (target.x + .5), placed.y - (target.y + .5)) <= 3) ? 1 : 0;
    const beaconBonus = this.state.beacon.level >= 3 ? 1 : 0;
    const yieldAmount = 1 + (resonance >= 2 ? 1 : 0) + lanternBonus + beaconBonus;
    this.addItem(crop.produce, yieldAmount, false);
    this.state.questStats.harvest += 1;
    this.state.stats.cropsHarvested += yieldAmount;
    soil.crop = null;
    soil.watered = false;
    this.sound("harvest");
    this.toast(`Harvested ${yieldAmount} ${crop.name}${yieldAmount > 1 ? "s" : ""}${resonance >= 2 ? " with Harmony." : "."}`);
    this.checkQuests();
    this.checkAchievement("first-harvest", this.state.stats.cropsHarvested >= 1, "First Harvest", "Harvest your first crop.");
  },

calculateCropResonance(x, y, type) {
    let score = 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const neighbor = this.state.soil[keyOf(x + dx, y + dy)]?.crop;
      if (neighbor && neighbor.type !== type && neighbor.growth >= CROPS[neighbor.type].days) score += neighbor.type === "moonbean" ? 2 : 1;
    }
    if (this.state.weather === "Sparkfall" && type === "moonbean") score += 2;
    return score;
  },

openBuildingService(building) {
    const service = building.service;
    if (service === "sleep") return this.offerSleep();
    if (service === "seedshop") return this.openSeedShop();
    if (service === "inn" || service === "cityInn") return this.openInn(service === "cityInn");
    if (service === "workshop" || service === "blacksmith") return this.openBlacksmith(service === "blacksmith");
    if (service === "beacon") return this.openBeacon();
    if (service === "guild") return this.openGuild();
    if (service === "market") return this.openMarket();
    if (service === "apothecary") return this.openApothecary();
    if (service === "arcane") return this.openArcaneShop();
    if (service === "bank") return this.openBank();
    if (service === "hunter") return this.openHunterShop();
    if (service === "observatory") return this.openObservatory();
    if (service === "cityHall") return this.openCityHall();
    this.toast(`${building.name} is currently a private building.`);
  }
};
