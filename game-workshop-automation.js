import {
  TILE, ITEMS, CROPS, clamp, distance, keyOf, isFarmableTile, regionAt, $, 
} from "./game-shared.js";
import { removeBackpackUnits, removeContainerUnits } from "./game-storage.js";
import {
  AUTOMATION_TYPES, AUTOMATION_KITS, MAX_AUTOMATION_DEVICES,
  WORKSHOP_BLUEPRINTS, WORKSHOP_BLUEPRINT_MAP, SEED_MAKER_RECIPES,
  createAutomationState, createAutomationDevice, automationDeviceAt,
  sprinklerOffsets, blueprintUnlocked, blueprintCostText,
} from "./workshop-automation-data.js";

function finiteInt(value, fallback = 0) {
  const numeric = Number(value);
  return Math.floor(Number.isFinite(numeric) ? numeric : fallback);
}

function combinedItemCount(game, id) {
  let total = Math.max(0, finiteInt(game.state.inventory?.[id]));
  for (const chest of Object.values(game.state.storage?.chests || {})) total += Math.max(0, finiteInt(chest.items?.[id]));
  return total;
}

function consumeCombinedItem(game, id, amount) {
  let remaining = Math.max(0, finiteInt(amount));
  if (remaining <= 0) return 0;
  const backpack = Math.min(remaining, Math.max(0, finiteInt(game.state.inventory?.[id])));
  if (backpack > 0) {
    removeBackpackUnits(game.state, id, backpack);
    remaining -= backpack;
  }
  const order = ["trunk", "pantry"];
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

function canAffordBlueprint(game, blueprint) {
  return Object.entries(blueprint.cost).every(([id, amount]) => combinedItemCount(game, id) >= amount);
}

function outputLabel(device) {
  if (!device.output) return "Empty";
  return `${ITEMS[device.output.id]?.icon || "📦"} ${ITEMS[device.output.id]?.name || device.output.id} ×${device.output.amount}`;
}

function nearbyMatureCropCount(game, device, radius = 5) {
  let total = 0;
  for (const [tile, soil] of Object.entries(game.state.soil || {})) {
    if (!soil?.crop) continue;
    const [x, y] = tile.split(",").map(Number);
    if (Math.hypot(x + .5 - device.x, y + .5 - device.y) > radius) continue;
    if ((Number(soil.crop.growth) || 0) >= CROPS[soil.crop.type].days) total += 1;
  }
  return total;
}

function deviceCount(game, type) {
  return (game.state.placed || []).filter((entry) => entry.type === type).length;
}

function activeAutomationDevices(game) {
  return (game.state.placed || []).filter((entry) => AUTOMATION_TYPES.has(entry.type));
}

function machineBusy(device) {
  return Boolean(device.input || device.output);
}

function addJournal(game, text) {
  game.state.journal ||= [];
  game.state.journal.unshift(text);
  game.state.journal = game.state.journal.slice(0, 30);
}

function drawAutomationDevice(ctx, device) {
  const x = device.x * TILE;
  const y = device.y * TILE;
  const pulse = (Math.sin(performance.now() / 320 + device.x) + 1) * .5;
  ctx.save();
  ctx.fillStyle = "rgba(16,36,29,.22)";
  ctx.beginPath(); ctx.ellipse(x, y + 11, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
  if (device.type === "qualitySprinkler" || device.type === "hearthSprinkler") {
    ctx.fillStyle = device.type === "hearthSprinkler" ? "#7467a8" : "#667a84";
    ctx.fillRect(x - 6, y - 7, 12, 19);
    ctx.fillStyle = device.type === "hearthSprinkler" ? "#c8c4ff" : "#8ec6d8";
    ctx.fillRect(x - 13, y - 10, 26, 6);
    ctx.beginPath(); ctx.arc(x, y - 12, device.type === "hearthSprinkler" ? 6 : 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .18 + pulse * .12;
    ctx.strokeStyle = "#bdefff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, device.type === "hearthSprinkler" ? 23 : 16, 0, Math.PI * 2); ctx.stroke();
  } else if (device.type === "beeHouse") {
    ctx.fillStyle = "#986b3d"; ctx.fillRect(x - 12, y - 10, 24, 22);
    ctx.fillStyle = "#efb94a"; for (let row = 0; row < 3; row += 1) ctx.fillRect(x - 9, y - 7 + row * 6, 18, 3);
    ctx.fillStyle = "#30261f"; ctx.beginPath(); ctx.arc(x, y + 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f6d35c"; ctx.fillRect(x + 11 + pulse * 5, y - 15 - pulse * 4, 4, 3);
  } else if (device.type === "lightningRod") {
    ctx.strokeStyle = "#69747c"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x, y - 17); ctx.stroke();
    ctx.fillStyle = "#d9e2e7"; ctx.beginPath(); ctx.moveTo(x, y - 25); ctx.lineTo(x - 6, y - 12); ctx.lineTo(x + 1, y - 14); ctx.lineTo(x - 3, y - 3); ctx.lineTo(x + 9, y - 18); ctx.lineTo(x + 2, y - 16); ctx.closePath(); ctx.fill();
    if (device.output) { ctx.shadowColor = "#c9c8ff"; ctx.shadowBlur = 16; ctx.fillStyle = "#e9e7ff"; ctx.beginPath(); ctx.arc(x, y - 20, 4 + pulse * 2, 0, Math.PI * 2); ctx.fill(); }
  } else if (device.type === "seedMaker") {
    ctx.fillStyle = "#596f5c"; ctx.fillRect(x - 12, y - 12, 24, 24);
    ctx.fillStyle = "#d5b26c"; ctx.fillRect(x - 8, y - 8, 16, 7);
    ctx.fillStyle = device.output ? "#efb94a" : device.input ? "#7fb56c" : "#38483d"; ctx.beginPath(); ctx.arc(x, y + 5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2e392f"; ctx.lineWidth = 3; ctx.strokeRect(x - 12, y - 12, 24, 24);
  }
  if (device.output) {
    ctx.shadowBlur = 0; ctx.fillStyle = "#fff1c8"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3; ctx.font = "bold 13px Trebuchet MS"; ctx.textAlign = "center";
    ctx.strokeText("!", x, y - 29); ctx.fillText("!", x, y - 29);
  }
  ctx.restore();
}

export function installWorkshopAutomation(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    interact: proto.interact,
    updateContextHint: proto.updateContextHint,
    drawPlaced: proto.drawPlaced,
    openFarmWorkshop: proto.openFarmWorkshop,
    toggleGameMenu: proto.toggleGameMenu,
  };

  proto.defaultState = function defaultStateWorkshopAutomation() {
    const state = original.defaultState.call(this);
    state.automation = createAutomationState();
    return state;
  };

  proto.migrateState = function migrateStateWorkshopAutomation(data) {
    const state = original.migrateState.call(this, data);
    state.automation = createAutomationState(data?.automation || state.automation);
    return state;
  };

  proto.enterGame = function enterGameWorkshopAutomation() {
    this.state.automation = createAutomationState(this.state.automation);
    const result = original.enterGame.call(this);
    this.checkAutomationAchievements();
    return result;
  };

  proto.nextDay = function nextDayWorkshopAutomation(passedOut) {
    this.state.automation = createAutomationState(this.state.automation);
    this.processAutomationMorning();
    const result = original.nextDay.call(this, passedOut);
    this.checkAutomationAchievements();
    this.saveGame?.(true);
    return result;
  };

  proto.processAutomationMorning = function processAutomationMorning() {
    const upcomingDay = this.state.day + 1;
    const watered = new Set();
    for (const device of activeAutomationDevices(this)) {
      if (device.type === "qualitySprinkler" || device.type === "hearthSprinkler") {
        for (const [dx, dy] of sprinklerOffsets(device.type)) {
          const x = Math.floor(device.x) + dx;
          const y = Math.floor(device.y) + dy;
          const soil = this.state.soil?.[keyOf(x, y)];
          if (!soil?.tilled) continue;
          soil.watered = true;
          watered.add(keyOf(x, y));
        }
      } else if (device.type === "beeHouse") {
        if (!device.output && upcomingDay >= finiteInt(device.nextReadyDay, upcomingDay)) {
          const amount = nearbyMatureCropCount(this, device) >= 4 ? 2 : 1;
          const id = this.state.weather === "Sparkfall" ? "sparkHoney" : "wildHoney";
          device.output = { id, amount };
          device.nextReadyDay = upcomingDay + 2;
        }
      } else if (device.type === "lightningRod") {
        if (!device.output && this.state.weather === "Sparkfall" && finiteInt(device.lastCapturedDay) !== this.state.day) {
          device.output = { id: "batteryCell", amount: 1 };
          device.lastCapturedDay = this.state.day;
        }
      } else if (device.type === "seedMaker" && device.input && !device.output && upcomingDay >= finiteInt(device.readyDay, upcomingDay)) {
        const recipe = SEED_MAKER_RECIPES[device.input.crop];
        if (recipe) device.output = { id: recipe.output, amount: recipe.amount };
        device.input = null;
        device.readyDay = 0;
      }
    }
    this.state.automation.stats.tilesWatered += watered.size;
    return watered.size;
  };

  proto.showAutomationWorkshop = function showAutomationWorkshop() {
    this.state.automation = createAutomationState(this.state.automation);
    const expansion = this.state.farmExpansion;
    if (!expansion?.completed?.includes("workshop")) return this.toast("Build the Farm Workshop before crafting automation devices.");
    const devices = activeAutomationDevices(this);
    const cards = WORKSHOP_BLUEPRINTS.map((blueprint) => {
      const unlocked = blueprintUnlocked(expansion, blueprint);
      const owned = combinedItemCount(this, blueprint.kit);
      const placed = deviceCount(this, blueprint.id);
      const affordable = canAffordBlueprint(this, blueprint);
      const costs = Object.entries(blueprint.cost).map(([id, amount]) => `<span class="automation-cost ${combinedItemCount(this, id) >= amount ? "ready" : "missing"}">${ITEMS[id].icon} ${combinedItemCount(this, id)}/${amount}</span>`).join("");
      return `<article class="automation-card ${unlocked ? "" : "locked"}"><span class="automation-icon">${blueprint.icon}</span><div><h3>${blueprint.name}</h3><p>${blueprint.description}</p><div class="automation-costs">${costs}</div><small>Owned ${owned} · Placed ${placed}/${blueprint.maxPlaced}</small></div><div class="automation-actions">${unlocked ? `<button data-auto-craft="${blueprint.id}" ${affordable ? "" : "disabled"}>Craft</button><button data-auto-place="${blueprint.id}" ${owned > 0 && devices.length < MAX_AUTOMATION_DEVICES && placed < blueprint.maxPlaced ? "" : "disabled"}>Place</button>` : `<strong>Requires ${blueprint.requires.join(" → ")}</strong>`}</div></article>`;
    }).join("");
    this.openModal("🛠️ Farm Workshop Automation", `<section class="automation-summary"><div><strong>${devices.length}/${MAX_AUTOMATION_DEVICES}</strong><small>devices placed</small></div><div><strong>${this.state.automation.stats.tilesWatered}</strong><small>tiles watered</small></div><div><strong>${this.state.automation.stats.seedsMade}</strong><small>seeds produced</small></div></section><p>Crafting may draw materials from your backpack and both farmhouse chests. Place devices on empty outdoor crop-field tiles.</p><div class="automation-list">${cards}</div>`, [
      { label: "Automation Report", action: () => { this.closeModal(); this.showAutomationReport(); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
    document.querySelectorAll("[data-auto-craft]").forEach((button) => { button.onclick = () => this.craftAutomationBlueprint(button.dataset.autoCraft); });
    document.querySelectorAll("[data-auto-place]").forEach((button) => { button.onclick = () => this.placeAutomationDevice(button.dataset.autoPlace); });
  };

  proto.craftAutomationBlueprint = function craftAutomationBlueprint(type) {
    const blueprint = WORKSHOP_BLUEPRINT_MAP[type];
    if (!blueprint || !blueprintUnlocked(this.state.farmExpansion, blueprint)) return this.toast("That workshop blueprint is still locked.");
    if (!canAffordBlueprint(this, blueprint)) return this.toast(`Requires ${blueprintCostText(blueprint)}.`);
    for (const [id, amount] of Object.entries(blueprint.cost)) {
      if (consumeCombinedItem(this, id, amount) !== amount) return this.toast("Workshop materials changed before crafting completed.");
    }
    this.addItem(blueprint.kit, 1, false);
    this.state.automation.stats.crafted += 1;
    if (!this.state.automation.knownBlueprints.includes(type)) this.state.automation.knownBlueprints.push(type);
    this.sound?.("success");
    this.toast(`${blueprint.name} crafted.`);
    this.checkAutomationAchievements();
    this.closeModal();
    this.showAutomationWorkshop();
  };

  proto.placeAutomationDevice = function placeAutomationDevice(type) {
    const blueprint = WORKSHOP_BLUEPRINT_MAP[type];
    if (!blueprint || !blueprintUnlocked(this.state.farmExpansion, blueprint)) return this.toast("That device cannot be placed yet.");
    if (this.state.mode !== "world" || regionAt(this.state.player.x, this.state.player.y).id !== "farm") return this.toast("Automation devices may only be placed on the Farmstead crop field.");
    if (activeAutomationDevices(this).length >= MAX_AUTOMATION_DEVICES) return this.toast(`The Farmstead supports at most ${MAX_AUTOMATION_DEVICES} automation devices.`);
    if (deviceCount(this, type) >= blueprint.maxPlaced) return this.toast(`Maximum ${blueprint.name} count reached.`);
    if (combinedItemCount(this, blueprint.kit) <= 0) return this.toast(`Craft a ${blueprint.name} first.`);
    const target = this.targetTile();
    const key = keyOf(target.x, target.y);
    if (!isFarmableTile(target.x, target.y) || this.currentResourceAt(target.x, target.y) || this.placedAt(target.x, target.y) || this.state.soil?.[key]) return this.toast("Face an empty, untilled crop-field tile.");
    if (consumeCombinedItem(this, blueprint.kit, 1) !== 1) return this.toast(`${blueprint.name} could not be removed from storage.`);
    const device = createAutomationDevice(type, target.x, target.y, this.state.day, `${this.state.day}:${this.state.automation.stats.placed}:${target.x}:${target.y}`);
    this.state.placed.push(device);
    this.state.automation.stats.placed += 1;
    this.sound?.("success");
    this.toast(`${blueprint.name} placed.`);
    this.checkAutomationAchievements();
    this.saveGame?.(true);
    this.closeModal();
  };

  proto.interact = function interactWorkshopAutomation() {
    if (this.state.mode === "world") {
      const target = this.targetTile(.95);
      const device = automationDeviceAt(this.state.placed, target.x, target.y)
        || activeAutomationDevices(this).find((entry) => distance(this.state.player, entry) < 1.35);
      if (device) return this.interactAutomationDevice(device);
    }
    return original.interact.call(this);
  };

  proto.interactAutomationDevice = function interactAutomationDevice(device) {
    const blueprint = WORKSHOP_BLUEPRINT_MAP[device.type];
    if (!blueprint) return;
    if (device.output) return this.collectAutomationOutput(device);
    if (device.type === "seedMaker") {
      if (device.input) return this.openModal("🌾 Seed Maker", `<p>Processing ${ITEMS[device.input.item].icon} ${ITEMS[device.input.item].name}. Ready on Day ${device.readyDay}.</p>`, [{ label: "Close", action: () => this.closeModal() }]);
      return this.openSeedMaker(device);
    }
    let detail = blueprint.description;
    if (device.type === "beeHouse") detail += `<br><br>Next production: Day ${device.nextReadyDay}. Nearby mature crops: ${nearbyMatureCropCount(this, device)}.`;
    if (device.type === "lightningRod") detail += "<br><br>The rod captures one battery during Sparkfall weather.";
    this.openModal(`${blueprint.icon} ${blueprint.name}`, `<p>${detail}</p><p>Stored output: ${outputLabel(device)}</p>`, [
      { label: "Remove Device", danger: true, action: () => this.removeAutomationDevice(device.id) },
      { label: "Close", action: () => this.closeModal() },
    ]);
  };

  proto.openSeedMaker = function openSeedMaker(device) {
    const rows = Object.entries(SEED_MAKER_RECIPES).map(([crop, recipe]) => `<button data-seed-input="${crop}" ${combinedItemCount(this, recipe.input) > 0 ? "" : "disabled"}>${ITEMS[recipe.input].icon} ${ITEMS[recipe.input].name} ${combinedItemCount(this, recipe.input)} → ${ITEMS[recipe.output].icon} ×${recipe.amount}</button>`).join("");
    this.openModal("🌾 Seed Maker", `<p>Load one harvested crop. Fresh seeds will be ready the following morning.</p><div class="menu-grid">${rows}</div>`, [
      { label: "Remove Device", danger: true, action: () => this.removeAutomationDevice(device.id) },
      { label: "Close", action: () => this.closeModal() },
    ]);
    document.querySelectorAll("[data-seed-input]").forEach((button) => { button.onclick = () => this.loadSeedMaker(device.id, button.dataset.seedInput); });
  };

  proto.loadSeedMaker = function loadSeedMaker(deviceId, crop) {
    const device = this.state.placed.find((entry) => entry.id === deviceId && entry.type === "seedMaker");
    const recipe = SEED_MAKER_RECIPES[crop];
    if (!device || device.input || device.output || !recipe) return this.toast("The Seed Maker is not ready.");
    if (consumeCombinedItem(this, recipe.input, 1) !== 1) return this.toast(`No ${ITEMS[recipe.input].name} is available.`);
    device.input = { crop, item: recipe.input };
    device.readyDay = this.state.day + 1;
    this.closeModal();
    this.toast(`${ITEMS[recipe.input].name} loaded. Seeds will be ready tomorrow.`);
    this.saveGame?.(true);
  };

  proto.collectAutomationOutput = function collectAutomationOutput(device) {
    const output = device.output;
    if (!output || !ITEMS[output.id] || output.amount <= 0) return this.toast("This machine has no output.");
    this.addItem(output.id, output.amount, false);
    if (output.id === "wildHoney" || output.id === "sparkHoney") this.state.automation.stats.honeyCollected += output.amount;
    else if (output.id === "batteryCell") this.state.automation.stats.batteriesCollected += output.amount;
    else if (["turnipSeed", "berrySeed", "moonSeed"].includes(output.id)) this.state.automation.stats.seedsMade += output.amount;
    device.output = null;
    this.sound?.("success");
    this.toast(`Collected ${ITEMS[output.id].name} ×${output.amount}.`);
    this.checkAutomationAchievements();
    this.saveGame?.(true);
  };

  proto.removeAutomationDevice = function removeAutomationDevice(deviceId) {
    const index = this.state.placed.findIndex((entry) => entry.id === deviceId && AUTOMATION_TYPES.has(entry.type));
    if (index < 0) return this.toast("Automation device not found.");
    const device = this.state.placed[index];
    if (machineBusy(device)) return this.toast("Collect the output or finish processing before removing this device.");
    const blueprint = WORKSHOP_BLUEPRINT_MAP[device.type];
    this.state.placed.splice(index, 1);
    this.addItem(blueprint.kit, 1, false);
    this.closeModal();
    this.toast(`${blueprint.name} returned to storage.`);
    this.saveGame?.(true);
  };

  proto.showAutomationReport = function showAutomationReport() {
    const stats = this.state.automation.stats;
    const devices = activeAutomationDevices(this);
    const ready = devices.filter((device) => device.output).length;
    const types = WORKSHOP_BLUEPRINTS.map((blueprint) => `<li>${blueprint.icon} ${blueprint.name}: ${deviceCount(this, blueprint.id)} placed · ${combinedItemCount(this, blueprint.kit)} stored</li>`).join("");
    this.openModal("Farmstead Automation Report", `<section class="automation-summary"><div><strong>${devices.length}</strong><small>active devices</small></div><div><strong>${ready}</strong><small>outputs ready</small></div><div><strong>${stats.tilesWatered}</strong><small>tiles watered</small></div></section><ul>${types}</ul><p>Honey collected: ${stats.honeyCollected} · Batteries captured: ${stats.batteriesCollected} · Seeds produced: ${stats.seedsMade}</p>`, [
      { label: "Workshop", action: () => { this.closeModal(); this.showAutomationWorkshop(); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
  };

  proto.openFarmWorkshop = function openFarmWorkshopAutomation() {
    if (!this.state.farmExpansion?.completed?.includes("workshop")) return original.openFarmWorkshop.call(this);
    this.openModal("🛠️ Farm Workshop", `<p>The workshop builds field automation, manages the estate plan, and keeps every crafting station in one place.</p><section class="automation-summary"><div><strong>${activeAutomationDevices(this).length}</strong><small>devices placed</small></div><div><strong>${this.state.automation.stats.honeyCollected}</strong><small>honey collected</small></div><div><strong>${this.state.automation.stats.batteriesCollected}</strong><small>batteries captured</small></div></section>`, [
      { label: "Automation Workshop", action: () => { this.closeModal(); this.showAutomationWorkshop(); } },
      { label: "Crafting", action: () => { this.closeModal(); this.showCrafting(); } },
      { label: "Project Board", action: () => { this.closeModal(); this.showFarmsteadPlan(); } },
      { label: "Estate Report", action: () => { this.closeModal(); this.showFarmsteadReport(); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
  };

  proto.updateContextHint = function updateContextHintWorkshopAutomation() {
    const result = original.updateContextHint.call(this);
    if (this.state.mode !== "world") return result;
    const target = this.targetTile(.95);
    const device = automationDeviceAt(this.state.placed, target.x, target.y)
      || activeAutomationDevices(this).find((entry) => distance(this.state.player, entry) < 1.35);
    if (!device) return result;
    const hint = $("contextHint");
    const blueprint = WORKSHOP_BLUEPRINT_MAP[device.type];
    hint.textContent = device.output ? `Interact: Collect ${outputLabel(device)}` : `Interact: ${blueprint.name}`;
    hint.classList.remove("hidden");
    return result;
  };

  proto.drawPlaced = function drawPlacedWorkshopAutomation(ctx, bounds) {
    const all = this.state.placed;
    this.state.placed = all.filter((entry) => !AUTOMATION_TYPES.has(entry.type));
    try { original.drawPlaced.call(this, ctx, bounds); }
    finally { this.state.placed = all; }
    for (const device of activeAutomationDevices(this)) {
      if (device.x < bounds.startX - 1 || device.x > bounds.endX + 1 || device.y < bounds.startY - 1 || device.y > bounds.endY + 1) continue;
      drawAutomationDevice(ctx, device);
    }
  };

  proto.toggleGameMenu = function toggleGameMenuWorkshopAutomation() {
    const result = original.toggleGameMenu.call(this);
    if (typeof document === "undefined" || !this.state.farmExpansion?.completed?.includes("workshop")) return result;
    const grid = document.querySelector("#modalBody .menu-grid");
    if (!grid || document.getElementById("automationMenu")) return result;
    const button = document.createElement("button");
    button.id = "automationMenu";
    button.textContent = "🛠️ Automation";
    grid.appendChild(button);
    button.onclick = () => { this.closeModal(); this.showAutomationWorkshop(); };
    return result;
  };

  proto.checkAutomationAchievements = function checkAutomationAchievements() {
    const stats = this.state.automation?.stats || {};
    const devices = activeAutomationDevices(this);
    this.checkAchievement?.("automation-first-device", devices.length >= 1, "First Circuit", "Place the first Farmstead automation device.");
    this.checkAchievement?.("automation-rainmaker", devices.filter((entry) => ["qualitySprinkler", "hearthSprinkler"].includes(entry.type)).length >= 8, "Rainmaker", "Operate eight advanced sprinklers.");
    this.checkAchievement?.("automation-sweet-industry", stats.honeyCollected >= 25, "Sweet Industry", "Collect 25 jars of workshop honey.");
    this.checkAchievement?.("automation-bottled-spark", stats.batteriesCollected >= 10, "Bottled Spark", "Capture 10 Hearth Batteries.");
    this.checkAchievement?.("automation-seed-sovereignty", stats.seedsMade >= 50, "Seed Sovereignty", "Produce 50 seeds with Seed Makers.");
    this.checkAchievement?.("automation-master-mechanist", this.state.automation.knownBlueprints.length >= WORKSHOP_BLUEPRINTS.length, "Master Mechanist", "Craft every Farm Workshop automation blueprint.");
  };
}
