import { ITEMS, clamp } from "./game-shared.js";
import { createSocialState, giftWeek } from "./game-relationships.js";
import { RELATIONSHIP_PROFILES, heartEventForKey } from "./relationship-data.js";

export function normalizeRelationshipRuntime(state) {
  if (!state || typeof state !== "object") return state;
  const day = Math.max(1, Math.floor(Number(state.day) || 1));
  const social = createSocialState(state.social);

  for (const npc of state.npcs || []) {
    npc.friendship = clamp(Number(npc.friendship) || 0, 0, 10);
    if (!RELATIONSHIP_PROFILES[npc.id]) continue;
    const talkedDay = Math.max(0, Math.min(day, Math.floor(Number(social.talkedDays[npc.id]) || 0)));
    if (talkedDay > 0) social.talkedDays[npc.id] = talkedDay;
    else delete social.talkedDays[npc.id];
    const streak = clamp(Math.floor(Number(social.talkStreaks[npc.id]) || 0), 0, 9999);
    if (streak > 0) social.talkStreaks[npc.id] = streak;
    else delete social.talkStreaks[npc.id];
  }

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
    letters.push({
      id,
      from: String(raw.from || "Hearthvale Post").slice(0, 100),
      subject: String(raw.subject || "Letter").slice(0, 140),
      body: String(raw.body || "").slice(0, 3000),
      day: clamp(Math.floor(Number(raw.day) || day), 1, day),
      read: Boolean(raw.read),
      claimed: reward ? Boolean(raw.claimed) : true,
      reward: reward && (reward.item || reward.coins > 0) ? reward : null,
      eventKey: heartEventForKey(raw.eventKey) ? raw.eventKey : null,
    });
  }
  social.letters = letters.slice(-100);
  social.met = [...new Set([
    ...social.met.filter((id) => RELATIONSHIP_PROFILES[id]),
    ...Object.keys(social.talkedDays).filter((id) => RELATIONSHIP_PROFILES[id]),
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
  };

  proto.migrateState = function migrateStateRelationshipsRuntime(data) {
    return normalizeRelationshipRuntime(original.migrateState.call(this, data));
  };

  proto.enterGame = function enterGameRelationshipsRuntime() {
    normalizeRelationshipRuntime(this.state);
    const result = original.enterGame.call(this);
    normalizeRelationshipRuntime(this.state);
    this.processSocialDay?.(true);
    return result;
  };

  proto.nextDay = function nextDayRelationshipsRuntime(passedOut) {
    const result = original.nextDay.call(this, passedOut);
    normalizeRelationshipRuntime(this.state);
    return result;
  };
}
