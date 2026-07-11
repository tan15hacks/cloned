import {
  TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEY, SETTINGS_KEY,
  ITEMS, CROPS, TOOLS, RECIPES, SHOP_ITEMS, WEATHER, BUILDINGS,
  WAYSTONES, INTERACTIONS, NPC_DEFS, isWaterTile, isPathTile,
  isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile,
  zoneAt, terrainAt, generateResources, generateMonsters, generateQuests,
} from "./world.js";

const $ = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const keyOf = (x, y) => `${x},${y}`;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const randomChoice = (items) => items[Math.floor(Math.random() * items.length)];
const formatTime = (minutes) => {
  const total = Math.floor(minutes);
  let hour = Math.floor(total / 60) % 24;
  const mins = total % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${String(mins).padStart(2, "0")} ${suffix}`;
};
const safeParse = (text, fallback = null) => {
  try { return JSON.parse(text); } catch { return fallback; }
};

function forecastWeather(day) {
  if (day % 7 === 0) return "Sparkfall";
  const value = Math.abs(Math.sin(day * 9.173 + 2.71));
  if (value < 0.19) return "Rain";
  if (value < 0.39) return "Cloudy";
  if (value > 0.93) return "Sparkfall";
  return "Clear";
}

class HearthvaleGame {
  constructor() {
    this.canvas = $("game");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.keys = new Set();
    this.justPressed = new Set();
    this.touchVector = { x: 0, y: 0 };
    this.lastFrame = performance.now();
    this.running = false;
    this.paused = true;
    this.modalOpen = false;
    this.dialogueOpen = false;
    this.fishingTimer = null;
    this.toastTimer = null;
    this.audio = null;
    this.state = null;
    this.camera = { x: 0, y: 0 };
    this.screen = { width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 };
    this.settings = this.loadSettings();
    this.currentZone = null;
    this.zoneBanner = { text: "", timer: 0 };
    this.bindUI();
    this.resize();
    this.updateContinueState();
    requestAnimationFrame((time) => this.loop(time));
  }

  defaultState() {
    return {
      version: 2,
      mapVersion: 2,
      player: { x: 11.5, y: 12.5, facing: "down", energy: 100, maxEnergy: 100, health: 100, maxHealth: 100, speed: 4.35 },
      day: 1,
      minutes: 360,
      weather: "Clear",
      tomorrowWeather: forecastWeather(2),
      coins: 250,
      selectedTool: 0,
      selectedCrop: "turnip",
      inventory: {
        wood: 0, stone: 0, copper: 0,
        turnipSeed: 12, berrySeed: 3, moonSeed: 0,
        turnip: 0, berry: 0, moonbean: 0,
        fish: 0, rareFish: 0, fiber: 0, herb: 0,
        mushroom: 0, apple: 0, snack: 2, tea: 0, crystal: 0,
      },
      soil: {},
      resources: generateResources(1),
      placed: [],
      npcs: NPC_DEFS.map((npc) => ({ ...npc, friendship: 0, talkedDay: 0, x: npc.home.x, y: npc.home.y })),
      monsters: generateMonsters(1),
      quests: generateQuests(1),
      questStats: { wood: 0, stone: 0, copper: 0, harvest: 0, fish: 0, talk: 0, monsters: 0, forage: 0, explore: 1 },
      dayVisitedZones: ["farm"],
      visitedZones: ["farm"],
      discoveredWaystones: ["farm"],
      completedQuests: [],
      beacon: { level: 0, wood: 0, stone: 0, produce: 0 },
      achievements: [],
      stats: { steps: 0, cropsHarvested: 0, fishCaught: 0, monstersDefeated: 0, daysPlayed: 0, totalEarned: 0, zonesVisited: 1 },
      tutorial: { moved: false, tool: false, planted: false, slept: false, mapSeen: false },
      journal: ["Day 1: I arrived at the expanded Farmstead. Proper roads now connect the whole valley."],
      upgrades: { toolPower: 1, backpack: 30 },
      mote: { unlocked: false, bond: 0 },
      flags: { introSeen: false, mineIntro: false, legacyMigrated: false },
      groveBlessingDay: 0,
    };
  }

  migrateState(data) {
    const base = this.defaultState();
    if (!data || typeof data !== "object") return base;
    if (data.version === 2 && data.mapVersion === 2) {
      return {
        ...base,
        ...data,
        player: { ...base.player, ...(data.player || {}) },
        inventory: { ...base.inventory, ...(data.inventory || {}) },
        questStats: { ...base.questStats, ...(data.questStats || {}) },
        beacon: { ...base.beacon, ...(data.beacon || {}) },
        stats: { ...base.stats, ...(data.stats || {}) },
        tutorial: { ...base.tutorial, ...(data.tutorial || {}) },
        upgrades: { ...base.upgrades, ...(data.upgrades || {}) },
        mote: { ...base.mote, ...(data.mote || {}) },
        flags: { ...base.flags, ...(data.flags || {}) },
        dayVisitedZones: Array.isArray(data.dayVisitedZones) ? data.dayVisitedZones : ["farm"],
        visitedZones: Array.isArray(data.visitedZones) ? data.visitedZones : ["farm"],
        discoveredWaystones: Array.isArray(data.discoveredWaystones) ? data.discoveredWaystones : ["farm"],
      };
    }

    const migratedSoil = {};
    for (const [key, soil] of Object.entries(data.soil || {})) {
      const [x, y] = key.split(",").map(Number);
      if (isFarmableTile(x, y)) migratedSoil[key] = soil;
    }
    return {
      ...base,
      day: Math.max(1, Number(data.day) || 1),
      minutes: clamp(Number(data.minutes) || 360, 300, 1320),
      weather: WEATHER[data.weather] ? data.weather : "Clear",
      tomorrowWeather: forecastWeather((Number(data.day) || 1) + 1),
      coins: Math.max(0, Number(data.coins) || 250),
      selectedTool: clamp(Number(data.selectedTool) || 0, 0, TOOLS.length - 1),
      selectedCrop: CROPS[data.selectedCrop] ? data.selectedCrop : "turnip",
      inventory: { ...base.inventory, ...(data.inventory || {}) },
      soil: migratedSoil,
      placed: Array.isArray(data.placed) ? data.placed.filter((p) => isFarmableTile(Math.floor(p.x), Math.floor(p.y))) : [],
      beacon: { ...base.beacon, ...(data.beacon || {}) },
      achievements: Array.isArray(data.achievements) ? data.achievements : [],
      completedQuests: Array.isArray(data.completedQuests) ? data.completedQuests : [],
      stats: { ...base.stats, ...(data.stats || {}) },
      upgrades: { ...base.upgrades, ...(data.upgrades || {}) },
      mote: { ...base.mote, ...(data.mote || {}) },
      journal: ["The valley map was rebuilt and expanded. Existing crops and progress were moved safely to the new Farmstead.", ...(Array.isArray(data.journal) ? data.journal : [])].slice(0, 24),
      flags: { ...base.flags, legacyMigrated: true, introSeen: true },
    };
  }

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

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.running) this.saveGame(true);
    });
    addEventListener("beforeunload", () => { if (this.running) this.saveGame(true); });
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
  }

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
      const max = rect.width * 0.31;
      const length = Math.hypot(dx, dy) || 1;
      if (length > max) { dx = dx / length * max; dy = dy / length * max; }
      stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.touchVector.x = dx / max;
      this.touchVector.y = dy / max;
    };
    joystick.addEventListener("pointerdown", (event) => {
      active = true;
      pointerId = event.pointerId;
      joystick.setPointerCapture(pointerId);
      update(event);
    });
    joystick.addEventListener("pointermove", (event) => { if (active && event.pointerId === pointerId) update(event); });
    const end = (event) => {
      if (event.pointerId !== pointerId) return;
      active = false;
      pointerId = null;
      this.touchVector.x = 0;
      this.touchVector.y = 0;
      stick.style.transform = "translate(-50%, -50%)";
    };
    joystick.addEventListener("pointerup", end);
    joystick.addEventListener("pointercancel", end);
  }

  resize() {
    const dpr = clamp(devicePixelRatio || 1, 1, 2);
    this.screen = { width: innerWidth, height: innerHeight, dpr };
    this.canvas.width = Math.round(innerWidth * dpr);
    this.canvas.height = Math.round(innerHeight * dpr);
    this.canvas.style.width = `${innerWidth}px`;
    this.canvas.style.height = `${innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  loadSettings() {
    return { sound: true, vibration: true, minimap: true, ...safeParse(localStorage.getItem(SETTINGS_KEY), {}) };
  }

  saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
  }

  updateContinueState() {
    const hasSave = Boolean(localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY));
    const button = $("continueButton");
    button.disabled = !hasSave;
    button.style.opacity = hasSave ? "1" : ".45";
    button.title = hasSave ? "Continue your saved valley" : "No saved valley yet";
  }

  confirmNewGame() {
    if (!localStorage.getItem(SAVE_KEY) && !localStorage.getItem(LEGACY_SAVE_KEY)) return this.startNewGame();
    this.openModal("Start a New Valley?", "<p>This replaces the local save on this device. Export the current save first if you want a backup.</p>", [
      { label: "Cancel", action: () => this.closeModal() },
      { label: "Start New Valley", danger: true, action: () => { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(LEGACY_SAVE_KEY); this.closeModal(); this.startNewGame(); } },
    ]);
  }

  startNewGame() {
    this.state = this.defaultState();
    this.enterGame();
    setTimeout(() => this.showIntro(), 250);
  }

  continueGame() {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY);
    const parsed = safeParse(raw);
    if (!parsed) {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(LEGACY_SAVE_KEY);
      this.updateContinueState();
      return this.openModal("Save Could Not Be Loaded", "<p>The local save was damaged and was removed. Start a new valley to continue.</p>", [{ label: "Close", action: () => this.closeModal() }]);
    }
    this.state = this.migrateState(parsed);
    this.enterGame();
    if (this.state.flags.legacyMigrated) {
      localStorage.removeItem(LEGACY_SAVE_KEY);
      this.saveGame(true);
      this.toast("Your old save was migrated to the expanded map.");
    } else {
      this.toast(`Welcome back — Day ${this.state.day}.`);
    }
  }

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
    this.currentZone = null;
    this.updateZone(true);
    this.buildToolbar();
    this.updateHUD();
    this.updateCamera(true);
    this.saveGame(true);
  }

  leaveToTitle() {
    this.saveGame(true);
    this.running = false;
    this.paused = true;
    this.closeModal();
    this.closeDialogue();
    $("titleScreen").classList.add("active");
    $("hud").classList.add("hidden");
    $("toolbar").classList.add("hidden");
    $("menuButton").classList.add("hidden");
    $("touchControls").classList.add("hidden");
    $("contextHint").classList.add("hidden");
    this.updateContinueState();
  }

  showIntro() {
    if (this.state.flags.introSeen) return;
    this.state.flags.introSeen = true;
    this.showDialogue({ name: "Mira", emoji: "👩🏽‍🌾" }, "Welcome back to Hearthvale. We rebuilt the roads, aligned every building to the valley grid, and opened the routes to Moonlake, Whisperwood, Northwatch, and Ember Ridge.", [
      { label: "Show me the valley", action: () => { this.closeDialogue(); this.showWorldMap(); } },
      { label: "I’ll explore", action: () => { this.closeDialogue(); this.toast("Follow the tan roads. Press M to open the valley menu."); } },
    ]);
  }

  saveGame(silent = false) {
    if (!this.state) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
      this.updateContinueState();
      if (!silent) this.toast("Valley saved on this device.");
    } catch {
      if (!silent) this.toast("Save failed: browser storage is unavailable.");
    }
  }

  exportSave() {
    if (!this.state) return this.toast("Start a valley before exporting a save.");
    const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hearthvale-expanded-day-${this.state.day}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  importSave(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = safeParse(String(reader.result));
      if (!parsed || !parsed.inventory || !parsed.day) return this.toast("That file is not a valid Hearthvale save.");
      this.state = this.migrateState(parsed);
      this.saveGame(true);
      this.closeModal();
      this.buildToolbar();
      this.updateHUD();
      this.updateCamera(true);
      this.toast("Valley imported successfully.");
    };
    reader.readAsText(file);
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000 || 0);
    this.lastFrame = now;
    if (this.running && !this.paused && !this.modalOpen && !this.dialogueOpen) this.update(dt);
    this.render();
    this.justPressed.clear();
    requestAnimationFrame((time) => this.loop(time));
  }

  update(dt) {
    this.updatePlayer(dt);
    this.updateNPCs(dt);
    this.updateMonsters(dt);
    this.state.minutes += dt * 9.5;
    if (this.state.minutes >= 1320 && this.state.minutes < 1321) this.toast("It is getting late. Return to the Farmhouse before midnight.");
    if (this.state.minutes >= 1440) this.passOut();
    if (this.justPressed.has("e") || this.justPressed.has("enter")) this.interact();
    if (this.justPressed.has(" ") || this.justPressed.has("f")) this.useTool();
    if (this.justPressed.has("q")) this.cycleSeed();
    this.updateZone(false, dt);
    this.discoverNearbyWaystone();
    this.updateCamera(false);
    this.updateHUD();
    this.updateContextHint();
  }

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
    if (length <= 0.08) return;
    dx /= Math.max(1, length);
    dy /= Math.max(1, length);
    if (Math.abs(dx) > Math.abs(dy)) player.facing = dx > 0 ? "right" : "left";
    else player.facing = dy > 0 ? "down" : "up";
    const roadBonus = isPathTile(Math.floor(player.x), Math.floor(player.y)) ? 1.08 : 1;
    const tiredPenalty = player.energy <= 10 ? 0.72 : 1;
    const speed = player.speed * roadBonus * tiredPenalty;
    const nextX = player.x + dx * speed * dt;
    const nextY = player.y + dy * speed * dt;
    if (!this.collides(nextX, player.y, 0.28)) player.x = nextX;
    if (!this.collides(player.x, nextY, 0.28)) player.y = nextY;
    this.state.stats.steps += Math.hypot(dx, dy) * dt;
    if (!this.state.tutorial.moved && this.state.stats.steps > 3) {
      this.state.tutorial.moved = true;
      this.toast("The roads are faster. Use the Hoe inside the fenced farm field.");
    }
  }

  collides(x, y, radius = 0.3, ignoreResources = false) {
    if (x - radius < 1 || y - radius < 1 || x + radius > WORLD_W - 1 || y + radius > WORLD_H - 1) return true;
    const corners = [[x - radius, y - radius], [x + radius, y - radius], [x - radius, y + radius], [x + radius, y + radius]];
    for (const [cx, cy] of corners) {
      const tx = Math.floor(cx);
      const ty = Math.floor(cy);
      if (isWaterTile(tx, ty) || buildingAtTile(tx, ty)) return true;
    }
    if (!ignoreResources) {
      for (const resource of this.state.resources) {
        if (resource.hp <= 0 || ["grass", "herb", "mushroom"].includes(resource.type)) continue;
        const size = ["tree", "fruitTree"].includes(resource.type) ? 0.54 : 0.4;
        if (Math.hypot(x - resource.x, y - resource.y) < radius + size) return true;
      }
      for (const placed of this.state.placed) if (Math.hypot(x - placed.x, y - placed.y) < radius + 0.35) return true;
    }
    return false;
  }

  targetTile(range = 1.05) {
    const player = this.state.player;
    const direction = { up: [0, -range], down: [0, range], left: [-range, 0], right: [range, 0] }[player.facing];
    return { x: Math.floor(player.x + direction[0]), y: Math.floor(player.y + direction[1]) };
  }

  updateZone(force = false, dt = 0) {
    if (this.zoneBanner.timer > 0) this.zoneBanner.timer = Math.max(0, this.zoneBanner.timer - dt);
    const zone = zoneAt(this.state.player.x, this.state.player.y);
    if (!force && this.currentZone?.id === zone.id) return;
    this.currentZone = zone;
    this.zoneBanner = { text: zone.name, timer: 2.4 };
    if (!this.state.dayVisitedZones.includes(zone.id)) {
      this.state.dayVisitedZones.push(zone.id);
      this.state.questStats.explore = this.state.dayVisitedZones.length;
      this.checkQuests();
    }
    if (!this.state.visitedZones.includes(zone.id)) {
      this.state.visitedZones.push(zone.id);
      this.state.stats.zonesVisited = this.state.visitedZones.length;
      this.state.journal.unshift(`Day ${this.state.day}: Discovered ${zone.name}.`);
      this.checkAchievement("explorer", this.state.visitedZones.length >= 6, "Valley Cartographer", "Visit all six major valley zones.");
    }
  }

  discoverNearbyWaystone() {
    const player = this.state.player;
    const stone = WAYSTONES.find((waystone) => distance(player, waystone) < 1.45);
    if (!stone || this.state.discoveredWaystones.includes(stone.id)) return;
    this.state.discoveredWaystones.push(stone.id);
    this.sound("success");
    this.toast(`Waystone discovered: ${stone.name}.`);
  }

  updateCamera(immediate = false) {
    const targetX = clamp(this.state.player.x * TILE - this.screen.width / 2, 0, Math.max(0, WORLD_W * TILE - this.screen.width));
    const targetY = clamp(this.state.player.y * TILE - this.screen.height / 2, 0, Math.max(0, WORLD_H * TILE - this.screen.height));
    if (immediate) {
      this.camera.x = targetX;
      this.camera.y = targetY;
    } else {
      this.camera.x += (targetX - this.camera.x) * 0.13;
      this.camera.y += (targetY - this.camera.y) * 0.13;
    }
  }

  useTool() {
    if (!this.running || this.paused || this.modalOpen || this.dialogueOpen) return;
    const tool = TOOLS[this.state.selectedTool];
    const target = this.targetTile();
    if (!["rod", "sword", "snack"].includes(tool.id) && this.state.player.energy <= 0) return this.toast("You are exhausted. Eat or sleep before working more.");
    this.state.tutorial.tool = true;
    if (tool.id === "hoe") this.useHoe(target);
    else if (tool.id === "water") this.useWater(target);
    else if (tool.id === "axe") this.hitResource(target, ["tree", "fruitTree", "grass"], "axe");
    else if (tool.id === "pick") this.hitResource(target, ["rock", "ore", "crystal"], "pick");
    else if (tool.id === "seed") this.plantSeed(target);
    else if (tool.id === "rod") this.beginFishing();
    else if (tool.id === "sword") this.swingSword();
    else if (tool.id === "snack") this.consumeItem("snack");
    this.buildToolbar();
    this.updateHUD();
  }

  spendEnergy(amount) {
    const multiplier = this.state.beacon.level >= 2 ? 0.85 : 1;
    this.state.player.energy = clamp(this.state.player.energy - amount * multiplier, 0, this.state.player.maxEnergy);
  }

  useHoe(target) {
    if (!isFarmableTile(target.x, target.y)) return this.toast("Till only the open ground inside the farm field.");
    if (this.resourceAt(target.x, target.y) || this.placedAt(target.x, target.y)) return this.toast("Clear this tile first.");
    const key = keyOf(target.x, target.y);
    const soil = this.state.soil[key];
    if (soil?.crop) return this.toast("A crop is already growing here.");
    this.state.soil[key] = { tilled: true, watered: soil?.watered || false, crop: null };
    this.spendEnergy(2);
    this.sound("dig");
  }

  useWater(target) {
    const soil = this.state.soil[keyOf(target.x, target.y)];
    if (!soil?.tilled) return this.toast("Till the ground before watering it.");
    soil.watered = true;
    this.spendEnergy(1);
    this.sound("water");
  }

  plantSeed(target) {
    const soil = this.state.soil[keyOf(target.x, target.y)];
    const crop = CROPS[this.state.selectedCrop];
    if (!soil?.tilled) return this.toast("Till the ground before planting.");
    if (soil.crop) return this.toast("Something is already planted here.");
    if ((this.state.inventory[crop.seed] || 0) <= 0) return this.toast(`No ${ITEMS[crop.seed].name}. Press Q to choose another seed.`);
    this.state.inventory[crop.seed] -= 1;
    soil.crop = { type: this.state.selectedCrop, growth: 0, plantedDay: this.state.day };
    this.state.tutorial.planted = true;
    this.spendEnergy(1);
    this.sound("plant");
    this.toast(`${crop.name} planted. Water it daily; press Q to cycle seeds.`);
  }

  cycleSeed() {
    const order = ["turnip", "berry", "moonbean"];
    const current = order.indexOf(this.state.selectedCrop);
    for (let offset = 1; offset <= order.length; offset += 1) {
      const next = order[(current + offset) % order.length];
      if ((this.state.inventory[CROPS[next].seed] || 0) > 0) {
        this.state.selectedCrop = next;
        this.buildToolbar();
        return this.toast(`Selected ${CROPS[next].name} seeds.`);
      }
    }
    this.toast("Mira sells more seeds in the Village.");
  }

  resourceAt(x, y) {
    return this.state.resources.find((resource) => resource.hp > 0 && Math.floor(resource.x) === x && Math.floor(resource.y) === y);
  }

  placedAt(x, y) {
    return this.state.placed.find((placed) => Math.floor(placed.x) === x && Math.floor(placed.y) === y);
  }

  hitResource(target, allowed, tool) {
    const resource = this.resourceAt(target.x, target.y);
    if (!resource || !allowed.includes(resource.type)) return this.toast(tool === "axe" ? "Use the axe on trees or grass." : "Use the pickaxe on rocks, ore, or crystals.");
    resource.hp -= this.state.upgrades.toolPower;
    this.spendEnergy(resource.type === "grass" ? 1 : 2);
    this.sound("hit");
    if (resource.hp > 0) return;
    if (resource.type === "tree") this.addItem("wood", 4 + Math.floor(Math.random() * 3), true);
    if (resource.type === "fruitTree") { this.addItem("wood", 3, false); this.addItem("apple", 2 + Math.floor(Math.random() * 2), true); }
    if (resource.type === "grass") this.addItem("fiber", 1 + Math.floor(Math.random() * 2), true);
    if (resource.type === "rock") this.addItem("stone", 2 + Math.floor(Math.random() * 2), true);
    if (resource.type === "ore") { this.addItem("stone", 1, false); this.addItem("copper", 2 + Math.floor(Math.random() * 2), true); }
    if (resource.type === "crystal") { this.addItem("stone", 2, false); this.addItem("crystal", 1, true); }
    this.state.resources = this.state.resources.filter((item) => item.id !== resource.id);
  }

  collectForage() {
    const player = this.state.player;
    const forage = this.state.resources.find((resource) => resource.hp > 0 && ["herb", "mushroom"].includes(resource.type) && distance(player, resource) < 1.45);
    if (!forage) return false;
    const item = forage.type;
    this.state.resources = this.state.resources.filter((resource) => resource.id !== forage.id);
    this.addItem(item, 1, true);
    this.sound("harvest");
    return true;
  }

  addItem(id, amount = 1, announce = false) {
    this.state.inventory[id] = (this.state.inventory[id] || 0) + amount;
    if (this.state.questStats[id] !== undefined) this.state.questStats[id] += amount;
    if (["herb", "mushroom", "apple"].includes(id)) this.state.questStats.forage += amount;
    if (announce) this.toast(`+${amount} ${ITEMS[id]?.name || id}`);
    this.checkQuests();
    this.buildToolbar();
  }

  beginFishing() {
    const player = this.state.player;
    let nearWater = false;
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        if (Math.abs(dx) + Math.abs(dy) <= 2 && isWaterTile(Math.floor(player.x + dx), Math.floor(player.y + dy))) nearWater = true;
      }
    }
    if (!nearWater) return this.toast("Stand beside the farm pond, river, or Moonlake to fish.");
    this.spendEnergy(2);
    this.openFishingGame();
  }

  openFishingGame() {
    this.modalOpen = true;
    this.paused = true;
    $("modalTitle").textContent = "Fishing — Reel in the Light Zone";
    $("modalBody").innerHTML = `
      <p>Press <strong>REEL</strong> while the fish overlaps the glowing catch zone. You have three attempts.</p>
      <div id="fishTrack" style="position:relative;height:58px;background:#8ec6d8;border:3px solid #10241d;border-radius:12px;overflow:hidden;margin:18px 0">
        <div style="position:absolute;left:58%;width:19%;top:0;bottom:0;background:rgba(239,185,74,.75);border-left:3px solid #10241d;border-right:3px solid #10241d"></div>
        <div id="fishMarker" style="position:absolute;left:0;top:8px;font-size:34px">🐟</div>
      </div>
      <p id="fishStatus"><strong>Attempts:</strong> 3</p>`;
    $("modalActions").innerHTML = `<button id="reelButton">REEL</button><button id="cancelFishing">Cancel</button>`;
    $("modal").classList.remove("hidden");
    let position = 0;
    let direction = 1;
    let attempts = 3;
    const marker = $("fishMarker");
    this.fishingTimer = setInterval(() => {
      position += direction * 1.6;
      if (position >= 91) { position = 91; direction = -1; }
      if (position <= 0) { position = 0; direction = 1; }
      marker.style.left = `${position}%`;
    }, 16);
    $("reelButton").onclick = () => {
      if (position >= 53 && position <= 78) {
        clearInterval(this.fishingTimer);
        this.fishingTimer = null;
        const atLake = zoneAt(this.state.player.x, this.state.player.y).id === "lake";
        const rareChance = this.state.weather === "Sparkfall" ? 0.38 : atLake ? 0.16 : 0.09;
        const item = Math.random() < rareChance ? "rareFish" : "fish";
        this.addItem(item, 1, false);
        this.state.questStats.fish += 1;
        this.state.stats.fishCaught += 1;
        this.checkQuests();
        this.closeModal();
        this.sound("success");
        this.toast(`Caught ${ITEMS[item].name}!`);
        this.checkAchievement("angler", this.state.stats.fishCaught >= 5, "Pond Whisperer", "Catch 5 fish.");
      } else {
        attempts -= 1;
        this.vibrate(45);
        $("fishStatus").innerHTML = `<strong>Attempts:</strong> ${attempts} — The fish slipped away.`;
        if (attempts <= 0) {
          clearInterval(this.fishingTimer);
          this.fishingTimer = null;
          this.closeModal();
          this.toast("The fish escaped. Try again when your timing feels right.");
        }
      }
    };
    $("cancelFishing").onclick = () => this.closeModal();
  }

  swingSword() {
    const player = this.state.player;
    let hit = false;
    for (const monster of this.state.monsters) {
      if (monster.hp <= 0 || distance(player, monster) > 1.5) continue;
      monster.hp -= this.state.upgrades.toolPower + 1;
      const angle = Math.atan2(monster.y - player.y, monster.x - player.x);
      monster.x += Math.cos(angle) * 0.55;
      monster.y += Math.sin(angle) * 0.55;
      hit = true;
      if (monster.hp <= 0) {
        this.state.stats.monstersDefeated += 1;
        this.state.questStats.monsters += 1;
        if (Math.random() < 0.55) this.addItem("copper", 1, false);
        if (Math.random() < 0.14) this.addItem("crystal", 1, false);
        this.checkQuests();
        this.checkAchievement("guardian", this.state.stats.monstersDefeated >= 5, "Ridge Guardian", "Defeat 5 creatures.");
      }
    }
    this.sound(hit ? "hit" : "swing");
  }

  consumeItem(id) {
    if ((this.state.inventory[id] || 0) <= 0) return this.toast(`You have no ${ITEMS[id]?.name || id}.`);
    if (id === "snack" && this.state.player.energy >= this.state.player.maxEnergy) return this.toast("Your energy is already full.");
    this.state.inventory[id] -= 1;
    if (id === "snack") this.state.player.energy = clamp(this.state.player.energy + 30, 0, this.state.player.maxEnergy);
    if (id === "tea") {
      this.state.player.energy = clamp(this.state.player.energy + 45, 0, this.state.player.maxEnergy);
      this.state.player.health = clamp(this.state.player.health + 15, 0, this.state.player.maxHealth);
    }
    this.buildToolbar();
    this.updateHUD();
    this.sound("eat");
    this.toast(`${ITEMS[id].name} consumed.`);
  }

  interact() {
    if (!this.running || this.paused || this.modalOpen || this.dialogueOpen) return;
    const player = this.state.player;
    const npc = this.state.npcs.find((person) => distance(player, person) < 1.45);
    if (npc) return this.talkToNPC(npc);
    if (this.collectForage()) return;

    const target = this.targetTile(0.9);
    const soil = this.state.soil[keyOf(target.x, target.y)];
    if (soil?.crop && soil.crop.growth >= CROPS[soil.crop.type].days) return this.harvestCrop(target, soil);

    const near = (point, range = 1.9) => distance(player, point) < range;
    const building = BUILDINGS.find((item) => near({ x: item.door.x + 0.5, y: item.door.y + 0.5 }, 1.8));
    if (building?.id === "farmhouse") return this.offerSleep();
    if (building?.id === "barn") return this.openBarnLedger();
    if (building?.id === "shop") return this.openShop();
    if (building?.id === "inn") return this.openInn();
    if (building?.id === "workshop") return this.openWorkshop();
    if (building?.id === "hall") return this.showRelationships();
    if (building?.id === "observatory") return this.openObservatory();
    if (near(INTERACTIONS.questBoard, 1.6)) return this.openQuestBoard();
    if (near(INTERACTIONS.beacon, 2.0)) return this.openBeacon();
    if (near(INTERACTIONS.grove, 2.0)) return this.visitGrove();
    const waystone = WAYSTONES.find((stone) => near(stone, 1.55));
    if (waystone) return this.openWaystone(waystone);
    if (near(INTERACTIONS.mineEntrance, 2.2) && !this.state.flags.mineIntro) {
      this.state.flags.mineIntro = true;
      return this.showDialogue({ name: "Oren", emoji: "🧔🏽" }, "The mine road now lines up with the entrance. Use the pickaxe on ore and the blade on ridge creatures. Go deeper east for rarer crystals.", [{ label: "Enter carefully", action: () => this.closeDialogue() }]);
    }
    if (near(INTERACTIONS.dock, 2.0)) return this.toast("Use the Fishing Rod at the Moonlake dock. Sparkfall increases rare catches.");
    this.toast("Nothing nearby to interact with.");
  }

  harvestCrop(target, soil) {
    const crop = CROPS[soil.crop.type];
    const resonance = this.calculateCropResonance(target.x, target.y, soil.crop.type);
    const lanternBonus = this.state.placed.some((placed) => placed.type === "lantern" && Math.hypot(placed.x - (target.x + 0.5), placed.y - (target.y + 0.5)) <= 3) ? 1 : 0;
    const beaconBonus = this.state.beacon.level >= 3 ? 1 : 0;
    const yieldAmount = 1 + (resonance >= 2 ? 1 : 0) + lanternBonus + beaconBonus;
    this.addItem(crop.produce, yieldAmount, false);
    this.state.questStats.harvest += 1;
    this.state.stats.cropsHarvested += yieldAmount;
    soil.crop = null;
    soil.watered = false;
    this.checkQuests();
    this.sound("harvest");
    this.toast(`Harvested ${yieldAmount} ${crop.name}${yieldAmount > 1 ? "s" : ""}${resonance >= 2 ? " with Harmony!" : "."}`);
    this.checkAchievement("first-harvest", this.state.stats.cropsHarvested >= 1, "First Harvest", "Harvest your first crop.");
    this.checkAchievement("harmonic-field", resonance >= 3, "Harmonic Field", "Harvest with 3 or more Harmony links.");
  }

  calculateCropResonance(x, y, type) {
    let score = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const neighbor = this.state.soil[keyOf(x + dx, y + dy)]?.crop;
      if (neighbor && neighbor.type !== type && neighbor.growth >= CROPS[neighbor.type].days) score += neighbor.type === "moonbean" ? 2 : 1;
    }
    if (this.state.weather === "Sparkfall" && type === "moonbean") score += 2;
    return score;
  }

  talkToNPC(npc) {
    const firstToday = npc.talkedDay !== this.state.day;
    if (firstToday) {
      npc.talkedDay = this.state.day;
      npc.friendship = clamp(npc.friendship + 1, 0, 10);
      this.state.questStats.talk += 1;
      if (npc.id === "lumi") this.state.mote.bond += 1;
      this.checkQuests();
    }
    const choices = [{ label: "Goodbye", action: () => this.closeDialogue() }];
    if ((this.state.inventory[npc.favorite] || 0) > 0) {
      choices.unshift({ label: `Gift ${ITEMS[npc.favorite].name}`, action: () => {
        this.state.inventory[npc.favorite] -= 1;
        npc.friendship = clamp(npc.friendship + 2, 0, 10);
        this.showDialogue(npc, `This is wonderful. Friendship with ${npc.name}: ${npc.friendship}/10.`, [{ label: "You’re welcome", action: () => this.closeDialogue() }]);
        this.checkAchievement("friend", npc.friendship >= 8, "Valley Friend", "Reach 8 friendship with a villager.");
      } });
    }
    this.showDialogue(npc, `${randomChoice(npc.lines)}${firstToday ? ` Friendship: ${npc.friendship}/10.` : ""}`, choices);
  }

  offerSleep() {
    this.openModal("Sleep Until Morning", `<p>End Day ${this.state.day} and save your progress?</p><p>${this.state.minutes < 1080 ? "It is still early, but you may sleep whenever you choose." : "A full night restores your energy and health."}</p>`, [
      { label: "Stay Awake", action: () => this.closeModal() },
      { label: "Sleep", action: () => { this.closeModal(); this.nextDay(false); } },
    ]);
  }

  passOut() {
    const fee = Math.min(80, Math.floor(this.state.coins * 0.1));
    this.state.coins -= fee;
    this.toast(`You passed out. The inn charged ${fee} coins to bring you home.`);
    this.nextDay(true);
  }

  nextDay(passedOut) {
    const state = this.state;
    state.day += 1;
    state.stats.daysPlayed += 1;
    state.minutes = 360;
    state.weather = state.tomorrowWeather || forecastWeather(state.day);
    state.tomorrowWeather = forecastWeather(state.day + 1);
    state.player.x = 11.5;
    state.player.y = 12.5;
    state.player.energy = passedOut ? Math.floor(state.player.maxEnergy * 0.7) : state.player.maxEnergy;
    state.player.health = clamp(state.player.health + (passedOut ? 10 : 35), 0, state.player.maxHealth);
    for (const soil of Object.values(state.soil)) {
      if (soil.crop && soil.watered) soil.crop.growth += 1;
      soil.watered = state.weather === "Rain";
    }
    for (const placed of state.placed.filter((item) => item.type === "sprinkler")) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const soil = state.soil[keyOf(Math.floor(placed.x) + dx, Math.floor(placed.y) + dy)];
        if (soil) soil.watered = true;
      }
    }
    if (state.mote.unlocked) {
      const dry = Object.values(state.soil).filter((soil) => soil.crop && !soil.watered);
      dry.slice(0, 4 + Math.floor(state.mote.bond / 3)).forEach((soil) => { soil.watered = true; });
    }
    if (state.beacon.level >= 3 && state.day % 3 === 0) this.addItem("moonSeed", 1, false);
    state.questStats = { wood: 0, stone: 0, copper: 0, harvest: 0, fish: 0, talk: 0, monsters: 0, forage: 0, explore: 1 };
    state.dayVisitedZones = ["farm"];
    state.quests = generateQuests(state.day);
    state.monsters = generateMonsters(state.day);
    state.groveBlessingDay = 0;
    this.regrowResources();
    state.journal.unshift(`Day ${state.day}: ${state.weather} weather. Tomorrow's forecast is ${state.tomorrowWeather}.`);
    state.journal = state.journal.slice(0, 24);
    state.tutorial.slept = true;
    this.currentZone = null;
    this.updateZone(true);
    this.updateCamera(true);
    this.saveGame(true);
    this.updateHUD();
    this.toast(`Day ${state.day} — ${state.weather}.${state.weather === "Rain" ? " Every tilled tile is watered." : ""}`);
    this.checkAchievement("week", state.day >= 8, "One Valley Week", "Reach Day 8.");
  }

  regrowResources() {
    const existing = new Set(this.state.resources.map((resource) => keyOf(Math.floor(resource.x), Math.floor(resource.y))));
    const candidates = generateResources(this.state.day).filter((resource) => !existing.has(keyOf(Math.floor(resource.x), Math.floor(resource.y))));
    candidates.sort(() => Math.random() - 0.5);
    const amount = 24 + Math.min(16, this.state.day);
    this.state.resources.push(...candidates.slice(0, amount));
  }

  openShop() {
    const rows = SHOP_ITEMS.map((item) => `
      <article class="shop-item"><div><h3>${ITEMS[item.id].icon} ${ITEMS[item.id].name} ×${item.amount}</h3><p>${item.description}</p><p><strong>${item.price} ◈</strong></p></div><button data-buy="${item.id}">Buy</button></article>`).join("");
    this.openModal("Mira’s Seed Stall", `<p>Your coins: <strong>${this.state.coins} ◈</strong></p><div class="shop-list">${rows}</div><hr><p>Sell crops, fish, and forage from every zone.</p>`, [
      { label: "Sell Produce, Fish & Forage", action: () => this.sellGoods() },
      { label: "Close", action: () => this.closeModal() },
    ]);
    document.querySelectorAll("[data-buy]").forEach((button) => {
      button.onclick = () => {
        const item = SHOP_ITEMS.find((entry) => entry.id === button.dataset.buy);
        if (this.state.coins < item.price) return this.toast("Not enough coins.");
        this.state.coins -= item.price;
        this.addItem(item.id, item.amount, false);
        this.sound("coin");
        this.closeModal();
        this.toast(`Bought ${ITEMS[item.id].name} ×${item.amount}.`);
      };
    });
  }

  sellGoods() {
    const sellable = ["turnip", "berry", "moonbean", "fish", "rareFish", "herb", "mushroom", "apple"];
    let total = 0;
    for (const id of sellable) {
      const count = this.state.inventory[id] || 0;
      total += count * ITEMS[id].value;
      this.state.inventory[id] = 0;
    }
    if (total <= 0) return this.toast("You have no crops, fish, or forage to sell.");
    const bonus = this.state.beacon.level >= 1 ? Math.floor(total * 0.1) : 0;
    total += bonus;
    this.state.coins += total;
    this.state.stats.totalEarned += total;
    this.closeModal();
    this.sound("coin");
    this.toast(`Sold goods for ${total} coins${bonus ? " with the Beacon bonus" : ""}.`);
    this.checkAchievement("merchant", this.state.stats.totalEarned >= 1000, "Valley Merchant", "Earn 1,000 coins.");
  }

  openInn() {
    const upgradePrice = 250 * this.state.upgrades.toolPower;
    this.openModal("The Hearth & Kettle", `<div class="shop-list">
      <article class="shop-item"><div><h3>🍲 Valley Stew</h3><p>Restore all energy and 25 health.</p><p><strong>65 ◈</strong></p></div><button id="buyStew">Eat</button></article>
      <article class="shop-item"><div><h3>🛏️ Guest Room</h3><p>Sleep immediately and begin a new day.</p><p><strong>25 ◈</strong></p></div><button id="rentRoom">Rest</button></article>
      <article class="shop-item"><div><h3>🛠️ Tool Tempering</h3><p>Increase axe, pickaxe, and sword power.</p><p><strong>${upgradePrice} ◈</strong></p></div><button id="upgradeTools">Upgrade</button></article>
    </div>`, [{ label: "Close", action: () => this.closeModal() }]);
    $("buyStew").onclick = () => {
      if (this.state.coins < 65) return this.toast("Not enough coins.");
      this.state.coins -= 65;
      this.state.player.energy = this.state.player.maxEnergy;
      this.state.player.health = clamp(this.state.player.health + 25, 0, this.state.player.maxHealth);
      this.closeModal();
      this.toast("The stew restored all your energy.");
    };
    $("rentRoom").onclick = () => {
      if (this.state.coins < 25) return this.toast("Not enough coins.");
      this.state.coins -= 25;
      this.closeModal();
      this.nextDay(false);
    };
    $("upgradeTools").onclick = () => {
      if (this.state.upgrades.toolPower >= 4) return this.toast("Your tools are already masterwork quality.");
      if (this.state.coins < upgradePrice) return this.toast("Not enough coins.");
      this.state.coins -= upgradePrice;
      this.state.upgrades.toolPower += 1;
      this.closeModal();
      this.toast(`Tools upgraded to power ${this.state.upgrades.toolPower}.`);
    };
  }

  openWorkshop() {
    this.openModal("Oren’s Workshop", "<p>Craft field equipment or temper your tools at the workbench.</p>", [
      { label: "Crafting", action: () => this.showCrafting() },
      { label: "Tool Upgrade", action: () => { this.closeModal(); this.openInn(); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
  }

  openBarnLedger() {
    const planted = Object.values(this.state.soil).filter((soil) => soil.crop).length;
    const ready = Object.values(this.state.soil).filter((soil) => soil.crop && soil.crop.growth >= CROPS[soil.crop.type].days).length;
    this.openModal("Farm Ledger", `<div class="inventory-grid">
      <article class="inventory-item"><strong>${planted}</strong><small>crops planted</small></article>
      <article class="inventory-item"><strong>${ready}</strong><small>ready to harvest</small></article>
      <article class="inventory-item"><strong>${this.totalHarmony()}</strong><small>farm Harmony</small></article>
      <article class="inventory-item"><strong>${this.state.placed.filter((item) => item.type === "sprinkler").length}</strong><small>sprinklers placed</small></article>
    </div><p>The barn ledger updates instantly and helps plan the next morning.</p>`, [{ label: "Close", action: () => this.closeModal() }]);
  }

  openObservatory() {
    this.openModal("Starwatch Observatory", `<p>Sora’s instruments forecast tomorrow with unusual accuracy.</p><div class="help-section"><h3>${WEATHER[this.state.tomorrowWeather].icon} Tomorrow: ${this.state.tomorrowWeather}</h3><p>${this.state.tomorrowWeather === "Rain" ? "All tilled soil will be watered." : this.state.tomorrowWeather === "Sparkfall" ? "Moonbeans resonate strongly and rare fish become more common." : "Plan your watering and exploration normally."}</p></div><p>Every seventh day is guaranteed Sparkfall.</p>`, [{ label: "Close", action: () => this.closeModal() }]);
  }

  visitGrove() {
    if (this.state.groveBlessingDay === this.state.day) return this.toast("The grove has already shared its blessing today.");
    this.state.groveBlessingDay = this.state.day;
    this.state.player.energy = clamp(this.state.player.energy + 25, 0, this.state.player.maxEnergy);
    this.state.player.health = clamp(this.state.player.health + 10, 0, this.state.player.maxHealth);
    if (this.state.weather === "Rain") this.addItem("mushroom", 1, false);
    else this.addItem("herb", 1, false);
    this.sound("success");
    this.toast("The Whisperwood Grove restored 25 energy and 10 health.");
  }

  openQuestBoard() {
    const html = this.state.quests.map((quest) => {
      const progress = Math.min(quest.target, this.state.questStats[quest.type] || 0);
      return `<article class="quest"><h3>${quest.title}</h3><p>${quest.text}</p><div class="progress"><i style="width:${progress / quest.target * 100}%"></i></div><p>${progress}/${quest.target} · Reward ${quest.reward} ◈</p>${progress >= quest.target && !quest.claimed ? `<button data-claim="${quest.id}">Claim Reward</button>` : quest.claimed ? "<strong>Completed</strong>" : ""}</article>`;
    }).join("");
    this.openModal("Community Requests", html, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-claim]").forEach((button) => { button.onclick = () => this.claimQuest(button.dataset.claim); });
  }

  claimQuest(id) {
    const quest = this.state.quests.find((entry) => entry.id === id);
    if (!quest || quest.claimed || (this.state.questStats[quest.type] || 0) < quest.target) return;
    quest.claimed = true;
    this.state.coins += quest.reward;
    this.state.stats.totalEarned += quest.reward;
    this.state.completedQuests.push(quest.id);
    this.closeModal();
    this.sound("success");
    this.toast(`Request complete: ${quest.title}. +${quest.reward} coins.`);
    this.checkAchievement("helper", this.state.completedQuests.length >= 5, "Community Helper", "Complete 5 requests.");
  }

  checkQuests() {
    for (const quest of this.state.quests) {
      if (!quest.claimed && (this.state.questStats[quest.type] || 0) >= quest.target && !quest.notified) {
        quest.notified = true;
        this.toast(`Request ready: ${quest.title}. Claim it at the Village board.`);
      }
    }
  }

  openBeacon() {
    const beacon = this.state.beacon;
    const thresholds = [
      { level: 1, wood: 30, stone: 20, produce: 5, reward: "Market prices +10% and Mote awakens." },
      { level: 2, wood: 65, stone: 55, produce: 18, reward: "Tool energy costs fall 15% and discovered Waystones enable fast travel." },
      { level: 3, wood: 110, stone: 95, produce: 35, reward: "Every harvest gains +1 yield and Moon Seeds arrive every third day." },
    ];
    const tiers = thresholds.map((tier) => `<article class="restore-tier"><h3>${tier.level <= beacon.level ? "✅" : "🔆"} Hearthlight Tier ${tier.level}</h3><p>${tier.reward}</p><p>Wood ${Math.min(beacon.wood, tier.wood)}/${tier.wood} · Stone ${Math.min(beacon.stone, tier.stone)}/${tier.stone} · Produce ${Math.min(beacon.produce, tier.produce)}/${tier.produce}</p></article>`).join("");
    const produce = (this.state.inventory.turnip || 0) + (this.state.inventory.berry || 0) + (this.state.inventory.moonbean || 0);
    this.openModal("Hearthlight Beacon", `<p>Donations accumulate across all three restoration tiers.</p>${tiers}<p><strong>Inventory:</strong> ${this.state.inventory.wood} wood · ${this.state.inventory.stone} stone · ${produce} produce</p>`, [
      { label: "Donate 10 Wood", action: () => this.donateBeacon("wood", 10) },
      { label: "Donate 10 Stone", action: () => this.donateBeacon("stone", 10) },
      { label: "Donate 5 Produce", action: () => this.donateProduce(5) },
      { label: "Close", action: () => this.closeModal() },
    ]);
  }

  donateBeacon(type, amount) {
    const actual = Math.min(amount, this.state.inventory[type] || 0);
    if (actual <= 0) return this.toast(`You have no ${type} to donate.`);
    this.state.inventory[type] -= actual;
    this.state.beacon[type] += actual;
    this.evaluateBeacon();
    this.closeModal();
    this.openBeacon();
  }

  donateProduce(amount) {
    let remaining = amount;
    let donated = 0;
    for (const id of ["turnip", "berry", "moonbean"]) {
      const take = Math.min(remaining, this.state.inventory[id] || 0);
      this.state.inventory[id] -= take;
      remaining -= take;
      donated += take;
    }
    if (donated <= 0) return this.toast("You have no harvested produce to donate.");
    this.state.beacon.produce += donated;
    this.evaluateBeacon();
    this.closeModal();
    this.openBeacon();
  }

  evaluateBeacon() {
    const beacon = this.state.beacon;
    const levels = [
      beacon.wood >= 30 && beacon.stone >= 20 && beacon.produce >= 5,
      beacon.wood >= 65 && beacon.stone >= 55 && beacon.produce >= 18,
      beacon.wood >= 110 && beacon.stone >= 95 && beacon.produce >= 35,
    ];
    const level = levels.filter(Boolean).length;
    if (level <= beacon.level) return;
    beacon.level = level;
    if (level >= 1) this.state.mote.unlocked = true;
    this.state.journal.unshift(`Day ${this.state.day}: The Hearthlight reached Tier ${level}.`);
    this.sound("success");
    this.toast(`Hearthlight restored to Tier ${level}!`);
    this.checkAchievement("beacon", level >= 1, "Light the Valley", "Restore the first Hearthlight tier.");
    this.checkAchievement("beacon-master", level >= 3, "Hearthkeeper", "Fully restore the Hearthlight Beacon.");
  }

  openWaystone(stone) {
    if (!this.state.discoveredWaystones.includes(stone.id)) this.state.discoveredWaystones.push(stone.id);
    if (this.state.beacon.level < 2) return this.openModal(stone.name, "<p>The Waystone hums faintly, but the Hearthlight must reach Tier 2 before it can carry travelers.</p>", [{ label: "Close", action: () => this.closeModal() }]);
    const destinations = WAYSTONES.filter((waystone) => this.state.discoveredWaystones.includes(waystone.id) && waystone.id !== stone.id);
    const html = destinations.length ? destinations.map((waystone) => `<button data-travel="${waystone.id}">${waystone.name}</button>`).join("") : "<p>Discover another Waystone before fast traveling.</p>";
    this.openModal(`${stone.name} Waystone`, `<p>Choose a discovered destination. Travel does not advance time.</p><div class="menu-grid">${html}</div>`, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-travel]").forEach((button) => {
      button.onclick = () => {
        const destination = WAYSTONES.find((waystone) => waystone.id === button.dataset.travel);
        this.state.player.x = destination.spawn.x;
        this.state.player.y = destination.spawn.y;
        this.closeModal();
        this.currentZone = null;
        this.updateZone(true);
        this.updateCamera(true);
        this.sound("success");
        this.toast(`Traveled to ${destination.name}.`);
      };
    });
  }

  showCrafting() {
    const html = RECIPES.map((recipe) => {
      const cost = Object.entries(recipe.cost).map(([id, amount]) => `${ITEMS[id].icon} ${amount} ${ITEMS[id].name}`).join(" · ");
      return `<article class="recipe"><h3>${recipe.icon} ${recipe.name}</h3><p>${recipe.description}</p><p>${cost}</p><button data-craft="${recipe.id}" ${this.canAffordItems(recipe.cost) ? "" : "disabled"}>Craft</button></article>`;
    }).join("");
    this.openModal("Crafting", `<div class="recipe-list">${html}</div><p>Sprinklers and lanterns are placed on the empty farm tile in front of you.</p>`, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-craft]").forEach((button) => { button.onclick = () => this.craft(button.dataset.craft); });
  }

  canAffordItems(cost) {
    return Object.entries(cost).every(([id, amount]) => (this.state.inventory[id] || 0) >= amount);
  }

  craft(id) {
    const recipe = RECIPES.find((entry) => entry.id === id);
    if (!recipe || !this.canAffordItems(recipe.cost)) return this.toast("You do not have all required materials.");
    if (["sprinkler", "lantern"].includes(id)) {
      const target = this.targetTile();
      if (!isFarmableTile(target.x, target.y) || this.resourceAt(target.x, target.y) || this.placedAt(target.x, target.y) || this.state.soil[keyOf(target.x, target.y)]?.crop) return this.toast("Face an empty farm tile to place this object.");
      for (const [item, amount] of Object.entries(recipe.cost)) this.state.inventory[item] -= amount;
      this.state.placed.push({ id: Date.now(), type: id, x: target.x + 0.5, y: target.y + 0.5 });
      this.closeModal();
      return this.toast(`${recipe.name} placed on the grid.`);
    }
    for (const [item, amount] of Object.entries(recipe.cost)) this.state.inventory[item] -= amount;
    this.addItem(id === "forestTea" ? "tea" : "snack", 1, false);
    this.closeModal();
    this.toast(`${recipe.name} crafted.`);
  }

  updateNPCs(dt) {
    const minutes = this.state.minutes;
    for (const npc of this.state.npcs) {
      let target = npc.home;
      if (npc.id === "mira") target = minutes < 1020 ? { x: 53.5, y: 15.5 } : { x: 59.5, y: 18.5 };
      if (npc.id === "oren") target = minutes < 720 ? { x: 83.5, y: 39.5 } : minutes < 1080 ? { x: 53.5, y: 30.5 } : { x: 70.5, y: 16.5 };
      if (npc.id === "lumi") target = minutes < 900 ? { x: 67.5, y: 31.5 } : { x: 56.5, y: 40.5 };
      if (npc.id === "tavi") target = minutes < 840 ? { x: 27.5, y: 55.5 } : { x: 20.5, y: 32.5 };
      if (npc.id === "sora") target = minutes < 780 ? { x: 91.5, y: 14.5 } : { x: 58.5, y: 39.5 };
      const dx = target.x - npc.x;
      const dy = target.y - npc.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.12) continue;
      const nextX = npc.x + dx / length * dt * 1.15;
      const nextY = npc.y + dy / length * dt * 1.15;
      if (!this.collides(nextX, npc.y, 0.25, true)) npc.x = nextX;
      if (!this.collides(npc.x, nextY, 0.25, true)) npc.y = nextY;
    }
  }

  updateMonsters(dt) {
    const player = this.state.player;
    const inRidge = zoneAt(player.x, player.y).id === "ridge";
    for (const monster of this.state.monsters) {
      if (monster.hp <= 0) continue;
      monster.cooldown = Math.max(0, monster.cooldown - dt);
      if (!inRidge) continue;
      const gap = distance(player, monster);
      if (gap < 7 && gap > 0.7) {
        const speed = monster.type === "shade" ? 1.25 : 0.9;
        const nextX = monster.x + (player.x - monster.x) / gap * speed * dt;
        const nextY = monster.y + (player.y - monster.y) / gap * speed * dt;
        if (!this.collides(nextX, monster.y, 0.25, true)) monster.x = nextX;
        if (!this.collides(monster.x, nextY, 0.25, true)) monster.y = nextY;
      }
      if (gap < 0.8 && monster.cooldown <= 0) {
        const damage = monster.type === "shade" ? 12 : 7;
        player.health = clamp(player.health - damage, 0, player.maxHealth);
        monster.cooldown = 1.5;
        this.vibrate(70);
        this.sound("hurt");
        this.toast(`A ${monster.type} hit you for ${damage}.`);
        if (player.health <= 0) this.knockedOut();
      }
    }
  }

  knockedOut() {
    this.state.player.health = 40;
    this.state.player.energy = 35;
    this.state.player.x = 70.5;
    this.state.player.y = 16.5;
    const fee = Math.min(120, Math.floor(this.state.coins * 0.15));
    this.state.coins -= fee;
    this.currentZone = null;
    this.updateZone(true);
    this.updateCamera(true);
    this.toast(`Oren carried you to the inn. Recovery cost: ${fee} coins.`);
  }

  render() {
    const ctx = this.ctx;
    const width = this.screen.width;
    const height = this.screen.height;
    ctx.save();
    ctx.setTransform(this.screen.dpr, 0, 0, this.screen.dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!this.running || !this.state) {
      ctx.fillStyle = "#75ad65";
      ctx.fillRect(0, 0, width, height);
      this.drawTitleBackdrop(ctx, width, height);
      ctx.restore();
      return;
    }
    ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));
    this.drawWorld(ctx);
    this.drawFences(ctx);
    this.drawSoil(ctx);
    this.drawPlaced(ctx);
    this.drawResources(ctx);
    this.drawBuildings(ctx);
    this.drawLandmarks(ctx);
    this.drawNPCs(ctx);
    this.drawMonsters(ctx);
    if (this.state.mote.unlocked) this.drawMote(ctx);
    this.drawPlayer(ctx);
    this.drawTarget(ctx);
    ctx.restore();
    this.drawWeatherAndLighting(ctx, width, height);
    if (this.settings.minimap) this.drawMinimap(ctx, width, height);
    this.drawZoneBanner(ctx, width);
  }

  drawTitleBackdrop(ctx, width, height) {
    ctx.fillStyle = "#8ec6d8";
    ctx.fillRect(0, 0, width, height * 0.44);
    ctx.fillStyle = "#4f8b53";
    for (let x = -30; x < width + 100; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x - 30, height * 0.47);
      ctx.lineTo(x + 35, height * 0.28);
      ctx.lineTo(x + 100, height * 0.47);
      ctx.fill();
    }
  }

  drawWorld(ctx) {
    const startX = clamp(Math.floor(this.camera.x / TILE) - 2, 0, WORLD_W);
    const endX = clamp(Math.ceil((this.camera.x + this.screen.width) / TILE) + 2, 0, WORLD_W);
    const startY = clamp(Math.floor(this.camera.y / TILE) - 2, 0, WORLD_H);
    const endY = clamp(Math.ceil((this.camera.y + this.screen.height) / TILE) + 2, 0, WORLD_H);
    const colors = {
      farm: ["#72aa60", "#6ca259"], field: ["#78ad62", "#72a85d"], village: ["#81b46d", "#79ac65"],
      meadow: ["#66a766", "#5f9f60"], forest: ["#477f4d", "#427747"], stone: ["#555961", "#50545b"],
    };
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const terrain = terrainAt(x, y);
        const px = x * TILE;
        const py = y * TILE;
        if (terrain === "water") {
          ctx.fillStyle = "#4e9cbc";
          ctx.fillRect(px, py, TILE + 1, TILE + 1);
          ctx.fillStyle = "rgba(255,255,255,.24)";
          const wave = (x * 11 + y * 7 + Math.floor(performance.now() / 300)) % 3;
          ctx.fillRect(px + 4 + wave * 6, py + 12, 10, 2);
          this.drawWaterEdges(ctx, x, y);
        } else if (terrain === "bridge") {
          ctx.fillStyle = "#7a5737";
          ctx.fillRect(px, py, TILE + 1, TILE + 1);
          ctx.fillStyle = "#b48750";
          for (let i = 2; i < TILE; i += 8) ctx.fillRect(px + i, py + 2, 5, TILE - 4);
          ctx.strokeStyle = "#4f3627";
          ctx.lineWidth = 2;
          ctx.strokeRect(px, py, TILE, TILE);
        } else if (terrain === "path") {
          ctx.fillStyle = (x + y) % 2 ? "#c6aa74" : "#cdb27d";
          ctx.fillRect(px, py, TILE + 1, TILE + 1);
          this.drawPathEdges(ctx, x, y);
          ctx.fillStyle = "rgba(94,69,42,.18)";
          if ((x * 13 + y * 17) % 5 === 0) ctx.fillRect(px + 8, py + 9, 3, 2);
        } else {
          const palette = colors[terrain] || colors.farm;
          ctx.fillStyle = palette[(x + y) & 1];
          ctx.fillRect(px, py, TILE + 1, TILE + 1);
          const detail = (x * 17 + y * 29) % 17;
          if (detail === 0) {
            ctx.fillStyle = terrain === "stone" ? "rgba(255,255,255,.07)" : "rgba(255,245,190,.13)";
            ctx.fillRect(px + 7, py + 8, 2, 3);
            ctx.fillRect(px + 11, py + 5, 2, 5);
          }
          if (terrain === "stone" && (x * 7 + y * 13) % 9 === 0) {
            ctx.strokeStyle = "rgba(28,30,34,.25)";
            ctx.beginPath(); ctx.moveTo(px + 5, py + 23); ctx.lineTo(px + 14, py + 17); ctx.lineTo(px + 22, py + 22); ctx.stroke();
          }
        }
      }
    }
  }

  drawWaterEdges(ctx, x, y) {
    const px = x * TILE;
    const py = y * TILE;
    ctx.fillStyle = "rgba(28,73,82,.42)";
    if (!isWaterTile(x, y - 1) && !isBridgeTile(x, y - 1)) ctx.fillRect(px, py, TILE, 4);
    if (!isWaterTile(x, y + 1) && !isBridgeTile(x, y + 1)) ctx.fillRect(px, py + TILE - 4, TILE, 4);
    if (!isWaterTile(x - 1, y) && !isBridgeTile(x - 1, y)) ctx.fillRect(px, py, 4, TILE);
    if (!isWaterTile(x + 1, y) && !isBridgeTile(x + 1, y)) ctx.fillRect(px + TILE - 4, py, 4, TILE);
  }

  drawPathEdges(ctx, x, y) {
    const px = x * TILE;
    const py = y * TILE;
    ctx.fillStyle = "rgba(75,59,37,.20)";
    if (!isPathTile(x, y - 1)) ctx.fillRect(px, py, TILE, 3);
    if (!isPathTile(x, y + 1)) ctx.fillRect(px, py + TILE - 3, TILE, 3);
    if (!isPathTile(x - 1, y)) ctx.fillRect(px, py, 3, TILE);
    if (!isPathTile(x + 1, y)) ctx.fillRect(px + TILE - 3, py, 3, TILE);
  }

  drawFences(ctx) {
    const drawFenceSegment = (x, y, horizontal) => {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = "#6c432c";
      if (horizontal) {
        ctx.fillRect(px, py + 12, TILE, 5);
        ctx.fillRect(px + 4, py + 6, 5, 18);
        ctx.fillRect(px + TILE - 8, py + 6, 5, 18);
      } else {
        ctx.fillRect(px + 12, py, 5, TILE);
        ctx.fillRect(px + 6, py + 4, 18, 5);
        ctx.fillRect(px + 6, py + TILE - 8, 18, 5);
      }
    };
    for (let x = 4; x <= 35; x += 1) {
      if (x < 9 || x > 12) drawFenceSegment(x, 12, true);
      if (x < 33 || x > 35) drawFenceSegment(x, 37, true);
    }
    for (let y = 13; y <= 36; y += 1) {
      if (y < 17 || y > 19) drawFenceSegment(3, y, false);
      if (y < 17 || y > 19) drawFenceSegment(36, y, false);
    }
  }

  drawSoil(ctx) {
    for (const [key, soil] of Object.entries(this.state.soil)) {
      const [x, y] = key.split(",").map(Number);
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = soil.watered ? "#584b40" : "#7b5d3d";
      ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = soil.watered ? "#8aa8ba" : "#4f3627";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 5, py + 10); ctx.lineTo(px + TILE - 5, py + 8);
      ctx.moveTo(px + 5, py + 20); ctx.lineTo(px + TILE - 5, py + 18);
      ctx.stroke();
      if (soil.crop) this.drawCrop(ctx, x, y, soil.crop);
    }
  }

  drawCrop(ctx, x, y, cropState) {
    const crop = CROPS[cropState.type];
    const ratio = clamp(cropState.growth / crop.days, 0, 1);
    const centerX = x * TILE + TILE / 2;
    const baseY = y * TILE + TILE - 5;
    ctx.strokeStyle = crop.colors[1];
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(centerX, baseY); ctx.lineTo(centerX, baseY - 8 - ratio * 10); ctx.stroke();
    ctx.fillStyle = crop.colors[1];
    ctx.beginPath(); ctx.ellipse(centerX - 4, baseY - 7 - ratio * 7, 5 + ratio * 2, 3 + ratio, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(centerX + 4, baseY - 10 - ratio * 8, 5 + ratio * 2, 3 + ratio, 0.5, 0, Math.PI * 2); ctx.fill();
    if (ratio >= 1) {
      ctx.fillStyle = crop.colors[2];
      ctx.beginPath(); ctx.arc(centerX, baseY - 16, cropState.type === "berry" ? 6 : 7, 0, Math.PI * 2); ctx.fill();
      if (cropState.type === "moonbean") {
        ctx.shadowColor = "#d9d7ff"; ctx.shadowBlur = 10;
        ctx.fillStyle = "#e9e8ff"; ctx.fillRect(centerX - 2, baseY - 20, 4, 4);
        ctx.shadowBlur = 0;
      }
    }
  }

  drawPlaced(ctx) {
    for (const placed of this.state.placed) {
      const x = placed.x * TILE;
      const y = placed.y * TILE;
      if (placed.type === "sprinkler") {
        ctx.fillStyle = "#6f7e87"; ctx.fillRect(x - 5, y - 12, 10, 22);
        ctx.fillStyle = "#8ec6d8"; ctx.fillRect(x - 12, y - 14, 24, 6);
      } else {
        ctx.fillStyle = "#6c432c"; ctx.fillRect(x - 5, y - 5, 10, 18);
        ctx.fillStyle = "#efb94a"; ctx.shadowColor = "#ffe69b"; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y - 12, 9, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  drawResources(ctx) {
    const visible = this.state.resources.filter((resource) => resource.hp > 0).sort((a, b) => a.y - b.y);
    for (const resource of visible) {
      const x = resource.x * TILE;
      const y = resource.y * TILE;
      if (["tree", "fruitTree"].includes(resource.type)) {
        ctx.fillStyle = "#5f3c2a"; ctx.fillRect(x - 5, y - 3, 10, 22);
        ctx.fillStyle = resource.type === "fruitTree" ? "#356f47" : "#245c3a";
        ctx.beginPath(); ctx.arc(x, y - 11, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = resource.type === "fruitTree" ? "#4c8a56" : "#3d8050";
        ctx.beginPath(); ctx.arc(x - 9, y - 16, 11, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 9, y - 12, 12, 0, Math.PI * 2); ctx.fill();
        if (resource.type === "fruitTree") {
          ctx.fillStyle = "#d95e52";
          ctx.beginPath(); ctx.arc(x - 8, y - 14, 3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x + 7, y - 7, 3, 0, Math.PI * 2); ctx.fill();
        }
      } else if (resource.type === "grass") {
        ctx.strokeStyle = "#245c3a"; ctx.lineWidth = 2;
        for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(x + i * 3, y + 10); ctx.lineTo(x + i * 4, y - 4 - Math.abs(i)); ctx.stroke(); }
      } else if (["rock", "ore", "crystal"].includes(resource.type)) {
        ctx.fillStyle = resource.type === "rock" ? "#777b7d" : resource.type === "ore" ? "#8a5b46" : "#5f5ba2";
        ctx.beginPath(); ctx.moveTo(x - 13, y + 10); ctx.lineTo(x - 16, y - 5); ctx.lineTo(x - 6, y - 14); ctx.lineTo(x + 11, y - 10); ctx.lineTo(x + 15, y + 7); ctx.closePath(); ctx.fill();
        if (resource.type === "ore") { ctx.fillStyle = "#d7894f"; ctx.fillRect(x - 5, y - 6, 5, 5); ctx.fillRect(x + 5, y + 1, 4, 4); }
        if (resource.type === "crystal") { ctx.fillStyle = "#c9c8ff"; ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x + 7, y - 6); ctx.lineTo(x, y + 4); ctx.lineTo(x - 7, y - 6); ctx.fill(); }
      } else if (resource.type === "herb") {
        ctx.fillStyle = "#a9d27d";
        ctx.beginPath(); ctx.ellipse(x - 4, y, 4, 9, -0.55, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 4, y - 3, 4, 9, 0.55, 0, Math.PI * 2); ctx.fill();
      } else if (resource.type === "mushroom") {
        ctx.fillStyle = "#eee2c7"; ctx.fillRect(x - 2, y, 4, 8);
        ctx.fillStyle = "#8d68a6"; ctx.beginPath(); ctx.arc(x, y - 1, 8, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#d9d7ff"; ctx.fillRect(x - 3, y - 5, 2, 2); ctx.fillRect(x + 3, y - 3, 2, 2);
      }
    }
  }

  drawBuildings(ctx) {
    for (const building of BUILDINGS) this.drawHouse(ctx, building);
  }

  drawHouse(ctx, building) {
    const px = building.x * TILE;
    const py = building.y * TILE;
    ctx.fillStyle = building.wall;
    ctx.fillRect(px, py + TILE, building.w * TILE, (building.h - 1) * TILE);
    ctx.fillStyle = building.roof;
    ctx.beginPath();
    ctx.moveTo(px - 10, py + TILE * 1.25);
    ctx.lineTo(px + building.w * TILE / 2, py - 18);
    ctx.lineTo(px + building.w * TILE + 10, py + TILE * 1.25);
    ctx.closePath();
    ctx.fill();
    const doorX = (building.door.x + 0.5) * TILE;
    const doorY = building.door.y * TILE;
    ctx.fillStyle = "#563c32";
    ctx.fillRect(doorX - 13, doorY - 32, 26, 32);
    ctx.fillStyle = "#8ec6d8";
    ctx.fillRect(px + 22, py + TILE * 2.2, 24, 19);
    ctx.fillRect(px + building.w * TILE - 46, py + TILE * 2.2, 24, 19);
    ctx.fillStyle = "#10241d";
    ctx.font = "bold 12px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(building.name, px + building.w * TILE / 2, py + TILE * 1.58);
    if (building.id === "observatory") {
      ctx.fillStyle = "#d9d7ff";
      ctx.beginPath(); ctx.arc(px + building.w * TILE / 2, py - 10, 17, Math.PI, 0); ctx.fill();
    }
  }

  drawLandmarks(ctx) {
    this.drawMineEntrance(ctx);
    this.drawQuestBoard(ctx);
    this.drawBeaconWorld(ctx);
    this.drawDock(ctx);
    this.drawGrove(ctx);
    for (const stone of WAYSTONES) this.drawWaystone(ctx, stone);
    this.drawZoneSigns(ctx);
  }

  drawMineEntrance(ctx) {
    const x = 80 * TILE;
    const y = 34 * TILE;
    ctx.fillStyle = "#56595e"; ctx.fillRect(x, y + TILE, 9 * TILE, 4 * TILE);
    ctx.fillStyle = "#292c30"; ctx.beginPath(); ctx.arc(x + 4.5 * TILE, y + 4 * TILE, 76, Math.PI, 0); ctx.fill();
    ctx.fillRect(x + 4.5 * TILE - 76, y + 4 * TILE, 152, TILE);
    ctx.strokeStyle = "#7a5a3a"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(x + 4.5 * TILE, y + 4 * TILE, 81, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = "#fff1c8"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 4; ctx.font = "bold 12px Trebuchet MS"; ctx.textAlign = "center";
    ctx.strokeText("EMBER MINE", x + 4.5 * TILE, y + 1.3 * TILE); ctx.fillText("EMBER MINE", x + 4.5 * TILE, y + 1.3 * TILE);
  }

  drawQuestBoard(ctx) {
    const x = INTERACTIONS.questBoard.x * TILE;
    const y = INTERACTIONS.questBoard.y * TILE;
    ctx.fillStyle = "#6c432c"; ctx.fillRect(x - 3, y - 10, 6, 36);
    ctx.fillStyle = "#d5b878"; ctx.fillRect(x - 18, y - 18, 36, 25);
    ctx.fillStyle = "#10241d"; ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.fillText("!", x, y + 2);
  }

  drawBeaconWorld(ctx) {
    const level = this.state.beacon.level;
    const x = INTERACTIONS.beacon.x * TILE;
    const y = INTERACTIONS.beacon.y * TILE;
    ctx.fillStyle = "#5b4b3b"; ctx.fillRect(x - 12, y - 4, 24, 34);
    ctx.fillStyle = level > 0 ? "#efb94a" : "#777";
    ctx.shadowColor = level > 0 ? "#ffe69b" : "transparent"; ctx.shadowBlur = level * 12;
    ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x + 18, y - 8); ctx.lineTo(x, y + 2); ctx.lineTo(x - 18, y - 8); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    for (let index = 0; index < level; index += 1) {
      ctx.fillStyle = "#fff4b8"; ctx.beginPath(); ctx.arc(x + Math.cos(index * 2.1) * 28, y - 14 + Math.sin(index * 2.1) * 15, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawDock(ctx) {
    const x = 54 * TILE;
    const y = 40 * TILE;
    ctx.fillStyle = "#7a5737"; ctx.fillRect(x, y, 5 * TILE, 2 * TILE);
    ctx.strokeStyle = "#4f3627"; ctx.lineWidth = 3;
    for (let i = 0; i <= 5; i += 1) { ctx.beginPath(); ctx.moveTo(x + i * TILE, y); ctx.lineTo(x + i * TILE, y + 2 * TILE); ctx.stroke(); }
  }

  drawGrove(ctx) {
    const x = INTERACTIONS.grove.x * TILE;
    const y = INTERACTIONS.grove.y * TILE;
    ctx.fillStyle = "#755a3c"; ctx.fillRect(x - 5, y - 3, 10, 27);
    ctx.fillStyle = "#89bc71"; ctx.shadowColor = "#bde99b"; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(x, y - 10, 19, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f5dca7"; ctx.beginPath(); ctx.arc(x, y - 9, 4, 0, Math.PI * 2); ctx.fill();
  }

  drawWaystone(ctx, stone) {
    const x = stone.x * TILE;
    const y = stone.y * TILE;
    const active = this.state.discoveredWaystones.includes(stone.id);
    ctx.fillStyle = "#5f6269";
    ctx.beginPath(); ctx.moveTo(x - 10, y + 15); ctx.lineTo(x - 14, y - 10); ctx.lineTo(x, y - 25); ctx.lineTo(x + 14, y - 10); ctx.lineTo(x + 10, y + 15); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = active ? "#c9c8ff" : "#85878b"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - 7, 6, 0, Math.PI * 2); ctx.stroke();
    if (active && this.state.beacon.level >= 2) {
      ctx.shadowColor = "#c9c8ff"; ctx.shadowBlur = 10; ctx.fillStyle = "#e8e7ff";
      ctx.beginPath(); ctx.arc(x, y - 7, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  drawZoneSigns(ctx) {
    const signs = [
      { x: 38.5, y: 17.5, text: "Village →" }, { x: 39.5, y: 35.5, text: "↓ Forest" },
      { x: 72.5, y: 32.5, text: "↓ Ember Ridge" }, { x: 79.5, y: 18.5, text: "Starwatch →" },
    ];
    for (const sign of signs) {
      const x = sign.x * TILE; const y = sign.y * TILE;
      ctx.fillStyle = "#6c432c"; ctx.fillRect(x - 3, y, 6, 22);
      ctx.fillStyle = "#d5b878"; ctx.fillRect(x - 26, y - 15, 52, 18);
      ctx.fillStyle = "#10241d"; ctx.font = "bold 8px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(sign.text, x, y - 3);
    }
  }

  drawNPCs(ctx) {
    for (const npc of [...this.state.npcs].sort((a, b) => a.y - b.y)) this.drawCharacter(ctx, npc.x, npc.y, npc.color, npc.name);
  }

  drawMonsters(ctx) {
    for (const monster of this.state.monsters.filter((entry) => entry.hp > 0).sort((a, b) => a.y - b.y)) {
      const x = monster.x * TILE;
      const y = monster.y * TILE;
      ctx.fillStyle = monster.type === "shade" ? "#463d62" : "#596c58";
      ctx.beginPath(); ctx.ellipse(x, y, monster.type === "shade" ? 15 : 12, monster.type === "shade" ? 18 : 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f5dca7"; ctx.fillRect(x - 6, y - 4, 3, 3); ctx.fillRect(x + 3, y - 4, 3, 3);
      if (monster.hp < monster.maxHp) {
        ctx.fillStyle = "#10241d"; ctx.fillRect(x - 15, y - 25, 30, 5);
        ctx.fillStyle = "#d95e52"; ctx.fillRect(x - 14, y - 24, 28 * monster.hp / monster.maxHp, 3);
      }
    }
  }

  drawMote(ctx) {
    const player = this.state.player;
    const time = performance.now() / 500;
    const x = (player.x - 0.65 + Math.cos(time) * 0.25) * TILE;
    const y = (player.y - 0.65 + Math.sin(time * 1.2) * 0.18) * TILE;
    ctx.shadowColor = "#fff3a8"; ctx.shadowBlur = 14;
    ctx.fillStyle = "#fff3a8"; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawPlayer(ctx) {
    this.drawCharacter(ctx, this.state.player.x, this.state.player.y, "#2e6f57", "");
  }

  drawCharacter(ctx, x, y, color, name) {
    const px = x * TILE;
    const py = y * TILE;
    ctx.fillStyle = "rgba(16,36,29,.22)"; ctx.beginPath(); ctx.ellipse(px, py + 12, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(px - 9, py - 7, 18, 21);
    ctx.fillStyle = "#e9c7a0"; ctx.beginPath(); ctx.arc(px, py - 13, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#10241d"; ctx.fillRect(px - 5, py - 15, 3, 3); ctx.fillRect(px + 2, py - 15, 3, 3);
    if (name) {
      ctx.font = "bold 10px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillStyle = "#fff1c8"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3;
      ctx.strokeText(name, px, py - 28); ctx.fillText(name, px, py - 28);
    }
  }

  drawTarget(ctx) {
    const target = this.targetTile();
    ctx.strokeStyle = "rgba(255,241,200,.88)";
    ctx.lineWidth = 2;
    ctx.strokeRect(target.x * TILE + 3, target.y * TILE + 3, TILE - 6, TILE - 6);
  }

  drawWeatherAndLighting(ctx, width, height) {
    ctx.fillStyle = WEATHER[this.state.weather].tint;
    ctx.fillRect(0, 0, width, height);
    if (this.state.weather === "Rain") {
      ctx.strokeStyle = "rgba(205,230,244,.55)"; ctx.lineWidth = 1;
      const time = performance.now() / 12;
      for (let index = 0; index < 90; index += 1) {
        const x = (index * 83 + time * 0.9) % (width + 50) - 25;
        const y = (index * 47 + time * 1.8) % (height + 50) - 25;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 14); ctx.stroke();
      }
    }
    if (this.state.weather === "Sparkfall") {
      const time = performance.now() / 700;
      for (let index = 0; index < 30; index += 1) {
        const x = (index * 137 + Math.sin(time + index) * 80 + time * 20) % (width + 40) - 20;
        const y = (index * 91 + time * 28) % (height + 40) - 20;
        ctx.fillStyle = `rgba(235,228,255,${0.35 + (index % 3) * 0.18})`;
        ctx.fillRect(x, y, 3, 3);
      }
    }
    const hour = this.state.minutes / 60;
    let darkness = 0;
    if (hour < 6) darkness = 0.55;
    else if (hour < 8) darkness = (8 - hour) * 0.12;
    else if (hour > 18) darkness = clamp((hour - 18) * 0.09, 0, 0.62);
    if (darkness <= 0) return;
    ctx.fillStyle = `rgba(19,28,55,${darkness})`;
    ctx.fillRect(0, 0, width, height);
    if (this.state.beacon.level > 0) {
      const beaconX = INTERACTIONS.beacon.x * TILE - this.camera.x;
      const beaconY = INTERACTIONS.beacon.y * TILE - this.camera.y;
      const radius = 150 + this.state.beacon.level * 65;
      const gradient = ctx.createRadialGradient(beaconX, beaconY, 0, beaconX, beaconY, radius);
      gradient.addColorStop(0, `rgba(255,225,130,${0.22 + this.state.beacon.level * 0.05})`);
      gradient.addColorStop(1, "rgba(255,225,130,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  }

  drawMinimap(ctx, width, height) {
    if (width < 720) return;
    const mapW = 188;
    const mapH = 132;
    const x = width - mapW - 16;
    const y = 124;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#10241d"; ctx.fillRect(x - 4, y - 4, mapW + 8, mapH + 8);
    ctx.fillStyle = "#f5dca7"; ctx.fillRect(x, y, mapW, mapH);
    const sx = mapW / WORLD_W;
    const sy = mapH / WORLD_H;
    const zoneColors = { farm: "#72aa60", village: "#81b46d", lake: "#5f9f60", forest: "#477f4d", ridge: "#555961", north: "#656a73" };
    for (let ty = 0; ty < WORLD_H; ty += 2) {
      for (let tx = 0; tx < WORLD_W; tx += 2) {
        ctx.fillStyle = isWaterTile(tx, ty) ? "#4e9cbc" : isPathTile(tx, ty) ? "#c6aa74" : zoneColors[zoneAt(tx, ty).id];
        ctx.fillRect(x + tx * sx, y + ty * sy, Math.ceil(sx * 2), Math.ceil(sy * 2));
      }
    }
    for (const stone of WAYSTONES) {
      if (!this.state.discoveredWaystones.includes(stone.id)) continue;
      ctx.fillStyle = "#d9d7ff"; ctx.fillRect(x + stone.x * sx - 1, y + stone.y * sy - 1, 3, 3);
    }
    ctx.fillStyle = "#d95e52";
    ctx.beginPath(); ctx.arc(x + this.state.player.x * sx, y + this.state.player.y * sy, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawZoneBanner(ctx, width) {
    if (this.zoneBanner.timer <= 0) return;
    const alpha = Math.min(1, this.zoneBanner.timer * 1.5, (2.4 - this.zoneBanner.timer) * 2.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "bold 20px Trebuchet MS";
    ctx.textAlign = "center";
    const textWidth = ctx.measureText(this.zoneBanner.text).width + 42;
    const x = width / 2 - textWidth / 2;
    const y = 76;
    ctx.fillStyle = "rgba(16,36,29,.88)";
    ctx.fillRect(x, y, textWidth, 40);
    ctx.strokeStyle = "#f5dca7"; ctx.lineWidth = 2; ctx.strokeRect(x, y, textWidth, 40);
    ctx.fillStyle = "#fff1c8"; ctx.fillText(this.zoneBanner.text, width / 2, y + 27);
    ctx.restore();
  }

  updateHUD() {
    if (!this.state) return;
    $("dayLabel").textContent = this.state.day;
    $("timeLabel").textContent = formatTime(this.state.minutes);
    $("weatherLabel").textContent = `${WEATHER[this.state.weather].icon} ${this.state.weather}`;
    $("coinLabel").textContent = Math.floor(this.state.coins);
    $("energyText").textContent = Math.ceil(this.state.player.energy);
    $("healthText").textContent = Math.ceil(this.state.player.health);
    $("energyFill").style.width = `${this.state.player.energy / this.state.player.maxEnergy * 100}%`;
    $("healthFill").style.width = `${this.state.player.health / this.state.player.maxHealth * 100}%`;
  }

  buildToolbar() {
    if (!this.state) return;
    $("toolbar").innerHTML = TOOLS.map((tool, index) => {
      let count = "";
      if (tool.id === "seed") count = this.state.inventory[CROPS[this.state.selectedCrop].seed] || 0;
      if (tool.id === "snack") count = this.state.inventory.snack || 0;
      const title = tool.id === "seed" ? `${CROPS[this.state.selectedCrop].name} Seeds — press Q to cycle` : tool.name;
      return `<button class="tool-slot ${index === this.state.selectedTool ? "selected" : ""}" data-tool="${index}" title="${title}"><span class="tool-key">${index + 1}</span><span class="tool-icon">${tool.icon}</span>${count !== "" ? `<span class="tool-count">${count}</span>` : ""}</button>`;
    }).join("");
    document.querySelectorAll("[data-tool]").forEach((button) => { button.onclick = () => this.selectTool(Number(button.dataset.tool)); });
  }

  selectTool(index) {
    this.state.selectedTool = clamp(index, 0, TOOLS.length - 1);
    this.buildToolbar();
    const tool = TOOLS[this.state.selectedTool];
    this.toast(tool.id === "seed" ? `${CROPS[this.state.selectedCrop].name} seeds selected. Press Q to cycle.` : `${tool.name} selected.`);
  }

  updateContextHint() {
    const hint = $("contextHint");
    const player = this.state.player;
    const near = (point, range = 1.9) => distance(player, point) < range;
    let text = "";
    const npc = this.state.npcs.find((person) => distance(player, person) < 1.45);
    const target = this.targetTile(0.9);
    const soil = this.state.soil[keyOf(target.x, target.y)];
    const forage = this.state.resources.find((resource) => ["herb", "mushroom"].includes(resource.type) && distance(player, resource) < 1.45);
    const building = BUILDINGS.find((item) => near({ x: item.door.x + 0.5, y: item.door.y + 0.5 }, 1.8));
    const waystone = WAYSTONES.find((stone) => near(stone, 1.55));
    if (npc) text = `Interact: Talk to ${npc.name}`;
    else if (forage) text = `Interact: Gather ${forage.type === "herb" ? "Silverleaf" : "Glowcap"}`;
    else if (soil?.crop && soil.crop.growth >= CROPS[soil.crop.type].days) text = `Interact: Harvest ${CROPS[soil.crop.type].name}`;
    else if (building) text = `Interact: ${building.name}`;
    else if (near(INTERACTIONS.questBoard, 1.6)) text = "Interact: Community requests";
    else if (near(INTERACTIONS.beacon, 2.0)) text = "Interact: Restore the Hearthlight";
    else if (near(INTERACTIONS.grove, 2.0)) text = "Interact: Whisperwood blessing";
    else if (waystone) text = `Interact: ${waystone.name} Waystone`;
    else text = `${TOOLS[this.state.selectedTool].name}: ${matchMedia("(pointer: coarse)").matches ? "A" : "Space/F"} · Interact: ${matchMedia("(pointer: coarse)").matches ? "B" : "E/Enter"}`;
    hint.textContent = text;
    hint.classList.toggle("hidden", !text);
  }

  toggleGameMenu() {
    if (!this.running) return;
    if (this.dialogueOpen) return this.closeDialogue();
    if (this.modalOpen) return this.closeModal();
    this.openModal("Valley Menu", `<div class="menu-grid">
      <button id="inventoryMenu">🎒 Inventory</button>
      <button id="mapMenu">🗺️ World Map</button>
      <button id="craftingMenu">🛠️ Crafting</button>
      <button id="questsMenu">📜 Requests</button>
      <button id="peopleMenu">🤝 Villagers</button>
      <button id="journalMenu">📖 Journal</button>
      <button id="statsMenu">🏆 Achievements</button>
      <button id="settingsMenu">⚙️ Settings</button>
      <button id="saveMenu">💾 Save Valley</button>
    </div>`, [
      { label: "Resume", action: () => this.closeModal() },
      { label: "Title Screen", action: () => this.leaveToTitle() },
    ]);
    $("inventoryMenu").onclick = () => this.showInventory();
    $("mapMenu").onclick = () => this.showWorldMap();
    $("craftingMenu").onclick = () => this.showCrafting();
    $("questsMenu").onclick = () => this.openQuestBoard();
    $("peopleMenu").onclick = () => this.showRelationships();
    $("journalMenu").onclick = () => this.showJournal();
    $("statsMenu").onclick = () => this.showStats();
    $("settingsMenu").onclick = () => this.showSettings(true);
    $("saveMenu").onclick = () => { this.saveGame(false); this.closeModal(); };
  }

  showInventory() {
    const items = Object.entries(this.state.inventory).filter(([, count]) => count > 0).map(([id, count]) => `<article class="inventory-item"><span class="item-icon">${ITEMS[id]?.icon || "📦"}</span><strong>${ITEMS[id]?.name || id}</strong><small>Quantity: ${count}</small><small>Base value: ${ITEMS[id]?.value || 0} ◈</small>${["snack", "tea"].includes(id) ? `<button data-consume="${id}">Consume</button>` : ""}</article>`).join("");
    this.openModal("Inventory & Farm Harmony", `<p>Farm Harmony: <strong>${this.totalHarmony()}</strong>. Different mature neighboring crops increase harvest yield.</p><div class="inventory-grid">${items || "<p>Your backpack is empty.</p>"}</div>`, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-consume]").forEach((button) => { button.onclick = () => { this.consumeItem(button.dataset.consume); this.closeModal(); }; });
  }

  totalHarmony() {
    let total = 0;
    for (const [key, soil] of Object.entries(this.state.soil)) {
      if (!soil.crop || soil.crop.growth < CROPS[soil.crop.type].days) continue;
      const [x, y] = key.split(",").map(Number);
      total += this.calculateCropResonance(x, y, soil.crop.type);
    }
    return Math.floor(total / 2);
  }

  showWorldMap() {
    this.state.tutorial.mapSeen = true;
    const zones = [
      ["farm", "Farmstead", "Fenced crop field, farmhouse, barn, and pond."],
      ["village", "Hearthvale Village", "Shops, inn, workshop, hall, Beacon, and request board."],
      ["lake", "Moonlake Meadow", "Orchard fruit, herbs, dock, and rare fishing."],
      ["forest", "Whisperwood", "Dense timber, Glowcaps, Silverleaf, and the restorative grove."],
      ["ridge", "Ember Ridge", "Ore, crystals, monsters, and the expanded mine."],
      ["north", "Northwatch Ridge", "Starwatch Observatory and highland forage."],
    ];
    const html = zones.map(([id, name, description]) => `<article class="relationship"><h3>${this.state.visitedZones.includes(id) ? "✅" : "❔"} ${name}</h3><p>${description}</p></article>`).join("");
    this.openModal("Expanded Valley Map", `<p>World size: <strong>${WORLD_W} × ${WORLD_H} tiles</strong>. Tan roads and aligned bridges connect every major zone.</p>${html}<p>Waystones discovered: ${this.state.discoveredWaystones.length}/${WAYSTONES.length}. Fast travel unlocks at Hearthlight Tier 2.</p>`, [{ label: "Close", action: () => this.closeModal() }]);
  }

  showRelationships() {
    const html = this.state.npcs.map((npc) => `<article class="relationship"><h3>${npc.emoji} ${npc.name}</h3><div class="progress"><i style="width:${npc.friendship * 10}%"></i></div><p>Friendship ${npc.friendship}/10 · Favorite: ${ITEMS[npc.favorite].icon} ${ITEMS[npc.favorite].name}</p></article>`).join("");
    this.openModal("Villagers", html, [{ label: "Close", action: () => this.closeModal() }]);
  }

  showJournal() {
    this.openModal("Valley Journal", this.state.journal.map((entry) => `<p>• ${entry}</p>`).join(""), [{ label: "Close", action: () => this.closeModal() }]);
  }

  showStats() {
    const stats = this.state.stats;
    const achievements = this.state.achievements.length ? this.state.achievements.map((achievement) => `<p>🏆 <strong>${achievement.title}</strong> — ${achievement.description}</p>`).join("") : "<p>No achievements unlocked yet.</p>";
    this.openModal("Achievements & Statistics", `<div class="inventory-grid">
      <article class="inventory-item"><strong>${Math.floor(stats.steps)}</strong><small>tiles traveled</small></article>
      <article class="inventory-item"><strong>${stats.cropsHarvested}</strong><small>crops harvested</small></article>
      <article class="inventory-item"><strong>${stats.fishCaught}</strong><small>fish caught</small></article>
      <article class="inventory-item"><strong>${stats.monstersDefeated}</strong><small>monsters defeated</small></article>
      <article class="inventory-item"><strong>${stats.zonesVisited}</strong><small>zones visited</small></article>
      <article class="inventory-item"><strong>${this.state.completedQuests.length}</strong><small>requests completed</small></article>
    </div><hr>${achievements}`, [{ label: "Close", action: () => this.closeModal() }]);
  }

  checkAchievement(id, condition, title, description) {
    if (!condition || this.state.achievements.some((achievement) => achievement.id === id)) return;
    this.state.achievements.push({ id, title, description, day: this.state.day });
    this.sound("success");
    this.toast(`Achievement unlocked: ${title}`);
  }

  showSettings(fromGame) {
    const checked = (value) => value ? "checked" : "";
    this.openModal("Settings", `
      <label class="settings-row"><span>Sound effects</span><input id="soundSetting" type="checkbox" ${checked(this.settings.sound)}></label>
      <label class="settings-row"><span>Mobile vibration</span><input id="vibrationSetting" type="checkbox" ${checked(this.settings.vibration)}></label>
      <label class="settings-row"><span>Desktop minimap</span><input id="minimapSetting" type="checkbox" ${checked(this.settings.minimap)}></label>
      <label class="settings-row"><span>Fullscreen</span><button id="fullscreenSetting">Toggle Fullscreen</button></label>
      <hr><p><strong>Save management</strong></p>
      <div class="dialogue-choices"><button id="exportSave">Export Save</button><button id="importButton">Import Save</button><input id="importSave" type="file" accept="application/json" hidden></div>
    `, [{ label: fromGame ? "Back" : "Close", action: () => { this.closeModal(); if (fromGame) this.toggleGameMenu(); } }]);
    $("soundSetting").onchange = (event) => { this.settings.sound = event.target.checked; this.saveSettings(); };
    $("vibrationSetting").onchange = (event) => { this.settings.vibration = event.target.checked; this.saveSettings(); };
    $("minimapSetting").onchange = (event) => { this.settings.minimap = event.target.checked; this.saveSettings(); };
    $("fullscreenSetting").onclick = () => document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
    $("exportSave").onclick = () => this.exportSave();
    $("importButton").onclick = () => $("importSave").click();
    $("importSave").onchange = (event) => { if (event.target.files?.[0]) this.importSave(event.target.files[0]); };
  }

  showHowToPlay() {
    this.openModal("How to Play", `
      <section class="help-section"><h3>Movement</h3><p>Desktop: <kbd>WASD</kbd> or arrows. <kbd>E</kbd>/<kbd>Enter</kbd> interacts. <kbd>Space</kbd>/<kbd>F</kbd> uses tools. Mobile: left stick, A for tools, B to interact.</p></section>
      <section class="help-section"><h3>Expanded Map</h3><p>The world is now 104 × 78 tiles with a fenced Farmstead, aligned Village roads, Moonlake, Whisperwood, Northwatch, and Ember Ridge. Roads grant a small movement bonus.</p></section>
      <section class="help-section"><h3>Farming & Harmony</h3><p>Hoe, water, plant, and harvest inside the farm fence. Different mature crops beside one another create Harmony and bonus yields.</p></section>
      <section class="help-section"><h3>Waystones</h3><p>Walk near Waystones to discover them. Restore Hearthlight Tier 2 to fast travel among discovered stones.</p></section>
      <section class="help-section"><h3>Exploration</h3><p>Forage herbs and mushrooms in Whisperwood, apples near Moonlake, fish at three water regions, and mine crystals in Ember Ridge. Visit Starwatch for tomorrow’s forecast.</p></section>
    `, [{ label: "Close", action: () => this.closeModal() }]);
  }

  showDialogue(npc, text, choices = []) {
    this.dialogueOpen = true;
    this.paused = true;
    $("dialogueName").textContent = npc.name;
    $("dialoguePortrait").textContent = npc.emoji || "🙂";
    $("dialogueText").textContent = text;
    const box = $("dialogueChoices");
    box.innerHTML = "";
    for (const choice of choices) {
      const button = document.createElement("button");
      button.textContent = choice.label;
      button.addEventListener("click", choice.action);
      box.appendChild(button);
    }
    $("dialogue").classList.remove("hidden");
  }

  closeDialogue() {
    this.dialogueOpen = false;
    this.paused = !this.running;
    $("dialogue").classList.add("hidden");
  }

  openModal(title, body, actions = []) {
    this.modalOpen = true;
    this.paused = true;
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = body;
    const area = $("modalActions");
    area.innerHTML = "";
    for (const action of actions) {
      const button = document.createElement("button");
      button.textContent = action.label;
      if (action.danger) button.style.background = "#d95e52";
      button.addEventListener("click", action.action);
      area.appendChild(button);
    }
    $("modal").classList.remove("hidden");
  }

  closeModal() {
    if (this.fishingTimer) { clearInterval(this.fishingTimer); this.fishingTimer = null; }
    this.modalOpen = false;
    this.paused = !this.running;
    $("modal").classList.add("hidden");
  }

  toast(message) {
    const element = $("toast");
    element.textContent = message;
    element.classList.remove("hidden");
    requestAnimationFrame(() => element.classList.add("show"));
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      element.classList.remove("show");
      setTimeout(() => element.classList.add("hidden"), 200);
    }, 2700);
  }

  sound(type) {
    if (!this.settings.sound) return;
    try {
      if (!this.audio) this.audio = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = this.audio.createOscillator();
      const gain = this.audio.createGain();
      const frequencies = { dig: 150, water: 310, plant: 420, hit: 130, swing: 220, harvest: 520, success: 690, coin: 610, eat: 360, hurt: 95 };
      oscillator.frequency.value = frequencies[type] || 300;
      oscillator.type = type === "success" ? "triangle" : "square";
      gain.gain.setValueAtTime(0.04, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.12);
      oscillator.connect(gain);
      gain.connect(this.audio.destination);
      oscillator.start();
      oscillator.stop(this.audio.currentTime + 0.12);
    } catch {}
  }

  vibrate(milliseconds) {
    if (this.settings.vibration) navigator.vibrate?.(milliseconds);
  }
}

new HearthvaleGame();
