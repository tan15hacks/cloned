import { keyOf } from "./game-shared.js";
import { AUTOMATION_TYPES } from "./workshop-automation-data.js";

export function clearAutomationStreamConflicts(state) {
  if (!state || !Array.isArray(state.placed)) return 0;
  const occupied = new Set(state.placed
    .filter((entry) => AUTOMATION_TYPES.has(entry?.type))
    .map((entry) => keyOf(Math.floor(Number(entry.x)), Math.floor(Number(entry.y)))));
  if (!occupied.size) return 0;
  let removed = 0;
  if (Array.isArray(state.resources)) {
    const before = state.resources.length;
    state.resources = state.resources.filter((entry) => !occupied.has(keyOf(Math.floor(Number(entry.x)), Math.floor(Number(entry.y)))));
    removed += before - state.resources.length;
  }
  if (Array.isArray(state.monsters)) {
    const before = state.monsters.length;
    state.monsters = state.monsters.filter((entry) => !occupied.has(keyOf(Math.floor(Number(entry.x)), Math.floor(Number(entry.y)))));
    removed += before - state.monsters.length;
  }
  return removed;
}

export function installWorkshopAutomationStreamRuntime(GameClass) {
  const proto = GameClass.prototype;
  const originalRefresh = proto.refreshActiveWorldChunks;
  if (!originalRefresh) return;

  proto.refreshActiveWorldChunks = function refreshAutomationSafeChunks(force = false) {
    const result = originalRefresh.call(this, force);
    const removed = clearAutomationStreamConflicts(this.state);
    if (removed > 0) this.rebuildResourceMap?.();
    return result;
  };
}
