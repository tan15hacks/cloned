import { TILE, ITEMS, CROPS, clamp, distance, keyOf, $ } from "./game-shared.js";
import { INTERIOR_MAPS } from "./living-world-data.js";
import { calendarForDay } from "./seasons-data.js";
import { removeBackpackUnits, removeContainerUnits } from "./game-storage.js";
import {
  FARM_PROJECT_BOARD, FARM_BUILDINGS, FARM_PROJECTS, FARM_PROJECT_MAP,
  GREENHOUSE_MAP, createFarmExpansionState, greenhouseSlotSet, greenhouseSlotsForState,
  outdoorIrrigationCapacity, greenhouseGrowthMultiplier, farmBuildingAtTile, farmPathTile,
  projectAvailable, projectCostText, registerFarmsteadExpansion,
} from "./farmstead-expansion-data.js";

const BOARD_RADIUS = 1.65;

function finiteInt(value, fallback = 0) {
  const numeric = Number(value);
  return Math.floor(Number.isFinite(numeric) ? numeric : fallback);
}

function rectContains(building, x, y, padding = 0) {
  return x >= building.x - padding && x < building.x + building.w + padding
    && y >= building.y - padding && y < building.y + building.h + padding;
}

function materialCount(game, id) {
  let total = Math.max(0, finiteInt(game.state.inventory?.[id]));
  for (const chest of Object.values(game.state.storage?.chests || {})) total += Math.max(0, finiteInt(chest.items?.[id]));
  return total;
}

function consumeMaterial(game, id, amount) {
  let remaining = Math.max(0, finiteInt(amount));
  if (remaining <= 0) return 0;
  const backpack = Math.min(remaining, Math.max(0, finiteInt(game.state.inventory?.[id])));
  if (backpack > 0) {
    removeBackpackUnits(game.state, id, backpack);
    remaining -= backpack;
  }
  const order = id === "wood" || id === "stone" || id === "copper" || id === "iron" || id === "gold" || id === "crystal"
    ? ["trunk", "pantry"] : ["pantry", "trunk"];
  for (const chestId of order) {
    if (remaining <= 0) break;
    const chest = game.state.storage?.chests?.[chestId];
    if (!chest) continue;
    const take = Math.min(remaining, Math.max(0, finiteInt(chest.items?.[id])));
    if (take > 0) {
      removeContainerUnits(chest, id, take);
      remaining -= take;
    }
  }
  return Math.max(0, finiteInt(amount)) - remaining;
}

function projectAffordable(game, project) {
  return game.state.coins >= project.coins
    && Object.entries(project.cost).every(([id, amount]) => materialCount(game, id) >= amount);
}

function projectStatus(expansion, project) {
  if (expansion.completed.includes(project.id)) return "complete";
  if (expansion.project?.id === project.id) return "building";
  if (projectAvailable(expansion, project.id)) return "available";
  return "locked";
}

function siteActive(expansion, key) {
  return expansion.completed.includes(key) || expansion.project?.id === key;
}

function addJournal(game, text) {
  if (!Array.isArray(game.state.journal)) game.state.journal = [];
  game.state.journal.unshift(text);
  game.state.journal = game.state.journal.slice(0, 30);
}

function drawBuildingShell(ctx, building, greenhouse = false, construction = false) {
  const x = building.x * TILE;
  const y = building.y * TILE;
  const w = building.w * TILE;
  const h = building.h * TILE;
  ctx.save();
  ctx.fillStyle = "rgba(16,36,29,.22)";
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 10, w * .44, 11, 0, 0, Math.PI * 2); ctx.fill();
  if (construction) {
    ctx.fillStyle = "#9a7651"; ctx.fillRect(x + 8, y + 18, w - 16, h - 18);
    ctx.strokeStyle = "#e1c18a"; ctx.lineWidth = 5;
    for (let px = x + 14; px < x + w - 8; px += 34) { ctx.beginPath(); ctx.moveTo(px, y + 5); ctx.lineTo(px, y + h); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x + 5, y + 8); ctx.lineTo(x + w - 5, y + h - 4); ctx.moveTo(x + w - 5, y + 8); ctx.lineTo(x + 5, y + h - 4); ctx.stroke();
    ctx.fillStyle = "#efb94a"; ctx.font = "bold 12px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText("UNDER CONSTRUCTION", x + w / 2, y + h / 2);
    ctx.restore(); return;
  }
  if (greenhouse) {
    ctx.fillStyle = "rgba(154,215,214,.78)"; ctx.fillRect(x + 6, y + 22, w - 12, h - 22);
    ctx.strokeStyle = "#365f55"; ctx.lineWidth = 5; ctx.strokeRect(x + 6, y + 22, w - 12, h - 22);
    ctx.fillStyle = "rgba(177,226,239,.86)";
    ctx.beginPath(); ctx.moveTo(x, y + 24); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w, y + 24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#46705e"; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = 2;
    for (let px = x + 28; px < x + w; px += 32) { ctx.beginPath(); ctx.moveTo(px, y + 20); ctx.lineTo(px, y + h - 4); ctx.stroke(); }
  } else {
    ctx.fillStyle = building.wall; ctx.fillRect(x + 5, y + 24, w - 10, h - 24);
    ctx.fillStyle = building.roof; ctx.beginPath(); ctx.moveTo(x, y + 26); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w, y + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#574333"; ctx.fillRect((building.door.x - .6) * TILE, (building.y + building.h - 1.8) * TILE, 1.2 * TILE, 1.8 * TILE);
    ctx.fillStyle = "#d8c08e"; ctx.fillRect(x + 20, y + 40, 28, 22); ctx.fillRect(x + w - 48, y + 40, 28, 22);
  }
  ctx.fillStyle = "rgba(16,36,29,.88)"; ctx.fillRect(x + w / 2 - 60, y - 20, 120, 18);
  ctx.fillStyle = "#fff1c8"; ctx.font = "bold 10px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(building.name, x + w / 2, y - 7);
  ctx.restore();
}

function allGreenhouseSlots() {
  const slots = [];
  for (let y = 7; y <= 10; y += 1) {
    for (let x = 4; x <= 9; x += 1) slots.push({ x, y });
    for (let x = 18; x <= 23; x += 1) slots.push({ x, y });
  }
  return slots;
}

export function clearFarmsteadExpansionSpace(state) {
  if (!state?.farmExpansion) return 0;
  const expansion = state.farmExpansion;
  const activeBuildings = [];
  if (siteActive(expansion, "workshop")) activeBuildings.push(FARM_BUILDINGS.workshop);
  if (siteActive(expansion, "greenhouse") || expansion.completed.includes("greenhouseDeluxe")) activeBuildings.push(FARM_BUILDINGS.greenhouse);
  const pathEnabled = expansion.completed.includes("southField") || Boolean(expansion.project);
  const blocks = (x, y) => activeBuildings.some((building) => rectContains(building, x, y, 1)) || (pathEnabled && farmPathTile(Math.floor(x), Math.floor(y), expansion));
  let removed = 0;
  if (Array.isArray(state.resources)) {
    const before = state.resources.length;
    state.resources = state.resources.filter((entry) => !blocks(Number(entry.x), Number(entry.y)));
    removed += before - state.resources.length;
  }
  if (Array.isArray(state.monsters)) {
    const before = state.monsters.length;
    state.monsters = state.monsters.filter((entry) => !blocks(Number(entry.x), Number(entry.y)));
    removed += before - state.monsters.length;
  }
  if (Array.isArray(state.placed)) {
    const before = state.placed.length;
    state.placed = state.placed.filter((entry) => !blocks(Number(entry.x), Number(entry.y)));
    removed += before - state.placed.length;
  }
  if (state.soil && typeof state.soil === "object") {
    for (const key of Object.keys(state.soil)) {
      const [x, y] = key.split(",").map(Number);
      if (blocks(x + .5, y + .5)) { delete state.soil[key]; removed += 1; }
    }
  }
  return removed;
}

export function installFarmsteadExpansion(GameClass) {
  registerFarmsteadExpansion();
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    useHoe: proto.useHoe,
    useWater: proto.useWater,
    plantSeed: proto.plantSeed,
    interact: proto.interact,
    interactInterior: proto.interactInterior,
    updateContextHint: proto.updateContextHint,
    drawTerrainTile: proto.drawTerrainTile,
    drawBuildings: proto.drawBuildings,
    collides: proto.collides,
    renderInterior: proto.renderInterior,
    toggleGameMenu: proto.toggleGameMenu,
  };

  proto.defaultState = function defaultStateFarmsteadExpansion() {
    const state = original.defaultState.call(this);
    state.farmExpansion = createFarmExpansionState({}, state);
    return state;
  };

  proto.migrateState = function migrateStateFarmsteadExpansion(data) {
    const state = original.migrateState.call(this, data);
    state.farmExpansion = createFarmExpansionState(data?.farmExpansion || state.farmExpansion, state);
    clearFarmsteadExpansionSpace(state);
    return state;
  };

  proto.enterGame = function enterGameFarmsteadExpansion() {
    registerFarmsteadExpansion();
    this.state.farmExpansion = createFarmExpansionState(this.state.farmExpansion, this.state);
    const result = original.enterGame.call(this);
    const removed = clearFarmsteadExpansionSpace(this.state);
    if (!this.state.farmExpansion.introQueued && Array.isArray(this.state.social?.letters)) {
      this.state.farmExpansion.introQueued = true;
      if (!this.state.social.letters.some((letter) => letter.id === "farmstead-expansion-plan")) this.state.social.letters.push({
        id: "farmstead-expansion-plan", from: "Oren & Mira", subject: "A Plan for the Lower Farm",
        body: "We marked a project board beside the old barn. Restore the south field, build a workshop, and the land will support a Hearthglass Greenhouse. Construction materials may be drawn from your backpack or either farmhouse chest.",
        reward: { item: "wood", amount: 20, coins: 250 }, read: false, claimed: false, eventKey: null, day: this.state.day,
      });
      this.toast?.("A Farmstead expansion plan arrived in the mailbox.");
    }
    if (removed > 0) {
      this.rebuildResourceMap?.();
      this.refreshActiveWorldChunks?.(true);
    }
    this.checkFarmsteadAchievements();
    this.saveGame?.(true);
    return result;
  };

  proto.nextDay = function nextDayFarmsteadExpansion(passedOut) {
    this.state.farmExpansion = createFarmExpansionState(this.state.farmExpansion, this.state);
    this.processFarmsteadMorningWatering();
    this.processGreenhouseDay();
    const result = original.nextDay.call(this, passedOut);
    this.advanceFarmProject();
    const removed = clearFarmsteadExpansionSpace(this.state);
    if (removed > 0) {
      this.rebuildResourceMap?.();
      this.refreshActiveWorldChunks?.(true);
    }
    this.checkFarmsteadAchievements();
    this.saveGame?.(true);
    return result;
  };

  proto.processFarmsteadMorningWatering = function processFarmsteadMorningWatering() {
    const capacity = outdoorIrrigationCapacity(this.state.farmExpansion);
    if (capacity <= 0) return 0;
    const candidates = Object.entries(this.state.soil || {})
      .filter(([, soil]) => soil?.tilled && soil.crop && !soil.watered)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, capacity);
    for (const [, soil] of candidates) soil.watered = true;
    this.state.farmExpansion.stats.autoWateredTiles += candidates.length;
    return candidates.length;
  };

  proto.processGreenhouseDay = function processGreenhouseDay() {
    const expansion = this.state.farmExpansion;
    if (!expansion.completed.includes("greenhouse")) return;
    const automatic = expansion.completed.includes("irrigation");
    const multiplier = greenhouseGrowthMultiplier(expansion);
    for (const soil of Object.values(expansion.greenhouseSoil || {})) {
      if (!soil?.tilled) continue;
      if (automatic) soil.watered = true;
      if (soil.crop && soil.watered) soil.crop.growth = Math.max(0, (Number(soil.crop.growth) || 0) + multiplier);
      soil.watered = automatic;
    }
  };

  proto.advanceFarmProject = function advanceFarmProject() {
    const expansion = this.state.farmExpansion;
    if (!expansion.project) return;
    expansion.project.daysRemaining -= 1;
    if (expansion.project.daysRemaining > 0) {
      this.toast(`${FARM_PROJECT_MAP[expansion.project.id].name}: ${expansion.project.daysRemaining} day${expansion.project.daysRemaining === 1 ? "" : "s"} remaining.`);
      return;
    }
    const project = FARM_PROJECT_MAP[expansion.project.id];
    expansion.project = null;
    if (!expansion.completed.includes(project.id)) expansion.completed.push(project.id);
    expansion.stats.projectsCompleted = expansion.completed.length;
    clearFarmsteadExpansionSpace(this.state);
    this.sound?.("success");
    this.showZoneBanner?.(`${project.icon} ${project.name} Complete`);
    this.toast(`${project.name} is complete.`);
    addJournal(this, `Farmstead project completed: ${project.name}.`);
    this.checkFarmsteadAchievements();
  };

  proto.startFarmProject = function startFarmProject(projectId) {
    const expansion = this.state.farmExpansion = createFarmExpansionState(this.state.farmExpansion, this.state);
    const project = FARM_PROJECT_MAP[projectId];
    if (!project || !projectAvailable(expansion, projectId)) return this.toast("That Farmstead project is not available yet.");
    if (!projectAffordable(this, project)) return this.toast(`Requires ${projectCostText(project)}.`);
    this.state.coins -= project.coins;
    for (const [id, amount] of Object.entries(project.cost)) {
      if (consumeMaterial(this, id, amount) !== amount) return this.toast("Construction materials changed before the project could begin.");
    }
    expansion.project = { id: project.id, daysRemaining: project.days, startedDay: this.state.day };
    clearFarmsteadExpansionSpace(this.state);
    this.rebuildResourceMap?.();
    this.refreshActiveWorldChunks?.(true);
    addJournal(this, `Construction started: ${project.name} (${project.days} days).`);
    this.sound?.("success");
    this.toast(`${project.name} started. Completion in ${project.days} day${project.days === 1 ? "" : "s"}.`);
    this.saveGame?.(true);
    this.closeModal();
    this.showFarmsteadPlan();
  };

  proto.showFarmsteadPlan = function showFarmsteadPlan() {
    this.state.farmExpansion = createFarmExpansionState(this.state.farmExpansion, this.state);
    const expansion = this.state.farmExpansion;
    const cards = FARM_PROJECTS.map((project) => {
      const status = projectStatus(expansion, project);
      const affordable = projectAffordable(this, project);
      const materialRows = Object.entries(project.cost).map(([id, amount]) => `<span class="farm-material ${materialCount(this, id) >= amount ? "ready" : "missing"}">${ITEMS[id]?.icon || "📦"} ${materialCount(this, id)}/${amount} ${ITEMS[id]?.name || id}</span>`).join("");
      const action = status === "available" ? `<button data-farm-project="${project.id}" ${affordable ? "" : "disabled"}>Start · ${project.days}d</button>` : `<strong class="farm-project-status ${status}">${status === "complete" ? "✓ Complete" : status === "building" ? `${expansion.project.daysRemaining}d remaining` : "Locked"}</strong>`;
      return `<article class="farm-project-card ${status}"><span class="farm-project-icon">${project.icon}</span><div><h3>${project.name}</h3><p>${project.description}</p><div class="farm-materials"><span class="farm-material ${this.state.coins >= project.coins ? "ready" : "missing"}">◈ ${this.state.coins}/${project.coins}</span>${materialRows}</div></div>${action}</article>`;
    }).join("");
    const greenhouse = expansion.completed.includes("greenhouse");
    const slots = greenhouse ? greenhouseSlotsForState(expansion).length : 0;
    this.openModal("🏡 Farmstead Expansion Plan", `<section class="farmstead-summary"><div><strong>${expansion.completed.length}/${FARM_PROJECTS.length}</strong><small>projects complete</small></div><div><strong>${slots}</strong><small>greenhouse plots</small></div><div><strong>${outdoorIrrigationCapacity(expansion)}</strong><small>outdoor auto-water</small></div></section><p>Construction draws materials from the backpack, Farmhouse Pantry, and Adventure Trunk. Only one project may be active at a time.</p><div class="farm-project-list">${cards}</div>`, [
      { label: "Farm Report", action: () => { this.closeModal(); this.showFarmsteadReport(); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
    document.querySelectorAll("[data-farm-project]").forEach((button) => { button.onclick = () => this.startFarmProject(button.dataset.farmProject); });
  };

  proto.showFarmsteadReport = function showFarmsteadReport() {
    const expansion = this.state.farmExpansion;
    const greenhouseSoil = Object.values(expansion.greenhouseSoil || {});
    const crops = greenhouseSoil.filter((soil) => soil.crop).length;
    const watered = greenhouseSoil.filter((soil) => soil.watered).length;
    const calendar = calendarForDay(this.state.day);
    this.openModal("Farmstead Estate Report", `<section class="farmstead-summary"><div><strong>${expansion.stats.projectsCompleted}</strong><small>projects completed</small></div><div><strong>${expansion.stats.greenhouseHarvests}</strong><small>greenhouse harvests</small></div><div><strong>${expansion.stats.autoWateredTiles}</strong><small>tiles auto-watered</small></div></section><p>${calendar.season.icon} ${calendar.season.name}, Year ${calendar.year}. Greenhouse occupancy: ${crops}/${greenhouseSlotsForState(expansion).length}; watered plots: ${watered}.</p><p>${expansion.completed.includes("greenhouseDeluxe") ? "The expanded greenhouse grows protected crops 25% faster." : expansion.completed.includes("greenhouse") ? "Protected crops grow at full speed in every season." : "Build the greenhouse to unlock protected farming."}</p>`, [
      { label: "Project Plan", action: () => { this.closeModal(); this.showFarmsteadPlan(); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
  };

  proto.openFarmWorkshop = function openFarmWorkshop() {
    this.openModal("🛠️ Farm Workshop", `<p>The workshop centralizes crafting, construction records, and estate planning. Materials in farmhouse storage remain available for construction.</p><section class="farmstead-summary"><div><strong>${this.state.farmExpansion.completed.length}</strong><small>projects complete</small></div><div><strong>${this.state.storage?.stats?.itemsStored || 0}</strong><small>items stored</small></div><div><strong>${this.state.stats?.cropsHarvested || 0}</strong><small>crops harvested</small></div></section>`, [
      { label: "Crafting", action: () => { this.closeModal(); this.showCrafting(); } },
      { label: "Project Board", action: () => { this.closeModal(); this.showFarmsteadPlan(); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
  };

  proto.useHoe = function useHoeFarmsteadExpansion(target) {
    if (this.state.mode !== "interior" || this.state.living?.interiorId !== "greenhouse") return original.useHoe.call(this, target);
    const expansion = this.state.farmExpansion;
    if (!greenhouseSlotSet(expansion).has(keyOf(target.x, target.y))) return this.toast("The hoe works only inside an unlocked greenhouse bed.");
    const soil = expansion.greenhouseSoil[keyOf(target.x, target.y)];
    if (soil?.crop) return this.toast("A crop is already growing here.");
    expansion.greenhouseSoil[keyOf(target.x, target.y)] = { tilled: true, watered: expansion.completed.includes("irrigation") || Boolean(soil?.watered), crop: null };
    this.spendEnergy(1);
    this.sound?.("dig");
  };

  proto.useWater = function useWaterFarmsteadExpansion(target) {
    if (this.state.mode !== "interior" || this.state.living?.interiorId !== "greenhouse") return original.useWater.call(this, target);
    const soil = this.state.farmExpansion.greenhouseSoil[keyOf(target.x, target.y)];
    if (!soil?.tilled) return this.toast("Till a greenhouse plot before watering it.");
    soil.watered = true;
    this.spendEnergy(1);
    this.sound?.("water");
  };

  proto.plantSeed = function plantSeedFarmsteadExpansion(target) {
    if (this.state.mode !== "interior" || this.state.living?.interiorId !== "greenhouse") return original.plantSeed.call(this, target);
    const expansion = this.state.farmExpansion;
    const key = keyOf(target.x, target.y);
    if (!greenhouseSlotSet(expansion).has(key)) return this.toast("Plant only inside an unlocked greenhouse bed.");
    const soil = expansion.greenhouseSoil[key];
    const crop = CROPS[this.state.selectedCrop];
    if (!soil?.tilled) return this.toast("Till the greenhouse plot before planting.");
    if (soil.crop) return this.toast("Something is already planted here.");
    if ((this.state.inventory[crop.seed] || 0) <= 0) return this.toast(`You have no ${ITEMS[crop.seed].name}.`);
    this.state.inventory[crop.seed] -= 1;
    soil.crop = { type: this.state.selectedCrop, growth: 0, plantedDay: this.state.day, greenhouse: true };
    if (expansion.completed.includes("irrigation")) soil.watered = true;
    expansion.stats.greenhouseCropsPlanted += 1;
    this.spendEnergy(1);
    this.sound?.("plant");
    this.toast(`${crop.name} planted under Hearthglass.`);
  };

  proto.interact = function interactFarmsteadExpansion() {
    if (this.state.mode === "world") {
      if (distance(this.state.player, FARM_PROJECT_BOARD) < BOARD_RADIUS) return this.showFarmsteadPlan();
      const expansion = this.state.farmExpansion;
      if (expansion.completed.includes("workshop") && distance(this.state.player, FARM_BUILDINGS.workshop.door) < 2.1) return this.openFarmWorkshop();
      if (expansion.completed.includes("greenhouse") && distance(this.state.player, FARM_BUILDINGS.greenhouse.door) < 2.1) return this.enterInterior("greenhouse", { door: { x: 41, y: 61 } });
    }
    return original.interact.call(this);
  };

  proto.interactInterior = function interactInteriorFarmsteadExpansion() {
    if (this.state.mode !== "interior" || this.state.living?.interiorId !== "greenhouse") return original.interactInterior.call(this);
    const player = this.state.player;
    if (distance(player, GREENHOUSE_MAP.exit) < 1.5) return this.leaveInterior();
    const target = this.targetTile(.9);
    const soil = this.state.farmExpansion.greenhouseSoil[keyOf(target.x, target.y)];
    if (soil?.crop && soil.crop.growth >= CROPS[soil.crop.type].days) {
      this.harvestCrop(target, soil);
      this.state.farmExpansion.stats.greenhouseHarvests += 1;
      this.checkFarmsteadAchievements();
      return;
    }
    const interaction = GREENHOUSE_MAP.interactions.find((entry) => distance(player, entry) < 1.7);
    if (interaction?.id === "greenhouseControls") return this.openGreenhouseControls();
    if (interaction?.id === "greenhouseLedger") return this.showFarmsteadReport();
    if (soil?.crop) return this.toast(`${CROPS[soil.crop.type].name}: ${Math.floor(soil.crop.growth * 10) / 10}/${CROPS[soil.crop.type].days} growth days.`);
    this.toast("Nothing nearby to interact with.");
  };

  proto.openGreenhouseControls = function openGreenhouseControls() {
    const expansion = this.state.farmExpansion;
    const soils = Object.values(expansion.greenhouseSoil || {}).filter((soil) => soil.tilled);
    const unwatered = soils.filter((soil) => !soil.watered).length;
    const automatic = expansion.completed.includes("irrigation");
    this.openModal("💧 Greenhouse Irrigation", `<p>${automatic ? "The irrigation network waters every tilled greenhouse plot automatically each morning." : `${unwatered} tilled plot${unwatered === 1 ? " is" : "s are"} currently dry.`}</p><p>Unlocked beds: ${greenhouseSlotsForState(expansion).length} · Growth rate: ×${greenhouseGrowthMultiplier(expansion)}</p>`, [
      ...(!automatic && unwatered > 0 ? [{ label: `Water All · ${Math.min(12, Math.max(1, Math.ceil(unwatered / 4)))} energy`, action: () => this.waterAllGreenhousePlots() }] : []),
      { label: "Close", action: () => this.closeModal() },
    ]);
  };

  proto.waterAllGreenhousePlots = function waterAllGreenhousePlots() {
    const soils = Object.values(this.state.farmExpansion.greenhouseSoil || {}).filter((soil) => soil.tilled && !soil.watered);
    if (!soils.length) return this.toast("Every tilled greenhouse plot is already watered.");
    const energy = Math.min(12, Math.max(1, Math.ceil(soils.length / 4)));
    if (this.state.player.energy < energy) return this.toast(`You need ${energy} energy to water every greenhouse plot.`);
    for (const soil of soils) soil.watered = true;
    this.spendEnergy(energy);
    this.sound?.("water");
    this.closeModal();
    this.toast(`Watered ${soils.length} greenhouse plot${soils.length === 1 ? "" : "s"}.`);
  };

  proto.updateContextHint = function updateContextHintFarmsteadExpansion() {
    const result = original.updateContextHint.call(this);
    const hint = $("contextHint");
    if (this.state.mode === "world") {
      if (distance(this.state.player, FARM_PROJECT_BOARD) < BOARD_RADIUS) {
        hint.textContent = "Interact: Review Farmstead projects"; hint.classList.remove("hidden"); return result;
      }
      if (this.state.farmExpansion.completed.includes("workshop") && distance(this.state.player, FARM_BUILDINGS.workshop.door) < 2.1) {
        hint.textContent = "Interact: Open Farm Workshop"; hint.classList.remove("hidden"); return result;
      }
      if (this.state.farmExpansion.completed.includes("greenhouse") && distance(this.state.player, FARM_BUILDINGS.greenhouse.door) < 2.1) {
        hint.textContent = "Interact: Enter Hearthglass Greenhouse"; hint.classList.remove("hidden"); return result;
      }
    }
    if (this.state.mode === "interior" && this.state.living?.interiorId === "greenhouse") {
      let text = "";
      if (distance(this.state.player, GREENHOUSE_MAP.exit) < 1.5) text = "Interact: Leave greenhouse";
      else {
        const target = this.targetTile(.9);
        const soil = this.state.farmExpansion.greenhouseSoil[keyOf(target.x, target.y)];
        if (soil?.crop && soil.crop.growth >= CROPS[soil.crop.type].days) text = `Interact: Harvest ${CROPS[soil.crop.type].name}`;
        else {
          const interaction = GREENHOUSE_MAP.interactions.find((entry) => distance(this.state.player, entry) < 1.7);
          if (interaction) text = `Interact: ${interaction.label}`;
        }
      }
      if (text) { hint.textContent = text; hint.classList.remove("hidden"); }
    }
    return result;
  };

  proto.drawTerrainTile = function drawTerrainTileFarmsteadExpansion(ctx, x, y) {
    original.drawTerrainTile.call(this, ctx, x, y);
    if (!farmPathTile(x, y, this.state.farmExpansion)) return;
    ctx.fillStyle = "#c7ab75"; ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
    ctx.fillStyle = "rgba(76,54,36,.13)"; ctx.fillRect(x * TILE + 5 + ((x * 7 + y * 3) % 12), y * TILE + 12, 8, 3);
  };

  proto.drawBuildings = function drawBuildingsFarmsteadExpansion(ctx, bounds) {
    original.drawBuildings.call(this, ctx, bounds);
    const bx = FARM_PROJECT_BOARD.x * TILE; const by = FARM_PROJECT_BOARD.y * TILE;
    if (FARM_PROJECT_BOARD.x >= bounds.startX - 1 && FARM_PROJECT_BOARD.x <= bounds.endX + 1 && FARM_PROJECT_BOARD.y >= bounds.startY - 1 && FARM_PROJECT_BOARD.y <= bounds.endY + 1) {
      ctx.save(); ctx.fillStyle = "#6e4b34"; ctx.fillRect(bx - 3, by - 5, 6, 25); ctx.fillStyle = "#d0a768"; ctx.fillRect(bx - 18, by - 20, 36, 22); ctx.strokeStyle = "#3b2b25"; ctx.lineWidth = 3; ctx.strokeRect(bx - 18, by - 20, 36, 22); ctx.fillStyle = "#10241d"; ctx.font = "bold 15px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText("⌂", bx, by - 4); ctx.restore();
    }
    const expansion = this.state.farmExpansion;
    for (const [key, building] of Object.entries(FARM_BUILDINGS)) {
      const complete = expansion.completed.includes(key) || (key === "greenhouse" && expansion.completed.includes("greenhouseDeluxe"));
      const construction = expansion.project?.id === key;
      if (!complete && !construction) continue;
      if (building.x > bounds.endX || building.x + building.w < bounds.startX || building.y > bounds.endY || building.y + building.h < bounds.startY) continue;
      drawBuildingShell(ctx, building, key === "greenhouse", construction);
    }
  };

  proto.collides = function collidesFarmsteadExpansion(x, y, radius = .3) {
    if (this.state?.mode === "world") {
      if (Math.abs(x - FARM_PROJECT_BOARD.x) < .35 + radius && Math.abs(y - FARM_PROJECT_BOARD.y) < .3 + radius) return true;
      const corners = [[x-radius,y-radius],[x+radius,y-radius],[x-radius,y+radius],[x+radius,y+radius]];
      if (corners.some(([cx, cy]) => farmBuildingAtTile(cx, cy, this.state.farmExpansion))) return true;
    }
    return original.collides.call(this, x, y, radius);
  };

  proto.renderInterior = function renderInteriorFarmsteadExpansion() {
    if (this.state?.living?.interiorId !== "greenhouse") return original.renderInterior.call(this);
    const ctx = this.ctx; const map = GREENHOUSE_MAP; const width = this.screen.width;
    ctx.save(); ctx.setTransform(this.screen.dpr, 0, 0, this.screen.dpr, 0, 0); ctx.clearRect(0, 0, width, this.screen.height); ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));
    ctx.fillStyle = map.wall; ctx.fillRect(0, 0, map.width * TILE, map.height * TILE);
    ctx.fillStyle = map.floor; ctx.fillRect(TILE, TILE, (map.width - 2) * TILE, (map.height - 2) * TILE);
    for (let y = 1; y < map.height - 1; y += 1) for (let x = 1; x < map.width - 1; x += 1) {
      ctx.fillStyle = (x + y) % 2 ? "rgba(255,255,255,.045)" : "rgba(45,90,65,.04)"; ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
    ctx.fillStyle = "rgba(126,199,214,.58)"; ctx.fillRect(TILE, TILE, (map.width - 2) * TILE, TILE * 1.2);
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2;
    for (let x = 2; x < map.width - 1; x += 2) { ctx.beginPath(); ctx.moveTo(x * TILE, TILE); ctx.lineTo(x * TILE, TILE * 2.2); ctx.stroke(); }
    const unlocked = greenhouseSlotSet(this.state.farmExpansion);
    for (const slot of allGreenhouseSlots()) {
      const key = keyOf(slot.x, slot.y); const isUnlocked = unlocked.has(key); const soil = this.state.farmExpansion.greenhouseSoil[key];
      ctx.fillStyle = isUnlocked ? soil?.watered ? "#51483f" : "#76583c" : "rgba(45,55,48,.32)";
      ctx.fillRect(slot.x * TILE + 2, slot.y * TILE + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = isUnlocked ? "#403328" : "rgba(220,230,220,.15)"; ctx.lineWidth = 2; ctx.strokeRect(slot.x * TILE + 3, slot.y * TILE + 3, TILE - 6, TILE - 6);
      if (soil?.crop) this.drawCrop(ctx, slot.x, slot.y, soil.crop);
      else if (!isUnlocked) { ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.font = "bold 13px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText("×", (slot.x + .5) * TILE, (slot.y + .65) * TILE); }
    }
    for (const object of map.objects) this.drawInteriorObject(ctx, object);
    for (const interaction of map.interactions) { ctx.fillStyle = "rgba(239,185,74,.2)"; ctx.beginPath(); ctx.arc(interaction.x * TILE, interaction.y * TILE, 13, 0, Math.PI * 2); ctx.fill(); }
    const time = performance.now() / 1000; ctx.fillStyle = "rgba(255,255,215,.42)";
    for (let i = 0; i < 18; i += 1) { const x = (2 + ((i * 5.7 + time * .18) % 24)) * TILE; const y = (3 + ((i * 2.3 + time * .11) % 11)) * TILE; ctx.fillRect(x, y, 2, 2); }
    this.drawAnimatedCharacter(ctx, this.state.player, "#2e6f57", "", true);
    ctx.fillStyle = "#f2d59d"; ctx.fillRect((map.exit.x - .65) * TILE, (map.exit.y - .25) * TILE, 1.3 * TILE, .5 * TILE);
    ctx.fillStyle = "rgba(16,36,29,.62)"; ctx.font = "bold 9px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText("EXIT", map.exit.x * TILE, (map.exit.y + .1) * TILE);
    ctx.restore(); if (this.zoneBanner.timer > 0) this.drawZoneBanner(ctx, width);
  };

  proto.toggleGameMenu = function toggleGameMenuFarmsteadExpansion() {
    const result = original.toggleGameMenu.call(this);
    if (typeof document === "undefined") return result;
    const grid = document.querySelector("#modalBody .menu-grid");
    if (!grid || document.getElementById("farmsteadMenu")) return result;
    const button = document.createElement("button"); button.id = "farmsteadMenu"; button.textContent = "🏡 Farmstead"; grid.appendChild(button);
    button.onclick = () => { this.closeModal(); this.showFarmsteadPlan(); };
    return result;
  };

  proto.checkFarmsteadAchievements = function checkFarmsteadAchievements() {
    const expansion = this.state.farmExpansion;
    this.checkAchievement?.("farmstead-first-project", expansion.completed.length >= 1, "Breaking New Ground", "Complete the first Farmstead expansion project.");
    this.checkAchievement?.("farmstead-workshop", expansion.completed.includes("workshop"), "A Place to Build", "Construct the Farm Workshop.");
    this.checkAchievement?.("farmstead-greenhouse", expansion.completed.includes("greenhouse"), "Under Hearthglass", "Construct the Hearthglass Greenhouse.");
    this.checkAchievement?.("farmstead-irrigation", expansion.completed.includes("irrigation"), "Water Finds a Way", "Install the complete Farmstead irrigation network.");
    this.checkAchievement?.("farmstead-green-thumb", expansion.stats.greenhouseHarvests >= 50, "Protected Harvest", "Harvest 50 crops inside the greenhouse.");
    this.checkAchievement?.("farmstead-master-estate", expansion.completed.length >= FARM_PROJECTS.length, "Master of the Farmstead", "Complete every Farmstead expansion project.");
  };
}
