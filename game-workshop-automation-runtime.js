import { ITEMS, clamp, isFarmableTile, keyOf } from "./game-shared.js";
import {
  AUTOMATION_TYPES, MAX_AUTOMATION_DEVICES, MACHINE_OUTPUT_ITEMS,
  WORKSHOP_BLUEPRINTS, WORKSHOP_BLUEPRINT_MAP, SEED_MAKER_RECIPES,
  createAutomationState,
} from "./workshop-automation-data.js";

const MAX_COUNTER = 999999999;

function finiteInt(value, fallback = 0) {
  const numeric = Number(value);
  return Math.floor(Number.isFinite(numeric) ? numeric : fallback);
}

function normalizedOutput(raw, allowed) {
  if (!raw || typeof raw !== "object" || !allowed.has(raw.id) || !ITEMS[raw.id]) return null;
  const amount = clamp(finiteInt(raw.amount), 1, 99);
  return { id: raw.id, amount };
}

function normalizeDevice(raw, day, serial) {
  if (!raw || typeof raw !== "object" || !AUTOMATION_TYPES.has(raw.type)) return null;
  const xNumber = Number(raw.x);
  const yNumber = Number(raw.y);
  if (!Number.isFinite(xNumber) || !Number.isFinite(yNumber)) return null;
  const tileX = Math.floor(xNumber);
  const tileY = Math.floor(yNumber);
  if (!isFarmableTile(tileX, tileY)) return null;
  const base = {
    id: typeof raw.id === "string" && raw.id.startsWith("automation:") ? raw.id.slice(0, 160) : `automation:migrated:${serial}:${raw.type}`,
    type: raw.type,
    x: tileX + .5,
    y: tileY + .5,
    placedDay: clamp(finiteInt(raw.placedDay, 1), 1, Math.max(1, day)),
  };
  if (raw.type === "beeHouse") return {
    ...base,
    nextReadyDay: clamp(finiteInt(raw.nextReadyDay, day + 2), 1, MAX_COUNTER),
    output: normalizedOutput(raw.output, new Set(["wildHoney", "sparkHoney"])),
  };
  if (raw.type === "lightningRod") return {
    ...base,
    lastCapturedDay: clamp(finiteInt(raw.lastCapturedDay), 0, Math.max(0, day)),
    output: normalizedOutput(raw.output, new Set(["batteryCell"])),
  };
  if (raw.type === "seedMaker") {
    const recipe = SEED_MAKER_RECIPES[raw.input?.crop];
    const output = normalizedOutput(raw.output, new Set(["turnipSeed", "berrySeed", "moonSeed"]));
    const input = !output && recipe && raw.input?.item === recipe.input ? { crop: raw.input.crop, item: recipe.input } : null;
    return {
      ...base,
      input,
      output,
      readyDay: input ? clamp(finiteInt(raw.readyDay, day + 1), day + 1, MAX_COUNTER) : 0,
    };
  }
  return base;
}

export function hardenWorkshopAutomationState(state) {
  if (!state || typeof state !== "object") return { state, removed: 0 };
  state.automation = createAutomationState(state.automation);
  const source = Array.isArray(state.placed) ? state.placed : [];
  const nonAutomation = source.filter((entry) => !AUTOMATION_TYPES.has(entry?.type));
  const blocked = new Set(nonAutomation.map((entry) => keyOf(Math.floor(Number(entry.x)), Math.floor(Number(entry.y)))));
  const counts = Object.fromEntries(WORKSHOP_BLUEPRINTS.map((entry) => [entry.id, 0]));
  const normalized = [];
  let removed = 0;
  for (const raw of source) {
    if (!AUTOMATION_TYPES.has(raw?.type)) continue;
    if (normalized.length >= MAX_AUTOMATION_DEVICES) { removed += 1; continue; }
    const device = normalizeDevice(raw, Math.max(1, finiteInt(state.day, 1)), normalized.length);
    if (!device) { removed += 1; continue; }
    const blueprint = WORKSHOP_BLUEPRINT_MAP[device.type];
    const tile = keyOf(Math.floor(device.x), Math.floor(device.y));
    if (!blueprint || counts[device.type] >= blueprint.maxPlaced || blocked.has(tile) || state.soil?.[tile]) {
      removed += 1;
      continue;
    }
    blocked.add(tile);
    counts[device.type] += 1;
    normalized.push(device);
  }
  state.placed = [...nonAutomation, ...normalized];
  state.automation.knownBlueprints = [...new Set([
    ...state.automation.knownBlueprints,
    ...normalized.map((device) => device.type),
  ].filter((id) => WORKSHOP_BLUEPRINT_MAP[id]))];
  for (const key of ["crafted", "placed", "tilesWatered", "honeyCollected", "batteriesCollected", "seedsMade"]) {
    state.automation.stats[key] = clamp(finiteInt(state.automation.stats[key]), 0, MAX_COUNTER);
  }
  state.automation.stats.placed = Math.max(state.automation.stats.placed, normalized.length);
  return { state, removed };
}

export function installWorkshopAutomationRuntime(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    showAutomationWorkshop: proto.showAutomationWorkshop,
    craftAutomationBlueprint: proto.craftAutomationBlueprint,
    placeAutomationDevice: proto.placeAutomationDevice,
    interactAutomationDevice: proto.interactAutomationDevice,
    collectAutomationOutput: proto.collectAutomationOutput,
    removeAutomationDevice: proto.removeAutomationDevice,
  };

  proto.migrateState = function migrateStateWorkshopAutomationRuntime(data) {
    return hardenWorkshopAutomationState(original.migrateState.call(this, data)).state;
  };

  proto.enterGame = function enterGameWorkshopAutomationRuntime() {
    const before = hardenWorkshopAutomationState(this.state);
    const result = original.enterGame.call(this);
    const after = hardenWorkshopAutomationState(this.state);
    if (before.removed + after.removed > 0) {
      this.saveGame?.(true);
      this.toast?.("Invalid or overlapping workshop devices were safely removed from this save.");
    }
    return result;
  };

  proto.nextDay = function nextDayWorkshopAutomationRuntime(passedOut) {
    hardenWorkshopAutomationState(this.state);
    const result = original.nextDay.call(this, passedOut);
    hardenWorkshopAutomationState(this.state);
    return result;
  };

  for (const name of ["showAutomationWorkshop", "craftAutomationBlueprint", "placeAutomationDevice", "interactAutomationDevice", "collectAutomationOutput", "removeAutomationDevice"]) {
    if (!original[name]) continue;
    proto[name] = function hardenedAutomationAction(...args) {
      hardenWorkshopAutomationState(this.state);
      return original[name].apply(this, args);
    };
  }

  proto.automationItemCount = function automationItemCount(id) {
    if (!ITEMS[id]) return 0;
    let total = Math.max(0, finiteInt(this.state.inventory?.[id]));
    for (const chest of Object.values(this.state.storage?.chests || {})) total += Math.max(0, finiteInt(chest.items?.[id]));
    return total;
  };

  proto.validAutomationOutput = function validAutomationOutput(output) {
    return Boolean(output && MACHINE_OUTPUT_ITEMS.has(output.id) && ITEMS[output.id] && finiteInt(output.amount) > 0);
  };
}
