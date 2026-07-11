import assert from "node:assert/strict";
import { installRanchingRuntime } from "../game-ranch-runtime.js";

class Harness {
  constructor() {
    this.state = {
      day: 1, minutes: 600, weather: "Clear",
      progression: { skillLevels: { farming: 10 } },
      ranch: {
        hay: 5, lastProcessedDay: 0,
        buildings: { coop: { level: 3, doorOpen: true }, barn: { level: 0, doorOpen: true } },
        grass: [{ x: 4.5, y: 24.5, growth: 1 }],
        animals: [{ id: "animal-1", species: "chicken", name: "Pip", fedToday: false, wasOutsideToday: false, sick: false, happiness: 70 }],
        machines: { mayonnaise: { slots: [{ remaining: 1000, ready: false }] } },
      },
    };
  }
  update(dt) { this.state.minutes += dt; this.advanceRanchMachines(dt * 1.25); }
  nextDay() { this.processRanchDayEnd(); this.advanceRanchMachines(720); this.state.day += 1; this.state.minutes = 360; }
  processRanchDayEnd() { this.state.ranch.lastProcessedDay = this.state.day; }
  toast(message) { this.lastToast = message; }
  closeModal() {}
  openAnimalCare() {}
  showRanchCare() {}
  awardSkillXp() {}
}

installRanchingRuntime(Harness);
const game = new Harness();
game.update(10);
assert.equal(game.state.ranch.machines.mayonnaise.slots[0].remaining, 988, "Ten game minutes at Farming 10 should receive the 20% machine-speed bonus");
game.processRanchDayEnd();
assert.equal(game.state.ranch.animals[0].fedToday, true, "Off-screen clear-weather grazing should feed an animal");
assert.equal(game.state.ranch.grass[0].growth, 0);

game.state.ranch.machines.mayonnaise.slots[0] = { remaining: 1000, ready: false };
game.state.minutes = 1200;
game.nextDay(false);
assert.equal(game.state.ranch.machines.mayonnaise.slots[0].remaining, 280, "Sleeping at 8 PM should advance exactly 600 overnight minutes with the Farming 10 speed bonus");

console.log(JSON.stringify({ ok: true, offscreenGrazing: true, exactOvernightTime: true, machineSpeedBonus: true }));
