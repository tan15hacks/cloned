import {
  TILE,
  CAVE_W,
  CAVE_H,
  MONSTER_TYPES,
  ITEMS,
  CAVE_MONSTERS,
  regionAt,
  distance,
  clamp,
  randomInt,
  isWaterTile,
  buildingAtTile,
  $,
} from "./game-shared.js";

export const EQUIPMENT_SLOTS = ["weapon", "armor", "helmet", "boots", "ring", "charm"];

export const EQUIPMENT_DEFS = {
  fieldBlade: { name: "Field Blade", icon: "🗡️", slot: "weapon", rarity: "common", damage: 2, range: 1.55, attackSpeed: 1, crit: .05, knockback: .48, value: 0 },
  guildSabre: { name: "Guild Sabre", icon: "⚔️", slot: "weapon", rarity: "uncommon", damage: 4, range: 1.72, attackSpeed: 1.12, crit: .09, knockback: .58, value: 550 },
  emberEdge: { name: "Ember Edge", icon: "🔥", slot: "weapon", rarity: "rare", damage: 7, range: 1.82, attackSpeed: .98, crit: .13, knockback: .68, element: "burn", value: 1800 },
  voidbrand: { name: "Voidbrand", icon: "🔮", slot: "weapon", rarity: "legendary", damage: 11, range: 2.05, attackSpeed: .92, crit: .2, knockback: .8, value: 3500 },
  workCoat: { name: "Reinforced Work Coat", icon: "🥋", slot: "armor", rarity: "common", armor: 1, maxHealth: 5, value: 0 },
  ironMail: { name: "Ironhart Mail", icon: "🛡️", slot: "armor", rarity: "uncommon", armor: 4, maxHealth: 15, value: 650 },
  frostPlate: { name: "Frostbound Plate", icon: "🧊", slot: "armor", rarity: "rare", armor: 7, maxHealth: 25, statusResist: .2, value: 1600 },
  leatherCap: { name: "Hunter's Cap", icon: "🧢", slot: "helmet", rarity: "uncommon", armor: 1, crit: .03, value: 300 },
  hunterHelm: { name: "Dread Hunter Helm", icon: "⛑️", slot: "helmet", rarity: "rare", armor: 3, crit: .05, lootBonus: .08, value: 900 },
  trailBoots: { name: "Trail Boots", icon: "🥾", slot: "boots", rarity: "common", moveSpeed: .06, value: 0 },
  frostTreads: { name: "Frost Treads", icon: "👢", slot: "boots", rarity: "rare", moveSpeed: .12, slowResist: .65, value: 900 },
  luckyRing: { name: "Lucky Ring", icon: "💍", slot: "ring", rarity: "rare", crit: .08, lootBonus: .12, value: 1000 },
  depthRing: { name: "Ring of the Depths", icon: "🕳️", slot: "ring", rarity: "epic", damage: 3, range: .12, value: 1900 },
  mossCharm: { name: "Murkfen Moss Charm", icon: "🍀", slot: "charm", rarity: "uncommon", poisonResist: .75, statusResist: .1, value: 700 },
  emberCharm: { name: "Cinderwake Ember Charm", icon: "🧿", slot: "charm", rarity: "rare", burnResist: .75, damage: 1, value: 1300 },
};

const DEFAULT_COMBAT = {
  version: 1,
  equipment: { weapon: "fieldBlade", armor: "workCoat", helmet: null, boots: "trailBoots", ring: null, charm: null },
  owned: ["fieldBlade", "workCoat", "trailBoots"],
  attackCooldown: 0,
  attackTimer: 0,
  attackDirection: "down",
  invulnerable: 0,
  statuses: {
    poison: { time: 0, tick: 0 },
    burn: { time: 0, tick: 0 },
    slow: { time: 0 },
  },
  projectiles: [],
  lootDrops: [],
  damageNumbers: [],
  screenFlash: 0,
  killsSinceGear: 0,
};

const STATUS_TYPES = ["poison", "burn", "slow"];
const RANK_ORDER = ["F", "E", "D", "C", "B", "A", "S"];

export function createCombatState(existing = {}) {
  const state = {
    ...DEFAULT_COMBAT,
    ...(existing && typeof existing === "object" ? existing : {}),
    equipment: { ...DEFAULT_COMBAT.equipment, ...(existing?.equipment || {}) },
    owned: Array.isArray(existing?.owned) ? [...new Set([...DEFAULT_COMBAT.owned, ...existing.owned.filter((id) => EQUIPMENT_DEFS[id])])] : [...DEFAULT_COMBAT.owned],
    statuses: {
      poison: { ...DEFAULT_COMBAT.statuses.poison, ...(existing?.statuses?.poison || {}) },
      burn: { ...DEFAULT_COMBAT.statuses.burn, ...(existing?.statuses?.burn || {}) },
      slow: { ...DEFAULT_COMBAT.statuses.slow, ...(existing?.statuses?.slow || {}) },
    },
    projectiles: [],
    lootDrops: Array.isArray(existing?.lootDrops) ? existing.lootDrops : [],
    damageNumbers: [],
  };
  for (const slot of EQUIPMENT_SLOTS) {
    const id = state.equipment[slot];
    if (id && (!EQUIPMENT_DEFS[id] || EQUIPMENT_DEFS[id].slot !== slot)) state.equipment[slot] = null;
  }
  state.attackCooldown = Math.max(0, Number(state.attackCooldown) || 0);
  state.attackTimer = 0;
  state.invulnerable = 0;
  state.screenFlash = 0;
  return state;
}

export function equipmentStats(combat, upgrades = {}) {
  const stats = {
    damage: 2 + (Number(upgrades.weaponPower) || 1) * 2,
    range: 1.5,
    attackSpeed: 1,
    crit: .04,
    knockback: .45,
    armor: (Number(upgrades.armor) || 0) * 2,
    maxHealth: 0,
    moveSpeed: 0,
    lootBonus: 0,
    statusResist: 0,
    poisonResist: 0,
    burnResist: 0,
    slowResist: 0,
    element: null,
  };
  for (const slot of EQUIPMENT_SLOTS) {
    const def = EQUIPMENT_DEFS[combat?.equipment?.[slot]];
    if (!def) continue;
    for (const key of ["damage", "armor", "maxHealth", "moveSpeed", "lootBonus", "statusResist", "poisonResist", "burnResist", "slowResist"]) stats[key] += Number(def[key]) || 0;
    if (slot === "weapon") {
      stats.range = Number(def.range) || stats.range;
      stats.attackSpeed = Number(def.attackSpeed) || stats.attackSpeed;
      stats.knockback = Number(def.knockback) || stats.knback;
      stats.element = def.element || null;
    } else stats.range += Number(def.range) || 0;
    stats.crit += Number(def.crit) || 0;
  }
  stats.crit = clamp(stats.crit, 0, .75);
  stats.statusResist = clamp(stats.statusResist, 0, .8);
  return stats;
}

export function directionHitsTarget(facing, player, target, range, coneDot = .22) {
  const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const [fx, fy] = vectors[facing] || vectors.down;
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const d = Math.hypot(dx, dy);
  if (d <= .05 || d > range) return false;
  return (dx / d) * fx + (dy / d) * fy >= coneDot;
}

export function monsterBehavior(type) {
  const id = String(type).toLowerCase();
  if (/(fogwraith|prismwraith)/.test(id)) return "teleport";
  if (/(mage|spirit|elemental|wraith|wisp|imp|thornling|tidesprite)/.test(id)) return "ranged";
  if (/(golem|sentinel|brute|turtle|stag|knight|warden|abyssbeast)/.test(id)) return "heavy";
  if (/(bat|wolf|hound|moth|gull|chimera|rat)/.test(id)) return "dash";
  if (/slime/.test(id)) return "leap";
  return "melee";
}

export function statusForMonster(type) {
  const id = String(type).toLowerCase();
  if (/(spider|leech|scorpion|toad|venom)/.test(id)) return "poison";
  if (/(snow|ice|frost|glacial)/.test(id)) return "slow";
  if (/(ember|lava|fire|flame|magma|inferno)/.test(id)) return "burn";
  return null;
}

function currentMonsterDef(game, monster) {
  return game.state.mode === "cave" ? CAVE_MONSTERS[monster.type] : MONSTER_TYPES[monster.type];
}

function currentFloorKey(game) {
  return game.state.mode === "cave" ? game.state.cave.currentFloor : 0;
}

function currentDropVisible(game, drop) {
  return drop.mode === game.state.mode && (drop.mode !== "cave" || drop.floor === currentFloorKey(game));
}

function rankAtLeast(current, required) {
  return RANK_ORDER.indexOf(current) >= RANK_ORDER.indexOf(required);
}

function monsterLevel(game, monster) {
  if (game.state.mode === "cave") return Math.max(1, game.state.cave.currentFloor);
  const region = regionAt(monster.x, monster.y);
  return ({ low: 1, medium: 6, high: 12, elite: 20 })[region.reward] || 1;
}

function equipmentDescription(def) {
  const parts = [];
  if (def.damage) parts.push(`+${def.damage} damage`);
  if (def.armor) parts.push(`+${def.armor} armor`);
  if (def.maxHealth) parts.push(`+${def.maxHealth} max HP`);
  if (def.crit) parts.push(`+${Math.round(def.crit * 100)}% crit`);
  if (def.range && def.slot !== "weapon") parts.push(`+${def.range.toFixed(2)} range`);
  if (def.attackSpeed && def.attackSpeed !== 1) parts.push(`${Math.round((def.attackSpeed - 1) * 100)}% attack speed`);
  if (def.moveSpeed) parts.push(`+${Math.round(def.moveSpeed * 100)}% move speed`);
  if (def.statusResist) parts.push(`${Math.round(def.statusResist * 100)}% status resistance`);
  if (def.poisonResist) parts.push(`${Math.round(def.poisonResist * 100)}% poison resistance`);
  if (def.burnResist) parts.push(`${Math.round(def.burnResist * 100)}% burn resistance`);
  if (def.slowResist) parts.push(`${Math.round(def.slowResist * 100)}% slow resistance`);
  if (def.lootBonus) parts.push(`+${Math.round(def.lootBonus * 100)}% gear find`);
  if (def.element) parts.push(`${def.element} strikes`);
  return parts.join(" · ") || "Reliable starter equipment";
}

function shopEntries(kind, city) {
  if (kind === "blacksmith") {
    return [
      { id: "guildSabre", rank: "F" },
      { id: "ironMail", rank: "F" },
      { id: "leatherCap", rank: "F" },
      ...(city ? [{ id: "frostTreads", rank: "D" }, { id: "frostPlate", rank: "C" }, { id: "emberEdge", rank: "C" }] : []),
    ];
  }
  return [
    { id: "mossCharm", rank: "E" },
    { id: "hunterHelm", rank: "D" },
    { id: "luckyRing", rank: "C" },
    { id: "emberCharm", rank: "C" },
    { id: "depthRing", rank: "B" },
    { id: "voidbrand", rank: "A" },
  ];
}

function gearPoolFor(game, monster) {
  if (game.state.mode === "cave") {
    const floor = game.state.cave.currentFloor;
    if (floor >= 40) return ["emberCharm", "emberEdge", "depthRing", "voidbrand"];
    if (floor >= 30) return ["frostTreads", "frostPlate", "depthRing"];
    if (floor >= 20) return ["luckyRing", "hunterHelm", "depthRing"];
    return ["leatherCap", "guildSabre", "mossCharm"];
  }
  const region = regionAt(monster.x, monster.y).id;
  const pools = {
    greenfields: ["leatherCap", "guildSabre"],
    moonlake: ["luckyRing", "trailBoots"],
    darkforest: ["hunterHelm", "mossCharm"],
    swamp: ["mossCharm", "hunterHelm"],
    veilmoor: ["luckyRing", "depthRing"],
    frostpeak: ["frostTreads", "frostPlate"],
    volcano: ["emberCharm", "emberEdge"],
    dreadwild: ["depthRing", "voidbrand"],
    ruins: ["depthRing", "hunterHelm"],
    suncoast: ["luckyRing", "trailBoots"],
  };
  return pools[region] || [];
}

export function installCombatOverhaul(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    update: proto.update,
    updatePlayer: proto.updatePlayer,
    nextDay: proto.nextDay,
    knockedOut: proto.knockedOut,
    useConsumable: proto.useConsumable,
    toggleGameMenu: proto.toggleGameMenu,
    openBlacksmith: proto.openBlacksmith,
    openHunterShop: proto.openHunterShop,
    leaveCave: proto.leaveCave,
    changeCaveFloor: proto.changeCaveFloor,
    drawPlayer: proto.drawPlayer,
    drawWorld: proto.drawWorld,
    drawCave: proto.drawCave,
    render: proto.render,
  };

  proto.defaultState = function defaultStateWithCombat() {
    const state = original.defaultState.call(this);
    state.combat = createCombatState();
    state.player.baseMaxHealth = state.player.maxHealth;
    state.player.baseSpeed = state.player.speed;
    return state;
  };

  proto.migrateState = function migrateStateWithCombat(data) {
    const state = original.migrateState.call(this, data);
    state.combat = createCombatState(data?.combat || state.combat);
    state.player.baseMaxHealth = Number(data?.player?.baseMaxHealth) || Number(state.player.baseMaxHealth) || 100;
    state.player.baseSpeed = Number(data?.player?.baseSpeed) || Number(state.player.baseSpeed) || 4.5;
    return state;
  };

  proto.enterGame = function enterGameWithCombat() {
    original.enterGame.call(this);
    this.state.combat = createCombatState(this.state.combat);
    this.applyEquipmentVitals();
  };

  proto.getCombatStats = function getCombatStats() {
    return equipmentStats(this.state.combat, this.state.upgrades);
  };

  proto.applyEquipmentVitals = function applyEquipmentVitals() {
    const stats = this.getCombatStats();
    const base = this.state.player.baseMaxHealth || 100;
    const previousMax = this.state.player.maxHealth || base;
    this.state.player.maxHealth = base + stats.maxHealth;
    if (this.state.player.maxHealth > previousMax) this.state.player.health += this.state.player.maxHealth - previousMax;
    this.state.player.health = clamp(this.state.player.health, 0, this.state.player.maxHealth);
  };

  proto.updatePlayer = function updatePlayerWithEquipment(dt) {
    const player = this.state.player;
    const stats = this.getCombatStats();
    const savedSpeed = player.speed;
    const slowed = this.state.combat.statuses.slow.time > 0;
    const slowFactor = slowed ? .64 + stats.slowResist * .36 : 1;
    player.speed = (player.baseSpeed || 4.5) * (1 + stats.moveSpeed) * slowFactor;
    original.updatePlayer.call(this, dt);
    player.speed = savedSpeed;
  };

  proto.update = function updateWithCombat(dt) {
    this.updateCombatTimers(dt);
    original.update.call(this, dt);
    this.updateEnemyProjectiles(dt);
    this.updateLootDrops(dt);
    this.updateDamageNumbers(dt);
  };

  proto.updateCombatTimers = function updateCombatTimers(dt) {
    const combat = this.state.combat;
    combat.attackCooldown = Math.max(0, combat.attackCooldown - dt);
    combat.attackTimer = Math.max(0, combat.attackTimer - dt);
    combat.invulnerable = Math.max(0, combat.invulnerable - dt);
    combat.screenFlash = Math.max(0, combat.screenFlash - dt);
    for (const status of STATUS_TYPES) combat.statuses[status].time = Math.max(0, combat.statuses[status].time - dt);
    if (combat.statuses.poison.time > 0) {
      combat.statuses.poison.tick -= dt;
      if (combat.statuses.poison.tick <= 0) {
        combat.statuses.poison.tick = 1;
        this.damagePlayerFromStatus(2, "poison");
      }
    }
    if (combat.statuses.burn.time > 0) {
      combat.statuses.burn.tick -= dt;
      if (combat.statuses.burn.tick <= 0) {
        combat.statuses.burn.tick = .7;
        this.damagePlayerFromStatus(3, "burn");
      }
    }
  };

  proto.damagePlayerFromStatus = function damagePlayerFromStatus(amount, status) {
    if (this.state.player.health <= 0) return;
    const stats = this.getCombatStats();
    const reduction = status === "poison" ? stats.poisonResist : status === "burn" ? stats.burnResist : 0;
    const damage = Math.max(1, Math.round(amount * (1 - reduction)));
    this.state.player.health = clamp(this.state.player.health - damage, 0, this.state.player.maxHealth);
    this.addDamageNumber(this.state.player.x, this.state.player.y - .6, damage, status === "burn" ? "#ff8b3d" : "#9ad35f", false);
    if (this.state.player.health <= 0) this.knockedOut();
  };

  proto.applyStatus = function applyStatus(status, duration) {
    if (!status || !this.state.combat.statuses[status]) return;
    const stats = this.getCombatStats();
    let resist = stats.statusResist;
    if (status === "poison") resist = 1 - (1 - resist) * (1 - stats.poisonResist);
    if (status === "burn") resist = 1 - (1 - resist) * (1 - stats.burnResist);
    if (status === "slow") resist = 1 - (1 - resist) * (1 - stats.slowResist);
    const adjusted = Math.max(.5, duration * (1 - clamp(resist, 0, .9)));
    this.state.combat.statuses[status].time = Math.max(this.state.combat.statuses[status].time, adjusted);
    if (status !== "slow") this.state.combat.statuses[status].tick = 0;
  };

  proto.swingSword = function swingSwordDirectional() {
    const combat = this.state.combat;
    if (combat.attackCooldown > 0 || this.state.player.energy <= 0) return;
    const stats = this.getCombatStats();
    const player = this.state.player;
    combat.attackDirection = player.facing;
    combat.attackTimer = .2;
    combat.attackCooldown = Math.max(.24, .62 / stats.attackSpeed);
    this.attackFlash = .18;
    this.spendEnergy(.6);
    let hits = 0;
    for (const monster of [...this.currentMonsters()]) {
      if (monster.hp <= 0 || monster.combat?.dead) continue;
      if (!directionHitsTarget(player.facing, player, monster, stats.range)) continue;
      const critical = Math.random() < stats.crit;
      const variance = .9 + Math.random() * .2;
      const damage = Math.max(1, Math.round(stats.damage * variance * (critical ? 1.75 : 1)));
      this.hitMonsterCombat(monster, damage, critical, stats);
      hits += 1;
      if (hits >= 4) break;
    }
    this.sound(hits ? "hit" : "swing");
    if (hits) this.vibrate(criticalPulse(hits));
  };

  proto.hitMonsterCombat = function hitMonsterCombat(monster, damage, critical, stats) {
    monster.combat ||= {};
    monster.hp -= damage;
    monster.combat.hitFlash = .14;
    const angle = Math.atan2(monster.y - this.state.player.y, monster.x - this.state.player.x);
    const knock = stats.knockback * (critical ? 1.25 : 1);
    const nx = monster.x + Math.cos(angle) * knock;
    const ny = monster.y + Math.sin(angle) * knock;
    if (!this.monsterCollides(nx, ny)) { monster.x = nx; monster.y = ny; }
    if (stats.element && Math.random() < .28) {
      monster.combat.element = stats.element;
      monster.combat.elementTime = 2.5;
    }
    this.addDamageNumber(monster.x, monster.y - .65, damage, critical ? "#ffe26a" : "#fff1c8", critical);
    if (monster.hp <= 0) this.defeatMonster(monster);
  };

  proto.defeatMonster = function beginMonsterDeath(monster) {
    if (!monster || monster.combat?.dead) return;
    monster.hp = 0;
    monster.combat ||= {};
    monster.combat.dead = true;
    monster.combat.deathTimer = .42;
  };

  proto.ensureMonsterCombat = function ensureMonsterCombat(monster) {
    monster.combat ||= {
      behavior: monsterBehavior(monster.type),
      telegraph: 0,
      attackType: null,
      hitFlash: 0,
      deathTimer: 0,
      teleportCooldown: 2.5 + Math.random() * 2,
      orbit: Math.random() > .5 ? 1 : -1,
      element: null,
      elementTime: 0,
    };
    return monster.combat;
  };

  proto.updateMonsters = function updateMonstersOverhauled(dt) {
    const player = this.state.player;
    for (const monster of [...this.currentMonsters()]) {
      const def = currentMonsterDef(this, monster);
      if (!def) continue;
      const ai = this.ensureMonsterCombat(monster);
      ai.hitFlash = Math.max(0, ai.hitFlash - dt);
      ai.elementTime = Math.max(0, ai.elementTime - dt);
      monster.cooldown = Math.max(0, (monster.cooldown || 0) - dt);
      if (ai.dead) {
        ai.deathTimer -= dt;
        if (ai.deathTimer <= 0) this.finalizeMonsterDefeat(monster, def);
        continue;
      }
      if (ai.element === "burn" && ai.elementTime > 0) {
        ai.elementTick = (ai.elementTick || 0) - dt;
        if (ai.elementTick <= 0) {
          ai.elementTick = .8;
          monster.hp -= 1;
          this.addDamageNumber(monster.x, monster.y - .5, 1, "#ff8b3d", false);
          if (monster.hp <= 0) { this.defeatMonster(monster); continue; }
        }
      }
      const d = distance(player, monster);
      ai.teleportCooldown -= dt;
      if (ai.behavior === "teleport" && ai.teleportCooldown <= 0 && d < 7) {
        const angle = Math.random() * Math.PI * 2;
        const tx = player.x + Math.cos(angle) * 2.7;
        const ty = player.y + Math.sin(angle) * 2.7;
        if (!this.monsterCollides(tx, ty)) { monster.x = tx; monster.y = ty; }
        ai.teleportCooldown = 4.2;
        ai.hitFlash = .18;
      }
      if (ai.telegraph > 0) {
        ai.telegraph -= dt;
        if (ai.telegraph <= 0) this.executeMonsterAttack(monster, def, ai.attackType);
        continue;
      }
      if (d > 9) {
        this.moveMonsterToward(monster, monster.homeX, monster.homeY, def.speed * .35, dt);
        continue;
      }
      const behavior = ai.behavior;
      if (behavior === "ranged" || behavior === "teleport") {
        if (d < 2.4) this.moveMonsterAway(monster, player, def.speed, dt);
        else if (d > 5.2) this.moveMonsterToward(monster, player.x, player.y, def.speed * .75, dt);
        else this.circleMonster(monster, player, def.speed * .65, ai.orbit, dt);
        if (monster.cooldown <= 0 && d < 6.3) this.beginMonsterTelegraph(monster, "projectile", .55);
      } else if (behavior === "heavy") {
        if (d > 1.35) this.moveMonsterToward(monster, player.x, player.y, def.speed * .7, dt);
        if (monster.cooldown <= 0 && d < 1.65) this.beginMonsterTelegraph(monster, "slam", .75);
      } else if (behavior === "dash") {
        if (d > 2.4) this.circleMonster(monster, player, def.speed, ai.orbit, dt);
        if (monster.cooldown <= 0 && d < 5.2) this.beginMonsterTelegraph(monster, "dash", .38);
      } else if (behavior === "leap") {
        if (d > 1.5) this.moveMonsterToward(monster, player.x, player.y, def.speed * .5, dt);
        if (monster.cooldown <= 0 && d < 4) this.beginMonsterTelegraph(monster, "leap", .45);
      } else {
        if (d > .85) this.moveMonsterToward(monster, player.x, player.y, def.speed, dt);
        if (monster.cooldown <= 0 && d < 1.05) this.beginMonsterTelegraph(monster, "melee", .3);
      }
    }
  };

  proto.beginMonsterTelegraph = function beginMonsterTelegraph(monster, attackType, duration) {
    const ai = this.ensureMonsterCombat(monster);
    ai.attackType = attackType;
    ai.telegraph = duration;
    ai.aimX = this.state.player.x;
    ai.aimY = this.state.player.y;
    monster.cooldown = duration + (attackType === "slam" ? 1.8 : attackType === "projectile" ? 1.45 : 1.15);
  };

  proto.executeMonsterAttack = function executeMonsterAttack(monster, def, attackType) {
    if (monster.combat?.dead) return;
    const player = this.state.player;
    const status = statusForMonster(monster.type);
    if (attackType === "projectile") {
      const dx = player.x - monster.x;
      const dy = player.y - monster.y;
      const d = Math.hypot(dx, dy) || 1;
      this.state.combat.projectiles.push({
        id: `${monster.id}:${performance.now()}`,
        x: monster.x,
        y: monster.y,
        vx: dx / d * 4.2,
        vy: dy / d * 4.2,
        damage: def.damage,
        status,
        color: def.color,
        life: 3,
        mode: this.state.mode,
        floor: currentFloorKey(this),
        source: def.name,
      });
      return;
    }
    if (attackType === "dash" || attackType === "leap") {
      const dx = player.x - monster.x;
      const dy = player.y - monster.y;
      const d = Math.hypot(dx, dy) || 1;
      const travel = attackType === "dash" ? 1.55 : 1.15;
      const nx = monster.x + dx / d * travel;
      const ny = monster.y + dy / d * travel;
      if (!this.monsterCollides(nx, ny)) { monster.x = nx; monster.y = ny; }
      if (distance(player, monster) < 1.15) this.damagePlayerCombat(def.damage, status, monster, def.name);
      return;
    }
    const reach = attackType === "slam" ? 1.7 : 1.05;
    if (distance(player, monster) <= reach) this.damagePlayerCombat(def.damage, status, monster, def.name);
  };

  proto.damagePlayerCombat = function damagePlayerCombat(rawDamage, status, source, sourceName = "Monster") {
    const combat = this.state.combat;
    if (combat.invulnerable > 0 || this.state.player.health <= 0) return false;
    const stats = this.getCombatStats();
    const damage = Math.max(1, Math.round(rawDamage - stats.armor));
    this.state.player.health = clamp(this.state.player.health - damage, 0, this.state.player.maxHealth);
    combat.invulnerable = .72;
    combat.screenFlash = .18;
    if (status && Math.random() < .65) this.applyStatus(status, status === "slow" ? 3.5 : 4.5);
    if (source?.x !== undefined) {
      const angle = Math.atan2(this.state.player.y - source.y, this.state.player.x - source.x);
      const nx = this.state.player.x + Math.cos(angle) * .38;
      const ny = this.state.player.y + Math.sin(angle) * .38;
      if (!this.collides(nx, ny, .28)) { this.state.player.x = nx; this.state.player.y = ny; }
    }
    this.addDamageNumber(this.state.player.x, this.state.player.y - .65, damage, "#ff6b5f", false);
    this.vibrate(70);
    this.sound("hurt");
    if (this.state.player.health <= 0) this.knockedOut();
    return true;
  };

  proto.moveMonsterToward = function moveMonsterToward(monster, x, y, speed, dt) {
    const dx = x - monster.x;
    const dy = y - monster.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = monster.x + dx / d * speed * dt;
    const ny = monster.y + dy / d * speed * dt;
    if (!this.monsterCollides(nx, monster.y)) monster.x = nx;
    if (!this.monsterCollides(monster.x, ny)) monster.y = ny;
  };

  proto.moveMonsterAway = function moveMonsterAway(monster, target, speed, dt) {
    const dx = monster.x - target.x;
    const dy = monster.y - target.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = monster.x + dx / d * speed * dt;
    const ny = monster.y + dy / d * speed * dt;
    if (!this.monsterCollides(nx, monster.y)) monster.x = nx;
    if (!this.monsterCollides(monster.x, ny)) monster.y = ny;
  };

  proto.circleMonster = function circleMonster(monster, target, speed, direction, dt) {
    const dx = target.x - monster.x;
    const dy = target.y - monster.y;
    const d = Math.hypot(dx, dy) || 1;
    const tx = -dy / d * direction;
    const ty = dx / d * direction;
    const pull = clamp((d - 3) * .35, -.6, .6);
    const nx = monster.x + (tx + dx / d * pull) * speed * dt;
    const ny = monster.y + (ty + dy / d * pull) * speed * dt;
    if (!this.monsterCollides(nx, ny)) { monster.x = nx; monster.y = ny; }
  };

  proto.updateEnemyProjectiles = function updateEnemyProjectiles(dt) {
    const combat = this.state.combat;
    for (const projectile of combat.projectiles) {
      if (!currentDropVisible(this, projectile)) continue;
      projectile.life -= dt;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      const blocked = this.state.mode === "cave"
        ? !this.currentCave || projectile.x < 1 || projectile.y < 1 || projectile.x >= CAVE_W - 1 || projectile.y >= CAVE_H - 1 || this.currentCave.tiles[Math.floor(projectile.y)]?.[Math.floor(projectile.x)] === "wall"
        : isWaterTile(Math.floor(projectile.x), Math.floor(projectile.y)) || Boolean(buildingAtTile(projectile.x, projectile.y));
      if (blocked) projectile.life = 0;
      if (projectile.life > 0 && distance(this.state.player, projectile) < .48) {
        this.damagePlayerCombat(projectile.damage, projectile.status, projectile, projectile.source);
        projectile.life = 0;
      }
    }
    combat.projectiles = combat.projectiles.filter((projectile) => projectile.life > 0);
  };

  proto.finalizeMonsterDefeat = function finalizeMonsterDefeat(monster, def) {
    const worldMode = this.state.mode === "world";
    const region = worldMode ? regionAt(monster.x, monster.y).id : null;
    const coins = randomInt(def.coins[0], def.coins[1]);
    const items = [];
    for (const [id, chance] of def.drops) if (Math.random() < chance) items.push({ id, amount: 1 });
    const stats = this.getCombatStats();
    this.state.combat.killsSinceGear += 1;
    const gearChance = clamp(.018 + def.xp / 1600 + stats.lootBonus, 0, .28);
    const pool = gearPoolFor(this, monster).filter((id) => !this.state.combat.owned.includes(id));
    const gear = pool.length && Math.random() < gearChance ? [pool[Math.floor(Math.random() * pool.length)]] : [];
    this.state.combat.lootDrops.push({
      id: `loot:${monster.id}:${Date.now()}`,
      x: monster.x,
      y: monster.y,
      mode: this.state.mode,
      floor: currentFloorKey(this),
      coins,
      xp: def.xp,
      items,
      gear,
      bob: Math.random() * Math.PI * 2,
    });
    this.state.combat.lootDrops = this.state.combat.lootDrops.slice(-80);
    this.state.stats.monstersDefeated += 1;
    this.state.questStats.monsters += 1;
    if (worldMode) {
      this.state.guild.dailyKills[region] = (this.state.guild.dailyKills[region] || 0) + 1;
      this.state.monsters = this.state.monsters.filter((entry) => entry.id !== monster.id);
      this.ensureStreamState?.();
      if (this.state.stream && !this.state.stream.defeatedMonsters.includes(monster.id)) this.state.stream.defeatedMonsters.push(monster.id);
      if (this.state.stream) delete this.state.stream.monsterDamage[monster.id];
      const chapter = this.state.chapterOne;
      if (chapter && region === "greenfields" && chapter.step === 9) {
        chapter.counters.greenfieldKills += 1;
        if (chapter.counters.greenfieldKills >= 3) this.advanceChapterOne(10, "Completed the Greenfield Patrol hunt.");
        else this.updateChapterHUD(true);
      }
    } else {
      if (!this.state.cave.clearedMonsters.includes(monster.id)) this.state.cave.clearedMonsters.push(monster.id);
      this.currentCave.monsters = this.currentCave.monsters.filter((entry) => entry.id !== monster.id);
      if (monster.type === "depthWarden") {
        this.state.flags.caveBossDefeated = true;
        this.toast("The Floor 50 Warden has fallen. Collect its loot and use the final gate.");
      }
    }
    this.checkQuests();
    this.sound("success");
  };

  proto.updateLootDrops = function updateLootDrops(dt) {
    for (const drop of this.state.combat.lootDrops) {
      if (!currentDropVisible(this, drop)) continue;
      const d = distance(this.state.player, drop);
      if (d < 2.4 && d > .2) {
        const speed = 5.5;
        drop.x += (this.state.player.x - drop.x) / d * speed * dt;
        drop.y += (this.state.player.y - drop.y) / d * speed * dt;
      }
      if (d < .62) this.collectCombatLoot(drop);
    }
  };

  proto.collectCombatLoot = function collectCombatLoot(drop) {
    if (!this.state.combat.lootDrops.includes(drop)) return;
    this.state.combat.lootDrops = this.state.combat.lootDrops.filter((entry) => entry.id !== drop.id);
    this.state.coins += drop.coins || 0;
    this.state.stats.totalEarned += drop.coins || 0;
    this.state.guild.xp += drop.xp || 0;
    for (const item of drop.items || []) this.addItem(item.id, item.amount, false);
    const gearNames = [];
    for (const id of drop.gear || []) {
      if (!EQUIPMENT_DEFS[id] || this.state.combat.owned.includes(id)) continue;
      this.state.combat.owned.push(id);
      const def = EQUIPMENT_DEFS[id];
      gearNames.push(def.name);
      if (!this.state.combat.equipment[def.slot]) this.state.combat.equipment[def.slot] = id;
    }
    this.applyEquipmentVitals();
    this.updateGuildRank();
    this.sound("coin");
    const itemCount = (drop.items || []).reduce((sum, item) => sum + item.amount, 0);
    const summary = [`${drop.coins || 0} coins`, `${drop.xp || 0} Guild XP`];
    if (itemCount) summary.push(`${itemCount} material${itemCount === 1 ? "" : "s"}`);
    if (gearNames.length) summary.push(`GEAR: ${gearNames.join(", ")}`);
    this.toast(`Collected ${summary.join(" · ")}`);
  };

  proto.addDamageNumber = function addDamageNumber(x, y, amount, color, critical) {
    this.state.combat.damageNumbers.push({ x, y, amount, color, critical, life: .8, vy: -.65, mode: this.state.mode, floor: currentFloorKey(this) });
  };

  proto.updateDamageNumbers = function updateDamageNumbers(dt) {
    for (const number of this.state.combat.damageNumbers) {
      number.life -= dt;
      number.y += number.vy * dt;
    }
    this.state.combat.damageNumbers = this.state.combat.damageNumbers.filter((number) => number.life > 0);
  };

  proto.nextDay = function nextDayWithCombat(passedOut) {
    original.nextDay.call(this, passedOut);
    this.state.combat.projectiles = [];
    this.state.combat.damageNumbers = [];
    this.state.combat.statuses = createCombatState().statuses;
    this.state.combat.invulnerable = 0;
    this.applyEquipmentVitals();
  };

  proto.knockedOut = function knockedOutWithCombat() {
    this.state.combat.projectiles = [];
    this.state.combat.statuses = createCombatState().statuses;
    this.state.combat.invulnerable = 1;
    original.knockedOut.call(this);
  };

  proto.useConsumable = function useConsumableWithStatusCure() {
    const order = this.state.mode === "cave" ? ["caveTonic", "potion", "tea", "snack"] : ["potion", "tea", "snack", "caveTonic"];
    const id = order.find((item) => (this.state.inventory[item] || 0) > 0);
    if (!id) return this.toast("You have no consumables.");
    const hasStatus = STATUS_TYPES.some((status) => this.state.combat.statuses[status].time > 0);
    if (!hasStatus && this.state.player.energy >= this.state.player.maxEnergy && this.state.player.health >= this.state.player.maxHealth) return this.toast("Health and energy are already full.");
    this.state.inventory[id] -= 1;
    const effects = { snack: [30, 0], tea: [45, 15], potion: [10, 45], caveTonic: [70, 45] };
    const [energy, health] = effects[id];
    this.state.player.energy = clamp(this.state.player.energy + energy, 0, this.state.player.maxEnergy);
    this.state.player.health = clamp(this.state.player.health + health, 0, this.state.player.maxHealth);
    if (id === "caveTonic") this.state.combat.statuses = createCombatState().statuses;
    else if (id === "potion") {
      this.state.combat.statuses.poison.time = 0;
      this.state.combat.statuses.burn.time = 0;
    }
    this.toast(`${ITEMS[id].name} restored ${energy} energy and ${health} health${hasStatus && ["potion", "caveTonic"].includes(id) ? " and cured harmful effects" : ""}.`);
    this.sound("eat");
  };

  proto.leaveCave = function leaveCaveWithCombatCleanup() {
    this.state.combat.projectiles = [];
    original.leaveCave.call(this);
  };

  proto.changeCaveFloor = function changeCaveFloorWithCombatCleanup(floor) {
    this.state.combat.projectiles = [];
    original.changeCaveFloor.call(this, floor);
  };

  proto.toggleGameMenu = function toggleGameMenuWithEquipment() {
    original.toggleGameMenu.call(this);
    const grid = document.querySelector("#modalBody .menu-grid");
    if (!grid || document.getElementById("equipmentMenu")) return;
    const button = document.createElement("button");
    button.id = "equipmentMenu";
    button.textContent = "🛡️ Equipment";
    button.onclick = () => this.showEquipment();
    grid.insertBefore(button, grid.children[1] || null);
  };

  proto.showEquipment = function showEquipment() {
    const stats = this.getCombatStats();
    const slots = EQUIPMENT_SLOTS.map((slot) => {
      const id = this.state.combat.equipment[slot];
      const def = EQUIPMENT_DEFS[id];
      return `<article class="equipment-slot"><span>${def?.icon || "➕"}</span><div><small>${slot.toUpperCase()}</small><strong>${def?.name || "Empty"}</strong><p>${def ? equipmentDescription(def) : "No equipment in this slot."}</p></div></article>`;
    }).join("");
    const owned = this.state.combat.owned.map((id) => {
      const def = EQUIPMENT_DEFS[id];
      const equipped = this.state.combat.equipment[def.slot] === id;
      return `<article class="equipment-item rarity-${def.rarity}"><span>${def.icon}</span><div><strong>${def.name}</strong><small>${def.slot} · ${def.rarity}</small><p>${equipmentDescription(def)}</p></div><button data-equip="${id}" ${equipped ? "disabled" : ""}>${equipped ? "Equipped" : "Equip"}</button></article>`;
    }).join("");
    this.openModal("Equipment & Combat Stats", `<div class="combat-stats"><b>Damage ${stats.damage}</b><b>Armor ${stats.armor}</b><b>Crit ${Math.round(stats.crit * 100)}%</b><b>Range ${stats.range.toFixed(2)}</b><b>Attack ${stats.attackSpeed.toFixed(2)}×</b><b>Move +${Math.round(stats.moveSpeed * 100)}%</b></div><div class="equipment-grid">${slots}</div><h3>Owned Equipment</h3><div class="equipment-list">${owned}</div>`, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
    document.querySelectorAll("[data-equip]").forEach((button) => button.onclick = () => this.equipCombatItem(button.dataset.equip));
  };

  proto.equipCombatItem = function equipCombatItem(id) {
    const def = EQUIPMENT_DEFS[id];
    if (!def || !this.state.combat.owned.includes(id)) return;
    this.state.combat.equipment[def.slot] = id;
    this.applyEquipmentVitals();
    this.closeModal();
    this.showEquipment();
    this.toast(`${def.name} equipped.`);
    this.saveGame(true);
  };

  proto.openCombatEquipmentShop = function openCombatEquipmentShop(kind, city = true) {
    const entries = shopEntries(kind, city);
    const html = entries.map(({ id, rank }) => {
      const def = EQUIPMENT_DEFS[id];
      const owned = this.state.combat.owned.includes(id);
      const unlocked = rankAtLeast(this.state.guild.rank, rank);
      return `<article class="equipment-item rarity-${def.rarity}"><span>${def.icon}</span><div><strong>${def.name}</strong><small>${def.slot} · Rank ${rank} · ${def.value} coins</small><p>${equipmentDescription(def)}</p></div><button data-gear-buy="${id}" ${owned || !unlocked ? "disabled" : ""}>${owned ? "Owned" : unlocked ? "Buy" : `Rank ${rank}`}</button></article>`;
    }).join("");
    this.openModal(kind === "blacksmith" ? "Ironhart Equipment Forge" : "Hunter Equipment Cache", `<p>Guild Rank <strong>${this.state.guild.rank}</strong> · ${this.state.coins} coins</p><div class="equipment-list">${html}</div>`, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-gear-buy]").forEach((button) => button.onclick = () => {
      const id = button.dataset.gearBuy;
      const def = EQUIPMENT_DEFS[id];
      if (!def || this.state.combat.owned.includes(id)) return;
      if (this.state.coins < def.value) return this.toast("Not enough coins.");
      this.state.coins -= def.value;
      this.state.combat.owned.push(id);
      this.state.combat.equipment[def.slot] = id;
      this.applyEquipmentVitals();
      this.closeModal();
      this.toast(`${def.name} purchased and equipped.`);
      this.saveGame(true);
    });
  };

  proto.openBlacksmith = function openBlacksmithWithEquipment(city) {
    const toolPrice = 250 * this.state.upgrades.toolPower;
    const weaponPrice = 300 * this.state.upgrades.weaponPower;
    const armorPrice = 350 * (this.state.upgrades.armor + 1);
    this.openModal(city ? "Ironhart Smithy" : "Oren's Workshop", `<p>Upgrade core equipment power or browse wearable gear.</p><p>Tool ${this.state.upgrades.toolPower}/5 · Weapon training ${this.state.upgrades.weaponPower}/6 · Armor training ${this.state.upgrades.armor}/5</p>`, [
      { label: `Tool Upgrade — ${toolPrice}`, action: () => this.buyUpgrade("toolPower", toolPrice, city ? 5 : 3) },
      { label: `Weapon Training — ${weaponPrice}`, action: () => this.buyUpgrade("weaponPower", weaponPrice, city ? 6 : 3) },
      { label: `Armor Training — ${armorPrice}`, action: () => this.buyUpgrade("armor", armorPrice, city ? 5 : 2) },
      { label: "Browse Equipment", action: () => { this.closeModal(); this.openCombatEquipmentShop("blacksmith", city); } },
      { label: "Sell Ores", action: () => this.sellCategory(["copper", "iron", "silver", "gold", "obsidian"], 1) },
      { label: "Close", action: () => this.closeModal() },
    ]);
  };

  proto.openHunterShop = function openHunterShopWithEquipment() {
    this.openModal("Hunter's Provisioner", `<p>Guild Rank ${this.state.guild.rank}. Monster materials receive a 20% premium, and veteran gear unlocks with rank.</p>`, [
      { label: "Hunter Equipment", action: () => { this.closeModal(); this.openCombatEquipmentShop("hunter", true); } },
      { label: "Sell Monster Materials", action: () => this.sellCategory(["slimeGel", "fang", "venom", "hide", "ash", "frostcore", "embercore", "voidshard"], 1.2) },
      { label: "Buy Potion — 80", action: () => { if (this.state.coins < 80) return this.toast("Not enough coins."); this.state.coins -= 80; this.addItem("potion", 1, false); this.closeModal(); this.toast("Potion purchased."); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
  };

  proto.drawMonsters = function drawMonstersOverhauled(ctx, monsters, bounds, caveMode) {
    for (const monster of monsters) {
      if (monster.x < bounds.startX - 1 || monster.x > bounds.endX + 1 || monster.y < bounds.startY - 1 || monster.y > bounds.endY + 1) continue;
      const def = caveMode ? CAVE_MONSTERS[monster.type] : MONSTER_TYPES[monster.type];
      if (!def) continue;
      const ai = this.ensureMonsterCombat(monster);
      const x = monster.x * TILE;
      const baseY = monster.y * TILE;
      const bounce = ai.behavior === "leap" && !ai.dead ? Math.abs(Math.sin(performance.now() / 170 + Number(String(monster.id).length))) * 5 : 0;
      const y = baseY - bounce;
      const deathRatio = ai.dead ? clamp(ai.deathTimer / .42, 0, 1) : 1;
      const hidden = !caveMode && regionAt(monster.x, monster.y).id === "darkforest" && distance(this.state.player, monster) > 3.4;
      ctx.save();
      ctx.globalAlpha = (hidden ? .28 : 1) * deathRatio;
      ctx.translate(x, y);
      ctx.scale(ai.dead ? 1 + (1 - deathRatio) * .55 : 1, ai.dead ? deathRatio : 1);
      ctx.fillStyle = "rgba(16,36,29,.25)";
      ctx.beginPath(); ctx.ellipse(0, 11 + bounce, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ai.hitFlash > 0 ? "#fff1c8" : def.color;
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff1c8";
      ctx.fillRect(-6, -4, 3, 3); ctx.fillRect(3, -4, 3, 3);
      if (ai.elementTime > 0) { ctx.strokeStyle = ai.element === "burn" ? "#ff8b3d" : "#b7a1ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
      if (ai.telegraph > 0 && !ai.dead) {
        const pulse = .55 + Math.sin(performance.now() / 65) * .2;
        ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = "#ff5f55"; ctx.lineWidth = 3;
        if (ai.attackType === "projectile") { ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo((ai.aimX || this.state.player.x) * TILE, (ai.aimY || this.state.player.y) * TILE); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(x, baseY, (ai.attackType === "slam" ? 1.7 : 1.1) * TILE, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
      }
      const showBar = monster.hp < monster.maxHp || distance(this.state.player, monster) < 4 || monster.maxHp >= 80;
      if (showBar && !ai.dead) {
        ctx.fillStyle = "#10241d"; ctx.fillRect(x - 18, baseY - 28, 36, 7);
        ctx.fillStyle = monster.maxHp >= 80 ? "#b65cff" : "#d95e52"; ctx.fillRect(x - 17, baseY - 27, 34 * clamp(monster.hp / monster.maxHp, 0, 1), 5);
        ctx.fillStyle = "#fff1c8"; ctx.font = "bold 9px Trebuchet MS"; ctx.textAlign = "center"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3;
        const label = `Lv ${monsterLevel(this, monster)} ${def.name}`; ctx.strokeText(label, x, baseY - 34); ctx.fillText(label, x, baseY - 34);
      }
    }
  };

  proto.drawPlayer = function drawPlayerWithCombat(ctx) {
    const combat = this.state.combat;
    ctx.save();
    if (combat.invulnerable > 0 && Math.floor(performance.now() / 70) % 2 === 0) ctx.globalAlpha = .38;
    original.drawPlayer.call(this, ctx);
    ctx.restore();
    if (combat.attackTimer <= 0) return;
    const player = this.state.player;
    const stats = this.getCombatStats();
    const angles = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
    const angle = angles[combat.attackDirection] ?? Math.PI / 2;
    const progress = 1 - combat.attackTimer / .2;
    const start = angle - 1.05 + progress * .55;
    const end = angle + .35 + progress * .55;
    ctx.save();
    ctx.strokeStyle = stats.element === "burn" ? "#ff8b3d" : stats.damage >= 15 ? "#c4a3ff" : "#fff1c8";
    ctx.lineWidth = 6;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(player.x * TILE, player.y * TILE, stats.range * TILE * .72, start, end);
    ctx.stroke();
    ctx.restore();
  };

  proto.drawCombatWorldEffects = function drawCombatWorldEffects(ctx) {
    for (const drop of this.state.combat.lootDrops) {
      if (!currentDropVisible(this, drop)) continue;
      const bob = Math.sin(performance.now() / 220 + drop.bob) * 4;
      const x = drop.x * TILE;
      const y = drop.y * TILE - 10 + bob;
      ctx.save(); ctx.shadowColor = drop.gear?.length ? "#c89cff" : "#efb94a"; ctx.shadowBlur = 14;
      ctx.fillStyle = drop.gear?.length ? "#8b65b8" : "#efb94a";
      ctx.beginPath(); ctx.arc(x, y, drop.gear?.length ? 9 : 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff1c8"; ctx.font = "bold 12px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(drop.gear?.length ? "★" : "◆", x, y + 4); ctx.restore();
    }
    for (const projectile of this.state.combat.projectiles) {
      if (!currentDropVisible(this, projectile)) continue;
      ctx.save(); ctx.shadowColor = projectile.color; ctx.shadowBlur = 12; ctx.fillStyle = projectile.color;
      ctx.beginPath(); ctx.arc(projectile.x * TILE, projectile.y * TILE, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (const number of this.state.combat.damageNumbers) {
      if (!currentDropVisible(this, number)) continue;
      ctx.save(); ctx.globalAlpha = clamp(number.life / .35, 0, 1); ctx.fillStyle = number.color; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 4; ctx.font = `bold ${number.critical ? 20 : 15}px Trebuchet MS`; ctx.textAlign = "center";
      const label = number.critical ? `${number.amount}!` : String(number.amount); ctx.strokeText(label, number.x * TILE, number.y * TILE); ctx.fillText(label, number.x * TILE, number.y * TILE); ctx.restore();
    }
  };

  proto.drawWorld = function drawWorldWithCombat(ctx) {
    original.drawWorld.call(this, ctx);
    this.drawCombatWorldEffects(ctx);
  };

  proto.drawCave = function drawCaveWithCombat(ctx) {
    original.drawCave.call(this, ctx);
    this.drawCombatWorldEffects(ctx);
  };

  proto.render = function renderWithCombatHud() {
    original.render.call(this);
    if (!this.running || !this.state) return;
    this.drawCombatHud(this.ctx, this.screen.width, this.screen.height);
  };

  proto.drawCombatHud = function drawCombatHud(ctx, width, height) {
    const combat = this.state.combat;
    ctx.save();
    ctx.setTransform(this.screen.dpr, 0, 0, this.screen.dpr, 0, 0);
    if (combat.screenFlash > 0) { ctx.fillStyle = `rgba(210,45,45,${combat.screenFlash * .45})`; ctx.fillRect(0, 0, width, height); }
    const boss = this.currentMonsters().find((monster) => monster.hp > 0 && (monster.maxHp >= 80 || monster.type === "depthWarden"));
    if (boss) {
      const def = currentMonsterDef(this, boss);
      const barW = Math.min(520, width * .62);
      const x = (width - barW) / 2;
      const y = 154;
      ctx.fillStyle = "rgba(16,36,29,.94)"; ctx.fillRect(x - 4, y - 24, barW + 8, 46);
      ctx.fillStyle = "#fff1c8"; ctx.font = "bold 13px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(def.name, width / 2, y - 8);
      ctx.fillStyle = "#362d42"; ctx.fillRect(x, y, barW, 12);
      ctx.fillStyle = "#a65de2"; ctx.fillRect(x, y, barW * clamp(boss.hp / boss.maxHp, 0, 1), 12);
    }
    const activeStatuses = STATUS_TYPES.filter((status) => combat.statuses[status].time > 0);
    if (activeStatuses.length) {
      const icons = { poison: "☠ POISON", burn: "🔥 BURN", slow: "❄ SLOW" };
      activeStatuses.forEach((status, index) => {
        const x = 14;
        const y = height - 150 - index * 31;
        ctx.fillStyle = "rgba(16,36,29,.92)"; ctx.fillRect(x, y, 118, 25);
        ctx.fillStyle = status === "burn" ? "#ff9b42" : status === "slow" ? "#bfe9ff" : "#a8d86f";
        ctx.font = "bold 11px Trebuchet MS"; ctx.textAlign = "left"; ctx.fillText(`${icons[status]} ${combat.statuses[status].time.toFixed(1)}s`, x + 7, y + 17);
      });
    }
    ctx.restore();
  };
}

function criticalPulse(hits) {
  return Math.min(95, 35 + hits * 12);
}
