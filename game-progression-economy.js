import { ITEMS, $ } from "./game-shared.js";
import { EQUIPMENT_DEFS } from "./game-combat.js";
import {
  QUALITY_TIERS, UPGRADE_REQUIREMENTS, SHOP_STOCK,
  qualityMultiplier, enhancementCost,
} from "./progression-data.js";

function requirementsText(requirement) {
  if (!requirement) return "Maximum tier reached";
  const items = Object.entries(requirement.items || {}).map(([id, amount]) => `${ITEMS[id]?.icon || "•"} ${amount} ${ITEMS[id]?.name || id}`);
  return [`◈ ${requirement.coins} coins`, ...items].join(" · ");
}

export function installProgressionEconomy(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    nextDay: proto.nextDay,
    claimQuest: proto.claimQuest,
    claimBounty: proto.claimBounty,
    toggleGameMenu: proto.toggleGameMenu,
  };

  proto.ensureDailyStock = function ensureDailyStock() {
    const progression = this.state.progression;
    if (progression.stockDay === this.state.day && Object.keys(progression.dailyStock).length) return;
    progression.stockDay = this.state.day;
    progression.dailyStock = {};
    for (const [shop, entries] of Object.entries(SHOP_STOCK)) progression.dailyStock[shop] = Object.fromEntries(entries.map((entry) => [entry.id, entry.daily]));
  };

  proto.openBalancedShop = function openBalancedShop(kind) {
    this.ensureDailyStock();
    const farmingLevel = this.state.progression.skillLevels.farming;
    const entries = SHOP_STOCK[kind];
    const remaining = this.state.progression.dailyStock[kind];
    const html = entries.map((entry) => {
      const count = remaining[entry.id] || 0;
      const unlocked = farmingLevel >= entry.farming;
      return `<article class="shop-item"><div><h3>${ITEMS[entry.id].icon} ${ITEMS[entry.id].name} ×${entry.amount}</h3><p>${entry.price} coins · Daily stock ${count} · Farming Lv ${entry.farming}</p></div><button data-balanced-buy="${kind}:${entry.id}" ${!unlocked || count <= 0 ? "disabled" : ""}>${!unlocked ? `Lv ${entry.farming}` : count <= 0 ? "Sold Out" : "Buy"}</button></article>`;
    }).join("");
    const extra = kind === "market" ? `<button id="sellQualityProduce">Sell Produce & Fish</button>${this.state.progression.lastSale ? `<button id="buybackSale">Buy Back Last Sale</button>` : ""}` : "";
    this.openModal(kind === "seedshop" ? "Mira's Daily Seed Stock" : "Silvercrest Grand Market", `<p>Farming Level <strong>${farmingLevel}</strong> · Coins <strong>${this.state.coins}</strong></p><div class="shop-list">${html}</div><div class="menu-grid">${extra}</div>`, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-balanced-buy]").forEach((button) => button.onclick = () => {
      const [shop, id] = button.dataset.balancedBuy.split(":");
      const entry = SHOP_STOCK[shop].find((item) => item.id === id);
      if (!entry || this.state.progression.dailyStock[shop][id] <= 0) return;
      if (this.state.coins < entry.price) return this.toast("Not enough coins.");
      this.state.coins -= entry.price;
      this.state.progression.dailyStock[shop][id] -= 1;
      this.addItem(entry.id, entry.amount, false);
      this.closeModal();
      this.toast(`Bought ${ITEMS[entry.id].name} ×${entry.amount}.`);
    });
    const sellButton = $("sellQualityProduce");
    if (sellButton) sellButton.onclick = () => this.sellCategory(["turnip", "berry", "moonbean", "fish", "rareFish", "apple"], this.state.beacon.level >= 1 ? 1.1 : 1);
    const buybackButton = $("buybackSale");
    if (buybackButton) buybackButton.onclick = () => this.buybackLastSale();
  };

  proto.openSeedShop = function openSeedShopProgression() { this.openBalancedShop("seedshop"); };
  proto.openMarket = function openMarketProgression() { this.openBalancedShop("market"); };

  proto.sellCategory = function sellCategoryProgression(ids, multiplier = 1) {
    let total = 0;
    const soldItems = {};
    const soldQuality = {};
    const saleBonus = this.state.progression.adventureLevel >= 6 ? 1.05 : 1;
    for (const id of ids) {
      const count = this.state.inventory[id] || 0;
      if (count <= 0) continue;
      soldItems[id] = count;
      const quality = this.state.progression.qualityInventory[id] || {};
      const tracked = QUALITY_TIERS.reduce((sum, tier) => sum + Math.max(0, quality[tier.id] || 0), 0);
      const legacyNormal = Math.max(0, count - tracked);
      let remainingCount = count - legacyNormal;
      let itemValue = legacyNormal * (ITEMS[id]?.value || 1);
      soldQuality[id] = { normal: legacyNormal, silver: 0, gold: 0, iridium: 0 };
      for (const tier of QUALITY_TIERS) {
        const amount = Math.min(remainingCount, Math.max(0, quality[tier.id] || 0));
        remainingCount -= amount;
        soldQuality[id][tier.id] += amount;
        itemValue += amount * (ITEMS[id]?.value || 1) * qualityMultiplier(tier.id);
      }
      total += Math.floor(itemValue * multiplier * saleBonus);
      this.state.inventory[id] = 0;
      delete this.state.progression.qualityInventory[id];
    }
    if (total <= 0) return this.toast("You have nothing in that category to sell.");
    this.state.coins += total;
    this.state.stats.totalEarned += total;
    this.state.progression.lastSale = { day: this.state.day, total, items: soldItems, quality: soldQuality };
    this.sound("coin");
    this.closeModal();
    this.toast(`Sold goods for ${total} coins${saleBonus > 1 ? " with Merchant Rapport." : "."}`);
  };

  proto.buybackLastSale = function buybackLastSale() {
    const sale = this.state.progression.lastSale;
    if (!sale) return this.toast("There is no recent sale to buy back.");
    const price = Math.ceil(sale.total * 1.2);
    if (this.state.coins < price) return this.toast(`Buyback costs ${price} coins.`);
    this.state.coins -= price;
    for (const [id, count] of Object.entries(sale.items)) this.state.inventory[id] = (this.state.inventory[id] || 0) + count;
    for (const [id, quality] of Object.entries(sale.quality || {})) this.state.progression.qualityInventory[id] = { ...quality };
    this.state.progression.lastSale = null;
    this.closeModal();
    this.toast(`Bought back the previous sale for ${price} coins.`);
  };

  proto.canPayUpgrade = function canPayUpgrade(requirement) {
    if (!requirement || this.state.coins < requirement.coins) return false;
    return Object.entries(requirement.items || {}).every(([id, amount]) => (this.state.inventory[id] || 0) >= amount);
  };

  proto.purchaseBalancedUpgrade = function purchaseBalancedUpgrade(key, max) {
    const current = this.state.upgrades[key] || 0;
    const next = current + 1;
    if (next > max) return this.toast("This smith cannot improve it further.");
    const requirement = UPGRADE_REQUIREMENTS[key]?.[next];
    if (!this.canPayUpgrade(requirement)) return this.toast(`Required: ${requirementsText(requirement)}.`);
    this.state.coins -= requirement.coins;
    for (const [id, amount] of Object.entries(requirement.items)) this.state.inventory[id] -= amount;
    this.state.upgrades[key] = next;
    this.closeModal();
    this.toast(`${key.replace(/([A-Z])/g, " $1")} upgraded to ${next}.`);
    this.awardAdventureXp(20 + next * 10);
  };

  proto.enhanceEquippedItem = function enhanceEquippedItem(slot) {
    const id = this.state.combat.equipment[slot];
    if (!id) return this.toast(`No ${slot} is equipped.`);
    const current = Number(this.state.progression.enhancements[id]) || 0;
    if (current >= 3) return this.toast(`${EQUIPMENT_DEFS[id].name} is already +3.`);
    const cost = enhancementCost(current);
    if (this.state.coins < cost.coins || (this.state.inventory.crystal || 0) < cost.crystal || (this.state.inventory[cost.ore] || 0) < cost.amount) return this.toast(`Enhancement requires ${cost.coins} coins, ${cost.crystal} crystal, and ${cost.amount} ${ITEMS[cost.ore].name}.`);
    this.state.coins -= cost.coins;
    this.state.inventory.crystal -= cost.crystal;
    this.state.inventory[cost.ore] -= cost.amount;
    this.state.progression.enhancements[id] = current + 1;
    this.applyEquipmentVitals();
    this.closeModal();
    this.toast(`${EQUIPMENT_DEFS[id].name} enhanced to +${current + 1}.`);
  };

  proto.openBlacksmith = function openBlacksmithProgression(city) {
    const limits = { toolPower: city ? 5 : 3, weaponPower: city ? 6 : 3, armor: city ? 5 : 2 };
    const rows = ["toolPower", "weaponPower", "armor"].map((key) => {
      const current = this.state.upgrades[key] || 0;
      const next = current + 1;
      const req = UPGRADE_REQUIREMENTS[key]?.[next];
      return `<article class="progression-upgrade"><strong>${key.replace(/([A-Z])/g, " $1")} ${current}/${limits[key]}</strong><p>${next <= limits[key] ? requirementsText(req) : "Maximum available tier"}</p><button data-balanced-upgrade="${key}" ${next > limits[key] ? "disabled" : ""}>Upgrade</button></article>`;
    }).join("");
    const enhancementRows = ["weapon", "armor", "helmet"].map((slot) => {
      const id = this.state.combat.equipment[slot];
      const level = Number(this.state.progression.enhancements[id]) || 0;
      return `<button data-enhance-slot="${slot}" ${!id || level >= 3 ? "disabled" : ""}>Enhance ${id ? EQUIPMENT_DEFS[id].name : slot} +${level}</button>`;
    }).join("");
    this.openModal(city ? "Ironhart Smithy" : "Oren's Workshop", `<p>Upgrades now require both coins and depth-appropriate materials.</p><div class="progression-upgrades">${rows}</div><h3>Equipment Enhancement</h3><div class="menu-grid">${enhancementRows}<button id="browseBalancedEquipment">Browse Equipment</button><button id="sellBalancedOres">Sell Ores</button></div>`, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-balanced-upgrade]").forEach((button) => button.onclick = () => this.purchaseBalancedUpgrade(button.dataset.balancedUpgrade, limits[button.dataset.balancedUpgrade]));
    document.querySelectorAll("[data-enhance-slot]").forEach((button) => button.onclick = () => this.enhanceEquippedItem(button.dataset.enhanceSlot));
    $("browseBalancedEquipment").onclick = () => { this.closeModal(); this.openCombatEquipmentShop("blacksmith", city); };
    $("sellBalancedOres").onclick = () => this.sellCategory(["copper", "iron", "silver", "gold", "obsidian"], 1);
  };

  proto.claimQuest = function claimQuestProgression(id) {
    const quest = this.state.quests.find((entry) => entry.id === id);
    const wasClaimed = Boolean(quest?.claimed);
    original.claimQuest.call(this, id);
    if (quest && !wasClaimed && quest.claimed) this.awardAdventureXp(35);
  };

  proto.claimBounty = function claimBountyProgression(id) {
    const bounty = this.state.guild.bounties.find((entry) => entry.id === id);
    const wasClaimed = Boolean(bounty?.claimed);
    original.claimBounty.call(this, id);
    if (bounty && !wasClaimed && bounty.claimed) {
      this.awardAdventureXp(45);
      this.awardSkillXp("combat", 18, .15);
    }
  };

  proto.nextDay = function nextDayProgression(passedOut) {
    original.nextDay.call(this, passedOut);
    this.state.progression.stockDay = 0;
    this.ensureDailyStock();
    this.state.progression.lastSale = null;
  };

  proto.knockedOut = function knockedOutBalanced() {
    const fee = Math.min(150, Math.floor(this.state.coins * .08));
    this.state.coins -= fee;
    this.state.player.health = Math.ceil(this.state.player.maxHealth * .6);
    this.state.player.energy = Math.ceil(this.state.player.maxEnergy * .5);
    if (this.state.combat) {
      this.state.combat.projectiles = [];
      this.state.combat.invulnerable = 1;
      for (const status of Object.values(this.state.combat.statuses || {})) status.time = 0;
    }
    if (this.state.mode === "cave") {
      this.state.cave.currentFloor = 1;
      this.loadCaveFloor(1);
      this.state.player.x = 5.5;
      this.state.player.y = 16.5;
      this.toast(`The expedition healer rescued you. Recovery fee: ${fee} coins.`);
    } else {
      this.state.mode = "world";
      this.state.player.x = 130.5;
      this.state.player.y = 20.5;
      this.toast(`Silvercrest Guild rescued you. Recovery fee: ${fee} coins.`);
    }
  };

  proto.passOut = function passOutBalanced() {
    const fee = Math.min(80, Math.floor(this.state.coins * .05));
    this.state.coins -= fee;
    if (this.state.mode === "cave") this.leaveCave();
    this.toast(`You passed out. Recovery cost ${fee} coins.`);
    this.nextDay(true);
  };

  proto.toggleGameMenu = function toggleGameMenuProgression() {
    original.toggleGameMenu.call(this);
    const grid = document.querySelector("#modalBody .menu-grid");
    if (!grid || document.getElementById("progressionMenu")) return;
    const button = document.createElement("button");
    button.id = "progressionMenu";
    button.textContent = "📈 Skills & Progression";
    button.onclick = () => this.showProgression();
    grid.insertBefore(button, grid.children[2] || null);
  };
}
