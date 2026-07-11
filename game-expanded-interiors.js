import {
  TILE, BUILDINGS, ITEMS, WEATHER, REGIONS, clamp, distance, $,
} from "./game-shared.js";
import { INTERIOR_MAPS } from "./living-world-data.js";
import { calendarForDay, CROP_SEASON_TABLE } from "./seasons-data.js";
import {
  EXPANDED_INTERIOR_MAPS, BUILDING_INTERIOR_MAP, registerExpandedInteriors,
  activeInteriorResidents, interiorAssignmentForNpc, interiorIsOpenForBuilding,
} from "./expanded-interiors-data.js";

const EXPANDED_IDS = new Set(Object.keys(EXPANDED_INTERIOR_MAPS));

function createExpandedInteriorState(existing = {}) {
  const value = existing && typeof existing === "object" ? existing : {};
  const visits = value.visits && typeof value.visits === "object" ? value.visits : {};
  return {
    version: 1,
    visited: Array.isArray(value.visited) ? [...new Set(value.visited.filter((id) => INTERIOR_MAPS[id]))] : [],
    visits: Object.fromEntries(Object.entries(visits).filter(([id]) => INTERIOR_MAPS[id]).map(([id, count]) => [id, Math.max(0, Math.floor(Number(count) || 0))])),
    lastInterior: INTERIOR_MAPS[value.lastInterior] ? value.lastInterior : null,
    recordsRead: Array.isArray(value.recordsRead) ? [...new Set(value.recordsRead.map(String))] : [],
  };
}

function withFilteredNpcs(game, callback) {
  const all = game.state.npcs;
  game.state.npcs = all.filter((npc) => !npc.interiorId);
  try { return callback(); } finally { game.state.npcs = all; }
}

function formatHour(minutes) {
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = Math.floor(minutes % 60);
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function installExpandedInteriors(GameClass) {
  registerExpandedInteriors();
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    enterInterior: proto.enterInterior,
    openBuildingService: proto.openBuildingService,
    updateNpcSchedules: proto.updateNpcSchedules,
    updateInterior: proto.updateInterior,
    drawNPCs: proto.drawNPCs,
    interact: proto.interact,
    interactInterior: proto.interactInterior,
    updateCamera: proto.updateCamera,
    updateContextHint: proto.updateContextHint,
    toggleGameMenu: proto.toggleGameMenu,
    showHowToPlay: proto.showHowToPlay,
  };

  proto.defaultState = function defaultStateExpandedInteriors() {
    const state = original.defaultState.call(this);
    state.interiors = createExpandedInteriorState();
    return state;
  };

  proto.migrateState = function migrateStateExpandedInteriors(data) {
    const state = original.migrateState.call(this, data);
    state.interiors = createExpandedInteriorState(data?.interiors || state.interiors);
    if (state.mode === "interior" && !INTERIOR_MAPS[state.living?.interiorId]) {
      state.mode = "world";
      state.living.interiorId = null;
    }
    return state;
  };

  proto.enterGame = function enterGameExpandedInteriors() {
    original.enterGame.call(this);
    this.state.interiors = createExpandedInteriorState(this.state.interiors);
    this.refreshInteriorNpcAssignments();
  };

  proto.refreshInteriorNpcAssignments = function refreshInteriorNpcAssignments() {
    if (!this.state?.npcs) return;
    for (const npc of this.state.npcs) {
      const assignment = interiorAssignmentForNpc(npc.id, this.state);
      npc.interiorId = assignment?.interiorId || null;
      if (assignment) npc.activity = `Working inside ${INTERIOR_MAPS[assignment.interiorId].name}`;
    }
  };

  proto.activeInteriorResidents = function activeInteriorResidentsForCurrentMap() {
    const map = INTERIOR_MAPS[this.state.living?.interiorId];
    if (!map) return [];
    return activeInteriorResidents(map, this.state).map((resident) => ({
      resident,
      npc: this.state.npcs.find((entry) => entry.id === resident.id),
    })).filter((entry) => entry.npc);
  };

  proto.updateNpcSchedules = function updateNpcSchedulesExpanded(dt) {
    original.updateNpcSchedules.call(this, dt);
    this.refreshInteriorNpcAssignments();
  };

  proto.updateInterior = function updateInteriorExpanded(dt) {
    original.updateInterior.call(this, dt);
    if (this.state.mode === "interior") this.refreshInteriorNpcAssignments();
  };

  proto.drawNPCs = function drawNpcsExpanded(ctx, bounds) {
    return withFilteredNpcs(this, () => original.drawNPCs.call(this, ctx, bounds));
  };

  proto.interact = function interactExpandedInteriors() {
    if (this.state.mode === "interior") return this.interactInterior();
    return withFilteredNpcs(this, () => original.interact.call(this));
  };

  proto.enterInterior = function enterInteriorExpanded(id, building) {
    original.enterInterior.call(this, id, building);
    if (this.state.mode !== "interior" || !INTERIOR_MAPS[id]) return;
    const records = this.state.interiors;
    if (!records.visited.includes(id)) {
      records.visited.push(id);
      this.state.journal.unshift(`Discovered the interior of ${INTERIOR_MAPS[id].name}.`);
      this.state.journal = this.state.journal.slice(0, 30);
    }
    records.visits[id] = (records.visits[id] || 0) + 1;
    records.lastInterior = id;
    this.refreshInteriorNpcAssignments();
  };

  proto.openBuildingService = function openBuildingExpanded(building) {
    const interiorId = BUILDING_INTERIOR_MAP[building.id];
    if (!interiorId) return original.openBuildingService.call(this, building);
    if (!interiorIsOpenForBuilding(building, this.state)) {
      return this.toast(`${building.name} is closed. Check the sign beside the entrance.`);
    }
    this.enterInterior(interiorId, building);
  };

  proto.interactInterior = function interactExpandedInterior() {
    const map = INTERIOR_MAPS[this.state.living?.interiorId];
    if (!map || !EXPANDED_IDS.has(map.id)) return original.interactInterior.call(this);
    const player = this.state.player;
    if (distance(player, map.exit) < 1.5) return this.leaveInterior();
    const interaction = map.interactions.find((entry) => distance(player, entry) < 1.7);
    if (interaction) {
      this.startActionAnimation?.("interact");
      return this.handleExpandedInteriorInteraction(interaction, map);
    }
    const residentEntry = this.activeInteriorResidents().find(({ resident }) => distance(player, resident) < 2.1);
    if (residentEntry) return this.talkToNPC(residentEntry.npc);
    this.toast("Nothing nearby to interact with.");
  };

  proto.handleExpandedInteriorInteraction = function handleExpandedInteriorInteraction(interaction, map) {
    const id = interaction.id;
    if (id === "seedCounter") return this.openSeedShop();
    if (id === "cropCalendar") return this.showInteriorCropCalendar();
    if (id === "seedDisplay") return this.openModal("Mira's Seed Displays", "<p>Turnips are dependable, Sunberries reward patient care, and Moonbeans respond strongly to Harmony and Sparkfall.</p>", [{ label: "Close", action: () => this.closeModal() }]);
    if (id === "villageInnCounter" || id === "villageKitchen") return this.openInn(false);
    if (id === "villageGuestbook") return this.openModal("Hearth & Kettle Guestbook", `<p>Travelers have left notes about ${this.state.visitedRegions.length} discovered regions. The newest entry mentions ${REGIONS.find((region) => region.id === this.currentRegion)?.name || "Hearthvale"}.</p>`, [{ label: "Close", action: () => this.closeModal() }]);
    if (id === "smithCounter" || id === "smithAnvil") return this.openBlacksmith(true);
    if (id === "forgeLedger") return this.openModal("Ironhart Upgrade Ledger", `<p>Tool Power ${this.state.upgrades.toolPower}/5 · Weapon Power ${this.state.upgrades.weaponPower}/6 · Armor ${this.state.upgrades.armor}/5.</p><p>Deeper cave tiers provide the ores required for stronger tempering.</p>`, [{ label: "Close", action: () => this.closeModal() }]);
    if (id === "apothecaryCounter" || id === "apothecaryCauldron") return this.openApothecary();
    if (id === "remedyNotes") return this.openModal("Pella's Remedy Notes", "<p>Red Potions restore health. Forest Tea restores energy and health. Cave Tonics are stronger underground and help clear harmful combat effects.</p>", [{ label: "Close", action: () => this.closeModal() }]);
    if (id === "cityInnCounter" || id === "cityInnBed") return this.openInn(true);
    if (id === "cityInnPiano") return this.openModal("Golden Griffin Piano", "<p>A quiet Silvercrest melody fills the room. Evening customers pause for a moment before returning to their tables.</p>", [{ label: "Close", action: () => this.closeModal() }]);
    if (id === "marketCounter" || id === "produceStall") return this.openMarket();
    if (id === "marketBoard") return this.showInteriorMarketBoard();
    if (id === "observatoryDesk" || id === "observatoryTelescope") return this.openObservatory();
    if (id === "starChart") return this.showInteriorStarChart();
    if (id === "cityHallDesk") return this.openCityHall();
    if (id === "cityMap") return this.showWorldMap();
    if (id === "cityRecords") return this.showInteriorCivicRecords();
    this.toast(`${interaction.label} is not available yet.`);
  };

  proto.showInteriorCropCalendar = function showInteriorCropCalendar() {
    const calendar = calendarForDay(this.state.day);
    const rows = Object.entries(CROP_SEASON_TABLE).map(([crop, seasons]) => `<li><strong>${crop === "berry" ? "Sunberry" : crop === "moonbean" ? "Moonbean" : "Turnip"}</strong>: ${seasons.join(", ")}</li>`).join("");
    this.openModal("Seasonal Crop Board", `<p>${calendar.season.icon} ${calendar.season.name}, Day ${calendar.seasonDay}, Year ${calendar.year}</p><ul>${rows}</ul><p>Favored crops grow faster when watered. Other crops continue growing more slowly and never wither.</p>`, [{ label: "Close", action: () => this.closeModal() }]);
  };

  proto.showInteriorMarketBoard = function showInteriorMarketBoard() {
    const ids = ["turnip", "berry", "moonbean", "fish", "rareFish", "egg", "milk", "cheese", "truffleOil"];
    const rows = ids.filter((id) => ITEMS[id]).map((id) => `<li>${ITEMS[id].icon} ${ITEMS[id].name}: ${ITEMS[id].value} base coins</li>`).join("");
    this.openModal("Silvercrest Price Board", `<p>Posted base values before quality, Beacon, Adventure Level, and specialty-buyer bonuses:</p><ul>${rows}</ul>`, [{ label: "Close", action: () => this.closeModal() }]);
  };

  proto.showInteriorStarChart = function showInteriorStarChart() {
    const calendar = calendarForDay(this.state.day);
    const weather = WEATHER[this.state.tomorrowWeather] || { icon: "?" };
    this.openModal("Starwatch Chart", `<p>${calendar.season.icon} ${calendar.season.name}, Year ${calendar.year}</p><p>Tomorrow: <strong>${weather.icon} ${this.state.tomorrowWeather}</strong></p><p>Sora's chart marks Sparkfall as the strongest night for Moonbean resonance and old Waystone activity.</p>`, [{ label: "Close", action: () => this.closeModal() }]);
  };

  proto.showInteriorCivicRecords = function showInteriorCivicRecords() {
    const interiors = this.state.interiors;
    if (!interiors.recordsRead.includes("city-overview")) interiors.recordsRead.push("city-overview");
    this.openModal("Silvercrest Civic Records", `<p>Regions discovered: ${this.state.visitedRegions.length}/${REGIONS.length}</p><p>Named residents: ${this.state.npcs.length}</p><p>Building interiors visited: ${interiors.visited.length}/${Object.keys(INTERIOR_MAPS).length}</p><p>Requests completed: ${this.state.completedQuests.length} · Guild bounties: ${this.state.guild.completed}</p>`, [{ label: "Open World Map", action: () => this.showWorldMap() }, { label: "Close", action: () => this.closeModal() }]);
  };

  proto.updateCamera = function updateCameraExpandedInterior() {
    if (this.state?.mode !== "interior") return original.updateCamera.call(this);
    const map = INTERIOR_MAPS[this.state.living?.interiorId];
    if (!map) return;
    const worldWidth = map.width * TILE;
    const worldHeight = map.height * TILE;
    const targetX = this.state.player.x * TILE - this.screen.width / 2;
    const targetY = this.state.player.y * TILE - this.screen.height / 2;
    this.camera.x += (clamp(targetX, 0, Math.max(0, worldWidth - this.screen.width)) - this.camera.x) * .18;
    this.camera.y += (clamp(targetY, 0, Math.max(0, worldHeight - this.screen.height)) - this.camera.y) * .18;
  };

  proto.updateContextHint = function updateContextHintExpanded() {
    original.updateContextHint.call(this);
    if (this.state.mode !== "interior" || !EXPANDED_IDS.has(this.state.living?.interiorId)) return;
    const map = INTERIOR_MAPS[this.state.living.interiorId];
    const hint = $("contextHint");
    let text = "";
    if (distance(this.state.player, map.exit) < 1.5) text = "Interact: Leave building";
    else {
      const interaction = map.interactions.find((entry) => distance(this.state.player, entry) < 1.7);
      if (interaction) text = `Interact: ${interaction.label}`;
      else {
        const resident = this.activeInteriorResidents().find((entry) => distance(this.state.player, entry.resident) < 2.1);
        if (resident) text = `Interact: Talk to ${resident.npc.name}`;
      }
    }
    if (text) { hint.textContent = text; hint.classList.remove("hidden"); }
    else hint.classList.add("hidden");
  };

  proto.showInteriorDirectory = function showInteriorDirectory() {
    const cards = Object.entries(BUILDING_INTERIOR_MAP).map(([buildingId, interiorId]) => {
      const building = BUILDINGS.find((entry) => entry.id === buildingId);
      const map = INTERIOR_MAPS[interiorId];
      const visited = this.state.interiors.visited.includes(interiorId);
      const open = interiorIsOpenForBuilding(building, this.state);
      return `<article class="interior-directory-card ${visited ? "visited" : ""}"><h3>${visited ? "✅" : "⬚"} ${map.name}</h3><p>${open ? "Open now" : "Closed now"} · Visits ${this.state.interiors.visits[interiorId] || 0}</p><small>${building.service} · Current time ${formatHour(this.state.minutes)}</small></article>`;
    }).join("");
    this.openModal("Buildings & Interiors", `<p>Playable lightweight interior maps. Shop counters follow their normal business hours.</p><div class="interior-directory">${cards}</div>`, [{ label: "Close", action: () => this.closeModal() }]);
  };

  proto.toggleGameMenu = function toggleGameMenuExpanded() {
    original.toggleGameMenu.call(this);
    const grid = document.querySelector("#modalBody .menu-grid");
    if (!grid || document.getElementById("interiorDirectoryMenu")) return;
    const button = document.createElement("button");
    button.id = "interiorDirectoryMenu";
    button.textContent = "🏠 Buildings & Interiors";
    button.onclick = () => { this.closeModal(); this.showInteriorDirectory(); };
    grid.appendChild(button);
  };

  proto.showHowToPlay = function showHowToPlayExpanded() {
    original.showHowToPlay.call(this);
    const body = $("modalBody");
    if (!body || body.querySelector?.("[data-interior-help]")) return;
    body.insertAdjacentHTML?.("afterbegin", `<section class="help-section" data-interior-help><h3>Playable Buildings</h3><p>Enter open shops, inns, civic buildings, and Starwatch through their front doors. Walk to highlighted counters and furnishings to use services. Named NPCs follow indoor work schedules and disappear from the street while working inside.</p></section>`);
  };
}
