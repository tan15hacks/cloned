import assert from "node:assert/strict";
import { ITEMS, NPC_DEFS } from "../game-shared.js";
import { INTERIOR_MAPS } from "../living-world-data.js";
import { registerExpandedInteriors } from "../expanded-interiors-data.js";
import {
  RELATIONSHIP_PROFILES, RELATIONSHIP_NPC_IDS, SOCIAL_EVENT_SPOTS,
  validateRelationshipProfiles, giftAffinity, birthdayForNpc, heartEventForKey,
} from "../relationship-data.js";
import {
  createSocialState, giftWeek, giftStatus, canGiveGift, queueEligibleHeartEventsState,
} from "../game-relationships.js";

registerExpandedInteriors();
assert.equal(validateRelationshipProfiles(), true);
assert.equal(RELATIONSHIP_NPC_IDS.length, 18);
assert.deepEqual(new Set(RELATIONSHIP_NPC_IDS), new Set(NPC_DEFS.map((npc) => npc.id)));
assert.ok(ITEMS.friendshipPin);

const birthdays = new Set();
for (const profile of Object.values(RELATIONSHIP_PROFILES)) {
  assert.equal(profile.heartEvents.length, 3);
  assert.deepEqual(profile.heartEvents.map((event) => event.threshold), [3, 6, 9]);
  assert.equal(profile.loved.length, 2);
  assert.ok(profile.liked.length >= 3);
  assert.ok(profile.disliked.length >= 2);
  birthdays.add(profile.birthday.join(":"));
  for (const event of profile.heartEvents) {
    assert.ok(INTERIOR_MAPS[event.interiorId], `${profile.id} event interior must exist`);
    assert.ok(event.from < event.to);
    assert.ok(event.reward.coins > 0);
    assert.ok(ITEMS[event.reward.item]);
    const spot = SOCIAL_EVENT_SPOTS[event.interiorId];
    const map = INTERIOR_MAPS[event.interiorId];
    assert.ok(spot.x > 1 && spot.y > 1 && spot.x < map.width - 1 && spot.y < map.height - 1);
    const blocked = map.objects.some((object) => object.solid && spot.x >= object.x && spot.x < object.x + object.w && spot.y >= object.y && spot.y < object.y + object.h);
    assert.equal(blocked, false, `${profile.id}:${event.threshold} event spot must be walkable`);
  }
}
assert.equal(birthdays.size, 18, "Every resident should have a unique birthday");

assert.equal(giftAffinity("mira", "berry"), "loved");
assert.equal(giftAffinity("mira", "turnip"), "liked");
assert.equal(giftAffinity("mira", "ash"), "disliked");
assert.equal(giftAffinity("mira", "stone"), "neutral");
assert.equal(birthdayForNpc("mira", 3), true);
assert.equal(birthdayForNpc("sora", 33), true);
assert.equal(birthdayForNpc("rowan", 58), true);
assert.equal(birthdayForNpc("tor", 88), true);
assert.equal(birthdayForNpc("mira", 4), false);
assert.equal(giftWeek(1), 1);
assert.equal(giftWeek(7), 1);
assert.equal(giftWeek(8), 2);

const social = createSocialState();
assert.deepEqual(giftStatus(social, "mira", 1), { giftedToday: false, weeklyCount: 0, remaining: 2 });
social.giftLog.mira = [1];
assert.equal(canGiveGift(social, "mira", 1).ok, false);
assert.equal(canGiveGift(social, "mira", 2).ok, true);
social.giftLog.mira.push(2);
assert.equal(canGiveGift(social, "mira", 3).ok, false);
assert.equal(canGiveGift(social, "mira", 8).ok, true);

const npcs = NPC_DEFS.map((npc) => ({ ...npc, friendship: npc.id === "mira" ? 9 : 0 }));
assert.equal(queueEligibleHeartEventsState(social, npcs, 9), 1);
assert.deepEqual(social.pendingEvents, ["mira:3"]);
assert.ok(social.letters.some((letter) => letter.eventKey === "mira:3"));
social.completedEvents.push("mira:3");
social.pendingEvents = [];
assert.equal(queueEligibleHeartEventsState(social, npcs, 9), 1);
assert.deepEqual(social.pendingEvents, ["mira:6"]);
assert.equal(heartEventForKey("mira:9").title, "A Place at the Table");

console.log(JSON.stringify({
  ok: true,
  residents: RELATIONSHIP_NPC_IDS.length,
  uniqueBirthdays: birthdays.size,
  heartEvents: RELATIONSHIP_NPC_IDS.length * 3,
  eventSpotsWalkable: true,
  giftLimits: true,
}));
