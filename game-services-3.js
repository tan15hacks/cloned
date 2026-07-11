import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock, $, clamp, keyOf, distance, randomChoice, safeParse, formatTime, randomInt, GUILD_RANKS, FORAGE_TYPES, AXE_TYPES, PICK_TYPES, forecastWeather } from "./game-shared.js";

export const game_services_3 = {
donateProduce(amount) {
    let remaining = amount; let donated = 0;
    for (const id of ["turnip", "berry", "moonbean"]) { const take = Math.min(remaining, this.state.inventory[id] || 0); this.state.inventory[id] -= take; remaining -= take; donated += take; }
    if (!donated) return this.toast("You have no produce.");
    this.state.beacon.produce += donated; this.evaluateBeacon(); this.closeModal(); this.openBeacon();
  },

evaluateBeacon() {
    const beacon = this.state.beacon;
    const conditions = [beacon.wood >= 40 && beacon.stone >= 30 && beacon.produce >= 8, beacon.wood >= 90 && beacon.stone >= 75 && beacon.produce >= 20, beacon.wood >= 160 && beacon.stone >= 140 && beacon.produce >= 45];
    const level = conditions.filter(Boolean).length;
    if (level > beacon.level) { beacon.level = level; if (level >= 1) this.state.mote.unlocked = true; this.sound("success"); this.toast(`Hearthlight restored to Tier ${level}.`); }
  },

openWaystone(stone) {
    if (!this.state.discoveredWaystones.includes(stone.id)) { this.state.discoveredWaystones.push(stone.id); this.toast(`Waystone awakened: ${stone.name}.`); }
    if (this.state.beacon.level < 2) return this.openModal(stone.name, "<p>The Waystone is awake, but Hearthlight Tier 2 is required for fast travel.</p>", [{ label: "Close", action: () => this.closeModal() }]);
    const destinations = WAYSTONES.filter((entry) => this.state.discoveredWaystones.includes(entry.id) && entry.id !== stone.id);
    this.openModal("Waystone Travel", `<div class="menu-grid">${destinations.map((entry) => `<button data-travel="${entry.id}">${entry.name}</button>`).join("")}</div>`, [{ label: "Cancel", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-travel]").forEach((button) => button.onclick = () => { const destination = WAYSTONES.find((entry) => entry.id === button.dataset.travel); this.state.player.x = destination.spawn.x; this.state.player.y = destination.spawn.y; this.closeModal(); this.showZoneBanner(destination.name); this.toast(`Traveled to ${destination.name}.`); });
  },

showCrafting() {
    const html = RECIPES.map((recipe) => `<article class="recipe"><h3>${recipe.icon} ${recipe.name}</h3><p>${recipe.description}</p><p>${Object.entries(recipe.cost).map(([id, amount]) => `${ITEMS[id].icon} ${amount}`).join(" · ")}</p><button data-craft="${recipe.id}" ${this.canAffordItems(recipe.cost) ? "" : "disabled"}>Craft</button></article>`).join("");
    this.openModal("Crafting", `<div class="recipe-list">${html}</div>`, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-craft]").forEach((button) => button.onclick = () => this.craft(button.dataset.craft));
  },

canAffordItems(cost) { return Object.entries(cost).every(([id, amount]) => (this.state.inventory[id] || 0) >= amount); },

craft(id) {
    const recipe = RECIPES.find((entry) => entry.id === id);
    if (!recipe || !this.canAffordItems(recipe.cost)) return this.toast("Missing materials.");
    if (["sprinkler", "lantern"].includes(id)) {
      if (this.state.mode !== "world") return this.toast("Place farm equipment outdoors.");
      const target = this.targetTile();
      if (!isFarmableTile(target.x, target.y) || this.currentResourceAt(target.x, target.y) || this.placedAt(target.x, target.y) || this.state.soil[keyOf(target.x, target.y)]?.crop) return this.toast("Face an empty farm tile.");
      Object.entries(recipe.cost).forEach(([item, amount]) => { this.state.inventory[item] -= amount; });
      this.state.placed.push({ id: Date.now(), type: id, x: target.x + .5, y: target.y + .5 }); this.closeModal(); this.toast(`${recipe.name} placed.`); return;
    }
    Object.entries(recipe.cost).forEach(([item, amount]) => { this.state.inventory[item] -= amount; });
    this.addItem(id === "forestTea" ? "tea" : id, 1, false); this.closeModal(); this.toast(`${recipe.name} crafted.`);
  },

exportSave() {
    const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `hearthvale-v3-day-${this.state.day}.json`; link.click(); URL.revokeObjectURL(url);
  },

updateHUD() {
    if (!this.state) return;
    $("dayLabel").textContent = this.state.mode === "cave" ? `${this.state.day} · F${this.state.cave.currentFloor}` : this.state.day;
    $("timeLabel").textContent = formatTime(this.state.minutes);
    $("weatherLabel").textContent = this.state.mode === "cave" ? `⛏️ ${caveTier(this.state.cave.currentFloor).name}` : `${WEATHER[this.state.weather].icon} ${this.state.weather}`;
    $("coinLabel").textContent = Math.floor(this.state.coins);
    $("energyText").textContent = Math.ceil(this.state.player.energy);
    $("healthText").textContent = Math.ceil(this.state.player.health);
    $("energyFill").style.width = `${this.state.player.energy / this.state.player.maxEnergy * 100}%`;
    $("healthFill").style.width = `${this.state.player.health / this.state.player.maxHealth * 100}%`;
  },

buildToolbar() {
    if (!this.state) return;
    $("toolbar").innerHTML = TOOLS.map((tool, index) => {
      let count = "";
      let icon = tool.icon;
      let title = tool.name;
      if (tool.id === "seed") { count = this.state.inventory[CROPS[this.state.selectedCrop].seed] || 0; title = `${CROPS[this.state.selectedCrop].name} Seeds`; }
      if (tool.id === "snack") { const id = ["caveTonic", "potion", "tea", "snack"].find((item) => (this.state.inventory[item] || 0) > 0); if (id) { count = this.state.inventory[id]; icon = ITEMS[id].icon; title = ITEMS[id].name; } else count = 0; }
      return `<button class="tool-slot ${index === this.state.selectedTool ? "selected" : ""}" data-tool="${index}" title="${title}"><span class="tool-key">${index + 1}</span><span class="tool-icon">${icon}</span>${count !== "" ? `<span class="tool-count">${count}</span>` : ""}</button>`;
    }).join("");
    document.querySelectorAll("[data-tool]").forEach((button) => button.onclick = () => this.selectTool(Number(button.dataset.tool)));
  },

selectTool(index) { this.state.selectedTool = clamp(index, 0, TOOLS.length - 1); this.buildToolbar(); this.toast(`${TOOLS[this.state.selectedTool].name} selected.`); },

updateContextHint() {
    const hint = $("contextHint");
    const player = this.state.player;
    let text = "";
    if (this.state.mode === "cave") {
      const merchant = this.currentCave?.merchants.find((entry) => distance(player, entry) < 1.6);
      if (merchant) text = `Interact: ${merchant.name}`;
      else if (this.currentCave?.chest && !this.currentCave.chest.opened && distance(player, this.currentCave.chest) < 1.7) text = "Interact: Open rare chest";
      else if (distance(player, this.currentCave?.entry || {x:-10,y:-10}) < 1.7) text = this.currentCave.floor === 1 ? "Interact: Exit Grand Depths" : "Interact: Go up one floor";
      else if (distance(player, this.currentCave?.exit || {x:-10,y:-10}) < 1.7) text = this.currentCave.floor === 50 ? "Interact: Complete expedition" : "Interact: Descend one floor";
      else text = `Floor ${this.currentCave?.floor || 1}/50 · Use sword and pickaxe`;
    } else {
      const npc = this.state.npcs.find((entry) => distance(player, entry) < 1.5);
      const building = BUILDINGS.find((entry) => distance(player, { x: entry.door.x + .5, y: entry.door.y + .5 }) < 2.2);
      const cave = CAVE_ENTRANCES.find((entry) => distance(player, entry) < 2);
      const stone = WAYSTONES.find((entry) => distance(player, entry) < 1.8);
      if (npc) text = `Interact: Talk to ${npc.name}`;
      else if (building) text = `Interact: ${building.name}`;
      else if (cave) text = `Interact: Enter ${cave.name}`;
      else if (stone) text = `Interact: ${stone.name} Waystone`;
      else text = `${regionAt(player.x, player.y).name} · ${TOOLS[this.state.selectedTool].name}`;
    }
    hint.textContent = text; hint.classList.toggle("hidden", !text);
  }
};
