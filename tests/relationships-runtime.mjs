import assert from "node:assert/strict";
import { ITEMS, NPC_DEFS } from "../game-shared.js";
import { registerExpandedInteriors } from "../expanded-interiors-data.js";
import { installRelationships } from "../game-relationships.js";
import { installRelationshipsRuntime, normalizeRelationshipRuntime } from "../game-relationships-runtime.js";

registerExpandedInteriors();

class RelationshipHarness {
  constructor() {
    this.state = this.defaultState();
    this.lastToast = "";
    this.lastDialogue = null;
    this.achievementIds = [];
  }
  defaultState() {
    return {
      day: 1, minutes: 600, weather: "Clear", mode: "world",
      player: { x: 11.5, y: 15.5 }, living: { interiorId: null },
      inventory: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])),
      npcs: NPC_DEFS.map((npc) => ({ ...npc, friendship: 0, talkedDay: 0, x: npc.home.x, y: npc.home.y })),
      questStats: { talk: 0 }, journal: [], coins: 0, achievements: [],
      chapterOne: { completed: true, step: 14 }, chapterTwo: { completed: true, started: true, step: 16 },
      social: null,
    };
  }
  migrateState(data) { return { ...this.defaultState(), ...data, player: { ...this.defaultState().player, ...(data?.player || {}) }, living: { ...this.defaultState().living, ...(data?.living || {}) } }; }
  enterGame() {}
  nextDay() { this.state.day += 1; this.state.minutes = 360; }
  talkToNPC() { this.originalTalkCalled = true; }
  interact() {}
  interactInterior() {}
  updateContextHint() {}
  drawBuildings() {}
  showRelationships() {}
  checkQuests() {}
  checkAchievement(id, condition) { if (condition && !this.achievementIds.includes(id)) this.achievementIds.push(id); }
  addItem(id, amount) { this.state.inventory[id] = (this.state.inventory[id] || 0) + amount; }
  closeModal() {}
  closeDialogue() {}
  showDialogue(npc, text, choices) { this.lastDialogue = { npc: npc.id, text, choices }; }
  openModal() {}
  toast(message) { this.lastToast = message; }
  saveGame() {}
  sound() {}
}

installRelationships(RelationshipHarness);
installRelationshipsRuntime(RelationshipHarness);

const game = new RelationshipHarness();
game.state = game.defaultState();
game.state.inventory.berry = 3;
game.enterGame();
assert.ok(game.state.social);
assert.ok(game.state.social.letters.some((letter) => letter.id === "social-welcome"));

const mira = game.state.npcs.find((npc) => npc.id === "mira");
game.giveSocialGift("mira", "berry");
assert.equal(mira.friendship, 2, "Loved normal-day gifts should add two friendship");
assert.equal(game.state.inventory.berry, 2);
assert.deepEqual(game.state.social.giftLog.mira, [1]);

game.giveSocialGift("mira", "berry");
assert.equal(game.state.inventory.berry, 2, "A second same-day gift must not be consumed");
assert.match(game.lastToast, /already gave/i);

game.state.day = 3;
mira.friendship = 0;
game.giveSocialGift("mira", "berry");
assert.equal(mira.friendship, 4, "Loved birthday gifts should add four friendship");
assert.equal(game.state.social.pendingEvents.includes("mira:3"), true);
assert.ok(game.state.social.letters.some((letter) => letter.eventKey === "mira:3"));

game.state.mode = "interior";
game.state.living.interiorId = "seedshop";
game.state.minutes = 600;
const active = game.activeSocialHeartEvent();
assert.equal(active.npc.id, "mira");
assert.equal(active.threshold, 3);
const coinsBefore = game.state.coins;
game.completeSocialHeartEvent("mira:3");
assert.equal(game.state.social.pendingEvents.includes("mira:3"), false);
assert.equal(game.state.social.completedEvents.includes("mira:3"), true);
assert.ok(game.state.coins > coinsBefore);
assert.ok(game.state.inventory.berrySeed >= 1);
assert.equal(game.achievementIds.includes("heart-event"), true);

const welcome = game.state.social.letters.find((letter) => letter.id === "social-welcome");
const snacksBefore = game.state.inventory.snack || 0;
game.claimSocialLetter(welcome.id);
assert.equal(welcome.claimed, true);
assert.equal(game.state.inventory.snack, snacksBefore + 2);
const coinsAfterClaim = game.state.coins;
game.claimSocialLetter(welcome.id);
assert.equal(game.state.coins, coinsAfterClaim, "Mail rewards must only be claimed once");

const corrupt = normalizeRelationshipRuntime({
  day: 20,
  npcs: [{ id: "mira", friendship: 999 }, { id: "unknown", friendship: -8 }],
  social: {
    giftLog: { mira: [1, 1, 999, -2], unknown: [2] },
    talkedDays: { mira: 999, unknown: 4 },
    talkStreaks: { mira: -5 },
    pendingEvents: ["mira:3", "mira:6", "bad:9"],
    completedEvents: ["mira:3", "mira:3"],
    letters: [
      { id: "a", subject: "One", day: 999, reward: { item: "missing", amount: 99999, coins: -10 } },
      { id: "a", subject: "Duplicate", day: 1 },
    ],
  },
});
assert.equal(corrupt.npcs[0].friendship, 10);
assert.equal(corrupt.npcs[1].friendship, 0);
assert.deepEqual(corrupt.social.giftLog.mira, [1]);
assert.deepEqual(corrupt.social.pendingEvents, ["mira:6"]);
assert.deepEqual(corrupt.social.completedEvents, ["mira:3"]);
assert.equal(corrupt.social.letters.length, 1);
assert.equal(corrupt.social.letters[0].day, 20);
assert.equal(corrupt.social.letters[0].reward, null);

console.log(JSON.stringify({
  ok: true,
  welcomeMail: true,
  giftLimits: true,
  birthdayMultiplier: true,
  heartEventCompletion: true,
  oneTimeMailRewards: true,
  corruptSaveNormalization: true,
}));
