import { clearFarmsteadExpansionSpace } from "./game-farmstead-expansion.js";

export function installFarmsteadStreamRuntime(GameClass) {
  const proto = GameClass.prototype;
  const originalRefresh = proto.refreshActiveWorldChunks;
  if (!originalRefresh) return;

  proto.refreshActiveWorldChunks = function refreshFarmsteadSafeChunks(force = false) {
    const result = originalRefresh.call(this, force);
    const removed = clearFarmsteadExpansionSpace(this.state);
    if (removed > 0) this.rebuildResourceMap?.();
    return result;
  };
}
