import {
  TILE, ITEMS, NPC_DEFS, clamp, distance, randomChoice, regionAt, $,
} from "./game-shared.js";
import { INTERIOR_MAPS } from "./living-world-data.js";
import { calendarForDay } from "./seasons-data.js";
import {
  SOCIAL_MAILBOX, SOCIAL_EVENT_SPOTS, RELATIONSHIP_PROFILES, RELATIONSHIP_NPC_IDS,
  profileForNpc, eventKey, heartEventForKey, giftAffinity, birthdayForNpc,
  birthdayResidents, friendshipTier,
} from "./relationship-data.js";

const SOCIAL_VERSION = 1;
const GIFT_EXCLUSIONS = new Set(["friendshipPin", "festivalToken", "waystoneStabilizer", "riftCompass"]);

export function giftWeek(day) {
  return Math.floor((Math.max(1, Math.floor(Number(day) || 1)) - 1) / 7) + 1;
}

export function createSocialState(existing = {}) {
  const value = existing && typeof existing === "object" ? existing : {};
  const normalizeMap = (input) => input && typeof input === "object" && !Array.isArray(input) ? { ...input } : {};
  const giftLog = {};
  for (const [npcId, days] of Object.entries(normalizeMap(value.giftLog))) {
    if (!RELATIONSHIP_PROFILES[npcId] || !Array.isArray(days)) continue;
    giftLog[npcId] = [...new Set(days.map((day) => Math.max(1, Math.floor(Number(day) || 1))))].sort((a, b) => a - b).slice(-30);
  }
  const knownPreferences = {};
  for (const [npcId, items] of Object.entries(normalizeMap(value.knownPreferences))) {
    if (!RELATIONSHIP_PROFILES[npcId] || !Array.isArray(items)) continue;
    knownPreferences[npcId] = [...new Set(items.filter((item) => ITEMS[item]))].slice(0, 100);
  }
  return {
    version: SOCIAL_VERSION,
    introQueued: Boolean(value.introQueued),
    lastProcessedDay: Math.max(0, Math.floor(Number(value.lastProcessedDay) || 0)),
    giftLog,
    talkedDays: normalizeMap(value.talkedDays),
    talkStreaks: normalizeMap(value.talkStreaks),
    met: Array.isArray(value.met) ? [...new Set(value.met.filter((id) => RELATIONSHIP_PROFILES[id]))] : [],
    knownPreferences,
    pendingEvents: Array.isArray(value.pendingEvents) ? [...new Set(value.pendingEvents.filter((key) => heartEventForKey(key)))].slice(0, 54) : [],
    completedEvents: Array.isArray(value.completedEvents) ? [...new Set(value.completedEvents.filter((key) => heartEventForKey(key)))].slice(0, 54) : [],
    processedBirthdayKeys: Array.isArray(value.processedBirthdayKeys) ? [...new Set(value.processedBirthdayKeys.map(String))].slice(-100) : [],
    letters: Array.isArray(value.letters) ? value.letters.filter((letter) => letter && typeof letter === "object" && letter.id).map((letter) => ({
      id: String(letter.id), from: String(letter.from || "Hearthvale Post"), subject: String(letter.subject || "Letter"),
      body: String(letter.body || ""), day: Math.max(1, Math.floor(Number(letter.day) || 1)),
      read: Boolean(letter.read), claimed: Boolean(letter.claimed),
      reward: letter.reward && typeof letter.reward === "object" ? { ...letter.reward } : null,
      eventKey: heartEventForKey(letter.eventKey) ? letter.eventKey : null,
    })).slice(-100) : [],
  };
}

export function giftStatus(social, npcId, day) {
  const days = social?.giftLog?.[npcId] || [];
  const today = Math.max(1, Math.floor(Number(day) || 1));
  const week = giftWeek(today);
  const weeklyCount = days.filter((entry) => giftWeek(entry) === week).length;
  return { giftedToday: days.includes(today), weeklyCount, remaining: Math.max(0, 2 - weeklyCount) };
}

export function canGiveGift(social, npcId, day) {
  const status = giftStatus(social, npcId, day);
  if (status.giftedToday) return { ok: false, reason: "You already gave this resident a gift today.", ...status };
  if (status.weeklyCount >= 2) return { ok: false, reason: "You have already given this resident two gifts this week.", ...status };
  return { ok: true, reason: "", ...status };
}

function queueLetterState(social, letter) {
  if (social.letters.some((entry) => entry.id === letter.id)) return false;
  social.letters.push({ read: false, claimed: false, reward: null, eventKey: null, ...letter });
  social.letters = social.letters.slice(-100);
  return true;
}

export function queueEligibleHeartEventsState(social, npcs, day) {
  let queued = 0;
  for (const npc of npcs || []) {
    const profile = profileForNpc(npc.id);
    if (!profile) continue;
    const event = profile.heartEvents.find((candidate) => npc.friendship >= candidate.threshold
      && !social.completedEvents.includes(eventKey(npc.id, candidate.threshold))
      && !social.pendingEvents.includes(eventKey(npc.id, candidate.threshold)));
    if (!event) continue;
    const key = eventKey(npc.id, event.threshold);
    social.pendingEvents.push(key);
    const mapName = INTERIOR_MAPS[event.interiorId]?.name || event.interiorId;
    queueLetterState(social, {
      id: `heart:${key}`,
      from: npc.name,
      subject: `${event.threshold}-Heart Invitation — ${event.title}`,
      body: `I would like to speak somewhere quieter. Meet me inside ${mapName} between ${formatClock(event.from)} and ${formatClock(event.to)}. — ${npc.name}`,
      day,
      eventKey: key,
    });
    queued += 1;
  }
  return queued;
}

function formatClock(minutes) {
  const hour24 = Math.floor(minutes / 60) % 24;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${hour24 % 12 || 12}:00 ${suffix}`;
}

function storyOwnsConversation(game, npc) {
  const chapterOne = game.state.chapterOne;
  if (chapterOne && !chapterOne.completed) {
    if (npc.id === "mira" && chapterOne.step === 0) return true;
    if (npc.id === "aria" && chapterOne.step >= 7 && chapterOne.step <= 10) return true;
  }
  const chapterTwo = game.state.chapterTwo;
  if (!chapterTwo || chapterTwo.completed) return false;
  if (npc.id === "aria" && (!chapterTwo.started || chapterTwo.step === 0 || chapterTwo.step === 16)) return true;
  const required = { sora: 1, oren: 5, bram: 6, mei: 7 };
  return chapterTwo.started && required[npc.id] === chapterTwo.step;
}

function giftableInventory(game) {
  return Object.entries(game.state.inventory || {})
    .filter(([id, count]) => count > 0 && ITEMS[id] && !GIFT_EXCLUSIONS.has(id))
    .sort((a, b) => (ITEMS[b[0]].value || 0) - (ITEMS[a[0]].value || 0));
}

function addJournal(game, text) {
  game.state.journal.unshift(text);
  game.state.journal = game.state.journal.slice(0, 30);
}

export function installRelationships(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    talkToNPC: proto.talkToNPC,
    interact: proto.interact,
    interactInterior: proto.interactInterior,
    updateContextHint: proto.updateContextHint,
    drawBuildings: proto.drawBuildings,
    showRelationships: proto.showRelationships,
  };

  proto.defaultState = function defaultStateRelationships() {
    const state = original.defaultState.call(this);
    state.social = createSocialState();
    return state;
  };

  proto.migrateState = function migrateStateRelationships(data) {
    const state = original.migrateState.call(this, data);
    state.social = createSocialState(data?.social || state.social);
    return state;
  };

  proto.enterGame = function enterGameRelationships() {
    original.enterGame.call(this);
    this.state.social = createSocialState(this.state.social);
    this.processSocialDay(true);
  };

  proto.nextDay = function nextDayRelationships(passedOut) {
    const result = original.nextDay.call(this, passedOut);
    this.processSocialDay(true);
    return result;
  };

  proto.processSocialDay = function processSocialDay(force = false) {
    const social = this.state.social = createSocialState(this.state.social);
    if (!social.introQueued) {
      social.introQueued = true;
      queueLetterState(social, {
        id: "social-welcome",
        from: "Mira",
        subject: "A Mailbox Full of People",
        body: "The mailbox beside your farmhouse now carries personal letters, birthday reminders, and invitations from friends. Talk often, remember what people enjoy, and make time for the moments between adventures.",
        day: this.state.day,
        reward: { item: "snack", amount: 2, coins: 40 },
      });
    }
    if (force || social.lastProcessedDay !== this.state.day) {
      const calendar = calendarForDay(this.state.day);
      for (const npcId of birthdayResidents(this.state.day)) {
        const key = `birthday:y${calendar.year}:${npcId}`;
        if (social.processedBirthdayKeys.includes(key)) continue;
        social.processedBirthdayKeys.push(key);
        const npc = this.state.npcs.find((entry) => entry.id === npcId);
        queueLetterState(social, {
          id: key,
          from: "Silvercrest Civic Post",
          subject: `${npc?.name || npcId}'s Birthday`,
          body: `Today is ${npc?.name || npcId}'s birthday. A thoughtful gift receives a stronger friendship response before midnight.`,
          day: this.state.day,
        });
      }
      social.processedBirthdayKeys = social.processedBirthdayKeys.slice(-100);
      social.lastProcessedDay = this.state.day;
    }
    const queued = queueEligibleHeartEventsState(social, this.state.npcs, this.state.day);
    if (queued > 0) this.toast(`${queued} new heart-event invitation${queued === 1 ? "" : "s"} arrived at the Farmstead mailbox.`);
  };

  proto.talkToNPC = function talkToNPCRelationships(npc) {
    if (!profileForNpc(npc.id) || storyOwnsConversation(this, npc)) return original.talkToNPC.call(this, npc);
    const social = this.state.social;
    const profile = profileForNpc(npc.id);
    const previousTalkDay = Math.floor(Number(social.talkedDays[npc.id]) || 0);
    const firstToday = previousTalkDay !== this.state.day;
    if (firstToday) {
      social.talkStreaks[npc.id] = previousTalkDay === this.state.day - 1 ? (Number(social.talkStreaks[npc.id]) || 0) + 1 : 1;
      social.talkedDays[npc.id] = this.state.day;
      npc.talkedDay = this.state.day;
      const birthdayBonus = birthdayForNpc(npc.id, this.state.day) ? 1 : 0;
      npc.friendship = clamp((Number(npc.friendship) || 0) + 1 + birthdayBonus, 0, 10);
      this.state.questStats.talk += 1;
      this.checkQuests();
      if (!social.met.includes(npc.id)) social.met.push(npc.id);
      queueEligibleHeartEventsState(social, this.state.npcs, this.state.day);
      this.checkRelationshipAchievements();
    }
    const tier = friendshipTier(npc.friendship);
    const birthdayLine = birthdayForNpc(npc.id, this.state.day) ? " It means a great deal that you remembered my birthday." : "";
    const weatherLine = this.state.weather === "Rain" ? " The rain makes today feel slower." : this.state.weather === "Snow" ? " Snow has quieted every road." : "";
    const streak = Number(social.talkStreaks[npc.id]) || 1;
    const text = `${randomChoice(npc.lines)}${weatherLine}${birthdayLine}${firstToday ? ` ${tier.icon} ${tier.name} · Friendship ${npc.friendship}/10 · Talk streak ${streak} day${streak === 1 ? "" : "s"}.` : ""}`;
    const choices = [{ label: "Goodbye", action: () => this.closeDialogue() }];
    choices.unshift({ label: "Relationship Details", action: () => { this.closeDialogue(); this.showRelationshipDetails(npc.id); } });
    if (giftableInventory(this).length) choices.unshift({ label: "Give a Gift", action: () => { this.closeDialogue(); this.showGiftPicker(npc.id); } });
    this.showDialogue(npc, text, choices);
  };

  proto.showGiftPicker = function showGiftPicker(npcId) {
    const npc = this.state.npcs.find((entry) => entry.id === npcId);
    const status = canGiveGift(this.state.social, npcId, this.state.day);
    if (!npc) return;
    if (!status.ok) return this.toast(status.reason);
    const items = giftableInventory(this);
    const html = items.map(([id, count]) => `<article class="social-gift-item"><span>${ITEMS[id].icon}</span><div><strong>${ITEMS[id].name}</strong><small>Owned ${count}</small></div><button data-social-gift="${id}">Give</button></article>`).join("");
    this.openModal(`Choose a Gift for ${npc.name}`, `<p>Daily limit: one gift per resident. Weekly limit: two. Remaining this week: <strong>${status.remaining}</strong>.</p><div class="social-gift-list">${html || "<p>No giftable items are available.</p>"}</div>`, [
      { label: "Back", action: () => { this.closeModal(); this.showRelationshipDetails(npcId); } },
    ]);
    document.querySelectorAll("[data-social-gift]").forEach((button) => { button.onclick = () => this.giveSocialGift(npcId, button.dataset.socialGift); });
  };

  proto.giveSocialGift = function giveSocialGift(npcId, itemId) {
    const npc = this.state.npcs.find((entry) => entry.id === npcId);
    if (!npc || !ITEMS[itemId] || (this.state.inventory[itemId] || 0) <= 0) return this.toast("That gift is no longer available.");
    const allowed = canGiveGift(this.state.social, npcId, this.state.day);
    if (!allowed.ok) return this.toast(allowed.reason);
    const affinity = giftAffinity(npcId, itemId);
    const birthday = birthdayForNpc(npcId, this.state.day);
    const normal = { loved: 2, liked: 1, neutral: 0, disliked: -1 };
    const birthdayValues = { loved: 4, liked: 2, neutral: 1, disliked: -1 };
    const delta = (birthday ? birthdayValues : normal)[affinity];
    this.state.inventory[itemId] -= 1;
    const log = this.state.social.giftLog[npcId] ||= [];
    log.push(this.state.day);
    this.state.social.giftLog[npcId] = [...new Set(log)].slice(-30);
    const known = this.state.social.knownPreferences[npcId] ||= [];
    if (!known.includes(itemId)) known.push(itemId);
    npc.friendship = clamp((Number(npc.friendship) || 0) + delta, 0, 10);
    this.closeModal();
    const reactions = {
      loved: `This is wonderful. You remembered exactly what I love.`,
      liked: `Thank you. This is a thoughtful choice.`,
      neutral: `Thank you for thinking of me.`,
      disliked: `I appreciate the gesture, though this really is not for me.`,
    };
    const birthdayText = birthday ? " A birthday gift makes it feel even more special." : "";
    queueEligibleHeartEventsState(this.state.social, this.state.npcs, this.state.day);
    this.checkRelationshipAchievements();
    this.showDialogue(npc, `${reactions[affinity]}${birthdayText} Friendship: ${npc.friendship}/10.`, [
      { label: "You're welcome", action: () => this.closeDialogue() },
      { label: "View Relationship", action: () => { this.closeDialogue(); this.showRelationshipDetails(npcId); } },
    ]);
    this.saveGame(true);
  };

  proto.checkRelationshipAchievements = function checkRelationshipAchievements() {
    const npcs = this.state.npcs.filter((npc) => profileForNpc(npc.id));
    this.checkAchievement("social-circle", this.state.social.met.length >= RELATIONSHIP_NPC_IDS.length, "Hearthvale Social Circle", "Meet all 18 named residents through conversation.");
    this.checkAchievement("trusted-town", npcs.filter((npc) => npc.friendship >= 8).length >= 8, "Trusted Across Town", "Reach 8 friendship with eight residents.");
    this.checkAchievement("kindred-friend", npcs.some((npc) => npc.friendship >= 10), "Kindred Friend", "Reach maximum friendship with a resident.");
  };

  proto.activeSocialHeartEvent = function activeSocialHeartEvent() {
    if (this.state.mode !== "interior") return null;
    const interiorId = this.state.living?.interiorId;
    for (const key of this.state.social.pendingEvents) {
      const event = heartEventForKey(key);
      if (!event || event.interiorId !== interiorId) continue;
      if (this.state.minutes < event.from || this.state.minutes >= event.to) continue;
      const npc = this.state.npcs.find((entry) => entry.id === event.npcId);
      const spot = SOCIAL_EVENT_SPOTS[event.interiorId];
      if (npc && spot) return { ...event, npc, spot };
    }
    return null;
  };

  proto.interact = function interactRelationships() {
    if (this.state.mode === "world" && distance(this.state.player, SOCIAL_MAILBOX) < 1.7) return this.openSocialMailbox();
    return original.interact.call(this);
  };

  proto.interactInterior = function interactInteriorRelationships() {
    const active = this.activeSocialHeartEvent();
    if (active && distance(this.state.player, active.spot) < 1.9) return this.startSocialHeartEvent(active);
    return original.interactInterior.call(this);
  };

  proto.startSocialHeartEvent = function startSocialHeartEvent(active) {
    this.showDialogue(active.npc, active.text, [
      { label: active.threshold >= 9 ? "This friendship matters to me too" : "Listen", action: () => this.completeSocialHeartEvent(active.key) },
      { label: "Maybe later", action: () => this.closeDialogue() },
    ]);
  };

  proto.completeSocialHeartEvent = function completeSocialHeartEvent(key) {
    const event = heartEventForKey(key);
    if (!event || this.state.social.completedEvents.includes(key)) return this.closeDialogue();
    const npc = this.state.npcs.find((entry) => entry.id === event.npcId);
    this.state.social.pendingEvents = this.state.social.pendingEvents.filter((entry) => entry !== key);
    this.state.social.completedEvents.push(key);
    npc.friendship = clamp((Number(npc.friendship) || 0) + 1, 0, 10);
    if (event.reward.item && ITEMS[event.reward.item]) this.addItem(event.reward.item, event.reward.amount || 1, false);
    this.state.coins += event.reward.coins || 0;
    addJournal(this, `${npc.name}'s ${event.threshold}-heart event: ${event.title}.`);
    this.closeDialogue();
    this.sound("success");
    this.toast(`${event.title} complete: +${event.reward.coins || 0} coins${event.reward.item ? ` and ${ITEMS[event.reward.item].name} ×${event.reward.amount || 1}` : ""}.`);
    queueEligibleHeartEventsState(this.state.social, this.state.npcs, this.state.day);
    this.checkAchievement("heart-event", this.state.social.completedEvents.length >= 1, "A Story Shared", "Complete a resident heart event.");
    this.checkAchievement("town-confidant", this.state.social.completedEvents.filter((entry) => entry.endsWith(":9")).length >= 5, "Town Confidant", "Complete five 9-heart resident events.");
    this.saveGame(true);
  };

  proto.drawBuildings = function drawBuildingsRelationships(ctx, bounds) {
    original.drawBuildings.call(this, ctx, bounds);
    if (SOCIAL_MAILBOX.x < bounds.startX - 1 || SOCIAL_MAILBOX.x > bounds.endX + 1 || SOCIAL_MAILBOX.y < bounds.startY - 1 || SOCIAL_MAILBOX.y > bounds.endY + 1) return;
    const x = SOCIAL_MAILBOX.x * TILE;
    const y = SOCIAL_MAILBOX.y * TILE;
    const unread = this.state.social.letters.filter((letter) => !letter.read).length;
    ctx.save();
    ctx.fillStyle = "rgba(16,36,29,.22)"; ctx.beginPath(); ctx.ellipse(x, y + 11, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6f4b35"; ctx.fillRect(x - 3, y - 2, 6, 20);
    ctx.fillStyle = "#b85c4a"; ctx.fillRect(x - 13, y - 15, 26, 17);
    ctx.fillStyle = "#e8c987"; ctx.fillRect(x - 9, y - 11, 18, 3);
    ctx.strokeStyle = "#3b2b25"; ctx.lineWidth = 3; ctx.strokeRect(x - 13, y - 15, 26, 17);
    if (unread > 0) {
      ctx.fillStyle = "#efb94a"; ctx.beginPath(); ctx.arc(x + 13, y - 17, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#10241d"; ctx.font = "bold 9px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(String(Math.min(99, unread)), x + 13, y - 14);
    }
    ctx.restore();
  };

  proto.drawSocialInteriorGuest = function drawSocialInteriorGuest(ctx, map) {
    const active = this.activeSocialHeartEvent();
    if (!active || map.id !== active.interiorId) return;
    this.drawAnimatedCharacter(ctx, { ...active.npc, x: active.spot.x, y: active.spot.y, moving: false }, active.npc.color, active.npc.name, false);
    const x = active.spot.x * TILE;
    const y = active.spot.y * TILE - 42;
    ctx.save(); ctx.fillStyle = "#f08c96"; ctx.font = "bold 18px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText("♥", x, y); ctx.restore();
  };

  proto.updateContextHint = function updateContextHintRelationships() {
    original.updateContextHint.call(this);
    const hint = $("contextHint");
    if (this.state.mode === "world" && distance(this.state.player, SOCIAL_MAILBOX) < 1.7) {
      const unread = this.state.social.letters.filter((letter) => !letter.read).length;
      hint.textContent = `Interact: Check mailbox${unread ? ` · ${unread} unread` : ""}`;
      hint.classList.remove("hidden");
      return;
    }
    const active = this.activeSocialHeartEvent();
    if (active && distance(this.state.player, active.spot) < 1.9) {
      hint.textContent = `Heart Event: ${active.npc.name} — ${active.title}`;
      hint.classList.remove("hidden");
    }
  };

  proto.openSocialMailbox = function openSocialMailbox() {
    const letters = [...this.state.social.letters].sort((a, b) => b.day - a.day);
    const html = letters.length ? letters.map((letter) => `<article class="social-letter ${letter.read ? "read" : "unread"}"><div><strong>${letter.read ? "✉️" : "📨"} ${letter.subject}</strong><small>From ${letter.from} · Day ${letter.day}</small></div><button data-social-letter="${letter.id}">${letter.read ? (letter.reward && !letter.claimed ? "Claim" : "Read Again") : "Open"}</button></article>`).join("") : "<p>The mailbox is empty.</p>";
    this.openModal("Farmstead Mailbox", `<p>${letters.filter((letter) => !letter.read).length} unread letter${letters.filter((letter) => !letter.read).length === 1 ? "" : "s"}.</p><div class="social-mail-list">${html}</div>`, [{ label: "Close", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-social-letter]").forEach((button) => { button.onclick = () => this.openSocialLetter(button.dataset.socialLetter); });
  };

  proto.openSocialLetter = function openSocialLetter(id) {
    const letter = this.state.social.letters.find((entry) => entry.id === id);
    if (!letter) return;
    letter.read = true;
    const rewardText = letter.reward && !letter.claimed ? `<p><strong>Enclosed:</strong> ${letter.reward.coins || 0} coins${letter.reward.item && ITEMS[letter.reward.item] ? ` · ${ITEMS[letter.reward.item].icon} ${ITEMS[letter.reward.item].name} ×${letter.reward.amount || 1}` : ""}</p>` : "";
    const actions = [];
    if (letter.reward && !letter.claimed) actions.push({ label: "Claim Enclosure", action: () => this.claimSocialLetter(id) });
    actions.push({ label: "Back to Mailbox", action: () => { this.closeModal(); this.openSocialMailbox(); } });
    actions.push({ label: "Close", action: () => this.closeModal() });
    this.openModal(letter.subject, `<p><em>From ${letter.from}</em></p><p>${letter.body}</p>${rewardText}`, actions);
  };

  proto.claimSocialLetter = function claimSocialLetter(id) {
    const letter = this.state.social.letters.find((entry) => entry.id === id);
    if (!letter?.reward || letter.claimed) return;
    letter.claimed = true;
    if (letter.reward.item && ITEMS[letter.reward.item]) this.addItem(letter.reward.item, letter.reward.amount || 1, false);
    this.state.coins += Math.max(0, Number(letter.reward.coins) || 0);
    this.closeModal();
    this.toast("Mailbox enclosure claimed.");
    this.saveGame(true);
  };

  proto.showRelationshipDetails = function showRelationshipDetails(npcId) {
    const npc = this.state.npcs.find((entry) => entry.id === npcId);
    const profile = profileForNpc(npcId);
    if (!npc || !profile) return;
    const calendar = calendarForDay(this.state.day);
    const tier = friendshipTier(npc.friendship);
    const known = new Set(this.state.social.knownPreferences[npcId] || []);
    const giftStatusNow = giftStatus(this.state.social, npcId, this.state.day);
    const completed = profile.heartEvents.filter((event) => this.state.social.completedEvents.includes(eventKey(npcId, event.threshold))).length;
    const pending = profile.heartEvents.find((event) => this.state.social.pendingEvents.includes(eventKey(npcId, event.threshold)));
    const displayItems = (ids) => ids.map((id) => `${known.has(id) || npc.friendship >= 3 ? ITEMS[id]?.icon || "?" : "❔"} ${known.has(id) || npc.friendship >= 3 ? ITEMS[id]?.name || id : "Unknown"}`).join(" · ");
    const birthday = `${profile.birthday[0][0].toUpperCase()}${profile.birthday[0].slice(1)} ${profile.birthday[1]}`;
    this.openModal(`${npc.emoji} ${npc.name}`, `<section class="relationship-profile"><h3>${tier.icon} ${tier.name} · ${npc.friendship}/10</h3><div class="social-heart-track"><i style="width:${npc.friendship * 10}%"></i></div><p>${profile.role}</p><p><strong>Birthday:</strong> ${birthday}${birthdayForNpc(npcId, this.state.day) ? " · 🎂 Today" : ""}</p><p><strong>Loves:</strong> ${displayItems(profile.loved)}</p><p><strong>Likes:</strong> ${displayItems(profile.liked)}</p><p><strong>Dislikes:</strong> ${displayItems(profile.disliked)}</p><p><strong>Gifts this week:</strong> ${giftStatusNow.weeklyCount}/2 · <strong>Talk streak:</strong> ${Number(this.state.social.talkStreaks[npcId]) || 0}</p><p><strong>Heart events:</strong> ${completed}/3${pending ? ` · Invitation waiting for ${INTERIOR_MAPS[pending.interiorId]?.name}` : ""}</p><small>Year ${calendar.year} · ${calendar.season.name}</small></section>`, [
      { label: "Give Gift", action: () => { this.closeModal(); this.showGiftPicker(npcId); } },
      { label: "Back to Residents", action: () => { this.closeModal(); this.showRelationships(); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
  };

  proto.showRelationships = function showRelationshipsExpanded() {
    const birthdayToday = new Set(birthdayResidents(this.state.day));
    const cards = this.state.npcs.filter((npc) => profileForNpc(npc.id)).sort((a, b) => b.friendship - a.friendship || a.name.localeCompare(b.name)).map((npc) => {
      const profile = profileForNpc(npc.id);
      const tier = friendshipTier(npc.friendship);
      const pending = profile.heartEvents.some((event) => this.state.social.pendingEvents.includes(eventKey(npc.id, event.threshold)));
      return `<button class="relationship-social-card" data-relationship-npc="${npc.id}"><span class="relationship-avatar">${npc.emoji}</span><div><strong>${npc.name}${birthdayToday.has(npc.id) ? " 🎂" : ""}</strong><small>${profile.role}</small><div class="social-heart-track"><i style="width:${npc.friendship * 10}%"></i></div><small>${tier.icon} ${tier.name} · ${npc.friendship}/10${pending ? " · 💌 Event waiting" : ""}</small></div></button>`;
    }).join("");
    this.openModal("Residents & Relationships", `<p>Talk once per day, give up to two gifts per resident each week, remember birthdays, and follow heart-event invitations from the Farmstead mailbox.</p><div class="relationship-social-grid">${cards}</div>`, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
    document.querySelectorAll("[data-relationship-npc]").forEach((button) => { button.onclick = () => { this.closeModal(); this.showRelationshipDetails(button.dataset.relationshipNpc); }; });
  };
}
