import { TILE, distance, regionAt } from "./game-shared.js";
import { EQUIPMENT_DEFS } from "./game-combat.js";
import { CAVE_MILESTONES, caveBand } from "./progression-data.js";

const RANK_ORDER = ["F", "E", "D", "C", "B", "A", "S"];
const rankAtLeast = (current, required) => RANK_ORDER.indexOf(current) >= RANK_ORDER.indexOf(required);

function effectiveGearFloor(game, monster) {
  if (game.state.mode === "cave") return game.state.cave.currentFloor;
  const reward = regionAt(monster.x, monster.y).reward;
  return ({ low: 5, medium: 20, high: 30, elite: 40 })[reward] || 1;
}

function floorGearAllowed(id, floor, adventureLevel, guildRank) {
  if (id === "voidbrand") return floor >= 50 && adventureLevel >= 15 && rankAtLeast(guildRank, "A");
  if (["depthRing", "emberEdge", "emberCharm"].includes(id)) return floor >= 40 && adventureLevel >= 10;
  if (["frostPlate", "frostTreads"].includes(id)) return floor >= 30 && adventureLevel >= 8;
  if (["luckyRing", "hunterHelm"].includes(id)) return floor >= 20 && adventureLevel >= 6;
  return true;
}

function findBossTile(cave) {
  const candidates = [];
  for (let y = 2; y < cave.tiles.length - 2; y += 1) {
    for (let x = 2; x < cave.tiles[y].length - 2; x += 1) {
      if (cave.tiles[y][x] !== "floor") continue;
      const point = { x: x + .5, y: y + .5 };
      if (distance(point, cave.entry) < 9 || distance(point, cave.exit) < 2.5) continue;
      candidates.push(point);
    }
  }
  return candidates.sort((a, b) => distance(a, cave.exit) - distance(b, cave.exit))[0] || { x: 35.5, y: 16.5 };
}

export function installProgressionCaves(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    loadCaveFloor: proto.loadCaveFloor,
    interactCave: proto.interactCave,
    finalizeMonsterDefeat: proto.finalizeMonsterDefeat,
    drawMonsters: proto.drawMonsters,
    executeMonsterAttack: proto.executeMonsterAttack,
  };

  proto.loadCaveFloor = function loadCaveFloorProgression(floor) {
    original.loadCaveFloor.call(this, floor);
    const milestone = CAVE_MILESTONES[floor];
    if (!milestone || this.state.progression.bossRewards.includes(floor) || !this.currentCave) return;
    let boss = this.currentCave.monsters.find((monster) => monster.type === milestone.type && (floor === 50 || monster.milestoneBoss));
    if (!boss) {
      const point = findBossTile(this.currentCave);
      boss = { id: `milestone:${floor}`, type: milestone.type, x: point.x, y: point.y, cooldown: 0 };
      this.currentCave.monsters.push(boss);
    }
    boss.id = `milestone:${floor}`;
    boss.hp = milestone.hp;
    boss.maxHp = milestone.hp;
    boss.homeX = boss.x;
    boss.homeY = boss.y;
    boss.milestoneBoss = floor;
    boss.bossName = milestone.name;
    boss.bossDamage = milestone.damage;
  };

  proto.interactCave = function interactCaveProgression() {
    const floor = this.state.cave.currentFloor;
    const boss = this.currentCave?.monsters?.find((monster) => monster.milestoneBoss === floor && monster.hp > 0 && !monster.combat?.dead);
    if (boss && distance(this.state.player, this.currentCave.exit) < 1.8) return this.toast(`${boss.bossName} seals the descent gate.`);
    return original.interactCave.call(this);
  };

  proto.executeMonsterAttack = function executeMonsterAttackProgression(monster, def, attackType) {
    const adjusted = monster?.bossDamage ? { ...def, damage: monster.bossDamage } : def;
    return original.executeMonsterAttack.call(this, monster, adjusted, attackType);
  };

  proto.finalizeMonsterDefeat = function finalizeMonsterDefeatProgression(monster, def) {
    const milestoneFloor = Number(monster.milestoneBoss) || 0;
    const beforeDrops = this.state.combat.lootDrops.length;
    original.finalizeMonsterDefeat.call(this, monster, def);
    const drop = this.state.combat.lootDrops.slice(beforeDrops).find((entry) => String(entry.id).includes(String(monster.id))) || this.state.combat.lootDrops.at(-1);
    const skillXp = milestoneFloor ? CAVE_MILESTONES[milestoneFloor].xp : Math.max(5, Math.round(def.xp * .7));
    this.awardSkillXp("combat", skillXp, .28);
    this.state.progression.pityKills += 1;

    if (drop && !milestoneFloor && Array.isArray(drop.gear) && drop.gear.length) {
      const floor = effectiveGearFloor(this, monster);
      const keepChance = Math.min(.52, .22 + this.state.progression.skillLevels.combat * .02 + (this.state.progression.adventureLevel >= 10 ? .08 : 0));
      drop.gear = drop.gear.filter((id) => floorGearAllowed(id, floor, this.state.progression.adventureLevel, this.state.guild.rank) && Math.random() < keepChance);
      if (drop.gear.length) this.state.progression.pityKills = 0;
    }

    if (drop && !milestoneFloor && (!drop.gear || !drop.gear.length)) {
      const threshold = Math.max(18, 36 - this.state.progression.skillLevels.combat * 2 - (this.state.progression.adventureLevel >= 10 ? 4 : 0));
      if (this.state.progression.pityKills >= threshold) {
        const floor = effectiveGearFloor(this, monster);
        const candidates = Object.keys(EQUIPMENT_DEFS).filter((id) => !this.state.combat.owned.includes(id) && floorGearAllowed(id, floor, this.state.progression.adventureLevel, this.state.guild.rank));
        if (candidates.length) {
          drop.gear = [candidates[0]];
          this.state.progression.pityKills = 0;
        }
      }
    }

    if (milestoneFloor && drop) {
      const milestone = CAVE_MILESTONES[milestoneFloor];
      drop.coins = milestone.coins;
      drop.xp = milestone.xp;
      const guaranteed = milestone.gear.find((id) => !this.state.combat.owned.includes(id)) || milestone.gear[0];
      drop.gear = [...new Set([...(drop.gear || []), guaranteed])];
      if (!this.state.progression.bossRewards.includes(milestoneFloor)) this.state.progression.bossRewards.push(milestoneFloor);
      const band = caveBand(milestoneFloor);
      if (!this.state.progression.unlockedCaveTiers.includes(band)) this.state.progression.unlockedCaveTiers.push(band);
      this.state.journal.unshift(`Defeated ${milestone.name} on Floor ${milestoneFloor}; unlocked ${milestone.unlock}.`);
      this.state.journal = this.state.journal.slice(0, 30);
      this.toast(`${milestone.name} defeated! ${milestone.unlock} unlocked and guaranteed gear dropped.`);
    }
  };

  proto.drawMonsters = function drawMonstersProgression(ctx, monsters, bounds, caveMode) {
    original.drawMonsters.call(this, ctx, monsters, bounds, caveMode);
    for (const monster of monsters) {
      if (!monster.milestoneBoss || monster.hp <= 0 || monster.x < bounds.startX - 1 || monster.x > bounds.endX + 1 || monster.y < bounds.startY - 1 || monster.y > bounds.endY + 1) continue;
      const x = monster.x * TILE;
      const y = monster.y * TILE - 46;
      ctx.save();
      ctx.font = "bold 12px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#10241d";
      ctx.lineWidth = 4;
      ctx.fillStyle = "#ffe29a";
      ctx.strokeText(monster.bossName || "Milestone Guardian", x, y);
      ctx.fillText(monster.bossName || "Milestone Guardian", x, y);
      ctx.restore();
    }
  };
}
