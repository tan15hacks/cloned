const TILE = 32;
const WORLD_W = 68;
const WORLD_H = 52;
const SAVE_KEY = "hearthvale-save-v1";
const SETTINGS_KEY = "hearthvale-settings-v1";

const $ = (id) => document.getElementById(id);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
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

const ITEMS = {
  wood: { name: "Wood", icon: "🪵", value: 8 },
  stone: { name: "Stone", icon: "🪨", value: 7 },
  copper: { name: "Copper Ore", icon: "🟠", value: 22 },
  turnipSeed: { name: "Turnip Seeds", icon: "🌰", value: 12 },
  berrySeed: { name: "Sunberry Seeds", icon: "🫘", value: 22 },
  moonSeed: { name: "Moonbean Seeds", icon: "✨", value: 35 },
  turnip: { name: "Turnip", icon: "🥬", value: 34 },
  berry: { name: "Sunberry", icon: "🍓", value: 58 },
  moonbean: { name: "Moonbean", icon: "🫛", value: 95 },
  fish: { name: "River Fish", icon: "🐟", value: 45 },
  rareFish: { name: "Glimmerfin", icon: "🐠", value: 135 },
  fiber: { name: "Fiber", icon: "🌿", value: 5 },
  snack: { name: "Trail Snack", icon: "🥨", value: 30 },
  crystal: { name: "Hearth Crystal", icon: "💎", value: 180 },
};

const CROPS = {
  turnip: { name: "Turnip", days: 2, seed: "turnipSeed", produce: "turnip", colors: ["#775a2d", "#6a9d45", "#d9ead0"], value: 34 },
  berry: { name: "Sunberry", days: 3, seed: "berrySeed", produce: "berry", colors: ["#775a2d", "#3f8a61", "#d95e52"], value: 58 },
  moonbean: { name: "Moonbean", days: 4, seed: "moonSeed", produce: "moonbean", colors: ["#775a2d", "#5c69a8", "#c9c8ff"], value: 95 },
};

const TOOLS = [
  { id: "hoe", name: "Hoe", icon: "⛏️" },
  { id: "water", name: "Watering Can", icon: "🚿" },
  { id: "axe", name: "Axe", icon: "🪓" },
  { id: "pick", name: "Pickaxe", icon: "🔨" },
  { id: "seed", name: "Seeds", icon: "🌱" },
  { id: "rod", name: "Fishing Rod", icon: "🎣" },
  { id: "sword", name: "Valley Blade", icon: "🗡️" },
  { id: "snack", name: "Trail Snack", icon: "🥨" },
];

const RECIPES = [
  { id: "sprinkler", name: "Dewdrop Sprinkler", icon: "💦", description: "Waters the four neighboring soil tiles every morning.", cost: { wood: 8, stone: 8, copper: 2 } },
  { id: "snack", name: "Trail Snack", icon: "🥨", description: "Restores 30 energy.", cost: { berry: 1, turnip: 1 } },
  { id: "lantern", name: "Glow Lantern", icon: "🏮", description: "A warm farm decoration that increases nightly crop resonance nearby.", cost: { wood: 6, crystal: 1 } },
];

const SHOP_ITEMS = [
  { id: "turnipSeed", amount: 5, price: 45, description: "Fast, dependable starter crop." },
  { id: "berrySeed", amount: 5, price: 85, description: "A bright crop loved by villagers." },
  { id: "moonSeed", amount: 3, price: 110, description: "Rare crop that resonates strongly at night." },
  { id: "snack", amount: 1, price: 35, description: "Restores 30 energy." },
];

const WEATHER = {
  Clear: { icon: "☀️", tint: "rgba(255,232,155,.03)" },
  Cloudy: { icon: "☁️", tint: "rgba(110,130,145,.10)" },
  Rain: { icon: "🌧️", tint: "rgba(55,92,125,.16)" },
  Sparkfall: { icon: "✨", tint: "rgba(91,76,145,.12)" },
};

const NPC_DEFS = [
  {
    id: "mira", name: "Mira", emoji: "👩🏽‍🌾", color: "#d95e52", home: { x: 42, y: 15 },
    lines: [
      "The valley remembers every kindness. Even the soil seems to lean toward patient hands.",
      "Mixed fields grow better here. Plant different crops side by side and watch the Harmony rise.",
      "I keep the seed stall open from morning until late afternoon. The Sunberries are my favorite.",
    ], favorite: "berry",
  },
  {
    id: "oren", name: "Oren", emoji: "🧔🏽", color: "#4d7891", home: { x: 56, y: 16 },
    lines: [
      "The mine has been restless. Copper is common, but blue crystals appear after Sparkfall nights.",
      "Swing your blade before a cave mite gets too close. They are small, but stubborn.",
      "A good tool is only half the work. The other half is knowing when to head home.",
    ], favorite: "copper",
  },
  {
    id: "lumi", name: "Lumi", emoji: "🧑🏻‍🎨", color: "#8d68a6", home: { x: 49, y: 26 },
    lines: [
      "I paint the Hearthlight differently every day. Some mornings it looks gold, others green.",
      "Lanterns make Moonbeans sing. Not literally, but you will feel the pulse in the field.",
      "The old Beacon needs offerings, not repairs. It wakes when the village shares what it has.",
    ], favorite: "moonbean",
  },
  {
    id: "tavi", name: "Tavi", emoji: "🧒🏾", color: "#d7a23a", home: { x: 31, y: 45 },
    lines: [
      "I saw a Glimmerfin in the south pond! It flashed like a coin under the water.",
      "The forest paths change after rain. Well... maybe I just get lost more easily.",
      "Mote follows people who help the Beacon. I hope it follows you.",
    ], favorite: "fish",
  },
];

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
    this.settings = this.loadSettings();
    this.camera = { x: 0, y: 0 };
    this.screen = { width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 };
    this.state = null;
    this.uiBound = false;
    this.bindUI();
    this.resize();
    this.updateContinueState();
    requestAnimationFrame((t) => this.loop(t));
  }

  defaultState() {
    return {
      version: 1,
      player: { x: 8.5, y: 11.5, facing: "down", energy: 100, maxEnergy: 100, health: 100, maxHealth: 100, speed: 4.2 },
      day: 1,
      minutes: 360,
      weather: "Clear",
      coins: 250,
      selectedTool: 0,
      selectedCrop: "turnip",
      inventory: { wood: 0, stone: 0, copper: 0, turnipSeed: 12, berrySeed: 3, moonSeed: 0, turnip: 0, berry: 0, moonbean: 0, fish: 0, rareFish: 0, fiber: 0, snack: 2, crystal: 0 },
      soil: {},
      resources: this.generateResources(),
      placed: [],
      npcs: NPC_DEFS.map((n) => ({ ...n, friendship: 0, talkedDay: 0, x: n.home.x, y: n.home.y })),
      monsters: this.generateMonsters(),
      quests: this.generateQuests(1),
      questStats: { wood: 0, stone: 0, copper: 0, harvest: 0, fish: 0, talk: 0, monsters: 0 },
      completedQuests: [],
      beacon: { level: 0, wood: 0, stone: 0, produce: 0 },
      achievements: [],
      stats: { steps: 0, cropsHarvested: 0, fishCaught: 0, monstersDefeated: 0, daysPlayed: 0, totalEarned: 0 },
      tutorial: { moved: false, tool: false, planted: false, slept: false },
      journal: ["Day 1: I arrived in Hearthvale. The farmhouse is small, but the soil feels alive."],
      knownRecipes: ["sprinkler", "snack", "lantern"],
      upgrades: { toolPower: 1, backpack: 24 },
      mote: { unlocked: false, bond: 0 },
      flags: { introSeen: false, mineIntro: false, beaconIntro: false },
    };
  }

  generateResources() {
    const items = [];
    let id = 1;
    const add = (type, x, y, hp = 1) => items.push({ id: id++, type, x, y, hp, maxHp: hp });
    const seeded = (x, y) => {
      const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    for (let y = 10; y < 39; y += 1) {
      for (let x = 3; x < 34; x += 1) {
        if ((x > 5 && x < 15 && y > 10 && y < 23) || this.isWaterTile(x, y)) continue;
        const r = seeded(x, y);
        if (r > 0.94) add("tree", x + 0.5, y + 0.5, 3);
        else if (r > 0.90) add("rock", x + 0.5, y + 0.5, 2);
        else if (r > 0.84) add("grass", x + 0.5, y + 0.5, 1);
      }
    }
    for (let y = 41; y < 51; y += 1) {
      for (let x = 3; x < 35; x += 1) {
        const r = seeded(x + 101, y + 47);
        if (r > 0.78) add("tree", x + 0.5, y + 0.5, 3);
        else if (r > 0.68) add("grass", x + 0.5, y + 0.5, 1);
      }
    }
    for (let y = 36; y < 50; y += 1) {
      for (let x = 40; x < 66; x += 1) {
        const r = seeded(x + 211, y + 119);
        if (r > 0.78) add(r > 0.94 ? "crystal" : "ore", x + 0.5, y + 0.5, r > 0.94 ? 4 : 3);
        else if (r > 0.69) add("rock", x + 0.5, y + 0.5, 2);
      }
    }
    return items;
  }

  generateMonsters() {
    return [
      { id: 1, type: "mite", x: 46, y: 40, hp: 3, maxHp: 3, cooldown: 0 },
      { id: 2, type: "mite", x: 58, y: 43, hp: 3, maxHp: 3, cooldown: 0 },
      { id: 3, type: "shade", x: 62, y: 48, hp: 5, maxHp: 5, cooldown: 0 },
    ];
  }

  generateQuests(day) {
    const pool = [
      { id: `wood-${day}`, title: "Warm Hearth", type: "wood", target: 12, reward: 90, text: "Gather 12 wood for the village ovens." },
      { id: `stone-${day}`, title: "Path Repairs", type: "stone", target: 10, reward: 85, text: "Collect 10 stone for the washed-out path." },
      { id: `harvest-${day}`, title: "Fresh Basket", type: "harvest", target: 4, reward: 130, text: "Harvest 4 crops for the community table." },
      { id: `fish-${day}`, title: "Pond Supper", type: "fish", target: 2, reward: 120, text: "Catch 2 fish from the southern pond." },
      { id: `talk-${day}`, title: "Valley Voices", type: "talk", target: 3, reward: 75, text: "Speak with 3 villagers today." },
      { id: `monsters-${day}`, title: "Quiet the Mine", type: "monsters", target: 2, reward: 160, text: "Defeat 2 cave creatures." },
      { id: `copper-${day}`, title: "Copper Request", type: "copper", target: 4, reward: 150, text: "Mine 4 copper ore for Oren." },
    ];
    const offset = day % pool.length;
    return [pool[offset], pool[(offset + 2) % pool.length], pool[(offset + 4) % pool.length]].map((q) => ({ ...q, claimed: false }));
  }

  bindUI() {
    if (this.uiBound) return;
    this.uiBound = true;
    addEventListener("resize", () => this.resize());
    addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      this.keys.add(e.key.toLowerCase());
      if (!e.repeat) this.justPressed.add(e.key.toLowerCase());
      if (/^[1-8]$/.test(e.key) && this.running && !this.modalOpen && !this.dialogueOpen) this.selectTool(Number(e.key) - 1);
      if ((e.key === "Escape" || e.key.toLowerCase() === "m") && this.running) this.toggleGameMenu();
    });
    addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));

    $("newGameButton").addEventListener("click", () => this.confirmNewGame());
    $("continueButton").addEventListener("click", () => this.continueGame());
    $("howToButton").addEventListener("click", () => this.showHowToPlay());
    $("settingsButton").addEventListener("click", () => this.showSettings(false));
    $("menuButton").addEventListener("click", () => this.toggleGameMenu());
    $("modalClose").addEventListener("click", () => this.closeModal());
    $("actionButton").addEventListener("pointerdown", (e) => { e.preventDefault(); this.useTool(); });
    $("interactButton").addEventListener("pointerdown", (e) => { e.preventDefault(); this.interact(); });
    this.bindJoystick();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.running) this.saveGame(true);
    });
    addEventListener("beforeunload", () => { if (this.running) this.saveGame(true); });

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  bindJoystick() {
    const joy = $("joystick");
    const stick = $("stick");
    let active = false;
    let pointerId = null;
    const update = (e) => {
      const r = joy.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const max = r.width * 0.31;
      const len = Math.hypot(dx, dy) || 1;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.touchVector.x = dx / max;
      this.touchVector.y = dy / max;
    };
    joy.addEventListener("pointerdown", (e) => {
      active = true; pointerId = e.pointerId; joy.setPointerCapture(pointerId); update(e);
    });
    joy.addEventListener("pointermove", (e) => { if (active && e.pointerId === pointerId) update(e); });
    const end = (e) => {
      if (e.pointerId !== pointerId) return;
      active = false; pointerId = null;
      this.touchVector.x = 0; this.touchVector.y = 0;
      stick.style.transform = "translate(-50%, -50%)";
    };
    joy.addEventListener("pointerup", end);
    joy.addEventListener("pointercancel", end);
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
    try {
      return { music: true, sound: true, vibration: true, scale: "auto", ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
    } catch {
      return { music: true, sound: true, vibration: true, scale: "auto" };
    }
  }

  saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
  }

  updateContinueState() {
    const hasSave = Boolean(localStorage.getItem(SAVE_KEY));
    const button = $("continueButton");
    button.disabled = !hasSave;
    button.style.opacity = hasSave ? "1" : ".45";
    button.title = hasSave ? "Continue your saved valley" : "No saved valley yet";
  }

  confirmNewGame() {
    if (!localStorage.getItem(SAVE_KEY)) return this.startNewGame();
    this.openModal("Start a New Valley?", `
      <p>This will replace the current local save. The existing valley cannot be restored unless you export it first.</p>
      <p><strong>Current save:</strong> Day ${JSON.parse(localStorage.getItem(SAVE_KEY)).day || 1}</p>
    `, [
      { label: "Cancel", action: () => this.closeModal() },
      { label: "Start New Valley", action: () => { this.closeModal(); this.startNewGame(); }, danger: true },
    ]);
  }

  startNewGame() {
    this.state = this.defaultState();
    this.enterGame();
    setTimeout(() => this.showIntro(), 250);
  }

  continueGame() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY));
      this.state = this.migrateState(data);
      this.enterGame();
      this.toast(`Welcome back to Hearthvale — Day ${this.state.day}`);
    } catch {
      localStorage.removeItem(SAVE_KEY);
      this.updateContinueState();
      this.openModal("Save Could Not Be Loaded", "<p>The local save was damaged, so it was safely removed. Start a new valley to continue.</p>", [{ label: "Close", action: () => this.closeModal() }]);
    }
  }

  migrateState(data) {
    const base = this.defaultState();
    return {
      ...base,
      ...data,
      player: { ...base.player, ...(data.player || {}) },
      inventory: { ...base.inventory, ...(data.inventory || {}) },
      beacon: { ...base.beacon, ...(data.beacon || {}) },
      stats: { ...base.stats, ...(data.stats || {}) },
      questStats: { ...base.questStats, ...(data.questStats || {}) },
      upgrades: { ...base.upgrades, ...(data.upgrades || {}) },
      mote: { ...base.mote, ...(data.mote || {}) },
      tutorial: { ...base.tutorial, ...(data.tutorial || {}) },
      flags: { ...base.flags, ...(data.flags || {}) },
    };
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
    this.buildToolbar();
    this.updateHUD();
    this.saveGame(true);
  }

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
  }

  showIntro() {
    if (this.state.flags.introSeen) return;
    this.state.flags.introSeen = true;
    this.showDialogue({ name: "Mira", emoji: "👩🏽‍🌾" }, "Welcome to Hearthvale. Your grandfather kept this farm before the Hearthlight dimmed. Clear the land, plant a mixed field, and help us wake the Beacon again.", [
      { label: "I’m ready", action: () => { this.closeDialogue(); this.toast("Move with WASD, arrows, or the touch stick."); } },
      { label: "What makes this valley different?", action: () => this.showDialogue({ name: "Mira", emoji: "👩🏽‍🌾" }, "Crops here resonate. Different mature crops beside each other create Harmony, increasing harvests. Moonbeans and lanterns make the effect stronger.", [{ label: "Let’s begin", action: () => this.closeDialogue() }]) },
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
    const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hearthvale-day-${this.state.day}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importSave(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data.player || !data.inventory || !data.day) throw new Error("Invalid save");
        this.state = this.migrateState(data);
        this.saveGame(true);
        this.closeModal();
        this.buildToolbar();
        this.updateHUD();
        this.toast("Valley imported successfully.");
      } catch {
        this.toast("That file is not a valid Hearthvale save.");
      }
    };
    reader.readAsText(file);
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000 || 0);
    this.lastFrame = now;
    if (this.running && !this.paused && !this.modalOpen && !this.dialogueOpen) this.update(dt);
    this.render();
    this.justPressed.clear();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const s = this.state;
    if (!s) return;
    this.updatePlayer(dt);
    this.updateNPCs(dt);
    this.updateMonsters(dt);

    s.minutes += dt * 10;
    if (s.minutes >= 1320) {
      this.toast("It is getting late. Return to the farmhouse before midnight.");
      if (s.minutes >= 1440) this.passOut();
    }
    if (this.justPressed.has("e") || this.justPressed.has("enter")) this.interact();
    if (this.justPressed.has(" ") || this.justPressed.has("f")) this.useTool();
    if (this.justPressed.has("q")) this.cycleSeed();
    this.updateCamera();
    this.updateHUD();
    this.updateContextHint();
  }

  updatePlayer(dt) {
    const p = this.state.player;
    let dx = 0;
    let dy = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;
    dx += this.touchVector.x;
    dy += this.touchVector.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.08) {
      dx /= Math.max(1, len);
      dy /= Math.max(1, len);
      if (Math.abs(dx) > Math.abs(dy)) p.facing = dx > 0 ? "right" : "left";
      else p.facing = dy > 0 ? "down" : "up";
      const speed = p.speed * (p.energy <= 10 ? 0.72 : 1);
      const nx = p.x + dx * speed * dt;
      const ny = p.y + dy * speed * dt;
      if (!this.collides(nx, p.y, 0.28)) p.x = nx;
      if (!this.collides(p.x, ny, 0.28)) p.y = ny;
      this.state.stats.steps += Math.hypot(dx, dy) * dt;
      if (!this.state.tutorial.moved && this.state.stats.steps > 3) {
        this.state.tutorial.moved = true;
        this.toast("Select the Hoe and use it on the open farm soil.");
      }
    }
  }

  collides(x, y, radius = 0.3) {
    if (x - radius < 1 || y - radius < 2 || x + radius > WORLD_W - 1 || y + radius > WORLD_H - 1) return true;
    const corners = [[x - radius, y - radius], [x + radius, y - radius], [x - radius, y + radius], [x + radius, y + radius]];
    for (const [cx, cy] of corners) {
      if (this.isWaterTile(Math.floor(cx), Math.floor(cy))) return true;
      if (this.isBuildingTile(cx, cy)) return true;
    }
    for (const r of this.state.resources) {
      if (r.hp > 0 && r.type !== "grass" && Math.hypot(x - r.x, y - r.y) < radius + (r.type === "tree" ? 0.55 : 0.4)) return true;
    }
    for (const placed of this.state.placed) {
      if (Math.hypot(x - placed.x, y - placed.y) < radius + 0.35) return true;
    }
    return false;
  }

  isBuildingTile(x, y) {
    const boxes = [
      { x: 4, y: 4, w: 8, h: 5 },
      { x: 39, y: 7, w: 9, h: 7 },
      { x: 51, y: 7, w: 9, h: 8 },
      { x: 45, y: 21, w: 8, h: 6 },
      { x: 43, y: 31, w: 8, h: 4 },
    ];
    return boxes.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  }

  isWaterTile(x, y) {
    const pond = x >= 20 && x <= 29 && y >= 25 && y <= 32;
    const river = x >= 34 && x <= 37 && y >= 31 && y <= 50;
    return pond || river;
  }

  isFarmableTile(x, y) {
    return x >= 4 && x <= 32 && y >= 9 && y <= 38 && !this.isWaterTile(x, y) && !this.isBuildingTile(x + 0.5, y + 0.5);
  }

  targetTile(range = 1.05) {
    const p = this.state.player;
    const dirs = { up: [0, -range], down: [0, range], left: [-range, 0], right: [range, 0] };
    const d = dirs[p.facing];
    return { x: Math.floor(p.x + d[0]), y: Math.floor(p.y + d[1]) };
  }

  useTool() {
    if (!this.running || this.paused || this.modalOpen || this.dialogueOpen) return;
    const tool = TOOLS[this.state.selectedTool];
    const t = this.targetTile();
    if (!tool) return;
    if (!["rod", "sword", "snack"].includes(tool.id) && this.state.player.energy <= 0) return this.toast("You are exhausted. Eat a snack or sleep.");
    this.state.tutorial.tool = true;
    switch (tool.id) {
      case "hoe": this.useHoe(t); break;
      case "water": this.useWater(t); break;
      case "axe": this.hitResource(t, ["tree", "grass"], "axe"); break;
      case "pick": this.hitResource(t, ["rock", "ore", "crystal"], "pick"); break;
      case "seed": this.plantSeed(t); break;
      case "rod": this.beginFishing(); break;
      case "sword": this.swingSword(); break;
      case "snack": this.eatSnack(); break;
    }
    this.buildToolbar();
    this.updateHUD();
  }

  spendEnergy(amount) {
    const discount = this.state.beacon.level >= 2 ? 0.85 : 1;
    this.state.player.energy = clamp(this.state.player.energy - amount * discount, 0, this.state.player.maxEnergy);
  }

  useHoe(t) {
    if (!this.isFarmableTile(t.x, t.y)) return this.toast("The hoe can only prepare open farm ground.");
    if (this.resourceAt(t.x, t.y) || this.placedAt(t.x, t.y)) return this.toast("Clear this tile first.");
    const key = keyOf(t.x, t.y);
    const soil = this.state.soil[key];
    if (soil?.crop) return this.toast("A crop is already growing here.");
    this.state.soil[key] = { tilled: true, watered: soil?.watered || false, crop: null };
    this.spendEnergy(2);
    this.sound("dig");
  }

  useWater(t) {
    const soil = this.state.soil[keyOf(t.x, t.y)];
    if (!soil?.tilled) return this.toast("Till the ground before watering it.");
    soil.watered = true;
    this.spendEnergy(1);
    this.sound("water");
  }

  plantSeed(t) {
    const soil = this.state.soil[keyOf(t.x, t.y)];
    const crop = CROPS[this.state.selectedCrop];
    if (!soil?.tilled) return this.toast("Till the ground before planting.");
    if (soil.crop) return this.toast("Something is already planted here.");
    if ((this.state.inventory[crop.seed] || 0) <= 0) return this.toast(`You have no ${ITEMS[crop.seed].name}. Press Q to choose another seed.`);
    this.state.inventory[crop.seed] -= 1;
    soil.crop = { type: this.state.selectedCrop, growth: 0, plantedDay: this.state.day, resonance: 0 };
    this.state.tutorial.planted = true;
    this.spendEnergy(1);
    this.sound("plant");
    this.toast(`${crop.name} planted. Water it daily. Press Q to change seed type.`);
  }

  cycleSeed() {
    const order = ["turnip", "berry", "moonbean"];
    const current = order.indexOf(this.state.selectedCrop);
    for (let i = 1; i <= order.length; i += 1) {
      const next = order[(current + i) % order.length];
      if ((this.state.inventory[CROPS[next].seed] || 0) > 0) {
        this.state.selectedCrop = next;
        this.toast(`Selected ${CROPS[next].name} seeds.`);
        this.buildToolbar();
        return;
      }
    }
    this.toast("Buy more seeds from Mira's stall.");
  }

  resourceAt(x, y) {
    return this.state.resources.find((r) => r.hp > 0 && Math.floor(r.x) === x && Math.floor(r.y) === y);
  }

  placedAt(x, y) {
    return this.state.placed.find((p) => Math.floor(p.x) === x && Math.floor(p.y) === y);
  }

  hitResource(t, allowed, tool) {
    const r = this.resourceAt(t.x, t.y);
    if (!r || !allowed.includes(r.type)) return this.toast(tool === "axe" ? "Use the axe on trees or grass." : "Use the pickaxe on rocks and ore.");
    r.hp -= this.state.upgrades.toolPower;
    this.spendEnergy(r.type === "grass" ? 1 : 2);
    this.sound("hit");
    if (r.hp <= 0) {
      if (r.type === "tree") this.addItem("wood", 4 + Math.floor(Math.random() * 3), true);
      if (r.type === "grass") this.addItem("fiber", 1 + Math.floor(Math.random() * 2), true);
      if (r.type === "rock") this.addItem("stone", 2 + Math.floor(Math.random() * 2), true);
      if (r.type === "ore") { this.addItem("stone", 1, false); this.addItem("copper", 2 + Math.floor(Math.random() * 2), true); }
      if (r.type === "crystal") { this.addItem("stone", 2, false); this.addItem("crystal", 1, true); }
      this.state.resources = this.state.resources.filter((item) => item.id !== r.id);
    }
  }

  addItem(id, amount = 1, announce = false) {
    this.state.inventory[id] = (this.state.inventory[id] || 0) + amount;
    if (this.state.questStats[id] !== undefined) this.state.questStats[id] += amount;
    if (announce) this.toast(`+${amount} ${ITEMS[id]?.name || id}`);
    this.checkQuests();
    this.buildToolbar();
  }

  beginFishing() {
    const p = this.state.player;
    const nearWater = [
      [Math.floor(p.x + 1), Math.floor(p.y)], [Math.floor(p.x - 1), Math.floor(p.y)],
      [Math.floor(p.x), Math.floor(p.y + 1)], [Math.floor(p.x), Math.floor(p.y - 1)],
      [Math.floor(p.x + 2), Math.floor(p.y)], [Math.floor(p.x - 2), Math.floor(p.y)],
    ].some(([x, y]) => this.isWaterTile(x, y));
    if (!nearWater) return this.toast("Stand beside the pond or river to fish.");
    this.spendEnergy(2);
    this.openFishingGame();
  }

  openFishingGame() {
    this.modalOpen = true;
    this.paused = true;
    $("modalTitle").textContent = "Fishing — Reel in the Light Zone";
    $("modalBody").innerHTML = `
      <p>Press <strong>REEL</strong> while the moving fish marker overlaps the glowing catch zone. You have three attempts.</p>
      <div id="fishTrack" style="position:relative;height:58px;background:#8ec6d8;border:3px solid #10241d;border-radius:12px;overflow:hidden;margin:18px 0">
        <div id="catchZone" style="position:absolute;left:58%;width:19%;top:0;bottom:0;background:rgba(239,185,74,.75);border-left:3px solid #10241d;border-right:3px solid #10241d"></div>
        <div id="fishMarker" style="position:absolute;left:0;top:8px;font-size:34px">🐟</div>
      </div>
      <p id="fishStatus"><strong>Attempts:</strong> 3</p>
    `;
    $("modalActions").innerHTML = `<button id="reelButton">REEL</button><button id="cancelFishing">Cancel</button>`;
    $("modal").classList.remove("hidden");
    let pos = 0;
    let dir = 1;
    let attempts = 3;
    const marker = $("fishMarker");
    const tick = () => {
      pos += dir * 1.6;
      if (pos >= 91) { pos = 91; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      marker.style.left = `${pos}%`;
    };
    this.fishingTimer = setInterval(tick, 16);
    $("reelButton").onclick = () => {
      const success = pos >= 53 && pos <= 78;
      if (success) {
        clearInterval(this.fishingTimer);
        this.fishingTimer = null;
        const rareChance = this.state.weather === "Sparkfall" ? 0.35 : 0.1;
        const item = Math.random() < rareChance ? "rareFish" : "fish";
        this.addItem(item, 1, false);
        this.state.questStats.fish += 1;
        this.state.stats.fishCaught += 1;
        this.checkQuests();
        this.sound("success");
        this.closeModal();
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
    $("cancelFishing").onclick = () => {
      clearInterval(this.fishingTimer);
      this.fishingTimer = null;
      this.closeModal();
    };
  }

  swingSword() {
    const p = this.state.player;
    let hit = false;
    for (const m of this.state.monsters) {
      if (m.hp <= 0) continue;
      const d = distance(p, m);
      if (d <= 1.45) {
        m.hp -= this.state.upgrades.toolPower + 1;
        const angle = Math.atan2(m.y - p.y, m.x - p.x);
        m.x += Math.cos(angle) * 0.55;
        m.y += Math.sin(angle) * 0.55;
        hit = true;
        if (m.hp <= 0) {
          this.state.stats.monstersDefeated += 1;
          this.state.questStats.monsters += 1;
          if (Math.random() < 0.5) this.addItem("copper", 1, false);
          if (Math.random() < 0.12) this.addItem("crystal", 1, false);
          this.checkQuests();
          this.checkAchievement("guardian", this.state.stats.monstersDefeated >= 5, "Mine Guardian", "Defeat 5 cave creatures.");
        }
      }
    }
    this.sound(hit ? "hit" : "swing");
  }

  eatSnack() {
    if ((this.state.inventory.snack || 0) <= 0) return this.toast("You have no Trail Snacks. Craft one from a Turnip and Sunberry.");
    if (this.state.player.energy >= this.state.player.maxEnergy) return this.toast("Your energy is already full.");
    this.state.inventory.snack -= 1;
    this.state.player.energy = clamp(this.state.player.energy + 30, 0, this.state.player.maxEnergy);
    this.toast("Trail Snack restored 30 energy.");
    this.sound("eat");
  }

  interact() {
    if (!this.running || this.paused || this.modalOpen || this.dialogueOpen) return;
    const p = this.state.player;
    const npc = this.state.npcs.find((n) => distance(p, n) < 1.45);
    if (npc) return this.talkToNPC(npc);
    const t = this.targetTile(0.9);
    const soil = this.state.soil[keyOf(t.x, t.y)];
    if (soil?.crop && soil.crop.growth >= CROPS[soil.crop.type].days) return this.harvestCrop(t, soil);

    if (distance(p, { x: 8, y: 9 }) < 2) return this.offerSleep();
    if (distance(p, { x: 43.5, y: 14.5 }) < 2.1) return this.openShop();
    if (distance(p, { x: 55.5, y: 15.5 }) < 2.1) return this.openInn();
    if (distance(p, { x: 49, y: 27.7 }) < 2.2) return this.openBeacon();
    if (distance(p, { x: 40.5, y: 22 }) < 1.8) return this.openQuestBoard();
    if (distance(p, { x: 46.5, y: 35.5 }) < 2 && !this.state.flags.mineIntro) {
      this.state.flags.mineIntro = true;
      return this.showDialogue({ name: "Oren", emoji: "🧔🏽" }, "The old mine is open. Use the pickaxe on ore and the blade on cave creatures. Crystals are rare, especially after Sparkfall.", [{ label: "Enter carefully", action: () => this.closeDialogue() }]);
    }
    this.toast("Nothing nearby to interact with.");
  }

  harvestCrop(t, soil) {
    const crop = CROPS[soil.crop.type];
    const resonance = this.calculateCropResonance(t.x, t.y, soil.crop.type);
    const lanternBonus = this.state.placed.some((p) => p.type === "lantern" && Math.hypot(p.x - (t.x + .5), p.y - (t.y + .5)) <= 3) ? 1 : 0;
    const beaconBonus = this.state.beacon.level >= 3 ? 1 : 0;
    const yieldAmount = 1 + (resonance >= 2 ? 1 : 0) + lanternBonus + beaconBonus;
    this.addItem(crop.produce, yieldAmount, false);
    this.state.questStats.harvest += 1;
    this.state.stats.cropsHarvested += yieldAmount;
    soil.crop = null;
    soil.watered = false;
    this.checkQuests();
    this.sound("harvest");
    this.toast(`Harvested ${yieldAmount} ${crop.name}${yieldAmount > 1 ? "s" : ""}${resonance >= 2 ? " with Harmony bonus!" : "."}`);
    this.checkAchievement("first-harvest", this.state.stats.cropsHarvested >= 1, "First Harvest", "Harvest your first crop.");
    this.checkAchievement("harmonic-field", resonance >= 3, "Harmonic Field", "Harvest a crop with 3 different neighboring crop links.");
  }

  calculateCropResonance(x, y, type) {
    let score = 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
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
      this.state.mote.bond += npc.id === "lumi" ? 1 : 0;
      this.checkQuests();
    }
    const line = randomChoice(npc.lines);
    const choices = [{ label: "Goodbye", action: () => this.closeDialogue() }];
    const favoriteCount = this.state.inventory[npc.favorite] || 0;
    if (favoriteCount > 0) {
      choices.unshift({ label: `Gift ${ITEMS[npc.favorite].name}`, action: () => {
        this.state.inventory[npc.favorite] -= 1;
        npc.friendship = clamp(npc.friendship + 2, 0, 10);
        this.showDialogue(npc, `This is wonderful! I will remember your kindness. Friendship with ${npc.name}: ${npc.friendship}/10.`, [{ label: "You’re welcome", action: () => this.closeDialogue() }]);
        this.checkAchievement("friend", npc.friendship >= 8, "Valley Friend", "Reach 8 friendship with a villager.");
      }});
    }
    this.showDialogue(npc, `${line}${firstToday ? ` Friendship: ${npc.friendship}/10.` : ""}`, choices);
  }

  offerSleep() {
    const time = this.state.minutes;
    this.openModal("Sleep Until Morning", `<p>End Day ${this.state.day} and save your progress?</p><p>${time < 1080 ? "It is still early, but you may sleep whenever you choose." : "You have worked a full day. Rest will restore your energy and health."}</p>`, [
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
    const s = this.state;
    s.day += 1;
    s.stats.daysPlayed += 1;
    s.minutes = 360;
    const nextWeather = this.rollWeather();
    s.player.x = 8.5;
    s.player.y = 11.5;
    s.player.energy = passedOut ? Math.floor(s.player.maxEnergy * 0.7) : s.player.maxEnergy;
    s.player.health = clamp(s.player.health + (passedOut ? 10 : 35), 0, s.player.maxHealth);
    for (const soil of Object.values(s.soil)) {
      if (soil.crop && soil.watered) soil.crop.growth += 1;
      soil.watered = nextWeather === "Rain";
    }
    s.weather = nextWeather;
    const rainy = s.weather === "Rain";
    for (const placed of s.placed.filter((p) => p.type === "sprinkler")) {
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const soil = s.soil[keyOf(Math.floor(placed.x) + dx, Math.floor(placed.y) + dy)];
        if (soil) soil.watered = true;
      }
    }
    if (s.mote.unlocked) {
      const dry = Object.values(s.soil).filter((soil) => soil.crop && !soil.watered);
      dry.slice(0, 4 + Math.floor(s.mote.bond / 3)).forEach((soil) => { soil.watered = true; });
    }
    if (s.beacon.level >= 3 && s.day % 3 === 0) this.addItem("moonSeed", 1, false);
    s.questStats = { wood: 0, stone: 0, copper: 0, harvest: 0, fish: 0, talk: 0, monsters: 0 };
    s.quests = this.generateQuests(s.day);
    s.monsters = this.generateMonsters().map((m, i) => ({ ...m, id: s.day * 100 + i }));
    this.regrowResources();
    s.journal.unshift(`Day ${s.day}: ${s.weather} weather. The valley ${s.beacon.level > 0 ? "glows a little brighter" : "waits for the Beacon"}.`);
    s.journal = s.journal.slice(0, 20);
    s.tutorial.slept = true;
    this.saveGame(true);
    this.updateHUD();
    this.toast(`Day ${s.day} begins — ${s.weather}. ${rainy ? "The rain watered every tilled tile." : ""}`);
    this.checkAchievement("week", s.day >= 8, "One Valley Week", "Reach Day 8.");
  }

  rollWeather() {
    const r = Math.random();
    if (this.state.day % 7 === 0) return "Sparkfall";
    if (r < 0.22) return "Rain";
    if (r < 0.39) return "Cloudy";
    if (r < 0.46) return "Sparkfall";
    return "Clear";
  }

  regrowResources() {
    const existing = new Set(this.state.resources.map((r) => keyOf(Math.floor(r.x), Math.floor(r.y))));
    let nextId = this.state.resources.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    const candidates = [];
    for (let y = 40; y < 51; y += 1) for (let x = 3; x < 34; x += 1) candidates.push({ x, y, type: Math.random() < 0.7 ? "grass" : "tree" });
    for (let y = 36; y < 50; y += 1) for (let x = 40; x < 66; x += 1) candidates.push({ x, y, type: Math.random() < 0.82 ? "rock" : "ore" });
    candidates.sort(() => Math.random() - 0.5).slice(0, 14).forEach((c) => {
      if (!existing.has(keyOf(c.x, c.y))) this.state.resources.push({ id: nextId++, type: c.type, x: c.x + .5, y: c.y + .5, hp: c.type === "tree" ? 3 : c.type === "grass" ? 1 : c.type === "ore" ? 3 : 2, maxHp: c.type === "tree" ? 3 : c.type === "grass" ? 1 : c.type === "ore" ? 3 : 2 });
    });
  }

  openShop() {
    const rows = SHOP_ITEMS.map((item) => `
      <article class="shop-item">
        <div><h3>${ITEMS[item.id].icon} ${ITEMS[item.id].name} ×${item.amount}</h3><p>${item.description}</p><p><strong>${item.price} ◈</strong></p></div>
        <button data-buy="${item.id}">Buy</button>
      </article>
    `).join("");
    this.openModal("Mira’s Seed Stall", `<p>Your coins: <strong>${this.state.coins} ◈</strong></p><div class="shop-list">${rows}</div><hr><p>You can also sell all harvested goods and fish at once.</p>`, [
      { label: "Sell Produce & Fish", action: () => this.sellProduce() },
      { label: "Close", action: () => this.closeModal() },
    ]);
    document.querySelectorAll("[data-buy]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = SHOP_ITEMS.find((i) => i.id === button.dataset.buy);
        if (this.state.coins < item.price) return this.toast("Not enough coins.");
        this.state.coins -= item.price;
        this.addItem(item.id, item.amount, false);
        this.sound("coin");
        this.toast(`Bought ${ITEMS[item.id].name} ×${item.amount}.`);
        this.closeModal();
        this.openShop();
      });
    });
  }

  sellProduce() {
    const sellable = ["turnip", "berry", "moonbean", "fish", "rareFish"];
    let total = 0;
    for (const id of sellable) {
      const count = this.state.inventory[id] || 0;
      total += count * ITEMS[id].value;
      this.state.inventory[id] = 0;
    }
    if (total <= 0) return this.toast("You have no produce or fish to sell.");
    const bonus = this.state.beacon.level >= 1 ? Math.floor(total * 0.1) : 0;
    total += bonus;
    this.state.coins += total;
    this.state.stats.totalEarned += total;
    this.sound("coin");
    this.toast(`Sold goods for ${total} coins${bonus ? " including the Beacon market bonus" : ""}.`);
    this.closeModal();
    this.checkAchievement("merchant", this.state.stats.totalEarned >= 1000, "Valley Merchant", "Earn 1,000 coins from sales and rewards.");
  }

  openInn() {
    this.openModal("The Hearth & Kettle", `
      <p>The inn serves restorative meals and keeps a community notice board.</p>
      <div class="shop-list">
        <article class="shop-item"><div><h3>🍲 Valley Stew</h3><p>Restore all energy and 25 health.</p><p><strong>65 ◈</strong></p></div><button id="buyStew">Eat</button></article>
        <article class="shop-item"><div><h3>🛠️ Tool Tempering</h3><p>Increase axe, pickaxe, and sword power by 1.</p><p><strong>${250 * this.state.upgrades.toolPower} ◈</strong></p></div><button id="upgradeTools">Upgrade</button></article>
      </div>
    `, [{ label: "Close", action: () => this.closeModal() }]);
    $("buyStew").onclick = () => {
      if (this.state.coins < 65) return this.toast("Not enough coins.");
      this.state.coins -= 65;
      this.state.player.energy = this.state.player.maxEnergy;
      this.state.player.health = clamp(this.state.player.health + 25, 0, this.state.player.maxHealth);
      this.closeModal(); this.toast("The stew was excellent. Energy fully restored.");
    };
    $("upgradeTools").onclick = () => {
      const price = 250 * this.state.upgrades.toolPower;
      if (this.state.coins < price) return this.toast("Not enough coins.");
      if (this.state.upgrades.toolPower >= 4) return this.toast("Your tools are already masterwork quality.");
      this.state.coins -= price;
      this.state.upgrades.toolPower += 1;
      this.closeModal(); this.toast(`Tools upgraded to power ${this.state.upgrades.toolPower}.`);
    };
  }

  openQuestBoard() {
    const html = this.state.quests.map((q) => {
      const progress = Math.min(q.target, this.state.questStats[q.type] || 0);
      return `<article class="quest"><h3>${q.title}</h3><p>${q.text}</p><div class="progress"><i style="width:${progress / q.target * 100}%"></i></div><p>${progress}/${q.target} · Reward ${q.reward} ◈</p>${progress >= q.target && !q.claimed ? `<button data-claim="${q.id}">Claim Reward</button>` : q.claimed ? "<strong>Completed</strong>" : ""}</article>`;
    }).join("");
    this.openModal("Community Requests", html, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-claim]").forEach((b) => b.onclick = () => this.claimQuest(b.dataset.claim));
  }

  claimQuest(id) {
    const q = this.state.quests.find((item) => item.id === id);
    if (!q || q.claimed || (this.state.questStats[q.type] || 0) < q.target) return;
    q.claimed = true;
    this.state.coins += q.reward;
    this.state.stats.totalEarned += q.reward;
    this.state.completedQuests.push(q.id);
    this.sound("success");
    this.closeModal();
    this.toast(`Quest complete: ${q.title}. +${q.reward} coins.`);
    this.checkAchievement("helper", this.state.completedQuests.length >= 5, "Community Helper", "Complete 5 requests.");
  }

  checkQuests() {
    for (const q of this.state.quests) {
      if (!q.claimed && (this.state.questStats[q.type] || 0) >= q.target) this.toast(`Request ready: ${q.title}. Claim it at the board.`);
    }
  }

  openBeacon() {
    const b = this.state.beacon;
    const thresholds = [
      { level: 1, wood: 30, stone: 20, produce: 5, reward: "Market prices +10% and Mote awakens." },
      { level: 2, wood: 60, stone: 50, produce: 15, reward: "Tool energy costs fall by 15%." },
      { level: 3, wood: 100, stone: 90, produce: 30, reward: "Every harvest gains +1 yield and Moon Seeds arrive every third day." },
    ];
    const tiers = thresholds.map((t) => `<article class="restore-tier"><h3>${t.level <= b.level ? "✅" : "🔆"} Hearthlight Tier ${t.level}</h3><p>${t.reward}</p><p>Wood ${Math.min(b.wood, t.wood)}/${t.wood} · Stone ${Math.min(b.stone, t.stone)}/${t.stone} · Produce ${Math.min(b.produce, t.produce)}/${t.produce}</p></article>`).join("");
    this.openModal("Hearthlight Beacon", `<p>Donate shared resources to restore the valley’s ancient Beacon. Donations accumulate across tiers.</p>${tiers}<p><strong>Inventory:</strong> ${this.state.inventory.wood} wood, ${this.state.inventory.stone} stone, ${(this.state.inventory.turnip || 0) + (this.state.inventory.berry || 0) + (this.state.inventory.moonbean || 0)} produce</p>`, [
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
    const b = this.state.beacon;
    const levels = [
      b.wood >= 30 && b.stone >= 20 && b.produce >= 5,
      b.wood >= 60 && b.stone >= 50 && b.produce >= 15,
      b.wood >= 100 && b.stone >= 90 && b.produce >= 30,
    ];
    const newLevel = levels.filter(Boolean).length;
    if (newLevel > b.level) {
      b.level = newLevel;
      if (newLevel >= 1) this.state.mote.unlocked = true;
      this.sound("success");
      this.toast(`Hearthlight restored to Tier ${newLevel}!`);
      this.state.journal.unshift(`Day ${this.state.day}: The Hearthlight reached Tier ${newLevel}.`);
      this.checkAchievement("beacon", newLevel >= 1, "Light the Valley", "Restore the first Hearthlight tier.");
      this.checkAchievement("beacon-master", newLevel >= 3, "Hearthkeeper", "Fully restore the Hearthlight Beacon.");
    }
  }

  showCrafting() {
    const html = RECIPES.map((r) => {
      const costText = Object.entries(r.cost).map(([id, n]) => `${ITEMS[id].icon} ${n} ${ITEMS[id].name}`).join(" · ");
      const can = this.canAffordItems(r.cost);
      return `<article class="recipe"><h3>${r.icon} ${r.name}</h3><p>${r.description}</p><p>${costText}</p><button data-craft="${r.id}" ${can ? "" : "disabled"}>Craft</button></article>`;
    }).join("");
    this.openModal("Crafting", `<div class="recipe-list">${html}</div><p>Sprinklers and lanterns are placed on the tile in front of you after crafting.</p>`, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-craft]").forEach((b) => b.onclick = () => this.craft(b.dataset.craft));
  }

  canAffordItems(cost) {
    return Object.entries(cost).every(([id, n]) => (this.state.inventory[id] || 0) >= n);
  }

  craft(id) {
    const recipe = RECIPES.find((r) => r.id === id);
    if (!recipe || !this.canAffordItems(recipe.cost)) return this.toast("You do not have all required materials.");
    if (["sprinkler", "lantern"].includes(id)) {
      const t = this.targetTile();
      if (!this.isFarmableTile(t.x, t.y) || this.resourceAt(t.x, t.y) || this.placedAt(t.x, t.y) || this.state.soil[keyOf(t.x, t.y)]?.crop) return this.toast("Face an empty farm tile to place this object.");
      for (const [item, n] of Object.entries(recipe.cost)) this.state.inventory[item] -= n;
      this.state.placed.push({ id: Date.now(), type: id, x: t.x + .5, y: t.y + .5 });
      this.closeModal();
      this.toast(`${recipe.name} placed.`);
      return;
    }
    for (const [item, n] of Object.entries(recipe.cost)) this.state.inventory[item] -= n;
    this.addItem("snack", 1, false);
    this.closeModal();
    this.toast("Trail Snack crafted.");
  }

  updateNPCs(dt) {
    const minute = this.state.minutes;
    for (const npc of this.state.npcs) {
      let target = npc.home;
      if (npc.id === "mira") target = minute < 1020 ? { x: 43.5, y: 15.5 } : npc.home;
      if (npc.id === "oren") target = minute < 720 ? { x: 47, y: 35.8 } : minute < 1080 ? { x: 55.5, y: 16 } : npc.home;
      if (npc.id === "lumi") target = minute < 900 ? { x: 49, y: 28 } : { x: 40.5, y: 23 };
      if (npc.id === "tavi") target = minute < 840 ? { x: 18, y: 35 } : { x: 32, y: 44 };
      const dx = target.x - npc.x;
      const dy = target.y - npc.y;
      const len = Math.hypot(dx, dy);
      if (len > .15) {
        const nx = npc.x + dx / len * dt * 1.1;
        const ny = npc.y + dy / len * dt * 1.1;
        if (!this.isWaterTile(Math.floor(nx), Math.floor(ny)) && !this.isBuildingTile(nx, ny)) { npc.x = nx; npc.y = ny; }
      }
    }
  }

  updateMonsters(dt) {
    const p = this.state.player;
    const inMine = p.x >= 39 && p.y >= 35;
    for (const m of this.state.monsters) {
      if (m.hp <= 0) continue;
      m.cooldown = Math.max(0, m.cooldown - dt);
      if (!inMine) continue;
      const d = distance(p, m);
      if (d < 7 && d > .7) {
        const speed = m.type === "shade" ? 1.2 : .85;
        const dx = (p.x - m.x) / d;
        const dy = (p.y - m.y) / d;
        const nx = m.x + dx * speed * dt;
        const ny = m.y + dy * speed * dt;
        if (!this.isWaterTile(Math.floor(nx), Math.floor(ny)) && !this.isBuildingTile(nx, ny)) { m.x = nx; m.y = ny; }
      }
      if (d < .8 && m.cooldown <= 0) {
        const damage = m.type === "shade" ? 12 : 7;
        p.health = clamp(p.health - damage, 0, p.maxHealth);
        m.cooldown = 1.5;
        this.vibrate(70);
        this.sound("hurt");
        this.toast(`A cave ${m.type} hit you for ${damage}.`);
        if (p.health <= 0) this.knockedOut();
      }
    }
  }

  knockedOut() {
    this.state.player.health = 40;
    this.state.player.energy = 35;
    this.state.player.x = 55.5;
    this.state.player.y = 17;
    const fee = Math.min(120, Math.floor(this.state.coins * .15));
    this.state.coins -= fee;
    this.toast(`Oren carried you to the inn. Recovery cost: ${fee} coins.`);
  }

  updateCamera() {
    const p = this.state.player;
    const targetX = p.x * TILE - this.screen.width / 2;
    const targetY = p.y * TILE - this.screen.height / 2;
    const maxX = WORLD_W * TILE - this.screen.width;
    const maxY = WORLD_H * TILE - this.screen.height;
    this.camera.x += (clamp(targetX, 0, Math.max(0, maxX)) - this.camera.x) * .12;
    this.camera.y += (clamp(targetY, 0, Math.max(0, maxY)) - this.camera.y) * .12;
  }

  render() {
    const ctx = this.ctx;
    const w = this.screen.width;
    const h = this.screen.height;
    ctx.save();
    ctx.setTransform(this.screen.dpr, 0, 0, this.screen.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!this.running || !this.state) {
      ctx.fillStyle = "#75ad65";
      ctx.fillRect(0, 0, w, h);
      this.drawTitleBackdrop(ctx, w, h);
      ctx.restore();
      return;
    }
    ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));
    this.drawWorld(ctx);
    this.drawSoil(ctx);
    this.drawPlaced(ctx);
    this.drawResources(ctx);
    this.drawBuildings(ctx);
    this.drawNPCs(ctx);
    this.drawMonsters(ctx);
    if (this.state.mote.unlocked) this.drawMote(ctx);
    this.drawPlayer(ctx);
    this.drawTarget(ctx);
    ctx.restore();
    this.drawWeatherAndLighting(ctx, w, h);
  }

  drawTitleBackdrop(ctx, w, h) {
    ctx.fillStyle = "#8ec6d8";
    ctx.fillRect(0, 0, w, h * .44);
    ctx.fillStyle = "#4f8b53";
    for (let i = 0; i < w + 100; i += 90) {
      ctx.beginPath(); ctx.moveTo(i - 30, h * .47); ctx.lineTo(i + 35, h * .28); ctx.lineTo(i + 100, h * .47); ctx.fill();
    }
  }

  drawWorld(ctx) {
    const startX = clamp(Math.floor(this.camera.x / TILE) - 1, 0, WORLD_W);
    const endX = clamp(Math.ceil((this.camera.x + this.screen.width) / TILE) + 1, 0, WORLD_W);
    const startY = clamp(Math.floor(this.camera.y / TILE) - 1, 0, WORLD_H);
    const endY = clamp(Math.ceil((this.camera.y + this.screen.height) / TILE) + 1, 0, WORLD_H);
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        let color = "#6fa85e";
        if (x >= 36 && y < 32) color = "#7fb16b";
        if (y >= 40 && x < 35) color = "#4e8750";
        if (x >= 39 && y >= 35) color = "#4a4d54";
        if ((x >= 36 && x <= 63 && y >= 16 && y <= 20) || (y >= 27 && y <= 30 && x >= 38 && x <= 62)) color = "#c5aa73";
        if ((x >= 32 && x <= 41 && y >= 20 && y <= 23) || (x >= 45 && x <= 52 && y >= 28 && y <= 35)) color = "#bca16d";
        ctx.fillStyle = color;
        ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
        const n = ((x * 17 + y * 29) % 13);
        if (n === 0 && !this.isWaterTile(x, y)) {
          ctx.fillStyle = "rgba(255,255,255,.12)";
          ctx.fillRect(x * TILE + 6, y * TILE + 8, 2, 2);
          ctx.fillRect(x * TILE + 10, y * TILE + 5, 2, 4);
        }
        if (this.isWaterTile(x, y)) {
          ctx.fillStyle = "#4e9cbc";
          ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
          ctx.fillStyle = "rgba(255,255,255,.26)";
          ctx.fillRect(x * TILE + ((x + y) % 3) * 7 + 3, y * TILE + 12, 10, 2);
        }
        if (x >= 39 && y >= 35) {
          ctx.fillStyle = "rgba(255,255,255,.05)";
          ctx.fillRect(x * TILE + 4, y * TILE + 6, 3, 3);
        }
      }
    }
    ctx.strokeStyle = "rgba(16,36,29,.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(TILE, TILE * 2, (WORLD_W - 2) * TILE, (WORLD_H - 3) * TILE);
  }

  drawSoil(ctx) {
    for (const [key, soil] of Object.entries(this.state.soil)) {
      const [x, y] = key.split(",").map(Number);
      ctx.fillStyle = soil.watered ? "#594b40" : "#7b5d3d";
      ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = soil.watered ? "#8aa8ba" : "#4f3627";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x * TILE + 5, y * TILE + 10); ctx.lineTo(x * TILE + TILE - 5, y * TILE + 8);
      ctx.moveTo(x * TILE + 5, y * TILE + 20); ctx.lineTo(x * TILE + TILE - 5, y * TILE + 18);
      ctx.stroke();
      if (soil.crop) this.drawCrop(ctx, x, y, soil.crop);
    }
  }

  drawCrop(ctx, x, y, cropState) {
    const crop = CROPS[cropState.type];
    const ratio = clamp(cropState.growth / crop.days, 0, 1);
    const cx = x * TILE + TILE / 2;
    const base = y * TILE + TILE - 5;
    ctx.strokeStyle = crop.colors[1];
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, base); ctx.lineTo(cx, base - 8 - ratio * 10); ctx.stroke();
    ctx.fillStyle = crop.colors[1];
    ctx.beginPath(); ctx.ellipse(cx - 4, base - 7 - ratio * 7, 5 + ratio * 2, 3 + ratio, -.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 4, base - 10 - ratio * 8, 5 + ratio * 2, 3 + ratio, .5, 0, Math.PI * 2); ctx.fill();
    if (ratio >= 1) {
      ctx.fillStyle = crop.colors[2];
      ctx.beginPath(); ctx.arc(cx, base - 16, cropState.type === "berry" ? 6 : 7, 0, Math.PI * 2); ctx.fill();
      if (cropState.type === "moonbean") {
        ctx.shadowColor = "#d9d7ff"; ctx.shadowBlur = 10;
        ctx.fillStyle = "#e9e8ff"; ctx.fillRect(cx - 2, base - 20, 4, 4); ctx.shadowBlur = 0;
      }
    }
  }

  drawResources(ctx) {
    const sorted = [...this.state.resources].filter((r) => r.hp > 0).sort((a, b) => a.y - b.y);
    for (const r of sorted) {
      const x = r.x * TILE;
      const y = r.y * TILE;
      if (r.type === "tree") {
        ctx.fillStyle = "#5f3c2a"; ctx.fillRect(x - 5, y - 3, 10, 22);
        ctx.fillStyle = "#245c3a"; ctx.beginPath(); ctx.arc(x, y - 11, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3d8050"; ctx.beginPath(); ctx.arc(x - 9, y - 16, 11, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 9, y - 12, 12, 0, Math.PI * 2); ctx.fill();
      } else if (r.type === "grass") {
        ctx.strokeStyle = "#245c3a"; ctx.lineWidth = 2;
        for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(x + i * 3, y + 10); ctx.lineTo(x + i * 4, y - 4 - Math.abs(i)); ctx.stroke(); }
      } else if (r.type === "rock" || r.type === "ore" || r.type === "crystal") {
        ctx.fillStyle = r.type === "rock" ? "#777b7d" : r.type === "ore" ? "#8a5b46" : "#5f5ba2";
        ctx.beginPath(); ctx.moveTo(x - 13, y + 10); ctx.lineTo(x - 16, y - 5); ctx.lineTo(x - 6, y - 14); ctx.lineTo(x + 11, y - 10); ctx.lineTo(x + 15, y + 7); ctx.closePath(); ctx.fill();
        if (r.type === "ore") { ctx.fillStyle = "#d7894f"; ctx.fillRect(x - 5, y - 6, 5, 5); ctx.fillRect(x + 5, y + 1, 4, 4); }
        if (r.type === "crystal") { ctx.fillStyle = "#c9c8ff"; ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x + 7, y - 6); ctx.lineTo(x, y + 4); ctx.lineTo(x - 7, y - 6); ctx.fill(); }
      }
    }
  }

  drawBuildings(ctx) {
    this.drawHouse(ctx, 4, 4, 8, 5, "#d7a15f", "#8b4e3f", "Farmhouse", 8, 9);
    this.drawHouse(ctx, 39, 7, 9, 7, "#e4b867", "#a85143", "Seed Stall", 43.5, 14);
    this.drawHouse(ctx, 51, 7, 9, 8, "#d0a773", "#436f63", "Hearth & Kettle", 55.5, 15);
    this.drawHouse(ctx, 45, 21, 8, 6, "#b9a185", "#6f596f", "Old Hall", 49, 27);
    this.drawMineEntrance(ctx, 43, 31);
    this.drawQuestBoard(ctx, 40.5, 22);
    this.drawBeaconWorld(ctx, 49, 28.2);
    ctx.font = "bold 12px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff1c8";
    ctx.strokeStyle = "#10241d";
    ctx.lineWidth = 4;
    ctx.strokeText("FOREST", 20 * TILE, 42 * TILE);
    ctx.fillText("FOREST", 20 * TILE, 42 * TILE);
    ctx.strokeText("OLD MINE", 53 * TILE, 38 * TILE);
    ctx.fillText("OLD MINE", 53 * TILE, 38 * TILE);
  }

  drawHouse(ctx, x, y, w, h, wall, roof, label, doorX, doorY) {
    const px = x * TILE, py = y * TILE;
    ctx.fillStyle = wall; ctx.fillRect(px, py + TILE, w * TILE, (h - 1) * TILE);
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(px - 10, py + TILE * 1.2); ctx.lineTo(px + w * TILE / 2, py - 18); ctx.lineTo(px + w * TILE + 10, py + TILE * 1.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#563c32"; ctx.fillRect(doorX * TILE - 12, doorY * TILE - 30, 24, 30);
    ctx.fillStyle = "#8ec6d8"; ctx.fillRect(px + 20, py + TILE * 2.1, 22, 18); ctx.fillRect(px + w * TILE - 42, py + TILE * 2.1, 22, 18);
    ctx.fillStyle = "#10241d"; ctx.font = "bold 12px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(label, px + w * TILE / 2, py + TILE * 1.55);
  }

  drawMineEntrance(ctx, x, y) {
    const px = x * TILE, py = y * TILE;
    ctx.fillStyle = "#56595e"; ctx.fillRect(px, py + TILE, 8 * TILE, 3 * TILE);
    ctx.fillStyle = "#2a2c30"; ctx.beginPath(); ctx.arc(px + 4 * TILE, py + 3 * TILE, 70, Math.PI, 0); ctx.fill();
    ctx.fillRect(px + 4 * TILE - 70, py + 3 * TILE, 140, TILE);
    ctx.strokeStyle = "#7a5a3a"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(px + 4 * TILE, py + 3 * TILE, 74, Math.PI, 0); ctx.stroke();
  }

  drawQuestBoard(ctx, x, y) {
    const px = x * TILE, py = y * TILE;
    ctx.fillStyle = "#6c432c"; ctx.fillRect(px - 3, py - 10, 6, 36);
    ctx.fillStyle = "#d5b878"; ctx.fillRect(px - 18, py - 18, 36, 25);
    ctx.fillStyle = "#10241d"; ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.fillText("!", px, py + 2);
  }

  drawBeaconWorld(ctx, x, y) {
    const level = this.state.beacon.level;
    const px = x * TILE, py = y * TILE;
    ctx.fillStyle = "#5b4b3b"; ctx.fillRect(px - 12, py - 4, 24, 34);
    ctx.fillStyle = level > 0 ? "#efb94a" : "#777";
    ctx.shadowColor = level > 0 ? "#ffe69b" : "transparent"; ctx.shadowBlur = level * 12;
    ctx.beginPath(); ctx.moveTo(px, py - 34); ctx.lineTo(px + 18, py - 8); ctx.lineTo(px, py + 2); ctx.lineTo(px - 18, py - 8); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    for (let i = 0; i < level; i += 1) {
      ctx.fillStyle = "#fff4b8"; ctx.beginPath(); ctx.arc(px + Math.cos(i * 2.1) * 28, py - 14 + Math.sin(i * 2.1) * 15, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawPlaced(ctx) {
    for (const p of this.state.placed) {
      const x = p.x * TILE, y = p.y * TILE;
      if (p.type === "sprinkler") {
        ctx.fillStyle = "#6f7e87"; ctx.fillRect(x - 5, y - 12, 10, 22);
        ctx.fillStyle = "#8ec6d8"; ctx.fillRect(x - 12, y - 14, 24, 6);
        ctx.fillStyle = "rgba(142,198,216,.55)"; ctx.beginPath(); ctx.arc(x, y - 12, 18, Math.PI, 0); ctx.stroke();
      } else {
        ctx.fillStyle = "#6c432c"; ctx.fillRect(x - 5, y - 5, 10, 18);
        ctx.fillStyle = "#efb94a"; ctx.shadowColor = "#ffe69b"; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(x, y - 12, 9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
    }
  }

  drawNPCs(ctx) {
    const sorted = [...this.state.npcs].sort((a, b) => a.y - b.y);
    for (const npc of sorted) {
      this.drawCharacter(ctx, npc.x, npc.y, npc.color, npc.emoji, npc.name);
    }
  }

  drawMonsters(ctx) {
    for (const m of this.state.monsters.filter((x) => x.hp > 0).sort((a, b) => a.y - b.y)) {
      const x = m.x * TILE, y = m.y * TILE;
      ctx.fillStyle = m.type === "shade" ? "#463d62" : "#596c58";
      ctx.beginPath(); ctx.ellipse(x, y, m.type === "shade" ? 15 : 12, m.type === "shade" ? 18 : 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f5dca7"; ctx.fillRect(x - 6, y - 4, 3, 3); ctx.fillRect(x + 3, y - 4, 3, 3);
      if (m.hp < m.maxHp) {
        ctx.fillStyle = "#10241d"; ctx.fillRect(x - 15, y - 25, 30, 5);
        ctx.fillStyle = "#d95e52"; ctx.fillRect(x - 14, y - 24, 28 * m.hp / m.maxHp, 3);
      }
    }
  }

  drawMote(ctx) {
    const p = this.state.player;
    const t = performance.now() / 500;
    const x = (p.x - .65 + Math.cos(t) * .25) * TILE;
    const y = (p.y - .65 + Math.sin(t * 1.2) * .18) * TILE;
    ctx.shadowColor = "#fff3a8"; ctx.shadowBlur = 14;
    ctx.fillStyle = "#fff3a8"; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawPlayer(ctx) {
    this.drawCharacter(ctx, this.state.player.x, this.state.player.y, "#2e6f57", "🧑🏽‍🌾", "");
  }

  drawCharacter(ctx, x, y, color, emoji, name) {
    const px = x * TILE, py = y * TILE;
    ctx.fillStyle = "rgba(16,36,29,.22)"; ctx.beginPath(); ctx.ellipse(px, py + 12, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(px - 9, py - 7, 18, 21);
    ctx.fillStyle = "#e9c7a0"; ctx.beginPath(); ctx.arc(px, py - 13, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#10241d"; ctx.fillRect(px - 5, py - 15, 3, 3); ctx.fillRect(px + 2, py - 15, 3, 3);
    if (name) {
      ctx.font = "bold 10px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillStyle = "#fff1c8"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3; ctx.strokeText(name, px, py - 28); ctx.fillText(name, px, py - 28);
    }
  }

  drawTarget(ctx) {
    const t = this.targetTile();
    ctx.strokeStyle = "rgba(255,241,200,.85)";
    ctx.lineWidth = 2;
    ctx.strokeRect(t.x * TILE + 3, t.y * TILE + 3, TILE - 6, TILE - 6);
  }

  drawWeatherAndLighting(ctx, w, h) {
    const weather = WEATHER[this.state.weather];
    ctx.fillStyle = weather.tint;
    ctx.fillRect(0, 0, w, h);
    if (this.state.weather === "Rain") {
      ctx.strokeStyle = "rgba(205,230,244,.55)"; ctx.lineWidth = 1;
      const t = performance.now() / 12;
      for (let i = 0; i < 80; i += 1) {
        const x = (i * 83 + t * .9) % (w + 50) - 25;
        const y = (i * 47 + t * 1.8) % (h + 50) - 25;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 14); ctx.stroke();
      }
    }
    if (this.state.weather === "Sparkfall") {
      const t = performance.now() / 700;
      for (let i = 0; i < 25; i += 1) {
        const x = (i * 137 + Math.sin(t + i) * 80 + t * 20) % (w + 40) - 20;
        const y = (i * 91 + t * 28) % (h + 40) - 20;
        ctx.fillStyle = `rgba(235,228,255,${.35 + (i % 3) * .18})`;
        ctx.fillRect(x, y, 3, 3);
      }
    }
    const hour = this.state.minutes / 60;
    let darkness = 0;
    if (hour < 6) darkness = .55;
    else if (hour < 8) darkness = (8 - hour) * .12;
    else if (hour > 18) darkness = clamp((hour - 18) * .09, 0, .62);
    if (darkness > 0) {
      ctx.fillStyle = `rgba(19,28,55,${darkness})`;
      ctx.fillRect(0, 0, w, h);
      if (this.state.beacon.level > 0) {
        const bx = 49 * TILE - this.camera.x;
        const by = 28 * TILE - this.camera.y;
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, 150 + this.state.beacon.level * 60);
        grad.addColorStop(0, `rgba(255,225,130,${.22 + this.state.beacon.level * .05})`);
        grad.addColorStop(1, "rgba(255,225,130,0)");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      }
    }
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
    $("toolbar").innerHTML = TOOLS.map((tool, i) => {
      let count = "";
      if (tool.id === "seed") count = this.state.inventory[CROPS[this.state.selectedCrop].seed] || 0;
      if (tool.id === "snack") count = this.state.inventory.snack || 0;
      const title = tool.id === "seed" ? `${CROPS[this.state.selectedCrop].name} Seeds — press Q to cycle` : tool.name;
      return `<button class="tool-slot ${i === this.state.selectedTool ? "selected" : ""}" data-tool="${i}" title="${title}"><span class="tool-key">${i + 1}</span><span class="tool-icon">${tool.icon}</span>${count !== "" ? `<span class="tool-count">${count}</span>` : ""}</button>`;
    }).join("");
    document.querySelectorAll("[data-tool]").forEach((b) => b.onclick = () => this.selectTool(Number(b.dataset.tool)));
  }

  selectTool(index) {
    this.state.selectedTool = clamp(index, 0, TOOLS.length - 1);
    this.buildToolbar();
    const tool = TOOLS[this.state.selectedTool];
    this.toast(tool.id === "seed" ? `${CROPS[this.state.selectedCrop].name} seeds selected. Press Q to cycle.` : `${tool.name} selected.`);
  }

  updateContextHint() {
    const hint = $("contextHint");
    const p = this.state.player;
    let text = "";
    const npc = this.state.npcs.find((n) => distance(p, n) < 1.45);
    const t = this.targetTile(.9);
    const soil = this.state.soil[keyOf(t.x, t.y)];
    if (npc) text = `Interact: Talk to ${npc.name}`;
    else if (soil?.crop && soil.crop.growth >= CROPS[soil.crop.type].days) text = `Interact: Harvest ${CROPS[soil.crop.type].name}`;
    else if (distance(p, { x: 8, y: 9 }) < 2) text = "Interact: Sleep and save";
    else if (distance(p, { x: 43.5, y: 14.5 }) < 2.1) text = "Interact: Open seed stall";
    else if (distance(p, { x: 55.5, y: 15.5 }) < 2.1) text = "Interact: Enter inn";
    else if (distance(p, { x: 49, y: 27.7 }) < 2.2) text = "Interact: Restore the Hearthlight";
    else if (distance(p, { x: 40.5, y: 22 }) < 1.8) text = "Interact: Community requests";
    else text = `${TOOLS[this.state.selectedTool].name}: ${matchMedia("(pointer: coarse)").matches ? "A button" : "Space/F"} · Interact: ${matchMedia("(pointer: coarse)").matches ? "B button" : "E/Enter"}`;
    hint.textContent = text;
    hint.classList.toggle("hidden", !text);
  }

  toggleGameMenu() {
    if (!this.running) return;
    if (this.dialogueOpen) return this.closeDialogue();
    if (this.modalOpen) return this.closeModal();
    this.openModal("Valley Menu", `
      <div class="menu-grid">
        <button id="inventoryMenu">🎒 Inventory</button>
        <button id="craftingMenu">🛠️ Crafting</button>
        <button id="questsMenu">📜 Requests</button>
        <button id="peopleMenu">🤝 Villagers</button>
        <button id="journalMenu">📖 Journal</button>
        <button id="statsMenu">🏆 Achievements</button>
        <button id="settingsMenu">⚙️ Settings</button>
        <button id="saveMenu">💾 Save Valley</button>
      </div>
    `, [
      { label: "Resume", action: () => this.closeModal() },
      { label: "Title Screen", action: () => this.leaveToTitle() },
    ]);
    $("inventoryMenu").onclick = () => this.showInventory();
    $("craftingMenu").onclick = () => this.showCrafting();
    $("questsMenu").onclick = () => this.openQuestBoard();
    $("peopleMenu").onclick = () => this.showRelationships();
    $("journalMenu").onclick = () => this.showJournal();
    $("statsMenu").onclick = () => this.showStats();
    $("settingsMenu").onclick = () => this.showSettings(true);
    $("saveMenu").onclick = () => { this.saveGame(false); this.closeModal(); };
  }

  showInventory() {
    const items = Object.entries(this.state.inventory).filter(([, count]) => count > 0).map(([id, count]) => `<article class="inventory-item"><span class="item-icon">${ITEMS[id]?.icon || "📦"}</span><strong>${ITEMS[id]?.name || id}</strong><small>Quantity: ${count}</small><small>Base value: ${ITEMS[id]?.value || 0} ◈</small></article>`).join("");
    const harmony = this.totalHarmony();
    this.openModal("Inventory & Farm Harmony", `<p>Farm Harmony: <strong>${harmony}</strong>. Mature different crops beside one another to increase bonus harvests.</p><div class="inventory-grid">${items || "<p>Your backpack is empty.</p>"}</div>`, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
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

  showRelationships() {
    const html = this.state.npcs.map((n) => `<article class="relationship"><h3>${n.emoji} ${n.name}</h3><div class="progress"><i style="width:${n.friendship * 10}%"></i></div><p>Friendship ${n.friendship}/10 · Favorite gift: ${ITEMS[n.favorite].icon} ${ITEMS[n.favorite].name}</p></article>`).join("");
    this.openModal("Villagers", html, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
  }

  showJournal() {
    this.openModal("Valley Journal", this.state.journal.map((j) => `<p>• ${j}</p>`).join(""), [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
  }

  showStats() {
    const s = this.state.stats;
    const achievements = this.state.achievements.length ? this.state.achievements.map((a) => `<p>🏆 <strong>${a.title}</strong> — ${a.description}</p>`).join("") : "<p>No achievements unlocked yet.</p>";
    this.openModal("Achievements & Statistics", `
      <div class="inventory-grid">
        <article class="inventory-item"><strong>${Math.floor(s.steps)}</strong><small>tiles traveled</small></article>
        <article class="inventory-item"><strong>${s.cropsHarvested}</strong><small>crops harvested</small></article>
        <article class="inventory-item"><strong>${s.fishCaught}</strong><small>fish caught</small></article>
        <article class="inventory-item"><strong>${s.monstersDefeated}</strong><small>monsters defeated</small></article>
        <article class="inventory-item"><strong>${s.totalEarned}</strong><small>coins earned</small></article>
        <article class="inventory-item"><strong>${this.state.completedQuests.length}</strong><small>requests completed</small></article>
      </div><hr>${achievements}
    `, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
  }

  checkAchievement(id, condition, title, description) {
    if (!condition || this.state.achievements.some((a) => a.id === id)) return;
    this.state.achievements.push({ id, title, description, day: this.state.day });
    this.sound("success");
    this.toast(`Achievement unlocked: ${title}`);
  }

  showSettings(fromGame) {
    const checked = (v) => v ? "checked" : "";
    this.openModal("Settings", `
      <label class="settings-row"><span>Sound effects</span><input id="soundSetting" type="checkbox" ${checked(this.settings.sound)}></label>
      <label class="settings-row"><span>Vibration on supported mobile devices</span><input id="vibrationSetting" type="checkbox" ${checked(this.settings.vibration)}></label>
      <label class="settings-row"><span>Fullscreen</span><button id="fullscreenSetting">Toggle Fullscreen</button></label>
      <hr>
      <p><strong>Save management</strong></p>
      <div class="dialogue-choices"><button id="exportSave">Export Save</button><label style="display:inline-block"><button id="importButton">Import Save</button><input id="importSave" type="file" accept="application/json" hidden></label></div>
    `, [{ label: fromGame ? "Back" : "Close", action: () => { this.closeModal(); if (fromGame) this.toggleGameMenu(); } }]);
    $("soundSetting").onchange = (e) => { this.settings.sound = e.target.checked; this.saveSettings(); };
    $("vibrationSetting").onchange = (e) => { this.settings.vibration = e.target.checked; this.saveSettings(); };
    $("fullscreenSetting").onclick = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    };
    $("exportSave").onclick = () => this.state ? this.exportSave() : this.toast("Start a valley before exporting a save.");
    $("importButton").onclick = () => $("importSave").click();
    $("importSave").onchange = (e) => { if (e.target.files?.[0]) this.importSave(e.target.files[0]); };
  }

  showHowToPlay() {
    this.openModal("How to Play", `
      <section class="help-section"><h3>Move & Interact</h3><p>Desktop: <kbd>WASD</kbd> or arrow keys to move, <kbd>E</kbd>/<kbd>Enter</kbd> to interact, <kbd>Space</kbd>/<kbd>F</kbd> to use a tool. Mobile: use the left stick, A to use tools, and B to interact.</p></section>
      <section class="help-section"><h3>Farm</h3><p>Hoe an open farm tile, water it, select Seeds, and plant. Crops advance one growth day only when watered. Rain waters every tilled tile.</p></section>
      <section class="help-section"><h3>Harmony — Unique Mechanic</h3><p>Mature crops of different types create resonance when planted beside one another. Strong Harmony can double harvests. Moonbeans, Sparkfall weather, and crafted lanterns amplify it.</p></section>
      <section class="help-section"><h3>Restore the Valley</h3><p>Donate wood, stone, and produce to the Hearthlight Beacon. Each restored tier permanently unlocks powerful valley-wide bonuses and the helpful spirit Mote.</p></section>
      <section class="help-section"><h3>Explore</h3><p>Fish at water, mine ore in the southeast cave, complete community requests, befriend villagers with favorite gifts, craft sprinklers, upgrade tools, and save by sleeping or through the menu.</p></section>
    `, [{ label: "Close", action: () => this.closeModal() }]);
  }

  showDialogue(npc, text, choices = []) {
    this.dialogueOpen = true;
    this.paused = true;
    $("dialogueName").textContent = npc.name;
    $("dialoguePortrait").textContent = npc.emoji || "🙂";
    $("dialogueText").textContent = text;
    const choiceBox = $("dialogueChoices");
    choiceBox.innerHTML = "";
    choices.forEach((choice) => {
      const button = document.createElement("button");
      button.textContent = choice.label;
      button.addEventListener("click", choice.action);
      choiceBox.appendChild(button);
    });
    $("dialogue").classList.remove("hidden");
  }

  closeDialogue() {
    this.dialogueOpen = false;
    this.paused = false;
    $("dialogue").classList.add("hidden");
  }

  openModal(title, body, actions = []) {
    this.modalOpen = true;
    this.paused = true;
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = body;
    const area = $("modalActions");
    area.innerHTML = "";
    actions.forEach((action) => {
      const button = document.createElement("button");
      button.textContent = action.label;
      if (action.danger) button.style.background = "#d95e52";
      button.addEventListener("click", action.action);
      area.appendChild(button);
    });
    $("modal").classList.remove("hidden");
  }

  closeModal() {
    if (this.fishingTimer) { clearInterval(this.fishingTimer); this.fishingTimer = null; }
    this.modalOpen = false;
    this.paused = !this.running;
    $("modal").classList.add("hidden");
  }

  toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.remove("hidden");
    requestAnimationFrame(() => el.classList.add("show"));
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.classList.add("hidden"), 200);
    }, 2600);
  }

  sound(type) {
    if (!this.settings.sound) return;
    try {
      if (!this.audio) this.audio = new (window.AudioContext || window.webkitAudioContext)();
      const osc = this.audio.createOscillator();
      const gain = this.audio.createGain();
      const map = { dig: 150, water: 310, plant: 420, hit: 130, swing: 220, harvest: 520, success: 690, coin: 610, eat: 360, hurt: 95 };
      osc.frequency.value = map[type] || 300;
      osc.type = type === "success" ? "triangle" : "square";
      gain.gain.setValueAtTime(.04, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, this.audio.currentTime + .12);
      osc.connect(gain); gain.connect(this.audio.destination);
      osc.start(); osc.stop(this.audio.currentTime + .12);
    } catch {}
  }

  vibrate(ms) {
    if (this.settings.vibration) navigator.vibrate?.(ms);
  }
}

new HearthvaleGame();
