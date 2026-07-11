import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock, $, clamp, keyOf, distance, randomChoice, safeParse, formatTime, randomInt, GUILD_RANKS, FORAGE_TYPES, AXE_TYPES, PICK_TYPES, forecastWeather } from "./game-shared.js";

export const game_services_2 = {
buyUpgrade(key, price, max) {
    if (this.state.upgrades[key] >= max) return this.toast("This smith cannot improve it further.");
    if (this.state.coins < price) return this.toast("Not enough coins.");
    this.state.coins -= price; this.state.upgrades[key] += 1; this.closeModal(); this.toast(`${key.replace(/([A-Z])/g, " $1")} upgraded to ${this.state.upgrades[key]}.`);
  },

openApothecary() {
    this.openShopModal("Blue Vial Apothecary", [
      { id: "potion", amount: 1, price: 85 }, { id: "tea", amount: 1, price: 65 }, { id: "caveTonic", amount: 1, price: 190 },
    ], [{ label: "Sell Herbs & Monster Parts", action: () => this.sellCategory(["herb", "mushroom", "swampBloom", "snowHerb", "slimeGel", "venom", "ash"], 1.1) }]);
  },

openArcaneShop() {
    this.openShopModal("Moon & Rune", [
      { id: "moonSeed", amount: 5, price: 180 }, { id: "crystal", amount: 1, price: 260 }, { id: "mistPearl", amount: 1, price: 170 },
    ], [{ label: "Sell Arcane Materials", action: () => this.sellCategory(["crystal", "mistPearl", "frostcore", "embercore", "voidshard", "relic"], 1.18) }]);
  },

openBank() {
    this.openModal("Silvercrest Exchange", `<p>Your current balance is carried directly: <strong>${this.state.coins} coins</strong>.</p><p>The Exchange provides save export and import services.</p>`, [
      { label: "Save Now", action: () => { this.saveGame(false); this.closeModal(); } },
      { label: "Export Save", action: () => this.exportSave() },
      { label: "Close", action: () => this.closeModal() },
    ]);
  },

openHunterShop() {
    this.openModal("Hunter's Provisioner", `<p>Guild Rank ${this.state.guild.rank}. Monster materials receive a 20% premium here.</p>`, [
      { label: "Sell Monster Materials", action: () => this.sellCategory(["slimeGel", "fang", "venom", "hide", "ash", "frostcore", "embercore", "voidshard"], 1.2) },
      { label: "Buy Potion — 80", action: () => { if (this.state.coins < 80) return this.toast("Not enough coins."); this.state.coins -= 80; this.addItem("potion", 1, false); this.closeModal(); this.toast("Potion purchased."); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
  },

openObservatory() {
    this.openModal("Starwatch Observatory", `<p>Tomorrow's forecast: <strong>${WEATHER[this.state.tomorrowWeather].icon} ${this.state.tomorrowWeather}</strong>.</p><p>Frostpeak always has local snow effects, while Cinderwake produces ash and embers regardless of valley weather.</p>`, [{ label: "Close", action: () => this.closeModal() }]);
  },

openCityHall() {
    this.openModal("Silvercrest Hall", `<p>Silvercrest has ${this.state.npcs.filter((npc) => npc.region === "city").length} named residents, an Adventurers' Guild, market, smithy, apothecary, arcane shop, bank, inn, and hunter provisioner.</p><p>Regions discovered: ${this.state.visitedRegions.length}/${REGIONS.length}.</p>`, [{ label: "View World Map", action: () => this.showWorldMap() }, { label: "Close", action: () => this.closeModal() }]);
  },

openGuild() {
    const bounties = this.state.guild.bounties.map((bounty) => {
      const progress = Math.min(bounty.target, this.state.guild.dailyKills[bounty.region] || 0);
      const region = REGIONS.find((entry) => entry.id === bounty.region);
      return `<article class="quest"><h3>${bounty.title}</h3><p>Defeat ${bounty.target} monsters in ${region.name}.</p><div class="progress"><i style="width:${progress / bounty.target * 100}%"></i></div><p>${progress}/${bounty.target} · ${bounty.reward} coins · ${bounty.xp} XP</p>${progress >= bounty.target && !bounty.claimed ? `<button data-bounty="${bounty.id}">Claim</button>` : bounty.claimed ? "<strong>Completed</strong>" : ""}</article>`;
    }).join("");
    const next = GUILD_RANKS.find((entry) => entry.xp > this.state.guild.xp);
    this.openModal("Silvercrest Adventurers' Guild", `<p><strong>Rank ${this.state.guild.rank}</strong> · ${this.state.guild.xp} XP${next ? ` · Next rank at ${next.xp}` : " · Maximum rank"}</p>${bounties}<p>Deepest cave floor: ${this.state.cave.maxFloor}/50</p>`, [
      { label: "Open Floor Gate", action: () => { this.closeModal(); this.enterCave(1); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
    document.querySelectorAll("[data-bounty]").forEach((button) => button.onclick = () => this.claimBounty(button.dataset.bounty));
  },

claimBounty(id) {
    const bounty = this.state.guild.bounties.find((entry) => entry.id === id);
    if (!bounty || bounty.claimed || (this.state.guild.dailyKills[bounty.region] || 0) < bounty.target) return;
    bounty.claimed = true; this.state.coins += bounty.reward; this.state.guild.xp += bounty.xp; this.state.guild.completed += 1; this.updateGuildRank(); this.closeModal(); this.toast(`Bounty complete: +${bounty.reward} coins and +${bounty.xp} XP.`);
  },

openQuestBoard() {
    const html = this.state.quests.map((quest) => {
      const progress = Math.min(quest.target, this.state.questStats[quest.type] || 0);
      return `<article class="quest"><h3>${quest.title}</h3><p>${quest.text}</p><div class="progress"><i style="width:${progress / quest.target * 100}%"></i></div><p>${progress}/${quest.target} · Reward ${quest.reward}</p>${progress >= quest.target && !quest.claimed ? `<button data-claim="${quest.id}">Claim Reward</button>` : quest.claimed ? "<strong>Completed</strong>" : ""}</article>`;
    }).join("");
    this.openModal("Continental Requests", html, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-claim]").forEach((button) => button.onclick = () => this.claimQuest(button.dataset.claim));
  },

claimQuest(id) {
    const quest = this.state.quests.find((entry) => entry.id === id);
    if (!quest || quest.claimed || (this.state.questStats[quest.type] || 0) < quest.target) return;
    quest.claimed = true; this.state.coins += quest.reward; this.state.stats.totalEarned += quest.reward; this.state.completedQuests.push(quest.id); this.closeModal(); this.toast(`Request complete: +${quest.reward} coins.`);
  },

checkQuests() {
    for (const quest of this.state.quests) if (!quest.claimed && (this.state.questStats[quest.type] || 0) >= quest.target) this.toast(`Request ready: ${quest.title}.`);
  },

openBeacon() {
    const beacon = this.state.beacon;
    const tiers = [
      { level: 1, wood: 40, stone: 30, produce: 8, reward: "Market prices +10% and Mote awakens." },
      { level: 2, wood: 90, stone: 75, produce: 20, reward: "Tool energy costs -15% and Waystone travel unlocks." },
      { level: 3, wood: 160, stone: 140, produce: 45, reward: "Every crop harvest gains +1 yield." },
    ];
    const html = tiers.map((tier) => `<article class="restore-tier"><h3>${tier.level <= beacon.level ? "✅" : "🔆"} Tier ${tier.level}</h3><p>${tier.reward}</p><p>Wood ${Math.min(beacon.wood, tier.wood)}/${tier.wood} · Stone ${Math.min(beacon.stone, tier.stone)}/${tier.stone} · Produce ${Math.min(beacon.produce, tier.produce)}/${tier.produce}</p></article>`).join("");
    this.openModal("Hearthlight Beacon", html, [
      { label: "Donate 10 Wood", action: () => this.donateBeacon("wood", 10) },
      { label: "Donate 10 Stone", action: () => this.donateBeacon("stone", 10) },
      { label: "Donate 5 Produce", action: () => this.donateProduce(5) },
      { label: "Close", action: () => this.closeModal() },
    ]);
  },

donateBeacon(type, amount) {
    const actual = Math.min(amount, this.state.inventory[type] || 0);
    if (actual <= 0) return this.toast(`You have no ${type}.`);
    this.state.inventory[type] -= actual; this.state.beacon[type] += actual; this.evaluateBeacon(); this.closeModal(); this.openBeacon();
  }
};
