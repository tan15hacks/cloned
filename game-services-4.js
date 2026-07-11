import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock, $, clamp, keyOf, distance, randomChoice, safeParse, formatTime, randomInt, GUILD_RANKS, FORAGE_TYPES, AXE_TYPES, PICK_TYPES, forecastWeather } from "./game-shared.js";

export const game_services_4 = {
toggleGameMenu() {
    if (!this.running) return;
    if (this.dialogueOpen) return this.closeDialogue();
    if (this.modalOpen) return this.closeModal();
    this.openModal("Adventure Menu", `<div class="menu-grid"><button id="inventoryMenu">🎒 Inventory</button><button id="craftingMenu">🛠️ Crafting</button><button id="questsMenu">📜 Requests</button><button id="guildMenu">⚔️ Guild</button><button id="mapMenu">🗺️ World Map</button><button id="peopleMenu">🤝 Residents</button><button id="journalMenu">📖 Journal</button><button id="statsMenu">🏆 Statistics</button><button id="settingsMenu">⚙️ Settings</button><button id="saveMenu">💾 Save</button></div>`, [
      { label: "Resume", action: () => this.closeModal() }, { label: "Title Screen", action: () => this.leaveToTitle() },
    ]);
    $("inventoryMenu").onclick = () => this.showInventory();
    $("craftingMenu").onclick = () => this.showCrafting();
    $("questsMenu").onclick = () => this.openQuestBoard();
    $("guildMenu").onclick = () => this.openGuild();
    $("mapMenu").onclick = () => this.showWorldMap();
    $("peopleMenu").onclick = () => this.showRelationships();
    $("journalMenu").onclick = () => this.showJournal();
    $("statsMenu").onclick = () => this.showStats();
    $("settingsMenu").onclick = () => this.showSettings(true);
    $("saveMenu").onclick = () => { this.saveGame(false); this.closeModal(); };
  },

showInventory() {
    const items = Object.entries(this.state.inventory).filter(([, count]) => count > 0).map(([id, count]) => `<article class="inventory-item"><span class="item-icon">${ITEMS[id]?.icon || "📦"}</span><strong>${ITEMS[id]?.name || id}</strong><small>Quantity: ${count}</small><small>Value: ${ITEMS[id]?.value || 0}</small></article>`).join("");
    this.openModal("Inventory", `<div class="inventory-grid">${items || "<p>Your backpack is empty.</p>"}</div>`, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
  },

showWorldMap() {
    const cards = REGIONS.map((region) => `<article class="relationship" style="border-left:10px solid ${region.color}"><h3>${this.state.visitedRegions.includes(region.id) ? "✅" : "❔"} ${region.name}</h3><p>${region.safe ? "Safe settlement or peaceful region" : `${region.reward.toUpperCase()} reward monster region · 3 unique monster species`}</p></article>`).join("");
    this.openModal("Continental World Map — 256 × 224", `<p><strong>57,344 tiles</strong> across ${REGIONS.length} regions. Only nearby chunks are rendered for mobile performance.</p>${cards}`, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
  },

showRelationships() {
    const html = this.state.npcs.map((npc) => `<article class="relationship"><h3>${npc.emoji} ${npc.name}</h3><div class="progress"><i style="width:${npc.friendship * 10}%"></i></div><p>${regionAt(npc.home.x, npc.home.y).name} · Friendship ${npc.friendship}/10 · Favorite ${ITEMS[npc.favorite].icon}</p></article>`).join("");
    this.openModal("Residents", html, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
  },

showJournal() { this.openModal("Adventure Journal", this.state.journal.map((entry) => `<p>• ${entry}</p>`).join(""), [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]); },

showStats() {
    const stats = this.state.stats;
    const achievements = this.state.achievements.length ? this.state.achievements.map((achievement) => `<p>🏆 <strong>${achievement.title}</strong> — ${achievement.description}</p>`).join("") : "<p>No achievements unlocked yet.</p>";
    this.openModal("Achievements & Statistics", `<div class="inventory-grid"><article class="inventory-item"><strong>${REGIONS.length}</strong><small>world regions</small></article><article class="inventory-item"><strong>57,344</strong><small>world tiles</small></article><article class="inventory-item"><strong>${stats.regionsVisited}</strong><small>regions discovered</small></article><article class="inventory-item"><strong>${stats.deepestFloor}</strong><small>deepest cave floor</small></article><article class="inventory-item"><strong>${stats.monstersDefeated}</strong><small>monsters defeated</small></article><article class="inventory-item"><strong>${stats.chestsFound}</strong><small>1% chests found</small></article><article class="inventory-item"><strong>${this.state.guild.rank}</strong><small>guild rank</small></article><article class="inventory-item"><strong>${this.state.guild.xp}</strong><small>guild XP</small></article></div><hr>${achievements}`, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
  },

checkAchievement(id, condition, title, description) {
    if (!condition || this.state.achievements.some((entry) => entry.id === id)) return;
    this.state.achievements.push({ id, title, description, day: this.state.day }); this.sound("success"); this.toast(`Achievement: ${title}`);
  },

showSettings(fromGame) {
    const checked = (value) => value ? "checked" : "";
    this.openModal("Settings", `<label class="settings-row"><span>Sound effects</span><input id="soundSetting" type="checkbox" ${checked(this.settings.sound)}></label><label class="settings-row"><span>Vibration</span><input id="vibrationSetting" type="checkbox" ${checked(this.settings.vibration)}></label><label class="settings-row"><span>Minimap on desktop</span><input id="minimapSetting" type="checkbox" ${checked(this.settings.minimap)}></label><label class="settings-row"><span>Fullscreen</span><button id="fullscreenSetting">Toggle Fullscreen</button></label><hr><div class="dialogue-choices"><button id="exportSave">Export Save</button><button id="importButton">Import Save</button><input id="importSave" type="file" accept="application/json" hidden></div>`, [{ label: fromGame ? "Back" : "Close", action: () => { this.closeModal(); if (fromGame) this.toggleGameMenu(); } }]);
    $("soundSetting").onchange = (event) => { this.settings.sound = event.target.checked; this.saveSettings(); };
    $("vibrationSetting").onchange = (event) => { this.settings.vibration = event.target.checked; this.saveSettings(); };
    $("minimapSetting").onchange = (event) => { this.settings.minimap = event.target.checked; this.saveSettings(); };
    $("fullscreenSetting").onclick = () => document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
    $("exportSave").onclick = () => this.state ? this.exportSave() : this.toast("Start a game first.");
    $("importButton").onclick = () => $("importSave").click();
    $("importSave").onchange = (event) => this.importSave(event.target.files?.[0]);
  }
};
