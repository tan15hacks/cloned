import { ITEMS } from "./game-shared.js";
import { MACHINE_DEFS, RANCH_PRODUCT_IDS, RANCH_QUALITY, RANCH_QUALITY_ORDER } from "./ranch-data.js";

function itemCostHtml(cost = {}) {
  return Object.entries(cost).map(([id, amount]) => id === "coins" ? `${amount} coins` : `${ITEMS[id]?.icon || "📦"} ${amount}`).join(" · ");
}
function qualityLabel(quality) {
  const def = RANCH_QUALITY[quality] || RANCH_QUALITY.normal;
  return `${def.icon} ${def.name}`;
}
function closeAnd(game, callback) { game.closeModal(); callback(); }

export function installRanchingMachines(GameClass) {
  const proto = GameClass.prototype;
  proto.showRanchMachines = function showRanchMachines() {
    const farmingLevel = this.state.progression?.skillLevels?.farming || 1;
    const html = Object.entries(MACHINE_DEFS).map(([id, def]) => {
      const machine = this.state.ranch.machines[id];
      const buildMultiplier = 1 + machine.count * .5;
      const buildCost = Object.fromEntries(Object.entries(def.cost).map(([item, amount]) => [item, Math.ceil(amount * buildMultiplier)]));
      const slots = machine.count ? machine.slots.map((slot, index) => {
        if (!slot) {
          const inputs = Object.keys(def.inputs).filter((input) => (this.state.inventory[input] || 0) > 0);
          return `<div class="machine-slot"><strong>Slot ${index + 1}: Empty</strong>${inputs.length ? inputs.map((input) => `<button data-load-machine="${id}" data-machine-slot="${index}" data-machine-input="${input}">${ITEMS[input].icon} Load ${ITEMS[input].name}</button>`).join("") : "<small>No valid input in inventory.</small>"}</div>`;
        }
        if (slot.ready) return `<div class="machine-slot ready"><strong>Slot ${index + 1}: ${qualityLabel(slot.quality)} ${ITEMS[slot.output].name}</strong><button data-collect-machine="${id}" data-machine-slot="${index}">Collect</button></div>`;
        return `<div class="machine-slot"><strong>Slot ${index + 1}: Processing ${ITEMS[slot.input].name}</strong><small>${Math.ceil(slot.remaining)} game minutes remaining</small></div>`;
      }).join("") : "<p>No machine built.</p>";
      return `<article class="machine-card"><h3>${def.icon} ${def.name} ×${machine.count}</h3><p>Farming ${def.farmingLevel} · Processes in ${def.minutes} game minutes</p>${slots}<button data-build-machine="${id}" ${machine.count >= 2 || farmingLevel < def.farmingLevel ? "disabled" : ""}>Build ${machine.count ? "Second" : "Machine"} — ${itemCostHtml(buildCost)}</button></article>`;
    }).join("");
    this.openModal("Artisan Machines", `<p>Machines continue processing while you farm, explore, or sleep. Input quality carries into the artisan product.</p><div class="machine-grid">${html}</div>`, [
      { label: "Back", action: () => closeAnd(this, () => this.openRanchCenter()) },
    ]);
    document.querySelectorAll("[data-build-machine]").forEach((button) => button.onclick = () => this.buildRanchMachine(button.dataset.buildMachine));
    document.querySelectorAll("[data-load-machine]").forEach((button) => button.onclick = () => this.loadRanchMachine(button.dataset.loadMachine, Number(button.dataset.machineSlot), button.dataset.machineInput));
    document.querySelectorAll("[data-collect-machine]").forEach((button) => button.onclick = () => this.collectRanchMachine(button.dataset.collectMachine, Number(button.dataset.machineSlot)));
  };

  proto.buildRanchMachine = function buildRanchMachine(machineId) {
    const def = MACHINE_DEFS[machineId];
    const machine = this.state.ranch.machines[machineId];
    const farmingLevel = this.state.progression?.skillLevels?.farming || 1;
    if (!def || !machine || machine.count >= 2) return;
    if (farmingLevel < def.farmingLevel) return this.toast(`Farming Level ${def.farmingLevel} is required.`);
    const multiplier = 1 + machine.count * .5;
    const cost = Object.fromEntries(Object.entries(def.cost).map(([item, amount]) => [item, Math.ceil(amount * multiplier)]));
    if (!this.canAffordRanchCost(cost)) return this.toast(`Missing materials: ${itemCostHtml(cost)}.`);
    this.payRanchCost(cost);
    machine.count += 1;
    machine.slots.push(null);
    this.awardSkillXp?.("farming", 18, .3);
    this.toast(`${def.name} built.`);
    this.closeModal(); this.showRanchMachines();
  };

  proto.loadRanchMachine = function loadRanchMachine(machineId, slotIndex, inputId) {
    const def = MACHINE_DEFS[machineId];
    const machine = this.state.ranch.machines[machineId];
    if (!def?.inputs[inputId] || !machine || machine.slots[slotIndex]) return;
    const quality = this.consumeRanchQualityItem(inputId);
    if (!quality) return this.toast(`No ${ITEMS[inputId].name} available.`);
    machine.slots[slotIndex] = { input: inputId, output: def.inputs[inputId], quality, remaining: def.minutes, ready: false };
    this.toast(`${ITEMS[inputId].name} loaded into ${def.name}.`);
    this.closeModal(); this.showRanchMachines();
  };

  proto.collectRanchMachine = function collectRanchMachine(machineId, slotIndex) {
    const machine = this.state.ranch.machines[machineId];
    const slot = machine?.slots?.[slotIndex];
    if (!slot?.ready) return;
    let quality = slot.quality;
    const farmingLevel = this.state.progression?.skillLevels?.farming || 1;
    if (farmingLevel >= 9 && Math.random() < .12) {
      const index = Math.min(RANCH_QUALITY_ORDER.length - 1, RANCH_QUALITY_ORDER.indexOf(quality) + 1);
      quality = RANCH_QUALITY_ORDER[index];
    }
    this.addRanchItem(slot.output, quality, 1, true);
    machine.slots[slotIndex] = null;
    this.state.ranch.stats.artisanCollected += 1;
    if (!this.state.ranch.stats.artisanTypes.includes(slot.output)) this.state.ranch.stats.artisanTypes.push(slot.output);
    this.awardSkillXp?.("farming", 10, .3);
    this.checkRanchAchievements();
    this.closeModal(); this.showRanchMachines();
  };

  proto.sellRanchGoods = function sellRanchGoods() {
    this.normalizeRanchQualityInventory();
    let total = 0;
    let count = 0;
    const beaconBonus = this.state.beacon.level >= 1 ? 1.1 : 1;
    const adventureBonus = (this.state.progression?.adventureLevel || 1) >= 6 ? 1.08 : 1;
    for (const id of RANCH_PRODUCT_IDS) {
      const record = this.state.ranch.qualityInventory[id];
      for (const quality of RANCH_QUALITY_ORDER) {
        const amount = record[quality] || 0;
        if (!amount) continue;
        total += Math.floor(amount * (ITEMS[id]?.value || 1) * RANCH_QUALITY[quality].multiplier * beaconBonus * adventureBonus);
        count += amount;
        record[quality] = 0;
      }
      this.state.inventory[id] = 0;
    }
    if (!count) return this.toast("No animal or artisan products are ready to sell.");
    this.state.coins += total;
    this.state.stats.totalEarned += total;
    this.sound("coin");
    this.closeModal();
    this.toast(`Sold ${count} ranch goods for ${total} coins.`);
  };
}
