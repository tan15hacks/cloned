import { BUILDINGS, WORLD_W, WORLD_H, clamp } from "./game-shared.js";
import { INTERIOR_MAPS, shopIsOpen } from "./living-world-data.js";
import { BUILDING_INTERIOR_MAP, registerExpandedInteriors } from "./expanded-interiors-data.js";

registerExpandedInteriors();

const DIRECTORY_INTERIORS = {
  farmhouse: "farmhouse",
  guild: "guild",
  ...BUILDING_INTERIOR_MAP,
};

const INTERIOR_TO_BUILDING = Object.fromEntries(
  Object.entries(DIRECTORY_INTERIORS).map(([buildingId, interiorId]) => [interiorId, buildingId]),
);

const TIMED_SERVICE_INTERACTIONS = new Set([
  "seedCounter",
  "villageInnCounter", "villageKitchen",
  "smithCounter", "smithAnvil",
  "apothecaryCounter", "apothecaryCauldron",
  "cityInnCounter", "cityInnBed",
  "marketCounter", "produceStall",
  "observatoryDesk", "observatoryTelescope",
  "cityHallDesk",
]);

function finitePoint(value) {
  if (!value || !Number.isFinite(Number(value.x)) || !Number.isFinite(Number(value.y))) return null;
  const x = Number(value.x);
  const y = Number(value.y);
  if (x < 1 || y < 1 || x >= WORLD_W - 1 || y >= WORLD_H - 1) return null;
  return { x, y };
}

function buildingForInterior(interiorId) {
  const buildingId = INTERIOR_TO_BUILDING[interiorId];
  return BUILDINGS.find((entry) => entry.id === buildingId) || null;
}

function buildingReturnPoint(interiorId) {
  const mapPoint = finitePoint(INTERIOR_MAPS[interiorId]?.exit?.world);
  if (mapPoint) return mapPoint;
  const building = buildingForInterior(interiorId);
  if (building) return { x: building.door.x + .5, y: building.door.y + 1.5 };
  return { x: 11.5, y: 15.5 };
}

function formatHour(minutes) {
  const hour24 = Math.floor((Number(minutes) || 0) / 60) % 24;
  const minute = Math.floor((Number(minutes) || 0) % 60);
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${hour24 % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function safeInteriorReturnPoint(data) {
  const interiorId = data?.living?.interiorId;
  return finitePoint(data?.living?.worldReturn) || buildingReturnPoint(interiorId);
}

export function normalizeExpandedInteriorRuntime(state) {
  if (!state || typeof state !== "object") return state;
  const raw = state.interiors && typeof state.interiors === "object" ? state.interiors : {};
  const validIds = new Set(Object.keys(INTERIOR_MAPS));
  const visited = Array.isArray(raw.visited)
    ? [...new Set(raw.visited.filter((id) => validIds.has(id)))].slice(0, validIds.size)
    : [];
  const visits = {};
  if (raw.visits && typeof raw.visits === "object") {
    for (const [id, count] of Object.entries(raw.visits)) {
      if (!validIds.has(id)) continue;
      visits[id] = clamp(Math.floor(Number(count) || 0), 0, 999999);
    }
  }
  state.interiors = {
    version: 1,
    visited,
    visits,
    lastInterior: validIds.has(raw.lastInterior) ? raw.lastInterior : null,
    recordsRead: Array.isArray(raw.recordsRead)
      ? [...new Set(raw.recordsRead.map(String).filter(Boolean))].slice(0, 100)
      : [],
  };
  if (state.living) {
    if (!validIds.has(state.living.interiorId)) state.living.interiorId = null;
    const returnPoint = finitePoint(state.living.worldReturn);
    state.living.worldReturn = returnPoint;
  }
  for (const npc of state.npcs || []) {
    if (!validIds.has(npc.interiorId)) npc.interiorId = null;
  }
  return state;
}

export function installExpandedInteriorsRuntime(GameClass) {
  const proto = GameClass.prototype;
  const originalMigrateState = proto.migrateState;
  const originalEnterGame = proto.enterGame;
  const originalEnterInterior = proto.enterInterior;
  const originalLeaveInterior = proto.leaveInterior;
  const originalHandleInteraction = proto.handleExpandedInteriorInteraction;

  proto.migrateState = function migrateStateExpandedInteriorRuntime(data) {
    const wasInterior = data?.mode === "interior";
    const returnPoint = wasInterior ? safeInteriorReturnPoint(data) : null;
    const state = normalizeExpandedInteriorRuntime(originalMigrateState.call(this, data));
    if (wasInterior && returnPoint) {
      state.mode = "world";
      state.player.x = clamp(returnPoint.x, 2, WORLD_W - 2);
      state.player.y = clamp(returnPoint.y, 2, WORLD_H - 2);
      if (state.living) {
        state.living.interiorId = null;
        state.living.worldReturn = null;
      }
    }
    return state;
  };

  proto.enterGame = function enterGameExpandedInteriorRuntime() {
    normalizeExpandedInteriorRuntime(this.state);
    originalEnterGame.call(this);
    normalizeExpandedInteriorRuntime(this.state);
    this.refreshInteriorNpcAssignments?.();
  };

  if (originalEnterInterior) proto.enterInterior = function enterInteriorExpandedRuntime(id, building) {
    const result = originalEnterInterior.call(this, id, building);
    const total = Object.keys(DIRECTORY_INTERIORS).length;
    this.checkAchievement?.(
      "open-every-door",
      (this.state?.interiors?.visited?.filter((interiorId) => INTERIOR_TO_BUILDING[interiorId]).length || 0) >= total,
      "Open Every Door",
      "Visit all ten playable building interiors.",
    );
    return result;
  };

  proto.leaveInterior = function leaveInteriorExpandedRuntime() {
    const result = originalLeaveInterior.call(this);
    if (this.state?.living) this.state.living.worldReturn = null;
    this.refreshInteriorNpcAssignments?.();
    return result;
  };

  if (originalHandleInteraction) proto.handleExpandedInteriorInteraction = function handleExpandedInteriorInteractionRuntime(interaction, map) {
    if (TIMED_SERVICE_INTERACTIONS.has(interaction?.id)) {
      const interiorId = map?.id || this.state?.living?.interiorId;
      const building = buildingForInterior(interiorId);
      if (building?.service && !shopIsOpen(building.service, this.state.minutes)) {
        this.refreshInteriorNpcAssignments?.();
        return this.toast(`${building.name} has closed for the day. Lore displays and the exit remain available.`);
      }
    }
    return originalHandleInteraction.call(this, interaction, map);
  };

  proto.showInteriorDirectory = function showCompleteInteriorDirectory() {
    const cards = Object.entries(DIRECTORY_INTERIORS).map(([buildingId, interiorId]) => {
      const building = BUILDINGS.find((entry) => entry.id === buildingId);
      const map = INTERIOR_MAPS[interiorId];
      const visited = this.state.interiors.visited.includes(interiorId);
      const alwaysAccessible = buildingId === "farmhouse" || buildingId === "guild";
      const open = alwaysAccessible || !building?.service || shopIsOpen(building.service, this.state.minutes);
      return `<article class="interior-directory-card ${visited ? "visited" : ""}"><h3>${visited ? "✅" : "⬚"} ${map.name}</h3><p>${open ? "Open now" : "Closed now"} · Visits ${this.state.interiors.visits[interiorId] || 0}</p><small>${alwaysAccessible ? "Always accessible" : building?.service || "interior"} · Current time ${formatHour(this.state.minutes)}</small></article>`;
    }).join("");
    this.openModal(
      "Buildings & Interiors",
      `<p><strong>${this.state.interiors.visited.length}/${Object.keys(DIRECTORY_INTERIORS).length}</strong> playable interiors discovered. Business counters follow their normal working hours.</p><div class="interior-directory">${cards}</div>`,
      [{ label: "Close", action: () => this.closeModal() }],
    );
  };
}
