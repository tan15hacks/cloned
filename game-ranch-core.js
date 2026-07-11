import {
  TILE, ITEMS, clamp, distance, $, regionAt,
} from "./game-shared.js";
import { calendarForDay, festivalForDay } from "./seasons-data.js";
import {
  ANIMAL_SPECIES, HOUSING_UPGRADES, MACHINE_DEFS, PASTURE, COOP_SITE,
  BARN_DOOR, RANCH_PRODUCT_IDS, RANCH_QUALITY, RANCH_QUALITY_ORDER,
  createRanchState, createAnimal, housingDefinition, housingCapacity,
  housingAnimalCount, housingHasRoom, siloCapacity, productForAnimal,
  pastureContains,
} from "./ranch-data.js";

const GAME_MINUTES_WORLD = 1.25;
const GAME_MINUTES_CAVE = .75;
const QUALITY_HIGH_TO_LOW = [...RANCH_QUALITY_ORDER].reverse();

function costText(cost = {}) {
  return Object.entries(cost).map(([id, amount]) => id === "coins" ? `${amount} coins` : `${ITEMS[id]?.icon || "📦"} ${amount}`).join(" · ");
}

function animalHousing(animal) { return ANIMAL_SPECIES[animal.species]?.housing || "barn"; }
function isBadOutdoorWeather(weather) { return weather === "Rain" || weather === "Snow"; }

function deterministic01(day, x, y, salt = 0) {
  let value = Math.imul((day | 0) + 31, 73856093) ^ Math.imul(Math.floor(x * 10) + 17, 19349663) ^ Math.imul(Math.floor(y * 10) + salt + 43, 83492791);
  value ^= value >>> 13;
  return (value >>> 0) / 4294967296;
}

export function installRanching(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    update: proto.update,
    nextDay: proto.nextDay,
    interact: proto.interact,
    openBuildingService: proto.openBuildingService,
    updateContextHint: proto.updateContextHint,
    drawWorld: proto.drawWorld,
    collides: proto.collides,
  };

  proto.defaultState = function defaultStateRanching() {
    const state = original.defaultState.call(this);
    state.ranch = createRanchState({}, state.day);
    return state;
  };

  proto.migrateState = function migrateStateRanching(data) {
    const state = original.migrateState.call(this, data);
    state.ranch = createRanchState(data?.ranch || state.ranch, state.day);
    return state;
  };

  proto.enterGame = function enterGameRanching() {
    original.enterGame.call(this);
    this.state.ranch = createRanchState(this.state.ranch, this.state.day);
    this.normalizeRanchQualityInventory();
    this.refreshRanchHousingPositions();
    this.clearRanchSpawnConflicts();
  };

  proto.normalizeRanchQualityInventory = function normalizeRanchQualityInventory() {
    const ranch = this.state.ranch;
    for (const id of RANCH_PRODUCT_IDS) {
      const record = ranch.qualityInventory[id];
      const inventoryCount = Math.max(0, Math.floor(Number(this.state.inventory[id]) || 0));
      const recorded = RANCH_QUALITY_ORDER.reduce((sum, quality) => sum + (record[quality] || 0), 0);
      if (recorded < inventoryCount) record.normal += inventoryCount - recorded;
      else if (recorded > inventoryCount) {
        let excess = recorded - inventoryCount;
        for (const quality of RANCH_QUALITY_ORDER) {
          const remove = Math.min(excess, record[quality]);
          record[quality] -= remove;
          excess -= remove;
          if (excess <= 0) break;
        }
      }
    }
  };

  proto.clearRanchSpawnConflicts = function clearRanchSpawnConflicts() {
    if (!Array.isArray(this.state.resources)) return;
    const before = this.state.resources.length;
    this.state.resources = this.state.resources.filter((resource) => {
      const inPasture = pastureContains(resource.x, resource.y);
      const inCoop = resource.x >= COOP_SITE.x - 1 && resource.x < COOP_SITE.x + COOP_SITE.w + 1 && resource.y >= COOP_SITE.y - 1 && resource.y < COOP_SITE.y + COOP_SITE.h + 1;
      return !inPasture && !inCoop;
    });
    if (this.state.resources.length !== before) this.rebuildResourceMap?.();
    if (Array.isArray(this.state.monsters)) this.state.monsters = this.state.monsters.filter((monster) => !pastureContains(monster.x, monster.y));
  };

  proto.update = function updateRanching(dt) {
    const modeBefore = this.state?.mode;
    original.update.call(this, dt);
    if (!this.state?.ranch) return;
    if (this.state.mode === "world" && regionAt(this.state.player.x, this.state.player.y).id === "farm") this.clearRanchSpawnConflicts();
    const rate = modeBefore === "cave" ? GAME_MINUTES_CAVE : GAME_MINUTES_WORLD;
    this.advanceRanchMachines(dt * rate);
    if (this.state.mode === "world" && regionAt(this.state.player.x, this.state.player.y).id === "farm") this.updateRanchAnimals(dt);
  };

  proto.nextDay = function nextDayRanching(passedOut) {
    this.processRanchDayEnd();
    original.nextDay.call(this, passedOut);
    this.advanceRanchConstruction();
    this.advanceRanchIncubator();
    this.advanceRanchMachines(720);
    this.growPastureGrass();
    this.refreshRanchHousingPositions();
    this.checkRanchAchievements();
    this.saveGame(true);
  };

  proto.processRanchDayEnd = function processRanchDayEnd() {
    const ranch = this.state.ranch;
    if (!ranch || ranch.lastProcessedDay === this.state.day) return;
    ranch.lastProcessedDay = this.state.day;
    ranch.lastAutoCollection = [];
    const calendar = calendarForDay(this.state.day);
    const farmingLevel = this.state.progression?.skillLevels?.farming || 1;
    const waterPerAnimal = 3;
    let fullyHappy = 0;

    for (const animal of ranch.animals) {
      const species = ANIMAL_SPECIES[animal.species];
      if (!species) continue;
      const kind = species.housing;
      const housing = housingDefinition(ranch, kind);
      const building = ranch.buildings[kind];
      if (!animal.fedToday && housing.autoFeeder && ranch.hay > 0) {
        ranch.hay -= 1;
        animal.fedToday = true;
      }
      const watered = ranch.troughWater >= waterPerAnimal;
      if (watered) ranch.troughWater -= waterPerAnimal;
      const heated = calendar.season.id !== "winter" || building.heater || housing.winterProtection;
      const clean = ranch.cleanliness >= 35;
      const petted = animal.pettedDay === this.state.day;
      const care = Number(animal.fedToday) + Number(watered) + Number(clean) + Number(heated) + Number(petted);

      if (care >= 4) {
        animal.happiness = clamp(animal.happiness + 5, 0, 100);
        animal.health = clamp(animal.health + 5, 1, 100);
        animal.friendship = clamp(animal.friendship + (petted ? .28 : .08), 0, 10);
      } else if (care >= 2) {
        animal.happiness = clamp(animal.happiness - 2, 0, 100);
        animal.health = clamp(animal.health + 1, 1, 100);
      } else {
        animal.happiness = clamp(animal.happiness - 10, 0, 100);
        animal.health = clamp(animal.health - 10, 1, 100);
      }
      if (animal.health < 30 || (care <= 1 && deterministic01(this.state.day, animal.x, animal.y, 91) < .15)) animal.sick = true;
      if (animal.health > 70 && care >= 4) animal.sick = false;
      animal.ageDays += 1;
      if (animal.happiness >= 80) fullyHappy += 1;

      const product = productForAnimal(animal, {
        day: this.state.day,
        fed: animal.fedToday,
        watered,
        wasOutside: animal.wasOutsideToday,
        weather: this.state.weather,
        seasonId: calendar.season.id,
        buildingLevel: housing.level,
        farmingLevel,
        heated,
        qualityRoll: deterministic01(this.state.day, animal.x, animal.y, 17),
        productRoll: deterministic01(this.state.day, animal.x, animal.y, 29),
        doubleRoll: deterministic01(this.state.day, animal.x, animal.y, 47),
      });
      if (product) {
        animal.lastProductDay = this.state.day;
        if (building.autoCollector) {
          this.addRanchItem(product.id, product.quality, product.amount, false);
          ranch.lastAutoCollection.push(product);
          ranch.stats.productsCollected += product.amount;
        } else animal.productReady = product;
      } else if (animal.productReady) animal.happiness = clamp(animal.happiness - 2, 0, 100);

      animal.fedToday = false;
      animal.wasOutsideToday = false;
      animal.outside = false;
      animal.targetX = null;
      animal.targetY = null;
    }

    ranch.cleanliness = clamp(ranch.cleanliness - Math.max(2, ranch.animals.length * 2.4), 0, 100);
    if (ranch.animals.length && fullyHappy === ranch.animals.length) ranch.stats.happyDays += 1;
    if (ranch.lastAutoCollection.length) {
      const total = ranch.lastAutoCollection.reduce((sum, entry) => sum + entry.amount, 0);
      this.state.journal.unshift(`Ranch auto-collector stored ${total} animal product${total === 1 ? "" : "s"}.`);
      this.state.journal = this.state.journal.slice(0, 30);
    }
  };

  proto.advanceRanchConstruction = function advanceRanchConstruction() {
    const ranch = this.state.ranch;
    const project = ranch.construction;
    if (!project) return;
    project.daysRemaining -= 1;
    if (project.daysRemaining > 0) return;
    ranch.buildings[project.kind].level = project.targetLevel;
    const label = project.kind === "silo" ? `Silo Level ${project.targetLevel}` : HOUSING_UPGRADES[project.kind][project.targetLevel].name;
    ranch.construction = null;
    this.sound("success");
    this.toast(`${label} construction is complete.`);
    this.state.journal.unshift(`Ranch construction complete: ${label}.`);
    this.state.journal = this.state.journal.slice(0, 30);
    this.awardAdventureXp?.(45 + project.targetLevel * 20);
  };

  proto.advanceRanchIncubator = function advanceRanchIncubator() {
    const ranch = this.state.ranch;
    const incubator = ranch.incubator;
    if (!incubator) return;
    if (incubator.daysRemaining > 0) incubator.daysRemaining -= 1;
    if (incubator.daysRemaining > 0) return;
    if (!housingHasRoom(ranch, "coop")) { incubator.ready = true; return; }
    const id = `animal-${ranch.nextAnimalId++}`;
    const animal = createAnimal(incubator.species, id, this.state.day);
    const farmingLevel = this.state.progression?.skillLevels?.farming || 1;
    if (farmingLevel >= 9 && deterministic01(this.state.day, ranch.nextAnimalId, 0, 131) < .18) animal.colorVariant = "rare";
    ranch.animals.push(animal);
    ranch.incubator = null;
    ranch.stats.animalsPurchased += 1;
    this.sound("success");
    this.toast(`${animal.name} hatched in the coop.`);
    this.awardSkillXp?.("farming", 18, .3);
  };

  proto.growPastureGrass = function growPastureGrass() {
    const season = calendarForDay(this.state.day).season.id;
    for (const patch of this.state.ranch.grass) {
      const growth = season === "winter" ? 0 : season === "spring" ? .65 : season === "summer" ? .45 : .32;
      const bonus = deterministic01(this.state.day, patch.x, patch.y, 67) * .2;
      patch.growth = clamp(patch.growth + growth + bonus, 0, 1);
    }
  };

  proto.advanceRanchMachines = function advanceRanchMachines(minutes) {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    for (const machine of Object.values(this.state.ranch.machines)) {
      for (const slot of machine.slots) {
        if (!slot || slot.ready) continue;
        slot.remaining = Math.max(0, slot.remaining - minutes);
        if (slot.remaining <= 0) slot.ready = true;
      }
    }
  };

  proto.refreshRanchHousingPositions = function refreshRanchHousingPositions() {
    const ranch = this.state.ranch;
    ranch.animals.forEach((animal, index) => {
      const kind = animalHousing(animal);
      if (animal.outside && pastureContains(animal.x, animal.y)) return;
      const door = kind === "coop" ? COOP_SITE.door : BARN_DOOR;
      animal.x = door.x + ((index % 3) - 1) * .55;
      animal.y = door.y + 1.1 + Math.floor(index / 3) * .4;
      animal.outside = false;
    });
  };

  proto.ranchOutdoorAllowed = function ranchOutdoorAllowed(animal) {
    const ranch = this.state.ranch;
    const kind = animalHousing(animal);
    if (!ranch.buildings[kind].doorOpen) return false;
    if (isBadOutdoorWeather(this.state.weather) || festivalForDay(this.state.day)) return false;
    if (this.state.minutes < 420 || this.state.minutes > 1110) return false;
    return !animal.sick && animal.health > 20;
  };

  proto.updateRanchAnimals = function updateRanchAnimals(dt) {
    const ranch = this.state.ranch;
    for (const animal of ranch.animals) {
      const species = ANIMAL_SPECIES[animal.species];
      if (!species) continue;
      if (!this.ranchOutdoorAllowed(animal)) { animal.outside = false; continue; }
      if (!animal.outside) {
        animal.outside = true;
        const numericId = Number(String(animal.id).match(/\d+/)?.[0]) || 1;
        animal.x = PASTURE.x + 2 + (numericId % 4) * 1.8;
        animal.y = PASTURE.y + 3 + (numericId % 7) * 2.5;
      }
      animal.wasOutsideToday = true;
      animal.wanderTimer = Math.max(0, (animal.wanderTimer || 0) - dt);
      let targetGrass = null;
      if (!animal.fedToday) targetGrass = ranch.grass.filter((patch) => patch.growth >= .55).sort((a, b) => distance(animal, a) - distance(animal, b))[0] || null;
      if (targetGrass) {
        animal.targetX = targetGrass.x;
        animal.targetY = targetGrass.y;
      } else if (animal.targetX == null || animal.wanderTimer <= 0 || Math.hypot(animal.x - animal.targetX, animal.y - animal.targetY) < .25) {
        const seed = deterministic01(this.state.day, animal.x, animal.y, Math.floor(this.state.minutes / 30));
        const seed2 = deterministic01(this.state.day, animal.y, animal.x, Math.floor(this.state.minutes / 20) + 19);
        animal.targetX = PASTURE.x + .8 + seed * (PASTURE.w - 1.6);
        animal.targetY = PASTURE.y + .8 + seed2 * (PASTURE.h - 1.6);
        animal.wanderTimer = 2.5 + seed * 4;
      }
      const dx = animal.targetX - animal.x;
      const dy = animal.targetY - animal.y;
      const d = Math.hypot(dx, dy);
      if (d > .08) {
        const step = Math.min(d, species.speed * dt);
        animal.x += dx / d * step;
        animal.y += dy / d * step;
      }
      animal.walkTime = (animal.walkTime || 0) + dt * 5;
      if (targetGrass && distance(animal, targetGrass) < .7) {
        targetGrass.growth = 0;
        animal.fedToday = true;
        animal.happiness = clamp(animal.happiness + 1, 0, 100);
        animal.targetX = null;
        animal.targetY = null;
      }
    }
  };

  proto.addRanchItem = function addRanchItem(id, quality = "normal", amount = 1, announce = true) {
    const safeQuality = RANCH_QUALITY[quality] ? quality : "normal";
    const safeAmount = Math.max(1, Math.floor(Number(amount) || 1));
    this.addItem(id, safeAmount, false);
    const record = this.state.ranch.qualityInventory[id];
    if (record) record[safeQuality] += safeAmount;
    if (announce) this.toast(`+${safeAmount} ${RANCH_QUALITY[safeQuality].icon} ${RANCH_QUALITY[safeQuality].name} ${ITEMS[id]?.name || id}`);
  };

  proto.consumeRanchQualityItem = function consumeRanchQualityItem(id) {
    this.normalizeRanchQualityInventory();
    if ((this.state.inventory[id] || 0) <= 0) return null;
    const record = this.state.ranch.qualityInventory[id];
    let quality = "normal";
    for (const candidate of QUALITY_HIGH_TO_LOW) if ((record?.[candidate] || 0) > 0) { quality = candidate; break; }
    this.state.inventory[id] -= 1;
    if (record && record[quality] > 0) record[quality] -= 1;
    return quality;
  };

  proto.collides = function collidesRanching(x, y, radius = .3) {
    if (this.state?.mode === "world" && this.state.ranch?.buildings?.coop?.level > 0) {
      const left = COOP_SITE.x; const right = COOP_SITE.x + COOP_SITE.w;
      const top = COOP_SITE.y; const bottom = COOP_SITE.y + COOP_SITE.h;
      if (x + radius > left && x - radius < right && y + radius > top && y - radius < bottom) return true;
    }
    return original.collides.call(this, x, y, radius);
  };

  proto.interact = function interactRanching() {
    if (this.state.mode === "world" && regionAt(this.state.player.x, this.state.player.y).id === "farm") {
      const animal = this.state.ranch.animals.find((entry) => entry.outside && distance(this.state.player, entry) < 1.5);
      if (animal) return this.openAnimalCare?.(animal);
      const target = this.targetTile(.9);
      const grass = this.state.ranch.grass.find((patch) => patch.growth >= .45 && Math.floor(patch.x) === target.x && Math.floor(patch.y) === target.y);
      if (grass) return this.cutRanchGrass(grass);
    }
    return original.interact.call(this);
  };

  proto.cutRanchGrass = function cutRanchGrass(patch) {
    if ((this.state.inventory.scythe || 0) <= 0) return this.toast("Buy the Ranch Scythe from the barn supply board first.");
    const room = siloCapacity(this.state.ranch) - this.state.ranch.hay;
    if (room <= 0) return this.toast("Hay storage is full. Upgrade the silo or feed animals.");
    const amount = Math.min(room, patch.growth >= .9 ? 2 : 1);
    patch.growth = 0;
    this.state.ranch.hay += amount;
    this.state.ranch.stats.grassCut += 1;
    this.spendEnergy(1);
    this.awardSkillXp?.("farming", 3, .2);
    this.sound("harvest");
    this.toast(`Cut grass into ${amount} hay. Storage ${this.state.ranch.hay}/${siloCapacity(this.state.ranch)}.`);
  };

  proto.openBuildingService = function openBuildingRanching(building) {
    if (building.id === "barn") return this.openRanchCenter?.();
    return original.openBuildingService.call(this, building);
  };

  proto.updateContextHint = function updateContextHintRanching() {
    original.updateContextHint.call(this);
    if (this.state.mode !== "world" || regionAt(this.state.player.x, this.state.player.y).id !== "farm") return;
    const hint = $("contextHint");
    const animal = this.state.ranch.animals.find((entry) => entry.outside && distance(this.state.player, entry) < 1.5);
    if (animal) {
      hint.textContent = `Interact: Care for ${animal.name} the ${ANIMAL_SPECIES[animal.species].name}`;
      hint.classList.remove("hidden");
      return;
    }
    const target = this.targetTile(.9);
    const grass = this.state.ranch.grass.find((patch) => patch.growth >= .45 && Math.floor(patch.x) === target.x && Math.floor(patch.y) === target.y);
    if (grass) {
      hint.textContent = (this.state.inventory.scythe || 0) > 0 ? "Interact: Cut pasture grass into hay" : "Pasture grass · Ranch Scythe required";
      hint.classList.remove("hidden");
    }
  };

  proto.checkRanchAchievements = function checkRanchAchievements() {
    const ranch = this.state.ranch;
    this.checkAchievement("first-flock", ranch.animals.length >= 1, "First Flock", "Welcome your first farm animal.");
    this.checkAchievement("happy-herd", ranch.animals.filter((animal) => animal.friendship >= 8 && animal.happiness >= 80).length >= 4, "Happy Herd", "Raise four deeply bonded and happy animals.");
    this.checkAchievement("master-rancher", ranch.buildings.coop.level >= 3 && ranch.buildings.barn.level >= 3 && ranch.animals.length >= 12, "Master Rancher", "Build deluxe housing and care for twelve animals.");
    this.checkAchievement("artisan-hearthvale", ranch.stats.artisanTypes.length >= 4, "Artisan of Hearthvale", "Produce four different artisan animal goods.");
  };

  proto.ranchCostText = costText;
}
