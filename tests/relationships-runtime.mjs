import assert from "node:assert/strict";
import { ITEMS, NPC_DEFS } from "../game-shared.js";
import { registerExpandedInteriors } from "../expanded-interiors-data.js";
import { installRelationships } from "../game-relationships.js";
import { clearMailboxSpace, installRelationshipsRuntime, normalizeRelationshipRuntime } from "../game-relationships-runtime.js";

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
      resources: [{ id: 1, type: "tree", x: 18.5, y: 14.5 }, { id: 2, type: "rock", x: 22.5, y: 18.5 }],
      placed: [{ id: "old", type: "lantern", x: 18.5, y: 14.5 }],
      soil: { "18,14": { tilled: true, crop: null }, "20,20": { tilled: true, crop: null } },
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
  collides() { return false; }
  checkQuests() {}
  checkAchievement(id, condition) { if (condition && !this.achievementIds.includes(id)) this.achievementIds.push(id); }
  addItem(id, amount) { this.state.inventory[id] = (this.state.inventory[id] || 0) + amount; }
  closeModal() {}
  closeDialogue() {}
  showDialogue(npc, text, choices) { this.lastDialogue = { npc: npc.id, text, choices }; }
  openModal() {}
  toast(message) { this.lastToast = message; }
  saveGame() {}
  rebuildResourceMap() { this.rebuilt = true; }
  refreshActiveWorldChunks() { this.refreshed = true; }
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
assert.deepEqual(game.state.resources.map((resource) => resource.id), [2]);
assert.deepEqual(game.state.placed, []);
assert.equal(game.state.soil["18,14"], undefined);
assert.ok(game.state.soil["20,20"]);
assert.equal(game.rebuilt, true);
assert.equal(game.collides(18.5, 14.5, .3), true, "The physical mailbox must block player movement");
assert.equal(game.collides(22.5, 18.5, .3), false);

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
    talkStreaks: { mira: -5, unknown: 7 },
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
assert.deepEqual(corrupt.social.talkedDays, { mira: 20 });
assert.deepEqual(corrupt.social.talkStreaks, {});
assert.deepEqual(corrupt.social.pendingEvents, ["mira:6"]);
assert.deepEqual(corrupt.social.completedEvents, ["mira:3"]);
assert.equal(corrupt.social.letters.length, 1);
assert.equal(corrupt.social.letters[0].day, 20);
assert.equal(corrupt.social.letters[0].reward, null);

const standalone = {
  resources: [{ id: "mail", x: 18.5, y: 14.5 }, { id: "safe", x: 30.5, y: 30.5 }],
  placed: [], soil: {},
};
assert.equal(clearMailboxSpace(standalone), 1);
assert.deepEqual(standalone.resources.map((resource) => resource.id), ["safe"]);

console.log(JSON.stringify({
  ok: true,
  welcomeMail: true,
  giftLimits: true,
  birthdayMultiplier: true,
  heartEventCompletion: true,
  oneTimeMailRewards: true,
  corruptSaveNormalization: true,
  mailboxSpaceProtection: true,
}));
