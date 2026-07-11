import { ITEMS, clamp, $, distance } from "./game-shared.js";
import { calendarForDay, festivalForDay } from "./seasons-data.js";
import {
  ANIMAL_SPECIES, HOUSING_UPGRADES, SILO_UPGRADES, RANCH_SUPPLIES,
  MACHINE_DEFS, RANCH_PRODUCT_IDS, RANCH_QUALITY, RANCH_QUALITY_ORDER,
  createAnimal, housingDefinition, housingCapacity, housingAnimalCount,
  housingHasRoom, speciesUnlocked, siloCapacity, nextHousingUpgrade,
} from "./ranch-data.js";

const QUALITY_HIGH_TO_LOW = [...RANCH_QUALITY_ORDER].reverse();
const ARTISAN_IDS = new Set(["mayonnaise", "duckMayonnaise", "cheese", "goatCheese", "cloth", "truffleOil"]);

function itemCostHtml(cost = {}) {
  return Object.entries(cost).map(([id, amount]) => id === "coins" ? `${amount} coins` : `${ITEMS[id]?.icon || "📦"} ${amount}`).join(" · ");
}

function qualityLabel(quality) {
  const def = RANCH_QUALITY[quality] || RANCH_QUALITY.normal;
  return `${def.icon} ${def.name}`;
}

function closeAnd(game, callback) {
  game.closeModal();
  callback();
}

export function installRanchingUI(GameClass) {
  const proto = GameClass.prototype;
  const originalToggleGameMenu = proto.toggleGameMenu;
  const originalShowHowToPlay = proto.showHowToPlay;

  proto.openRanchCenter = function openRanchCenter() {
    const ranch = this.state.ranch;
    const coop = housingDefinition(ranch, "coop");
    const barn = housingDefinition(ranch, "barn");
    const project = ranch.construction
      ? `<p class="ranch-project">🔨 ${ranch.construction.kind.toUpperCase()} upgrade · ${ranch.construction.daysRemaining} day${ranch.construction.daysRemaining === 1 ? "" : "s"} remaining</p>`
      : "";
    const sick = ranch.animals.filter((animal) => animal.sick).length;
    const ready = ranch.animals.filter((animal) => animal.productReady).length;
    this.openModal("Hearthvale Ranch", `
      <div class="ranch-summary">
        <article><span>🐔</span><strong>${housingAnimalCount(ranch, "coop")}/${coop.capacity}</strong><small>${coop.name}</small></article>
        <article><span>🐄</span><strong>${housingAnimalCount(ranch, "barn")}/${barn.capacity}</strong><small>${barn.name}</small></article>
        <article><span>🌾</span><strong>${ranch.hay}/${siloCapacity(ranch)}</strong><small>Hay storage</small></article>
        <article><span>💧</span><strong>${Math.round(ranch.troughWater)}%</strong><small>Water trough</small></article>
        <article><span>🧹</span><strong>${Math.round(ranch.cleanliness)}%</strong><small>Cleanliness</small></article>
        <article><span>📦</span><strong>${ready}</strong><small>Products ready</small></article>
      </div>
      ${project}
      ${sick ? `<p class="ranch-warning">💊 ${sick} animal${sick === 1 ? " needs" : "s need"} medicine.</p>` : ""}
      <p>Animals never permanently die. Consistent feeding, water, petting, shelter, and clean housing improve friendship, health, and product quality.</p>
    `, [
      { label: "🐾 Animal Roster", action: () => closeAnd(this, () => this.showRanchRoster()) },
      { label: "🛒 Rancher Shop", action: () => closeAnd(this, () => this.openRancherShop()) },
      { label: "🏗️ Buildings & Upgrades", action: () => closeAnd(this, () => this.showRanchBuildings()) },
      { label: "🌾 Daily Care", action: () => closeAnd(this, () => this.showRanchCare()) },
      { label: "⚙️ Artisan Machines", action: () => closeAnd(this, () => this.showRanchMachines()) },
      { label: "💰 Sell Ranch Goods", action: () => this.sellRanchGoods() },
      { label: "Close", action: () => this.closeModal() },
    ]);
  };

  proto.showRanchRoster = function showRanchRoster() {
    const ranch = this.state.ranch;
    const cards = ranch.animals.map((animal) => {
      const species = ANIMAL_SPECIES[animal.species];
      const status = animal.sick ? "Sick" : animal.productReady ? `${ITEMS[animal.productReady.id].name} ready` : animal.fedToday ? "Fed" : "Needs feed";
      return `<article class="animal-card ${animal.sick ? "sick" : ""}">
        <span class="animal-icon">${species.icon}</span>
        <div><h3>${animal.name}</h3><small>${species.name} · Age ${animal.ageDays} days · ${status}</small>
        <div class="animal-bars"><label>Friendship <i><b style="width:${animal.friendship * 10}%"></b></i></label><label>Happiness <i><b style="width:${animal.happiness}%"></b></i></label><label>Health <i><b style="width:${animal.health}%"></b></i></label></div></div>
        <button data-ranch-animal="${animal.id}">Care</button>
      </article>`;
    }).join("");
    this.openModal("Animal Roster", cards || "<p>The ranch is empty. Construct housing and purchase your first animal.</p>", [
      { label: "Back", action: () => closeAnd(this, () => this.openRanchCenter()) },
    ]);
    document.querySelectorAll("[data-ranch-animal]").forEach((button) => button.onclick = () => {
      const animal = ranch.animals.find((entry) => entry.id === button.dataset.ranchAnimal);
      if (animal) closeAnd(this, () => this.openAnimalCare(animal));
    });
  };

  proto.openAnimalCare = function openAnimalCare(animal) {
    const species = ANIMAL_SPECIES[animal.species];
    if (!species) return;
    const product = animal.productReady
      ? `${qualityLabel(animal.productReady.quality)} ${ITEMS[animal.productReady.id].name} ×${animal.productReady.amount}`
      : "No product ready";
    const tool = species.tool ? `Collection tool: ${ITEMS[species.tool].icon} ${ITEMS[species.tool].name}` : "Products can be gathered by hand.";
    this.openModal(`${species.icon} ${animal.name}`, `
      <div class="animal-profile"><span>${species.icon}</span><div><h3>${species.name}</h3><p>Friendship ${animal.friendship.toFixed(1)}/10 · Happiness ${Math.round(animal.happiness)} · Health ${Math.round(animal.health)}</p><p>${product}</p><small>${tool}</small></div></div>
    `, [
      { label: animal.pettedDay === this.state.day ? "♥ Petted Today" : "♥ Pet", action: () => this.petRanchAnimal(animal) },
      { label: animal.fedToday ? "🌾 Fed Today" : "🌾 Feed 1 Hay", action: () => this.feedRanchAnimal(animal) },
      { label: "📦 Collect Product", action: () => this.collectRanchProduct(animal) },
      { label: "💊 Treat with Medicine", action: () => this.treatRanchAnimal(animal) },
      { label: "✏️ Rename", action: () => this.renameRanchAnimal(animal) },
      { label: "Back", action: () => closeAnd(this, () => this.showRanchRoster()) },
    ]);
  };

  proto.petRanchAnimal = function petRanchAnimal(animal) {
    if (animal.pettedDay === this.state.day) return this.toast(`${animal.name} has already been petted today.`);
    animal.pettedDay = this.state.day;
    animal.friendship = clamp(animal.friendship + .35, 0, 10);
    animal.happiness = clamp(animal.happiness + 7, 0, 100);
    this.awardSkillXp?.("farming", 2, .15);
    this.sound("success");
    this.closeModal(); this.openAnimalCare(animal);
  };

  proto.feedRanchAnimal = function feedRanchAnimal(animal) {
    if (animal.fedToday) return this.toast(`${animal.name} is already fed.`);
    if (this.state.ranch.hay <= 0) return this.toast("No hay is stored. Cut pasture grass or buy hay.");
    this.state.ranch.hay -= 1;
    animal.fedToday = true;
    animal.happiness = clamp(animal.happiness + 3, 0, 100);
    this.awardSkillXp?.("farming", 1, .1);
    this.closeModal(); this.openAnimalCare(animal);
  };

  proto.collectRanchProduct = function collectRanchProduct(animal) {
    const species = ANIMAL_SPECIES[animal.species];
    const product = animal.productReady;
    if (!product) return this.toast(`${animal.name} has no product ready.`);
    if (species.tool && (this.state.inventory[species.tool] || 0) <= 0) return this.toast(`${ITEMS[species.tool].name} is required.`);
    this.addRanchItem(product.id, product.quality, product.amount, true);
    animal.productReady = null;
    animal.happiness = clamp(animal.happiness + 2, 0, 100);
    this.state.ranch.stats.productsCollected += product.amount;
    this.awardSkillXp?.("farming", 8 + product.amount * 3, .3);
    this.checkRanchAchievements();
    this.closeModal(); this.openAnimalCare(animal);
  };

  proto.treatRanchAnimal = function treatRanchAnimal(animal) {
    if (!animal.sick && animal.health >= 100) return this.toast(`${animal.name} is already healthy.`);
    if ((this.state.inventory.animalMedicine || 0) <= 0) return this.toast("You need Animal Medicine from the Rancher Shop.");
    this.state.inventory.animalMedicine -= 1;
    animal.sick = false;
    animal.health = 100;
    animal.happiness = clamp(animal.happiness + 12, 0, 100);
    this.toast(`${animal.name} recovered.`);
    this.closeModal(); this.openAnimalCare(animal);
  };

  proto.renameRanchAnimal = function renameRanchAnimal(animal) {
    const next = globalThis.prompt?.(`Rename ${animal.name}:`, animal.name);
    if (!next) return;
    animal.name = String(next).trim().slice(0, 18) || animal.name;
    this.closeModal(); this.openAnimalCare(animal);
  };

  proto.showRanchBuildings = function showRanchBuildings() {
    const ranch = this.state.ranch;
    const project = ranch.construction;
    const cards = ["coop", "barn"].map((kind) => {
      const building = ranch.buildings[kind];
      const current = housingDefinition(ranch, kind);
      const next = nextHousingUpgrade(ranch, kind);
      const incubator = kind === "coop" && building.level >= 2
        ? ranch.incubator ? `<p>Incubator: ${ranch.incubator.ready ? "Ready to hatch when space opens" : `${ranch.incubator.species === "duck" ? "Duck" : "Chicken"} · ${ranch.incubator.daysRemaining} days`}</p>` : `<p>Incubator: Empty</p><button data-incubate="chicken">Incubate Egg</button><button data-incubate="duck">Incubate Duck Egg</button>`
        : "";
      return `<article class="ranch-building">
        <h3>${kind === "coop" ? "🐔" : "🐄"} ${current.name}</h3>
        <p>Capacity ${housingAnimalCount(ranch, kind)}/${current.capacity} · Door ${building.doorOpen ? "Open" : "Closed"} · Heater ${building.heater ? "Installed" : "None"} · Auto-collector ${building.autoCollector ? "Installed" : "None"}</p>
        ${incubator}
        ${next ? `<p><strong>Next:</strong> ${next.name} · ${next.days} days<br><small>${itemCostHtml(next.cost)}</small></p><button data-ranch-upgrade="${kind}" ${project ? "disabled" : ""}>Start Upgrade</button>` : "<p><strong>Maximum tier reached.</strong></p>"}
        <button data-ranch-door="${kind}">${building.doorOpen ? "Close" : "Open"} Door</button>
        <button data-ranch-heater="${kind}" ${building.heater || building.level < 1 ? "disabled" : ""}>Install Heater</button>
        <button data-ranch-collector="${kind}" ${building.autoCollector || building.level < 3 ? "disabled" : ""}>Install Auto-Collector</button>
      </article>`;
    }).join("");
    const silo = ranch.buildings.silo;
    const siloDef = SILO_UPGRADES[silo.level];
    const nextSilo = nextHousingUpgrade(ranch, "silo");
    const siloCard = `<article class="ranch-building"><h3>🌾 ${siloDef.name}</h3><p>Hay ${ranch.hay}/${siloDef.capacity}</p>${nextSilo ? `<p><strong>Next:</strong> ${nextSilo.name} · ${nextSilo.days} days<br><small>${itemCostHtml(nextSilo.cost)}</small></p><button data-ranch-upgrade="silo" ${project ? "disabled" : ""}>Start Upgrade</button>` : "<p><strong>Maximum tier reached.</strong></p>"}</article>`;
    this.openModal("Ranch Buildings & Upgrades", `<div class="ranch-building-grid">${cards}${siloCard}</div>${project ? `<p class="ranch-project">Current project: ${project.kind} · ${project.daysRemaining} days remaining.</p>` : ""}`, [
      { label: "Back", action: () => closeAnd(this, () => this.openRanchCenter()) },
    ]);
    document.querySelectorAll("[data-ranch-upgrade]").forEach((button) => button.onclick = () => this.startRanchConstruction(button.dataset.ranchUpgrade));
    document.querySelectorAll("[data-ranch-door]").forEach((button) => button.onclick = () => this.toggleRanchDoor(button.dataset.ranchDoor));
    document.querySelectorAll("[data-ranch-heater]").forEach((button) => button.onclick = () => this.installRanchHeater(button.dataset.ranchHeater));
    document.querySelectorAll("[data-ranch-collector]").forEach((button) => button.onclick = () => this.installRanchCollector(button.dataset.ranchCollector));
    document.querySelectorAll("[data-incubate]").forEach((button) => button.onclick = () => this.startRanchIncubation(button.dataset.incubate));
  };

  proto.canAffordRanchCost = function canAffordRanchCost(cost = {}) {
    return Object.entries(cost).every(([id, amount]) => id === "coins" ? this.state.coins >= amount : (this.state.inventory[id] || 0) >= amount);
  };

  proto.payRanchCost = function payRanchCost(cost = {}) {
    for (const [id, amount] of Object.entries(cost)) {
      if (id === "coins") this.state.coins -= amount;
      else this.state.inventory[id] -= amount;
    }
  };

  proto.startRanchConstruction = function startRanchConstruction(kind) {
    const ranch = this.state.ranch;
    if (ranch.construction) return this.toast("Only one ranch construction project can run at a time.");
    const next = nextHousingUpgrade(ranch, kind);
    if (!next) return this.toast("That building is already fully upgraded.");
    if (!this.canAffordRanchCost(next.cost)) return this.toast(`Missing construction materials: ${itemCostHtml(next.cost)}.`);
    this.payRanchCost(next.cost);
    ranch.construction = { kind, targetLevel: next.level, daysRemaining: next.days };
    this.state.journal.unshift(`Ranch construction started: ${next.name} (${next.days} days).`);
    this.state.journal = this.state.journal.slice(0, 30);
    this.closeModal(); this.showRanchBuildings();
  };

  proto.toggleRanchDoor = function toggleRanchDoor(kind) {
    this.state.ranch.buildings[kind].doorOpen = !this.state.ranch.buildings[kind].doorOpen;
    this.closeModal(); this.showRanchBuildings();
  };

  proto.installRanchHeater = function installRanchHeater(kind) {
    const building = this.state.ranch.buildings[kind];
    if (building.heater) return this.toast("A heater is already installed.");
    if ((this.state.inventory.heater || 0) <= 0) return this.toast("Buy a Barn Heater from the Rancher Shop.");
    this.state.inventory.heater -= 1;
    building.heater = true;
    this.toast(`${kind === "coop" ? "Coop" : "Barn"} heater installed.`);
    this.closeModal(); this.showRanchBuildings();
  };

  proto.installRanchCollector = function installRanchCollector(kind) {
    const building = this.state.ranch.buildings[kind];
    const cost = { coins: 4500, iron: 12, crystal: 2 };
    const farmingLevel = this.state.progression?.skillLevels?.farming || 1;
    if (building.level < 3) return this.toast("A Deluxe building is required.");
    if (farmingLevel < 8) return this.toast("Farming Level 8 is required.");
    if (building.autoCollector) return this.toast("Auto-collection is already installed.");
    if (!this.canAffordRanchCost(cost)) return this.toast(`Auto-Collector requires ${itemCostHtml(cost)}.`);
    this.payRanchCost(cost);
    building.autoCollector = true;
    this.toast("Auto-Collector installed. New products will enter inventory each morning.");
    this.closeModal(); this.showRanchBuildings();
  };

  proto.startRanchIncubation = function startRanchIncubation(speciesId) {
    const ranch = this.state.ranch;
    if (ranch.buildings.coop.level < 2) return this.toast("A Large Coop is required for the incubator.");
    if (ranch.incubator) return this.toast("The incubator is already occupied.");
    if (!housingHasRoom(ranch, "coop")) return this.toast("The coop needs an open animal space before incubation starts.");
    const eggId = speciesId === "duck" ? "duckEgg" : "egg";
    if ((this.state.inventory[eggId] || 0) <= 0) return this.toast(`${ITEMS[eggId].name} is required.`);
    if ((this.state.inventory.incubatorPack || 0) <= 0) return this.toast("An Incubator Heat Pack is required.");
    this.consumeRanchQualityItem(eggId);
    this.state.inventory.incubatorPack -= 1;
    ranch.incubator = { species: speciesId === "duck" ? "duck" : "chicken", daysRemaining: speciesId === "duck" ? 4 : 3, ready: false };
    this.toast(`${speciesId === "duck" ? "Duck" : "Chicken"} egg placed in the incubator.`);
    this.closeModal(); this.showRanchBuildings();
  };

  proto.showRanchCare = function showRanchCare() {
    const ranch = this.state.ranch;
    const unfed = ranch.animals.filter((animal) => !animal.fedToday).length;
    this.openModal("Daily Ranch Care", `
      <div class="ranch-summary"><article><span>🌾</span><strong>${ranch.hay}/${siloCapacity(ranch)}</strong><small>Hay</small></article><article><span>💧</span><strong>${Math.round(ranch.troughWater)}%</strong><small>Water</small></article><article><span>🧹</span><strong>${Math.round(ranch.cleanliness)}%</strong><small>Cleanliness</small></article><article><span>🐾</span><strong>${unfed}</strong><small>Unfed animals</small></article></div>
      <p>Animals graze automatically in clear weather when their housing door is open. Rain, snow, festivals, sickness, and nighttime keep them indoors.</p>
    `, [
      { label: `🌾 Feed All (${unfed} hay max)`, action: () => this.feedAllRanchAnimals() },
      { label: "💧 Refill Water Trough", action: () => this.refillRanchTrough() },
      { label: "🧹 Clean Housing", action: () => this.cleanRanchHousing() },
      { label: "Back", action: () => closeAnd(this, () => this.openRanchCenter()) },
    ]);
  };

  proto.feedAllRanchAnimals = function feedAllRanchAnimals() {
    let fed = 0;
    for (const animal of this.state.ranch.animals) {
      if (animal.fedToday || this.state.ranch.hay <= 0) continue;
      animal.fedToday = true;
      this.state.ranch.hay -= 1;
      fed += 1;
    }
    if (!fed) return this.toast(this.state.ranch.hay <= 0 ? "No hay is stored." : "Every animal is already fed.");
    this.awardSkillXp?.("farming", fed, .1);
    this.toast(`Fed ${fed} animal${fed === 1 ? "" : "s"}.`);
    this.closeModal(); this.showRanchCare();
  };

  proto.refillRanchTrough = function refillRanchTrough() {
    if (this.state.ranch.troughWater >= 100) return this.toast("The water trough is already full.");
    this.state.ranch.troughWater = 100;
    this.spendEnergy(2);
    this.toast("Water trough refilled.");
    this.closeModal(); this.showRanchCare();
  };

  proto.cleanRanchHousing = function cleanRanchHousing() {
    if (this.state.ranch.cleanliness >= 100) return this.toast("The housing is already clean.");
    this.state.ranch.cleanliness = 100;
    this.spendEnergy(4);
    this.awardSkillXp?.("farming", 3, .15);
    this.toast("Coop and barn cleaned.");
    this.closeModal(); this.showRanchCare();
  };

  proto.openRancherShop = function openRancherShop() {
    if (this.state.minutes < 420 || this.state.minutes > 1080 || festivalForDay(this.state.day)) {
      return this.openModal("Meadow & Manger Ranch Supply", "<p>The ranch supply counter is open from 7:00 AM to 6:00 PM and closes on festival days.</p>", [{ label: "Back", action: () => closeAnd(this, () => this.openRanchCenter()) }]);
    }
    const farmingLevel = this.state.progression?.skillLevels?.farming || 1;
    const animalCards = Object.entries(ANIMAL_SPECIES).map(([id, species]) => {
      const unlocked = speciesUnlocked(this.state.ranch, id, farmingLevel);
      const room = housingHasRoom(this.state.ranch, species.housing);
      const housing = housingDefinition(this.state.ranch, species.housing);
      return `<article class="shop-item"><div><h3>${species.icon} ${species.name}</h3><p>${species.price} coins · Farming ${species.farmingLevel} · ${housing.name}</p></div><button data-buy-animal="${id}" ${!unlocked || !room ? "disabled" : ""}>${!unlocked ? "Locked" : !room ? "Full" : "Buy"}</button></article>`;
    }).join("");
    const supplyCards = Object.entries(RANCH_SUPPLIES).map(([id, supply]) => {
      const locked = farmingLevel < supply.farmingLevel;
      const owned = supply.unique && (this.state.inventory[supply.item] || 0) > 0;
      return `<article class="shop-item"><div><h3>${ITEMS[supply.item].icon} ${supply.name}</h3><p>${supply.price} coins · Farming ${supply.farmingLevel}</p></div><button data-buy-ranch-supply="${id}" ${locked || owned ? "disabled" : ""}>${owned ? "Owned" : locked ? "Locked" : "Buy"}</button></article>`;
    }).join("");
    this.openModal("Meadow & Manger Ranch Supply", `<p>Coins: <strong>${this.state.coins}</strong> · Farming Level ${farmingLevel}</p><h3>Animals</h3><div class="shop-list">${animalCards}</div><h3>Supplies</h3><div class="shop-list">${supplyCards}</div>`, [
      { label: "Back", action: () => closeAnd(this, () => this.openRanchCenter()) },
    ]);
    document.querySelectorAll("[data-buy-animal]").forEach((button) => button.onclick = () => this.buyRanchAnimal(button.dataset.buyAnimal));
    document.querySelectorAll("[data-buy-ranch-supply]").forEach((button) => button.onclick = () => this.buyRanchSupply(button.dataset.buyRanchSupply));
  };

  proto.buyRanchAnimal = function buyRanchAnimal(speciesId) {
    const species = ANIMAL_SPECIES[speciesId];
    const farmingLevel = this.state.progression?.skillLevels?.farming || 1;
    if (!species || !speciesUnlocked(this.state.ranch, speciesId, farmingLevel)) return this.toast("That animal is not unlocked yet.");
    if (!housingHasRoom(this.state.ranch, species.housing)) return this.toast(`${housingDefinition(this.state.ranch, species.housing).name} is full.`);
    if (this.state.coins < species.price) return this.toast("Not enough coins.");
    this.state.coins -= species.price;
    const id = `animal-${this.state.ranch.nextAnimalId++}`;
    const animal = createAnimal(speciesId, id, this.state.day);
    if (farmingLevel >= 9 && Math.random() < .12) animal.colorVariant = "rare";
    this.state.ranch.animals.push(animal);
    this.state.ranch.stats.animalsPurchased += 1;
    this.awardSkillXp?.("farming", 12, .25);
    this.checkRanchAchievements();
    this.toast(`${animal.name} the ${species.name} joined the ranch.`);
    this.closeModal(); this.openRancherShop();
  };

  proto.buyRanchSupply = function buyRanchSupply(supplyId) {
    const supply = RANCH_SUPPLIES[supplyId];
    if (!supply) return;
    if (supply.unique && (this.state.inventory[supply.item] || 0) > 0) return this.toast("You already own that tool.");
    if (this.state.coins < supply.price) return this.toast("Not enough coins.");
    this.state.coins -= supply.price;
    if (supply.item === "hay") this.state.ranch.hay = Math.min(siloCapacity(this.state.ranch), this.state.ranch.hay + supply.amount);
    else this.addItem(supply.item, supply.amount, false);
    this.toast(`Bought ${supply.name}.`);
    this.closeModal(); this.openRancherShop();
  };

  proto.showHowToPlay = function showHowToPlayRanching() {
    originalShowHowToPlay.call(this);
    const body = $("modalBody");
    if (!body || body.querySelector?.("[data-ranch-help]")) return;
    body.insertAdjacentHTML?.("afterbegin", `<section class="help-section" data-ranch-help><h3>Farm Animals & Ranching</h3><p>Interact with the Old Barn to construct coops and barns, buy six animal species, manage hay, water, cleanliness, doors, heaters, incubation, and auto-collection. Pet animals daily and let them graze in clear weather. Face mature pasture grass and interact while owning the Ranch Scythe to store hay. Milk and wool require their matching ranch tools. Artisan machines preserve product quality while processing over game time.</p></section>`);
  };

  proto.toggleGameMenu = function toggleGameMenuRanching() {
    originalToggleGameMenu.call(this);
    const grid = document.querySelector("#modalBody .menu-grid");
    if (!grid || document.getElementById("ranchMenu")) return;
    const button = document.createElement("button");
    button.id = "ranchMenu";
    button.textContent = "🐾 Ranching";
    button.onclick = () => { this.closeModal(); this.openRanchCenter(); };
    grid.appendChild(button);
  };
}
