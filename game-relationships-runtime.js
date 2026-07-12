import { ITEMS, clamp } from "./game-shared.js";
import { createSocialState, giftWeek } from "./game-relationships.js";
import { RELATIONSHIP_PROFILES, SOCIAL_MAILBOX, heartEventForKey } from "./relationship-data.js";

function mailboxBlocks(x, y, radius = .3) {
  const safeRadius = Math.max(0, Number(radius) || 0);
  return Math.abs(Number(x) - SOCIAL_MAILBOX.x) < .42 + safeRadius
    && Math.abs(Number(y) - SOCIAL_MAILBOX.y) < .34 + safeRadius;
}

export function clearMailboxSpace(state) {
  if (!state || typeof state !== "object") return 0;
  let removed = 0;
  if (Array.isArray(state.resources)) {
    const before = state.resources.length;
    state.resources = state.resources.filter((resource) => Math.hypot(Number(resource.x) - SOCIAL_MAILBOX.x, Number(resource.y) - SOCIAL_MAILBOX.y) >= 1.05);
    removed += before - state.resources.length;
  }
  if (Array.isArray(state.placed)) {
    const before = state.placed.length;
    state.placed = state.placed.filter((placed) => Math.hypot(Number(placed.x) - SOCIAL_MAILBOX.x, Number(placed.y) - SOCIAL_MAILBOX.y) >= 1.05);
    removed += before - state.placed.length;
  }
  if (state.soil && typeof state.soil === "object") {
    for (const key of Object.keys(state.soil)) {
      const [x, y] = key.split(",").map(Number);
      if (Math.floor(SOCIAL_MAILBOX.x) === x && Math.floor(SOCIAL_MAILBOX.y) === y) {
        delete state.soil[key];
        removed += 1;
      }
    }
  }
  return removed;
}

export function normalizeRelationshipRuntime(state) {
  if (!state || typeof state !== "object") return state;
  const day = Math.max(1, Math.floor(Number(state.day) || 1));
  const social = createSocialState(state.social);
  const talkedDays = {};
  const talkStreaks = {};

  for (const npc of state.npcs || []) {
    npc.friendship = clamp(Number(npc.friendship) || 0, 0, 10);
    if (!RELATIONSHIP_PROFILES[npc.id]) continue;
    const talkedDay = Math.max(0, Math.min(day, Math.floor(Number(social.talkedDays[npc.id]) || 0)));
    if (talkedDay > 0) talkedDays[npc.id] = talkedDay;
    const streak = clamp(Math.floor(Number(social.talkStreaks[npc.id]) || 0), 0, 9999);
    if (streak > 0) talkStreaks[npc.id] = streak;
  }
  social.talkedDays = talkedDays;
  social.talkStreaks = talkStreaks;

  for (const npcId of Object.keys(social.giftLog)) {
    social.giftLog[npcId] = [...new Set(social.giftLog[npcId]
      .map((entry) => Math.floor(Number(entry) || 0))
      .filter((entry) => entry >= 1 && entry <= day && giftWeek(entry) >= Math.max(1, giftWeek(day) - 12)))]
      .sort((a, b) => a - b)
      .slice(-30);
  }

  const completed = [...new Set(social.completedEvents.filter((key) => heartEventForKey(key)))];
  const pendingByNpc = new Map();
  for (const key of social.pendingEvents) {
    const event = heartEventForKey(key);
    if (!event || completed.includes(key)) continue;
    const current = pendingByNpc.get(event.npcId);
    if (!current || event.threshold < heartEventForKey(current).threshold) pendingByNpc.set(event.npcId, key);
  }
  social.completedEvents = completed.slice(0, 54);
  social.pendingEvents = [...pendingByNpc.values()].slice(0, 18);

  const letters = [];
  const ids = new Set();
  for (const raw of social.letters) {
    const id = String(raw.id || "");
    if (!id || ids.has(id)) continue;
    ids.add(id);
    const reward = raw.reward && typeof raw.reward === "object" ? {
      item: ITEMS[raw.reward.item] ? raw.reward.item : null,
      amount: clamp(Math.floor(Number(raw.reward.amount) || 1), 1, 999),
      coins: clamp(Math.floor(Number(raw.reward.coins) || 0), 0, 999999),
    } : null;
    const eventKey = heartEventForKey(raw.eventKey) ? raw.eventKey : null;
    letters.push({
      id: id.slice(0, 180),
      from: String(raw.from || "Hearthvale Post").slice(0, 100),
      subject: String(raw.subject || "Letter").slice(0, 140),
      body: String(raw.body || "").slice(0, 3000),
      day: clamp(Math.floor(Number(raw.day) || day), 1, day),
      read: Boolean(raw.read),
      claimed: reward ? Boolean(raw.claimed) : true,
      reward: reward && (reward.item || reward.coins > 0) ? reward : null,
      eventKey,
    });
  }
  social.letters = letters.slice(-100);
  social.met = [...new Set([
    ...social.met.filter((id) => RELATIONSHIP_PROFILES[id]),
    ...Object.keys(social.talkedDays),
  ])].slice(0, Object.keys(RELATIONSHIP_PROFILES).length);
  social.lastProcessedDay = clamp(social.lastProcessedDay, 0, day);
  social.processedBirthdayKeys = [...new Set(social.processedBirthdayKeys.map(String).filter(Boolean))].slice(-100);
  state.social = social;
  return state;
}

export function installRelationshipsRuntime(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    collides: proto.collides,
  };

  proto.migrateState = function migrateStateRelationshipsRuntime(data) {
    const state = normalizeRelationshipRuntime(original.migrateState.call(this, data));
    clearMailboxSpace(state);
    return state;
  };

  proto.enterGame = function enterGameRelationshipsRuntime() {
    normalizeRelationshipRuntime(this.state);
    const result = original.enterGame.call(this);
    normalizeRelationshipRuntime(this.state);
    const removed = clearMailboxSpace(this.state);
    if (removed > 0) {
      this.rebuildResourceMap?.();
      this.refreshActiveWorldChunks?.(true);
      this.saveGame?.(true);
    }
    return result;
  };

  proto.nextDay = function nextDayRelationshipsRuntime(passedOut) {
    const result = original.nextDay.call(this, passedOut);
    normalizeRelationshipRuntime(this.state);
    const removed = clearMailboxSpace(this.state);
    if (removed > 0) {
      this.rebuildResourceMap?.();
      this.refreshActiveWorldChunks?.(true);
      this.saveGame?.(true);
    }
    return result;
  };

  if (original.collides) proto.collides = function collidesWithMailbox(x, y, radius = .3) {
    if (this.state?.mode === "world" && mailboxBlocks(x, y, radius)) return true;
    return original.collides.call(this, x, y, radius);
  };
}
