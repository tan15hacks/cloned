import assert from "node:assert/strict";
import { NPC_DEFS } from "../game-shared.js";
import { ANIMAL_SPECIES } from "../ranch-data.js";
import {
  CHARACTER_APPEARANCES, animalArtScale, characterAppearanceFor,
  characterArtTargets, installCharacterArt,
} from "../game-character-art.js";

const targets = characterArtTargets();
assert.equal(targets.residents.length, NPC_DEFS.length);
assert.equal(targets.residents.every((id) => CHARACTER_APPEARANCES[id]), true);
assert.deepEqual(new Set(targets.animalSpecies), new Set(Object.keys(ANIMAL_SPECIES)));
assert.deepEqual(targets.facings, ["down", "left", "right", "up"]);
assert.deepEqual(targets.hooks, ["drawAnimatedCharacter", "drawRanchAnimal"]);

const mira = characterAppearanceFor({ id: "mira", color: "#d95e52" });
assert.equal(mira.style, "ponytail");
assert.equal(mira.accessory, "strawHat");
assert.equal(mira.outfit, "#d95e52");

const citizenA = characterAppearanceFor({ id: "citizen-a", x: 4, y: 8 }, false, true);
const citizenB = characterAppearanceFor({ id: "citizen-a", x: 99, y: 2 }, false, true);
assert.deepEqual(citizenA, citizenB, "Citizen art must be deterministic by ID");

assert.equal(animalArtScale({ species: "cow", ageDays: 0 }) < animalArtScale({ species: "cow", ageDays: 5 }), true);
assert.equal(animalArtScale({ species: "chicken", ageDays: 3 }) < animalArtScale({ species: "cow", ageDays: 5 }), true);
assert.equal(animalArtScale({ species: "unknown", ageDays: 4 }), 1);

class Harness {
  drawAnimatedCharacter() { this.characterFallback = true; }
  drawRanchAnimal() { this.animalFallback = true; }
}
installCharacterArt(Harness);
assert.equal(typeof Harness.prototype.drawAnimatedCharacter, "function");
assert.equal(typeof Harness.prototype.drawRanchAnimal, "function");

console.log(JSON.stringify({
  ok: true,
  residents: targets.residents.length,
  animalSpecies: targets.animalSpecies.length,
  facings: targets.facings.length,
  hooks: targets.hooks.length,
}));
