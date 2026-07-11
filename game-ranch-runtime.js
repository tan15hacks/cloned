import { ITEMS, clamp } from "./game-shared.js";
import { calendarForDay, festivalForDay } from "./seasons-data.js";
import {
  ANIMAL_SPECIES, MACHINE_DEFS, RANCH_QUALITY, RANCH_SUPPLIES,
  housingDefinition, siloCapacity,
} from "./ranch-data.js";

function snapshotMachines(ranch) {
  return Object.fromEntries(Object.entries(ranch?.machines || {}).map(([id, machine]) => [id, (machine.slots || []).map((slot) => slot ? { ...slot } : null)]));
}

function restoreMachines(ranch, snapshot) {
  for (const [id, slots] of Object.entries(snapshot || {})) {
    if (!ranch?.machines?.[id]) continue;
    ranch.machines[id].slots = slots.map((slot) => slot ? { ...slot } : null);
  }
}

function haySaveRoll(day, animal) {
  const id = Number(String(animal?.id || "0").match(/\d+/)?.[0]) || 0;
  let value = Math.imul((Number(day) || 1) + 31, 1103515245) ^ Math.imul(id + 17, 2654435761);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

export function normalizeRanchRuntime(state) {
  const ranch = state?.ranch;
  if (!ranch) return state;
  const maxLevel = { coop: 3, barn: 3, silo: 2 };
  if (ranch.construction) {
    const kind = ranch.construction.kind;
    const current = Number(ranch.buildings?.[kind]?.level) || 0;
    if (!(kind in maxLevel) || current >= maxLevel[kind]) ranch.construction = null;
    else {
      ranch.construction.targetLevel = clamp(Math.floor(Number(ranch.construction.targetLevel) || current + 1), current + 1, maxLevel[kind]);
      ranch.construction.daysRemaining = clamp(Math.floor(Number(ranch.construction.daysRemaining) || 1), 1, 10);
    }
  }
  ranch.lastProcessedDay = clamp(Math.floor(Number(ranch.lastProcessedDay) || 0), 0, Math.max(1, Number(state.day) || 1));
  ranch.hay = clamp(Math.floor(Number(ranch.hay) || 0), 0, siloCapacity(ranch));
  ranch.troughWater = clamp(Number(ranch.troughWater) || 0, 0, 100);
  ranch.cleanliness = clamp(Number(ranch.cleanliness) || 0, 0, 100);
  for (const animal of ranch.animals || []) {
    const product = animal.productReady;
    if (!product) continue;
    if (!ITEMS[product.id] || !RANCH_QUALITY[product.quality]) animal.productReady = null;
    else product.amount = clamp(Math.floor(Number(product.amount) || 1), 1, 2);
  }
  for (const [id, def] of Object.entries(MACHINE_DEFS)) {
    const machine = ranch.machines?.[id];
    if (!machine) continue;
    machine.count = clamp(Math.floor(Number(machine.count) || 0), 0, 2);
    const slots = Array.isArray(machine.slots) ? machine.slots.slice(0, machine.count) : [];
    while (slots.length < machine.count) slots.push(null);
    machine.slots = slots.map((slot) => {
      if (!slot || def.inputs[slot.input] !== slot.output || !RANCH_QUALITY[slot.quality]) return null;
      const remaining = Math.max(0, Number(slot.remaining) || 0);
      return { ...slot, remaining, ready: Boolean(slot.ready || remaining <= 0) };
    });
  }
  return state;
}

export function installRanchingRuntime(GameClass) {
  const proto = GameClass.prototype;
  const originalMigrateState = proto.migrateState;
  const originalEnterGame = proto.enterGame;
  const originalUpdate = proto.update;
  const originalNextDay = proto.nextDay;
  const originalProcessDayEnd = proto.processRanchDayEnd;
  const originalBuyRanchSupply = proto.buyRanchSupply;

  if (originalMigrateState) proto.migrateState = function migrateStateRanchingHardened(data) {
    return normalizeRanchRuntime(originalMigrateState.call(this, data));
  };

  if (originalEnterGame) proto.enterGame = function enterGameRanchingHardened() {
    originalEnterGame.call(this);
    normalizeRanchRuntime(this.state);
  };

  proto.consumeRanchHay = function consumeRanchHay(animal = null) {
    const ranch = this.state.ranch;
    if (!ranch || ranch.hay <= 0) return false;
    const farmingLevel = this.state.progression?.skillLevels?.farming || 1;
    const conserved = farmingLevel >= 7 && haySaveRoll(this.state.day, animal) < .2;
    if (!conserved) ranch.hay -= 1;
    return true;
  };

  proto.advanceRanchMachines = function advanceRanchMachinesHardened(minutes) {
    if (!this.state?.ranch || !Number.isFinite(minutes) || minutes <= 0) return;
    const farmingLevel = this.state.progression?.skillLevels?.farming || 1;
    const effectiveMinutes = minutes * (1 + Math.max(0, farmingLevel - 5) * .04);
    for (const machine of Object.values(this.state.ranch.machines || {})) {
      for (const slot of machine.slots || []) {
        if (!slot || slot.ready) continue;
        slot.remaining = Math.max(0, (Number(slot.remaining) || 0) - effectiveMinutes);
        if (slot.remaining <= 0) slot.ready = true;
      }
    }
  };

  proto.processRanchDayEnd = function processRanchDayEndHardened() {
    const ranch = this.state?.ranch;
    if (ranch && ranch.lastProcessedDay !== this.state.day) {
      const season = calendarForDay(this.state.day).season.id;
      const festival = festivalForDay(this.state.day);
      for (const animal of ranch.animals || []) {
        const species = ANIMAL_SPECIES[animal.species];
        const building = species ? ranch.buildings?.[species.housing] : null;
        if (!species || !building || animal.fedToday) continue;
        if (building.doorOpen && !animal.sick && !["Rain", "Snow"].includes(this.state.weather) && !festival && season !== "winter") {
          const grass = (ranch.grass || []).find((patch) => patch.growth >= .55);
          if (grass) {
            grass.growth = 0;
            animal.fedToday = true;
            animal.wasOutsideToday = true;
          }
        }
        if (!animal.fedToday && housingDefinition(ranch, species.housing).autoFeeder) animal.fedToday = this.consumeRanchHay(animal);
      }
    }
    return originalProcessDayEnd.call(this);
  };

  proto.update = function updateRanchingRuntime(dt) {
    const beforeDay = Number(this.state?.day) || 1;
    const beforeMinutes = Number(this.state?.minutes) || 0;
    const machineSnapshot = snapshotMachines(this.state?.ranch);
    originalUpdate.call(this, dt);
    if (!this.state?.ranch || this.state.day !== beforeDay) return;
    restoreMachines(this.state.ranch, machineSnapshot);
    this.advanceRanchMachines(Math.max(0, (Number(this.state.minutes) || 0) - beforeMinutes));
  };

  proto.nextDay = function nextDayRanchingRuntime(passedOut) {
    const beforeMinutes = Number(this.state?.minutes) || 0;
    const machineSnapshot = snapshotMachines(this.state?.ranch);
    originalNextDay.call(this, passedOut);
    if (!this.state?.ranch) return;
    restoreMachines(this.state.ranch, machineSnapshot);
    this.advanceRanchMachines(Math.max(0, 1440 - beforeMinutes) + 360);
  };

  proto.feedRanchAnimal = function feedRanchAnimalHardened(animal) {
    if (animal.fedToday) return this.toast(`${animal.name} is already fed.`);
    if (!this.consumeRanchHay(animal)) return this.toast("No hay is stored. Cut pasture grass or buy hay.");
    animal.fedToday = true;
    animal.happiness = clamp(animal.happiness + 3, 0, 100);
    this.awardSkillXp?.("farming", 1, .1);
    this.closeModal(); this.openAnimalCare(animal);
  };

  proto.feedAllRanchAnimals = function feedAllRanchAnimalsHardened() {
    let fed = 0;
    for (const animal of this.state.ranch.animals) {
      if (animal.fedToday || !this.consumeRanchHay(animal)) continue;
      animal.fedToday = true;
      fed += 1;
    }
    if (!fed) return this.toast(this.state.ranch.hay <= 0 ? "No hay is stored." : "Every animal is already fed.");
    this.awardSkillXp?.("farming", fed, .1);
    this.toast(`Fed ${fed} animal${fed === 1 ? "" : "s"}.`);
    this.closeModal(); this.showRanchCare();
  };

  if (originalBuyRanchSupply) proto.buyRanchSupply = function buyRanchSupplyHardened(supplyId) {
    const supply = RANCH_SUPPLIES[supplyId];
    if (supply?.item !== "hay") return originalBuyRanchSupply.call(this, supplyId);
    const room = siloCapacity(this.state.ranch) - this.state.ranch.hay;
    if (room <= 0) return this.toast("Hay storage is full.");
    const amount = Math.min(room, supply.amount);
    const price = Math.ceil(supply.price * amount / supply.amount);
    if (this.state.coins < price) return this.toast("Not enough coins.");
    this.state.coins -= price;
    this.state.ranch.hay += amount;
    this.toast(`Bought Hay ×${amount} for ${price} coins.`);
    this.closeModal(); this.openRancherShop();
  };
}
