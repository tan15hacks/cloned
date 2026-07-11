import { monsterBehavior } from "./game-combat.js";

const finiteOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function installCombatRuntimeHardening(GameClass) {
  const proto = GameClass.prototype;
  const originalGetCombatStats = proto.getCombatStats;

  proto.ensureMonsterCombat = function ensureMonsterCombatHardened(monster) {
    const existing = monster.combat && typeof monster.combat === "object" ? monster.combat : {};
    const defaults = {
      behavior: monsterBehavior(monster.type),
      telegraph: 0,
      attackType: null,
      hitFlash: 0,
      deathTimer: 0,
      teleportCooldown: 2.5 + Math.random() * 2,
      orbit: Math.random() > .5 ? 1 : -1,
      element: null,
      elementTime: 0,
      elementTick: 0,
    };
    monster.combat = { ...defaults, ...existing };
    monster.combat.behavior ||= defaults.behavior;
    monster.combat.telegraph = finiteOr(monster.combat.telegraph, 0);
    monster.combat.hitFlash = finiteOr(monster.combat.hitFlash, 0);
    monster.combat.deathTimer = finiteOr(monster.combat.deathTimer, 0);
    monster.combat.teleportCooldown = finiteOr(monster.combat.teleportCooldown, defaults.teleportCooldown);
    monster.combat.orbit = finiteOr(monster.combat.orbit, defaults.orbit) >= 0 ? 1 : -1;
    monster.combat.elementTime = finiteOr(monster.combat.elementTime, 0);
    monster.combat.elementTick = finiteOr(monster.combat.elementTick, 0);
    return monster.combat;
  };

  proto.getCombatStats = function getCombatStatsHardened() {
    const stats = originalGetCombatStats.call(this);
    stats.knockback = finiteOr(stats.knockback, .45);
    stats.range = finiteOr(stats.range, 1.5);
    stats.attackSpeed = Math.max(.25, finiteOr(stats.attackSpeed, 1));
    return stats;
  };
}
