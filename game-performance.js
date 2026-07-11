import {
  ITEMS,
  NPC_DEFS,
  CAVE_W,
  CAVE_H,
  generateQuests,
  generateGuildBounties,
  clamp,
  keyOf,
  randomInt,
  forecastWeather,
  terrainAt,
} from "./game-shared.js";
import {
  activeChunksForViewport,
  generateResourceChunk,
  generateMonsterChunk,
  localMapBounds,
} from "./world-stream.js";

export const WORLD_MINUTES_PER_REAL_SECOND = 1.25;
export const CAVE_MINUTES_PER_REAL_SECOND = 0.75;

const makeStreamState = (day) => ({
  day,
  depletedResources: [],
  defeatedMonsters: [],
  resourceDamage: {},
  monsterDamage: {},
});

const uniquePush = (array, value) => {
  if (!array.includes(value)) array.push(value);
};

export function installPerformanceStreaming(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    saveGame: proto.saveGame,
    hitResource: proto.hitResource,
    gatherForage: proto.gatherForage,
    defeatMonster: proto.defeatMonster,
  };

  proto.defaultState = function defaultStateStreamed() {
    const inventory = Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0]));
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
      resources: [],
      placed: [],
      npcs: NPC_DEFS.map((npc) => ({ ...npc, friendship: 0, talkedDay: 0, x: npc.home.x, y: npc.home.y })),
      monsters: [],
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
      journal: ["Day 1: Nearby chunks now stream around the player instead of loading the full continent."],
      upgrades: { toolPower: 1, weaponPower: 1, armor: 0, backpack: 40 },
      mote: { unlocked: false, bond: 0 },
      flags: { introSeen: false, legacyMigrated: false, caveBossDefeated: false },
      guild: { xp: 0, rank: "F", bounties: generateGuildBounties(1), dailyKills: {}, completed: 0 },
      cave: { maxFloor: 1, currentFloor: 1, runSeed: randomInt(1000, 999999), clearedMonsters: [], minedNodes: [], openedChests: [], visitedFloors: [1] },
      stream: makeStreamState(1),
    };
  };

  proto.ensureStreamState = function ensureStreamState() {
    if (!this.state.stream || this.state.stream.day !== this.state.day) this.state.stream = makeStreamState(this.state.day);
    this.state.stream.depletedResources ||= [];
    this.state.stream.defeatedMonsters ||= [];
    this.state.stream.resourceDamage ||= {};
    this.state.stream.monsterDamage ||= {};
  };

  proto.migrateState = function migrateStateStreamed(data) {
    const state = original.migrateState.call(this, data);
    state.resources = [];
    state.monsters = [];
    state.stream = data?.stream?.day === state.day
      ? {
          ...makeStreamState(state.day),
          ...data.stream,
          depletedResources: Array.isArray(data.stream.depletedResources) ? data.stream.depletedResources : [],
          defeatedMonsters: Array.isArray(data.stream.defeatedMonsters) ? data.stream.defeatedMonsters : [],
          resourceDamage: data.stream.resourceDamage || {},
          monsterDamage: data.stream.monsterDamage || {},
        }
      : makeStreamState(state.day);
    return state;
  };

  proto.snapshotActiveChunkState = function snapshotActiveChunkState() {
    if (!this.state || this.state.mode !== "world") return;
    this.ensureStreamState();
    for (const resource of this.state.resources) {
      if (resource.hp > 0 && resource.hp < resource.maxHp) this.state.stream.resourceDamage[resource.id] = resource.hp;
    }
    for (const monster of this.state.monsters) {
      if (monster.hp > 0 && monster.hp < monster.maxHp) this.state.stream.monsterDamage[monster.id] = monster.hp;
    }
  };

  proto.refreshActiveWorldChunks = function refreshActiveWorldChunks(force = false) {
    if (!this.state || this.state.mode !== "world") return;
    this.ensureStreamState();
    const chunks = activeChunksForViewport(this.state.player.x, this.state.player.y, this.screen.width, this.screen.height);
    const signature = chunks.map((chunk) => chunk.key).join("|");
    if (!force && signature === this.activeChunkSignature) return;

    this.snapshotActiveChunkState();
    const oldResources = new Map(this.state.resources.map((resource) => [resource.id, resource]));
    const oldMonsters = new Map(this.state.monsters.map((monster) => [monster.id, monster]));
    const depleted = new Set(this.state.stream.depletedResources);
    const defeated = new Set(this.state.stream.defeatedMonsters);
    const resources = [];
    const monsters = [];

    for (const chunk of chunks) {
      for (const generated of generateResourceChunk(this.state.day, chunk.cx, chunk.cy)) {
        if (depleted.has(generated.id)) continue;
        const existing = oldResources.get(generated.id);
        const hp = existing?.hp ?? this.state.stream.resourceDamage[generated.id] ?? generated.hp;
        resources.push({ ...generated, ...(existing || {}), hp });
      }
      for (const generated of generateMonsterChunk(this.state.day, chunk.cx, chunk.cy)) {
        if (defeated.has(generated.id)) continue;
        const existing = oldMonsters.get(generated.id);
        const hp = existing?.hp ?? this.state.stream.monsterDamage[generated.id] ?? generated.hp;
        monsters.push({ ...generated, ...(existing || {}), hp });
      }
    }

    this.state.resources = resources;
    this.state.monsters = monsters;
    this.activeChunkSignature = signature;
    this.rebuildResourceMap();
  };

  proto.enterGame = function enterGameStreamed() {
    original.enterGame.call(this);
    this.activeChunkSignature = "";
    this.refreshActiveWorldChunks(true);
  };

  proto.saveGame = function saveGameStreamed(silent = false) {
    this.snapshotActiveChunkState();
    original.saveGame.call(this, silent);
  };

  proto.update = function updateWithSlowClock(dt) {
    this.updatePlayer(dt);
    if (this.state.mode === "world") this.refreshActiveWorldChunks();
    this.updateMonsters(dt);
    this.attackFlash = Math.max(0, this.attackFlash - dt);
    this.zoneBanner.timer = Math.max(0, this.zoneBanner.timer - dt);
    const rate = this.state.mode === "cave" ? CAVE_MINUTES_PER_REAL_SECOND : WORLD_MINUTES_PER_REAL_SECOND;
    this.state.minutes += dt * rate;
    if (this.state.minutes >= 1380 && !this.lateWarningShown) {
      this.lateWarningShown = true;
      this.toast("It is very late. Return home or use the city inn.");
    }
    if (this.state.minutes >= 1440) this.passOut();
    if (this.justPressed.has("e") || this.justPressed.has("enter")) this.interact();
    if (this.justPressed.has(" ") || this.justPressed.has("f")) this.useTool();
    if (this.justPressed.has("q")) this.cycleSeed();
    this.discoverLocation();
    this.updateCamera();
    this.updateHUD();
    this.updateContextHint();
  };

  proto.nextDay = function nextDayStreamed(passedOut) {
    const state = this.state;
    state.day += 1;
    state.stats.daysPlayed += 1;
    state.minutes = 360;
    state.weather = forecastWeather(state.day);
    state.tomorrowWeather = forecastWeather(state.day + 1);
    state.mode = "world";
    this.currentCave = null;
    this.currentRegion = null;
    this.lateWarningShown = false;
    state.player.x = 11.5;
    state.player.y = 15.5;
    state.player.energy = passedOut ? Math.floor(state.player.maxEnergy * .7) : state.player.maxEnergy;
    state.player.health = clamp(state.player.health + (passedOut ? 10 : 40), 0, state.player.maxHealth);
    for (const soil of Object.values(state.soil)) {
      if (soil.crop && soil.watered) soil.crop.growth += 1;
      soil.watered = state.weather === "Rain";
    }
    for (const placed of state.placed.filter((entry) => entry.type === "sprinkler")) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const soil = state.soil[keyOf(Math.floor(placed.x) + dx, Math.floor(placed.y) + dy)];
        if (soil) soil.watered = true;
      }
    }
    if (state.mote.unlocked) {
      Object.values(state.soil)
        .filter((soil) => soil.crop && !soil.watered)
        .slice(0, 5 + Math.floor(state.mote.bond / 2))
        .forEach((soil) => { soil.watered = true; });
    }
    state.questStats = { wood: 0, stone: 0, copper: 0, harvest: 0, fish: 0, talk: 0, monsters: 0, forage: 0, explore: 1, caveFloors: 0 };
    state.quests = generateQuests(state.day);
    state.guild.bounties = generateGuildBounties(state.day);
    state.guild.dailyKills = {};
    state.dayVisitedRegions = ["farm"];
    state.resources = [];
    state.monsters = [];
    state.stream = makeStreamState(state.day);
    this.activeChunkSignature = "";
    state.cave.runSeed = randomInt(1000, 999999);
    state.cave.clearedMonsters = [];
    state.cave.minedNodes = [];
    state.cave.openedChests = [];
    state.journal.unshift(`Day ${state.day}: ${state.weather} weather. Nearby chunks stream as you travel.`);
    state.journal = state.journal.slice(0, 30);
    this.refreshActiveWorldChunks(true);
    this.saveGame(true);
    this.toast(`Day ${state.day} begins — ${state.weather}.`);
  };

  proto.hitResource = function hitResourceTracked(target, tool) {
    const resource = this.currentResourceAt(target.x, target.y);
    original.hitResource.call(this, target, tool);
    if (!resource || this.state.mode !== "world") return;
    this.ensureStreamState();
    if (resource.hp <= 0) {
      uniquePush(this.state.stream.depletedResources, resource.id);
      delete this.state.stream.resourceDamage[resource.id];
    } else if (resource.hp < resource.maxHp) {
      this.state.stream.resourceDamage[resource.id] = resource.hp;
    }
  };

  proto.gatherForage = function gatherForageTracked(resource) {
    original.gatherForage.call(this, resource);
    if (this.state.mode === "world" && resource) {
      this.ensureStreamState();
      uniquePush(this.state.stream.depletedResources, resource.id);
    }
  };

  proto.defeatMonster = function defeatMonsterTracked(monster) {
    const worldMode = this.state.mode === "world";
    const id = monster?.id;
    original.defeatMonster.call(this, monster);
    if (worldMode && id) {
      this.ensureStreamState();
      uniquePush(this.state.stream.defeatedMonsters, id);
      delete this.state.stream.monsterDamage[id];
    }
  };

  proto.drawMinimap = function drawLocalMinimap(ctx, width, height) {
    const mapW = 192;
    const mapH = 150;
    const x = width - mapW - 14;
    const y = height - mapH - 84;
    ctx.save();
    ctx.globalAlpha = .94;
    ctx.fillStyle = "#10241d";
    ctx.fillRect(x - 4, y - 4, mapW + 8, mapH + 8);
    ctx.fillStyle = "#f5dca7";
    ctx.fillRect(x, y, mapW, mapH);
    if (this.state.mode === "world") {
      const bounds = localMapBounds(this.state.player.x, this.state.player.y);
      const spanX = Math.max(1, bounds.endX - bounds.startX);
      const spanY = Math.max(1, bounds.endY - bounds.startY);
      const terrainColors = { farm: "#6fa85e", field: "#75a95e", village: "#83ae68", city: "#9ca77b", highland: "#7c9585", meadow: "#75ad65", lake: "#6fa589", mist: "#718d82", snow: "#c5d6da", darkforest: "#294b3b", swamp: "#566e49", dread: "#4b455b", volcano: "#68483e", coast: "#d2bd7b", ruins: "#a88c67", path: "#c5aa73", bridge: "#8a6744", water: "#4e9cbc", lava: "#d55a2c" };
      for (let ty = bounds.startY; ty < bounds.endY; ty += 2) {
        for (let tx = bounds.startX; tx < bounds.endX; tx += 2) {
          ctx.fillStyle = terrainColors[terrainAt(tx, ty)] || "#6fa85e";
          ctx.fillRect(x + (tx - bounds.startX) / spanX * mapW, y + (ty - bounds.startY) / spanY * mapH, mapW * 2 / spanX + 1, mapH * 2 / spanY + 1);
        }
      }
      for (const monster of this.state.monsters) {
        if (monster.hp <= 0 || monster.x < bounds.startX || monster.x > bounds.endX || monster.y < bounds.startY || monster.y > bounds.endY) continue;
        ctx.fillStyle = "#d95e52";
        ctx.fillRect(x + (monster.x - bounds.startX) / spanX * mapW - 1, y + (monster.y - bounds.startY) / spanY * mapH - 1, 3, 3);
      }
      ctx.fillStyle = "#fff1c8";
      ctx.strokeStyle = "#10241d";
      ctx.lineWidth = 2;
      const px = x + (this.state.player.x - bounds.startX) / spanX * mapW;
      const py = y + (this.state.player.y - bounds.startY) / spanY * mapH;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#10241d";
      ctx.font = "bold 10px Trebuchet MS";
      ctx.textAlign = "left";
      ctx.fillText("LOCAL AREA", x + 7, y + 13);
    } else {
      ctx.fillStyle = this.currentCave?.tier?.floor || "#4a4d54";
      ctx.fillRect(x + 5, y + 5, mapW - 10, mapH - 10);
      ctx.fillStyle = "#d95e52";
      ctx.beginPath();
      ctx.arc(x + this.state.player.x / CAVE_W * mapW, y + this.state.player.y / CAVE_H * mapH, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
}
