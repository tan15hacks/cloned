import { ITEMS, CROPS, TOOLS, clamp, regionAt, $, } from "./game-shared.js";
import {
  SKILL_IDS, SKILL_DEFS, QUALITY_TIERS, ADVENTURE_PERKS,
  createProgressionState, levelFromXp, xpForLevel, qualityRoll,
} from "./progression-data.js";

const QUALITY_ITEMS = new Set(["turnip", "berry", "moonbean", "fish", "rareFish", "apple"]);
const MINING_RESOURCE_PATTERN = /(rock|ore|node|crystal|core|obsidian|volcanicglass|mistpearl)/i;
const qualityName = (id) => QUALITY_TIERS.find((tier) => tier.id === id)?.name || "Normal";
const qualityIcon = (id) => QUALITY_TIERS.find((tier) => tier.id === id)?.icon || "●";

export function installProgressionCore(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    harvestCrop: proto.harvestCrop,
    collectResource: proto.collectResource,
    gatherForage: proto.gatherForage,
    getCombatStats: proto.getCombatStats,
  };

  CROPS.turnip.days = 3;
  CROPS.berry.days = 5;
  CROPS.moonbean.days = 7;
  ITEMS.turnip.value = 42;
  ITEMS.berry.value = 88;
  ITEMS.moonbean.value = 165;
  ITEMS.fish.value = 52;
  ITEMS.rareFish.value = 175;

  proto.defaultState = function defaultStateProgression() {
    const state = original.defaultState.call(this);
    state.progression = createProgressionState();
    state.player.progressionBaseMaxEnergy = state.player.maxEnergy || 100;
    return state;
  };

  proto.migrateState = function migrateStateProgression(data) {
    const state = original.migrateState.call(this, data);
    state.progression = createProgressionState(data?.progression || state.progression || {});
    state.player.progressionBaseMaxEnergy = Number(data?.player?.progressionBaseMaxEnergy) || Number(state.player.progressionBaseMaxEnergy) || 100;
    return state;
  };

  proto.enterGame = function enterGameProgression() {
    original.enterGame.call(this);
    this.state.progression = createProgressionState(this.state.progression);
    this.refreshProgressionLevels(false);
    this.applyProgressionPerks();
    this.ensureDailyStock?.();
  };

  proto.refreshProgressionLevels = function refreshProgressionLevels(announce = true) {
    const progression = this.state.progression;
    const oldAdventure = progression.adventureLevel;
    const oldSkills = { ...progression.skillLevels };
    progression.adventureLevel = levelFromXp(progression.adventureXp, 20);
    for (const id of SKILL_IDS) progression.skillLevels[id] = levelFromXp(progression.skillXp[id], 10);
    if (announce && progression.adventureLevel > oldAdventure) {
      this.sound("success");
      this.toast(`Adventure Level ${progression.adventureLevel}! A new passive perk may be active.`);
      this.state.journal.unshift(`Reached Adventure Level ${progression.adventureLevel}.`);
    }
    if (announce) for (const id of SKILL_IDS) if (progression.skillLevels[id] > oldSkills[id]) {
      this.toast(`${SKILL_DEFS[id].name} reached Level ${progression.skillLevels[id]}!`);
      this.state.journal.unshift(`${SKILL_DEFS[id].name} advanced to Level ${progression.skillLevels[id]}.`);
    }
    this.state.journal = this.state.journal.slice(0, 30);
    this.applyProgressionPerks();
  };

  proto.applyProgressionPerks = function applyProgressionPerks() {
    const level = this.state.progression.adventureLevel;
    const baseEnergy = this.state.player.progressionBaseMaxEnergy || 100;
    const previous = this.state.player.maxEnergy || baseEnergy;
    this.state.player.maxEnergy = baseEnergy + (level >= 2 ? 10 : 0);
    if (this.state.player.maxEnergy > previous) this.state.player.energy += this.state.player.maxEnergy - previous;
    this.state.player.energy = clamp(this.state.player.energy, 0, this.state.player.maxEnergy);
    this.state.upgrades.backpack = Math.max(this.state.upgrades.backpack || 40, level >= 8 ? 48 : 40);
    this.applyEquipmentVitals?.();
  };

  proto.awardSkillXp = function awardSkillXp(id, amount, adventureRatio = .35) {
    if (!SKILL_IDS.includes(id) || amount <= 0) return;
    const bonus = this.state.progression.adventureLevel >= 20 ? 1.08 : 1;
    const gained = Math.max(1, Math.round(amount * bonus));
    this.state.progression.skillXp[id] += gained;
    this.state.progression.adventureXp += Math.max(1, Math.round(gained * adventureRatio));
    this.refreshProgressionLevels(true);
  };

  proto.awardAdventureXp = function awardAdventureXp(amount) {
    if (amount <= 0) return;
    this.state.progression.adventureXp += Math.max(1, Math.round(amount));
    this.refreshProgressionLevels(true);
  };

  proto.getCombatStats = function getCombatStatsProgression() {
    const stats = original.getCombatStats.call(this);
    const progression = this.state.progression;
    const combatLevel = progression?.skillLevels?.combat || 1;
    const adventureLevel = progression?.adventureLevel || 1;
    stats.damage += Math.floor((combatLevel - 1) / 2);
    stats.crit = clamp(stats.crit + (combatLevel - 1) * .004 + (adventureLevel >= 10 ? .03 : 0), 0, .75);
    stats.moveSpeed += adventureLevel >= 4 ? .05 : 0;
    stats.maxHealth += adventureLevel >= 15 ? 15 : 0;
    stats.statusResist = clamp(stats.statusResist + (adventureLevel >= 15 ? .05 : 0), 0, .8);
    for (const slot of ["weapon", "armor", "helmet"]) {
      const equipmentId = this.state.combat?.equipment?.[slot];
      const enhancement = Number(progression?.enhancements?.[equipmentId]) || 0;
      if (slot === "weapon") stats.damage += enhancement * 1.5;
      else stats.armor += enhancement * .75;
    }
    stats.damage = Math.round(stats.damage * 10) / 10;
    stats.armor = Math.round(stats.armor * 10) / 10;
    return stats;
  };

  proto.recordQuality = function recordQuality(itemId, quality, amount = 1) {
    if (!QUALITY_ITEMS.has(itemId) || amount <= 0) return;
    const item = this.state.progression.qualityInventory[itemId] ||= { normal: 0, silver: 0, gold: 0, iridium: 0 };
    item[quality] = (item[quality] || 0) + amount;
  };

  proto.harvestCrop = function harvestCropProgression(target, soil) {
    const cropType = soil?.crop?.type;
    const harmony = cropType ? this.calculateCropResonance(target.x, target.y, cropType) : 0;
    const produceId = cropType ? CROPS[cropType].produce : null;
    const before = produceId ? this.state.inventory[produceId] || 0 : 0;
    original.harvestCrop.call(this, target, soil);
    const gained = produceId ? Math.max(0, (this.state.inventory[produceId] || 0) - before) : 0;
    const qualityCounts = { normal: 0, silver: 0, gold: 0, iridium: 0 };
    for (let index = 0; index < gained; index += 1) {
      const quality = qualityRoll(this.state.progression.skillLevels.farming, harmony, this.state.beacon.level, this.state.weather);
      qualityCounts[quality] += 1;
      this.recordQuality(produceId, quality, 1);
    }
    this.awardSkillXp("farming", Math.max(4, gained * 8));
    if (qualityCounts.gold + qualityCounts.iridium > 0) {
      const summary = `${qualityCounts.gold ? `${qualityCounts.gold} gold ` : ""}${qualityCounts.iridium ? `${qualityCounts.iridium} iridium` : ""}`.trim();
      this.toast(`Quality harvest: ${summary}.`);
    }
  };

  proto.collectResource = function collectResourceProgression(resource) {
    const before = { ...this.state.inventory };
    original.collectResource.call(this, resource);
    const mining = MINING_RESOURCE_PATTERN.test(resource.type);
    const skill = mining ? "mining" : "foraging";
    const level = this.state.progression.skillLevels[skill];
    const gainedIds = Object.keys(this.state.inventory).filter((id) => (this.state.inventory[id] || 0) > (before[id] || 0));
    if (gainedIds.length && Math.random() < Math.min(.35, (level - 1) * .04)) {
      const id = gainedIds[0];
      this.state.inventory[id] += 1;
      if (this.state.questStats[id] !== undefined) this.state.questStats[id] += 1;
      this.toast(`${SKILL_DEFS[skill].name} bonus: +1 ${ITEMS[id]?.name || id}.`);
    }
    this.awardSkillXp(skill, mining ? 7 + (resource.maxHp || 1) * 2 : 6);
  };

  proto.gatherForage = function gatherForageProgression(resource) {
    const id = resource.type;
    original.gatherForage.call(this, resource);
    const level = this.state.progression.skillLevels.foraging;
    if (Math.random() < Math.min(.42, (level - 1) * .05)) {
      this.state.inventory[id] = (this.state.inventory[id] || 0) + 1;
      this.toast(`Foraging bonus: +1 ${ITEMS[id]?.name || id}.`);
    }
    this.awardSkillXp("foraging", 8);
  };

  proto.openFishingGame = function openBalancedFishingGame() {
    const fishingLevel = this.state.progression.skillLevels.fishing;
    const zoneStart = 56 - Math.min(7, fishingLevel - 1);
    const zoneWidth = 20 + Math.min(10, fishingLevel - 1);
    this.modalOpen = true;
    this.paused = true;
    $("modalTitle").textContent = "Fishing — Reel in the Gold Zone";
    $("modalBody").innerHTML = `<p>Press <strong>REEL</strong> while the fish overlaps the gold zone. Fishing Level ${fishingLevel} widens the target.</p><div id="fishTrack" style="position:relative;height:58px;background:#8ec6d8;border:3px solid #10241d;border-radius:12px;overflow:hidden;margin:18px 0"><div style="position:absolute;left:${zoneStart}%;width:${zoneWidth}%;top:0;bottom:0;background:rgba(239,185,74,.75);border-left:3px solid #10241d;border-right:3px solid #10241d"></div><div id="fishMarker" style="position:absolute;left:0;top:8px;font-size:34px">🐟</div></div><p id="fishStatus"><strong>Attempts:</strong> 3</p>`;
    $("modalActions").innerHTML = `<button id="reelButton">REEL</button><button id="cancelFishing">Cancel</button>`;
    $("modal").classList.remove("hidden");
    let pos = 0;
    let dir = 1;
    let attempts = 3;
    const marker = $("fishMarker");
    const speed = Math.max(.95, 1.65 - (fishingLevel - 1) * .06);
    this.fishingTimer = setInterval(() => {
      pos += dir * speed;
      if (pos >= 91) { pos = 91; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      marker.style.left = `${pos}%`;
    }, 16);
    $("reelButton").onclick = () => {
      if (pos >= zoneStart - 4 && pos <= zoneStart + zoneWidth) {
        clearInterval(this.fishingTimer);
        this.fishingTimer = null;
        const region = regionAt(this.state.player.x, this.state.player.y).id;
        const rareChance = clamp((this.state.weather === "Sparkfall" || region === "moonlake" ? .25 : .1) + (fishingLevel - 1) * .018, .1, .48);
        const item = Math.random() < rareChance ? "rareFish" : "fish";
        const accuracy = 1 - Math.abs(pos - (zoneStart + zoneWidth / 2)) / (zoneWidth / 2 + 5);
        const quality = qualityRoll(fishingLevel, Math.max(0, accuracy * 3), 0, this.state.weather);
        this.addItem(item, 1, false);
        this.recordQuality(item, quality, 1);
        this.state.questStats.fish += 1;
        this.state.stats.fishCaught += 1;
        this.awardSkillXp("fishing", item === "rareFish" ? 18 : 11);
        this.checkQuests();
        this.closeModal();
        this.toast(`Caught ${qualityIcon(quality)} ${qualityName(quality)} ${ITEMS[item].name}!`);
      } else {
        attempts -= 1;
        this.vibrate(45);
        $("fishStatus").innerHTML = `<strong>Attempts:</strong> ${attempts} — The fish slipped away.`;
        if (attempts <= 0) {
          clearInterval(this.fishingTimer);
          this.fishingTimer = null;
          this.closeModal();
          this.toast("The fish escaped.");
        }
      }
    };
    $("cancelFishing").onclick = () => {
      clearInterval(this.fishingTimer);
      this.fishingTimer = null;
      this.closeModal();
    };
  };

  proto.showProgression = function showProgression() {
    const progression = this.state.progression;
    const nextAdventure = progression.adventureLevel < 20 ? xpForLevel(progression.adventureLevel) : progression.adventureXp;
    const skills = SKILL_IDS.map((id) => {
      const level = progression.skillLevels[id];
      const currentThreshold = level <= 1 ? 0 : xpForLevel(level - 1);
      const nextThreshold = level < 10 ? xpForLevel(level) : progression.skillXp[id];
      const value = progression.skillXp[id] - currentThreshold;
      const goal = Math.max(1, nextThreshold - currentThreshold);
      return `<article class="skill-card"><span>${SKILL_DEFS[id].icon}</span><div><strong>${SKILL_DEFS[id].name} Lv ${level}</strong><p>${SKILL_DEFS[id].description}</p><div class="progress"><i style="width:${clamp(value / goal * 100, 0, 100)}%"></i></div><small>${progression.skillXp[id]} XP</small></div></article>`;
    }).join("");
    const qualities = Object.entries(progression.qualityInventory).map(([id, bins]) => `<p>${ITEMS[id]?.icon || "•"} ${ITEMS[id]?.name || id}: ${QUALITY_TIERS.map((tier) => `${tier.icon}${bins[tier.id] || 0}`).join(" ")}</p>`).join("") || "<p>No quality produce or fish stored.</p>";
    const perks = ADVENTURE_PERKS.map((perk) => `<li class="${progression.adventureLevel >= perk.level ? "unlocked" : "locked"}">Lv ${perk.level}: <strong>${perk.name}</strong> — ${perk.text}</li>`).join("");
    this.openModal("Skills & Adventure Progression", `<section class="adventure-level"><h3>Adventure Level ${progression.adventureLevel}</h3><p>${progression.adventureXp}/${nextAdventure} XP · Cave tiers: ${progression.unlockedCaveTiers.join(", ")}</p></section><div class="skill-list">${skills}</div><h3>Quality Storage</h3>${qualities}<h3>Adventure Perks</h3><ul class="perk-list">${perks}</ul><p>Milestone bosses defeated: ${progression.bossRewards.length}/5</p>`, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
  };
}
