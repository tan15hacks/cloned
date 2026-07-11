import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock, $, clamp, keyOf, distance, randomChoice, safeParse, formatTime, randomInt, GUILD_RANKS, FORAGE_TYPES, AXE_TYPES, PICK_TYPES, forecastWeather } from "./game-shared.js";

export const game_base = {
emptyInventory() {
    return Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0]));
  },

defaultState() {
    const inventory = this.emptyInventory();
    Object.assign(inventory, { turnipSeed: 12, berrySeed: 4, moonSeed: 1, snack: 3, potion: 1 });
    return {
      version: 3,
      mapVersion: 3,
      mode: "world",
      player: { x: 11.5, y: 15.5, facing: "down", energy: 100, maxEnergy: 100, health: 100, maxHealth: 100, speed: 4.5 },
      day: 1,
      minutes: 360,
      weather: "Clear",
      tomorrowWeather: forecastWeather(2),
      coins: 300,
      selectedTool: 0,
      selectedCrop: "turnip",
      inventory,
      soil: {},
      resources: generateResources(1),
      placed: [],
      npcs: NPC_DEFS.map((npc) => ({ ...npc, friendship: 0, talkedDay: 0, x: npc.home.x, y: npc.home.y })),
      monsters: generateMonsters(1),
      quests: generateQuests(1),
      questStats: { wood: 0, stone: 0, copper: 0, harvest: 0, fish: 0, talk: 0, monsters: 0, forage: 0, explore: 1, caveFloors: 0 },
      visitedRegions: ["farm"],
      dayVisitedRegions: ["farm"],
      discoveredWaystones: ["farm"],
      completedQuests: [],
      beacon: { level: 0, wood: 0, stone: 0, produce: 0 },
      achievements: [],
      stats: { steps: 0, cropsHarvested: 0, fishCaught: 0, monstersDefeated: 0, daysPlayed: 0, totalEarned: 0, regionsVisited: 1, deepestFloor: 1, chestsFound: 0 },
      tutorial: { moved: false, tool: false, planted: false, slept: false, citySeen: false, caveSeen: false },
      journal: ["Day 1: The continent now stretches far beyond Hearthvale. Silvercrest and the wild regions await."],
      upgrades: { toolPower: 1, weaponPower: 1, armor: 0, backpack: 40 },
      mote: { unlocked: false, bond: 0 },
      flags: { introSeen: false, legacyMigrated: false, caveBossDefeated: false },
      guild: { xp: 0, rank: "F", bounties: generateGuildBounties(1), dailyKills: {}, completed: 0 },
      cave: { maxFloor: 1, currentFloor: 1, runSeed: randomInt(1000, 999999), clearedMonsters: [], minedNodes: [], openedChests: [], visitedFloors: [1] },
    };
  },

migrateState(data) {
    const base = this.defaultState();
    if (!data || typeof data !== "object") return base;
    if (data.version === 3 && data.mapVersion === 3) {
      return {
        ...base, ...data,
        player: { ...base.player, ...(data.player || {}) },
        inventory: { ...base.inventory, ...(data.inventory || {}) },
        questStats: { ...base.questStats, ...(data.questStats || {}) },
        beacon: { ...base.beacon, ...(data.beacon || {}) },
        stats: { ...base.stats, ...(data.stats || {}) },
        tutorial: { ...base.tutorial, ...(data.tutorial || {}) },
        upgrades: { ...base.upgrades, ...(data.upgrades || {}) },
        mote: { ...base.mote, ...(data.mote || {}) },
        flags: { ...base.flags, ...(data.flags || {}) },
        guild: { ...base.guild, ...(data.guild || {}), dailyKills: { ...(data.guild?.dailyKills || {}) } },
        cave: { ...base.cave, ...(data.cave || {}) },
      };
    }
    const inventory = { ...base.inventory, ...(data.inventory || {}) };
    return {
      ...base,
      day: Math.max(1, Number(data.day) || 1),
      minutes: clamp(Number(data.minutes) || 360, 300, 1320),
      weather: WEATHER[data.weather] ? data.weather : "Clear",
      tomorrowWeather: forecastWeather((Number(data.day) || 1) + 1),
      coins: Math.max(0, Number(data.coins) || 300),
      inventory,
      beacon: { ...base.beacon, ...(data.beacon || {}) },
      achievements: Array.isArray(data.achievements) ? data.achievements : [],
      completedQuests: Array.isArray(data.completedQuests) ? data.completedQuests : [],
      stats: { ...base.stats, ...(data.stats || {}) },
      upgrades: { ...base.upgrades, ...(data.upgrades || {}) },
      mote: { ...base.mote, ...(data.mote || {}) },
      soil: {},
      journal: ["The old valley save was migrated into the 57,344-tile continent. Farm plots were reset so the new aligned world remains stable.", ...(Array.isArray(data.journal) ? data.journal : [])].slice(0, 30),
      flags: { ...base.flags, legacyMigrated: true, introSeen: true },
    };
  },

bindUI() {
    addEventListener("resize", () => this.resize());
    addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
      const key = event.key.toLowerCase();
      this.keys.add(key);
      if (!event.repeat) this.justPressed.add(key);
      if (/^[1-8]$/.test(event.key) && this.running && !this.modalOpen && !this.dialogueOpen) this.selectTool(Number(event.key) - 1);
      if ((event.key === "Escape" || key === "m") && this.running) this.toggleGameMenu();
    });
    addEventListener("keyup", (event) => this.keys.delete(event.key.toLowerCase()));
    $("newGameButton").addEventListener("click", () => this.confirmNewGame());
    $("continueButton").addEventListener("click", () => this.continueGame());
    $("howToButton").addEventListener("click", () => this.showHowToPlay());
    $("settingsButton").addEventListener("click", () => this.showSettings(false));
    $("menuButton").addEventListener("click", () => this.toggleGameMenu());
    $("modalClose").addEventListener("click", () => this.closeModal());
    $("actionButton").addEventListener("pointerdown", (event) => { event.preventDefault(); this.useTool(); });
    $("interactButton").addEventListener("pointerdown", (event) => { event.preventDefault(); this.interact(); });
    this.bindJoystick();
    document.addEventListener("visibilitychange", () => { if (document.hidden && this.running) this.saveGame(true); });
    addEventListener("beforeunload", () => { if (this.running) this.saveGame(true); });
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
  },

bindJoystick() {
    const joystick = $("joystick");
    const stick = $("stick");
    let active = false;
    let pointerId = null;
    const update = (event) => {
      const rect = joystick.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let dx = event.clientX - centerX;
      let dy = event.clientY - centerY;
      const max = rect.width * .31;
      const length = Math.hypot(dx, dy) || 1;
      if (length > max) { dx = dx / length * max; dy = dy / length * max; }
      stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.touchVector.x = dx / max;
      this.touchVector.y = dy / max;
    };
    joystick.addEventListener("pointerdown", (event) => { active = true; pointerId = event.pointerId; joystick.setPointerCapture(pointerId); update(event); });
    joystick.addEventListener("pointermove", (event) => { if (active && event.pointerId === pointerId) update(event); });
    const end = (event) => {
      if (event.pointerId !== pointerId) return;
      active = false; pointerId = null; this.touchVector.x = 0; this.touchVector.y = 0;
      stick.style.transform = "translate(-50%, -50%)";
    };
    joystick.addEventListener("pointerup", end);
    joystick.addEventListener("pointercancel", end);
  },

resize() {
    const dpr = clamp(devicePixelRatio || 1, 1, 2);
    this.screen = { width: innerWidth, height: innerHeight, dpr };
    this.canvas.width = Math.round(innerWidth * dpr);
    this.canvas.height = Math.round(innerHeight * dpr);
    this.canvas.style.width = `${innerWidth}px`;
    this.canvas.style.height = `${innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  },

loadSettings() {
    return { sound: true, vibration: true, minimap: true, ...safeParse(localStorage.getItem(SETTINGS_KEY), {}) };
  },

saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); },

updateContinueState() {
    const hasSave = Boolean(localStorage.getItem(SAVE_KEY) || LEGACY_SAVE_KEYS.some((key) => localStorage.getItem(key)));
    const button = $("continueButton");
    button.disabled = !hasSave;
    button.style.opacity = hasSave ? "1" : ".45";
    button.title = hasSave ? "Continue your saved continent" : "No saved game yet";
  },

confirmNewGame() {
    if (!localStorage.getItem(SAVE_KEY) && !LEGACY_SAVE_KEYS.some((key) => localStorage.getItem(key))) return this.startNewGame();
    this.openModal("Start a New Continent?", "<p>This replaces the local save on this device. Export the current save first for a backup.</p>", [
      { label: "Cancel", action: () => this.closeModal() },
      { label: "Start New Game", danger: true, action: () => { localStorage.removeItem(SAVE_KEY); LEGACY_SAVE_KEYS.forEach((key) => localStorage.removeItem(key)); this.closeModal(); this.startNewGame(); } },
    ]);
  },

startNewGame() {
    this.state = this.defaultState();
    this.enterGame();
    setTimeout(() => this.showIntro(), 250);
  },

continueGame() {
    let raw = localStorage.getItem(SAVE_KEY);
    if (!raw) raw = LEGACY_SAVE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    const parsed = safeParse(raw);
    if (!parsed) {
      localStorage.removeItem(SAVE_KEY);
      LEGACY_SAVE_KEYS.forEach((key) => localStorage.removeItem(key));
      this.updateContinueState();
      return this.openModal("Save Could Not Be Loaded", "<p>The local save was damaged and was removed.</p>", [{ label: "Close", action: () => this.closeModal() }]);
    }
    this.state = this.migrateState(parsed);
    this.enterGame();
    this.toast(`Welcome back — Day ${this.state.day}, Guild Rank ${this.state.guild.rank}.`);
  },

enterGame() {
    $("titleScreen").classList.remove("active");
    $("hud").classList.remove("hidden");
    $("toolbar").classList.remove("hidden");
    $("menuButton").classList.remove("hidden");
    if (matchMedia("(pointer: coarse)").matches || innerWidth < 900) $("touchControls").classList.remove("hidden");
    this.running = true;
    this.paused = false;
    this.modalOpen = false;
    this.dialogueOpen = false;
    this.state.mode = this.state.mode === "cave" ? "world" : this.state.mode;
    this.state.player.x = clamp(this.state.player.x, 2, WORLD_W - 2);
    this.state.player.y = clamp(this.state.player.y, 2, WORLD_H - 2);
    this.currentCave = null;
    this.rebuildResourceMap();
    this.buildToolbar();
    this.updateHUD();
    this.saveGame(true);
  },

leaveToTitle() {
    this.saveGame(true);
    this.running = false;
    this.paused = true;
    this.closeModal();
    $("titleScreen").classList.add("active");
    $("hud").classList.add("hidden");
    $("toolbar").classList.add("hidden");
    $("menuButton").classList.add("hidden");
    $("touchControls").classList.add("hidden");
    $("contextHint").classList.add("hidden");
    this.updateContinueState();
  },

showIntro() {
    if (this.state.flags.introSeen) return;
    this.state.flags.introSeen = true;
    this.showDialogue({ name: "Guildmaster Aria", emoji: "🧝🏽‍♀️" }, "Hearthvale is now part of a vast continent. Silvercrest City needs farmers, explorers, miners, and monster hunters. The Grand Depths beneath the city descend through fifty floors.", [
      { label: "Begin the adventure", action: () => { this.closeDialogue(); this.toast("Follow the main road east to reach Silvercrest City."); } },
      { label: "Tell me about the wilds", action: () => this.showDialogue({ name: "Guildmaster Aria", emoji: "🧝🏽‍♀️" }, "Greenfield Wilds are safe for beginners. The swamp, dark forest, mist, snow, ruins, and volcano grow more dangerous. Dreadwild has the strongest surface monsters and the richest rewards.", [{ label: "Understood", action: () => this.closeDialogue() }]) },
    ]);
  },

saveGame(silent = false) {
    if (!this.state) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
      this.updateContinueState();
      if (!silent) this.toast("Adventure saved on this device.");
    } catch {
      if (!silent) this.toast("Save failed because browser storage is unavailable.");
    }
  },

rebuildResourceMap() {
    this.resourceMap.clear();
    for (const resource of this.state.resources) if (resource.hp > 0) this.resourceMap.set(keyOf(Math.floor(resource.x), Math.floor(resource.y)), resource);
  },

loop(now) {
    const dt = Math.min(.05, (now - this.lastFrame) / 1000 || 0);
    this.lastFrame = now;
    if (this.running && !this.paused && !this.modalOpen && !this.dialogueOpen) this.update(dt);
    this.render();
    this.justPressed.clear();
    requestAnimationFrame((time) => this.loop(time));
  },

update(dt) {
    this.updatePlayer(dt);
    this.updateMonsters(dt);
    this.attackFlash = Math.max(0, this.attackFlash - dt);
    this.zoneBanner.timer = Math.max(0, this.zoneBanner.timer - dt);
    this.state.minutes += dt * (this.state.mode === "cave" ? 5 : 9);
    if (this.state.minutes >= 1380) this.toast("It is very late. Return home or use the city inn.");
    if (this.state.minutes >= 1440) this.passOut();
    if (this.justPressed.has("e") || this.justPressed.has("enter")) this.interact();
    if (this.justPressed.has(" ") || this.justPressed.has("f")) this.useTool();
    if (this.justPressed.has("q")) this.cycleSeed();
    this.discoverLocation();
    this.updateCamera();
    this.updateHUD();
    this.updateContextHint();
  },

updatePlayer(dt) {
    const player = this.state.player;
    let dx = 0;
    let dy = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;
    dx += this.touchVector.x;
    dy += this.touchVector.y;
    const length = Math.hypot(dx, dy);
    if (length <= .08) return;
    dx /= Math.max(1, length);
    dy /= Math.max(1, length);
    if (Math.abs(dx) > Math.abs(dy)) player.facing = dx > 0 ? "right" : "left";
    else player.facing = dy > 0 ? "down" : "up";
    let speed = player.speed * (player.energy <= 10 ? .72 : 1);
    if (this.state.mode === "world" && isPathTile(Math.floor(player.x), Math.floor(player.y))) speed *= 1.16;
    const nx = player.x + dx * speed * dt;
    const ny = player.y + dy * speed * dt;
    if (!this.collides(nx, player.y, .28)) player.x = nx;
    if (!this.collides(player.x, ny, .28)) player.y = ny;
    this.state.stats.steps += Math.hypot(dx, dy) * dt;
    if (!this.state.tutorial.moved && this.state.stats.steps > 3) {
      this.state.tutorial.moved = true;
      this.toast("The main road leads east to Hearthvale Village and Silvercrest City.");
    }
  },

collides(x, y, radius = .3) {
    if (this.state.mode === "cave") {
      if (!this.currentCave) return true;
      const corners = [[x - radius, y - radius], [x + radius, y - radius], [x - radius, y + radius], [x + radius, y + radius]];
      for (const [cx, cy] of corners) {
        const tx = Math.floor(cx); const ty = Math.floor(cy);
        if (tx < 0 || ty < 0 || tx >= CAVE_W || ty >= CAVE_H || this.currentCave.tiles[ty][tx] === "wall") return true;
      }
      for (const node of this.currentCave.nodes) if (node.hp > 0 && Math.hypot(x - node.x, y - node.y) < radius + .38) return true;
      return false;
    }
    if (x - radius < 1 || y - radius < 1 || x + radius > WORLD_W - 1 || y + radius > WORLD_H - 1) return true;
    const corners = [[x - radius, y - radius], [x + radius, y - radius], [x - radius, y + radius], [x + radius, y + radius]];
    for (const [cx, cy] of corners) {
      if (isWaterTile(Math.floor(cx), Math.floor(cy))) return true;
      if (buildingAtTile(cx, cy)) return true;
    }
    const nearby = this.resourceMap.get(keyOf(Math.floor(x), Math.floor(y)));
    if (nearby && nearby.hp > 0 && !FORAGE_TYPES.has(nearby.type) && nearby.type !== "grass") return true;
    for (const placed of this.state.placed) if (Math.hypot(x - placed.x, y - placed.y) < radius + .35) return true;
    return false;
  },

targetTile(range = 1.05) {
    const player = this.state.player;
    const dirs = { up: [0, -range], down: [0, range], left: [-range, 0], right: [range, 0] };
    const vector = dirs[player.facing];
    return { x: Math.floor(player.x + vector[0]), y: Math.floor(player.y + vector[1]) };
  },

currentResourceAt(x, y) {
    if (this.state.mode === "cave") return this.currentCave?.nodes.find((node) => node.hp > 0 && Math.floor(node.x) === x && Math.floor(node.y) === y);
    return this.resourceMap.get(keyOf(x, y));
  },

useTool() {
    if (!this.running || this.paused || this.modalOpen || this.dialogueOpen) return;
    const tool = TOOLS[this.state.selectedTool];
    const target = this.targetTile();
    if (!tool) return;
    if (!["rod", "sword", "snack"].includes(tool.id) && this.state.player.energy <= 0) return this.toast("You are exhausted. Eat, drink a potion, or sleep.");
    this.state.tutorial.tool = true;
    if (tool.id === "hoe") this.useHoe(target);
    else if (tool.id === "water") this.useWater(target);
    else if (tool.id === "axe") this.hitResource(target, "axe");
    else if (tool.id === "pick") this.hitResource(target, "pick");
    else if (tool.id === "seed") this.plantSeed(target);
    else if (tool.id === "rod") this.beginFishing();
    else if (tool.id === "sword") this.swingSword();
    else if (tool.id === "snack") this.useConsumable();
    this.buildToolbar();
    this.updateHUD();
  }
};
