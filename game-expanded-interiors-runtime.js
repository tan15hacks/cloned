import { BUILDINGS, WORLD_W, WORLD_H, clamp } from "./game-shared.js";
import { INTERIOR_MAPS } from "./living-world-data.js";
import { BUILDING_INTERIOR_MAP, registerExpandedInteriors } from "./expanded-interiors-data.js";

registerExpandedInteriors();

const INTERIOR_TO_BUILDING = {
  farmhouse: "farmhouse",
  guild: "guild",
  ...Object.fromEntries(Object.entries(BUILDING_INTERIOR_MAP).map(([buildingId, interiorId]) => [interiorId, buildingId])),
};

function finitePoint(value) {
  if (!value || !Number.isFinite(Number(value.x)) || !Number.isFinite(Number(value.y))) return null;
  const x = Number(value.x);
  const y = Number(value.y);
  if (x < 1 || y < 1 || x >= WORLD_W - 1 || y >= WORLD_H - 1) return null;
  return { x, y };
}

function buildingReturnPoint(interiorId) {
  const mapPoint = finitePoint(INTERIOR_MAPS[interiorId]?.exit?.world);
  if (mapPoint) return mapPoint;
  const buildingId = INTERIOR_TO_BUILDING[interiorId];
  const building = BUILDINGS.find((entry) => entry.id === buildingId);
  if (building) return { x: building.door.x + .5, y: building.door.y + 1.5 };
  return { x: 11.5, y: 15.5 };
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
  const originalLeaveInterior = proto.leaveInterior;

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

  proto.leaveInterior = function leaveInteriorExpandedRuntime() {
    const result = originalLeaveInterior.call(this);
    if (this.state?.living) this.state.living.worldReturn = null;
    this.refreshInteriorNpcAssignments?.();
    return result;
  };
}
