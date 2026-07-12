import { ITEMS, NPC_DEFS } from "./game-shared.js";
import { calendarForDay } from "./seasons-data.js";

ITEMS.friendshipPin ||= { name: "Hearthvale Friendship Pin", icon: "💛", value: 250 };

export const SOCIAL_MAILBOX = { x: 18.5, y: 14.5, label: "Farmstead Mailbox" };

export const SOCIAL_EVENT_SPOTS = {
  seedshop: { x: 11.5, y: 12.0 },
  villageInn: { x: 13.5, y: 6.5 },
  blacksmith: { x: 12.5, y: 12.5 },
  apothecary: { x: 11.5, y: 6.5 },
  cityInn: { x: 14.5, y: 6.5 },
  cityMarket: { x: 15.5, y: 12.5 },
  observatory: { x: 12.5, y: 13.5 },
  cityHall: { x: 16.5, y: 14.5 },
};

const EVENT_WINDOWS = {
  seedshop: [480, 960], villageInn: [480, 1260], blacksmith: [480, 1020], apothecary: [540, 1020],
  cityInn: [540, 1260], cityMarket: [480, 1020], observatory: [960, 1380], cityHall: [540, 960],
};

const definitions = {
  mira: {
    role: "Seed keeper and village grower", birthday: ["spring", 3], eventInterior: "seedshop", rewardItem: "berrySeed",
    loved: ["berry", "moonbean"], liked: ["turnip", "herb", "apple"], disliked: ["ash", "venom"],
    titles: ["Roots Remember", "The Garden Ledger", "A Place at the Table"],
    moments: [
      "Mira shows you the first seed ledger she kept after taking over the shop. Every crossed-out failure is followed by a new attempt.",
      "Behind the counter, Mira reveals a drawer of seeds saved from difficult seasons. She trusts you to help preserve Hearthvale's growing future.",
      "Mira sets two cups beside the shop window and admits that the village feels more like home whenever you return through its gates.",
    ],
  },
  oren: {
    role: "Village inventor and metalworker", birthday: ["spring", 10], eventInterior: "blacksmith", rewardItem: "copper",
    loved: ["copper", "iron"], liked: ["stone", "silver", "gold"], disliked: ["fish", "tea"],
    titles: ["A Useful Failure", "Blueprint in the Ash", "Built to Last"],
    moments: [
      "Oren proudly demonstrates a machine that immediately rattles apart. He laughs first and asks what you think went wrong.",
      "Oren unfolds a private blueprint for a device meant to protect travelers in the Grand Depths. Your advice becomes part of the final design.",
      "With the forge quiet, Oren says the strongest things he has built were never tools, but friendships that survived every failed attempt.",
    ],
  },
  lumi: {
    role: "Painter of Waystones and wild places", birthday: ["spring", 17], eventInterior: "villageInn", rewardItem: "moonSeed",
    loved: ["moonbean", "crystal"], liked: ["mistPearl", "apple", "herb"], disliked: ["ash", "venom"],
    titles: ["A Color Without a Name", "The Unfinished Road", "Portrait of Home"],
    moments: [
      "Lumi mixes a color seen only in Veilmoor fog and asks you to name it. Your answer is written beneath the paint jar.",
      "Lumi shares an unfinished painting of the continental roads. The empty space at its center is shaped like the Farmstead.",
      "Lumi reveals a portrait of Hearthvale filled with tiny details from your adventures, saying that home is made from the people one notices.",
    ],
  },
  tavi: {
    role: "Young fisher and fearless explorer", birthday: ["spring", 24], eventInterior: "villageInn", rewardItem: "rareFish",
    loved: ["fish", "rareFish"], liked: ["apple", "snack", "berry"], disliked: ["venom", "ash"],
    titles: ["The One That Escaped", "A Map in Crayon", "Braver Together"],
    moments: [
      "Tavi tells an increasingly impossible story about a fish larger than the farmhouse. The final detail makes both of you laugh.",
      "Tavi unfolds a hand-drawn map of secret fishing spots and marks one with your name, declaring it a shared expedition base.",
      "Tavi admits that dangerous places feel less frightening after hearing your stories, because courage can be borrowed from someone trusted.",
    ],
  },
  sora: {
    role: "Astronomer of Starwatch", birthday: ["summer", 5], eventInterior: "observatory", rewardItem: "starShard",
    loved: ["crystal", "starShard"], liked: ["mistPearl", "moonbean", "rareFish"], disliked: ["ash", "swampBloom"],
    titles: ["A Moving Star", "The Sky's Margin", "Constellation of Two"],
    moments: [
      "Sora lets you track a wandering light through the Great Telescope. It moves against every known current of the sky.",
      "Sora shares a page normally kept outside the official observatory record: predictions that only make sense after your arrival in Hearthvale.",
      "Under a quiet field of stars, Sora names a new two-point constellation for the distance crossed whenever friends choose to meet again.",
    ],
  },
  aria: {
    role: "Guildmaster of Silvercrest", birthday: ["spring", 27], eventInterior: "cityHall", rewardItem: "potion",
    loved: ["relic", "voidshard"], liked: ["potion", "caveTonic", "gold"], disliked: ["fiber", "turnipSeed"],
    titles: ["Beyond the Rank", "The Empty Chair", "A Trusted Pathfinder"],
    moments: [
      "Away from the Guild desk, Aria admits that rank reports rarely capture who protected whom during an expedition.",
      "Aria shows you the empty chair reserved for advisers she can trust to challenge her decisions rather than simply obey them.",
      "Aria formally records you as a trusted Pathfinder, then quietly says the title matters less than knowing you will return.",
    ],
  },
  bram: {
    role: "Master smith of Ironhart", birthday: ["summer", 9], eventInterior: "blacksmith", rewardItem: "iron",
    loved: ["iron", "embercore"], liked: ["copper", "silver", "obsidian"], disliked: ["herb", "tea"],
    titles: ["Reading the Sparks", "The First Hammer", "Tempered Trust"],
    moments: [
      "Bram teaches you how to read the shape of forge sparks. He calls it the closest thing metal has to honest speech.",
      "Bram lets you hold the worn hammer that began the Ironhart shop and explains why he never replaced its cracked handle.",
      "Bram finishes a small pin from warm metal, saying trust should bend under pressure without ever losing its shape.",
    ],
  },
  niva: {
    role: "Arcane scholar and rune reader", birthday: ["summer", 13], eventInterior: "apothecary", rewardItem: "mistPearl",
    loved: ["mistPearl", "voidshard"], liked: ["crystal", "relic", "moonbean"], disliked: ["wood", "fiber"],
    titles: ["The Rune That Listens", "A Safe Experiment", "Written Between Worlds"],
    moments: [
      "Niva draws a rune that changes whenever you speak. She is delighted to discover that it records intention rather than sound.",
      "Niva asks you to supervise an experiment she would trust to no ordinary assistant. Together you close the circle before it destabilizes.",
      "Niva adds your name to a private grimoire of people who changed her understanding of the world without using magic at all.",
    ],
  },
  pella: {
    role: "Apothecary and field researcher", birthday: ["summer", 18], eventInterior: "apothecary", rewardItem: "tea",
    loved: ["herb", "snowHerb"], liked: ["mushroom", "tea", "swampBloom"], disliked: ["gold", "volcanicGlass"],
    titles: ["A Bitter Cure", "The Field Notebook", "Remedy for Loneliness"],
    moments: [
      "Pella asks you to test the smell of a new tonic before anyone tastes it. Your expression saves the batch from a terrible mistake.",
      "Pella shares field notes from dangerous regions and admits that several safe routes were added only after following your reports.",
      "Pella says some conditions have no bottled remedy. Consistent kindness, however, has proven remarkably effective.",
    ],
  },
  cass: {
    role: "Grand Market coordinator", birthday: ["summer", 23], eventInterior: "cityMarket", rewardItem: "gold",
    loved: ["gold", "rareFish"], liked: ["silver", "relic", "moonbean"], disliked: ["fiber", "stone"],
    titles: ["Worth More Than Coins", "The Honest Ledger", "A Permanent Account"],
    moments: [
      "Cass challenges you to price three unusual goods, then reveals that your reasoning mattered more than the numbers.",
      "Cass shows you a private ledger recording favors the market can never repay with coins. Your name already has several entries.",
      "Cass creates a permanent account in your name with a balance listed simply as: trust, payable whenever needed.",
    ],
  },
  rowan: {
    role: "Innkeeper and city cook", birthday: ["autumn", 2], eventInterior: "cityInn", rewardItem: "apple",
    loved: ["apple", "tea"], liked: ["berry", "mushroom", "fish"], disliked: ["venom", "ash"],
    titles: ["The Secret Ingredient", "After Closing", "A Reserved Seat"],
    moments: [
      "Rowan asks you to taste a new stew and waits anxiously. The secret ingredient turns out to be an apple and unreasonable optimism.",
      "After the last guest leaves, Rowan admits that keeping an inn means hearing everyone's story while rarely telling one's own.",
      "Rowan places a small reserved sign at the warmest table, saying there should always be a seat waiting whenever you return.",
    ],
  },
  ves: {
    role: "Singer and civic performer", birthday: ["autumn", 7], eventInterior: "cityInn", rewardItem: "moonSeed",
    loved: ["moonbean", "rareFish"], liked: ["apple", "crystal", "berry"], disliked: ["stone", "iron"],
    titles: ["A Song Without Words", "Before the Curtain", "The Returning Verse"],
    moments: [
      "Ves plays a melody still waiting for lyrics. You suggest that some feelings are clearer before words interfere.",
      "Minutes before a performance, Ves confesses that crowds are easier than singing honestly for one trusted person.",
      "Ves adds a returning verse to the city song, written for travelers who always know which light means home.",
    ],
  },
  lyra: {
    role: "Keeper of the Silvercrest Exchange", birthday: ["autumn", 12], eventInterior: "cityHall", rewardItem: "silver",
    loved: ["silver", "gold"], liked: ["relic", "crystal", "mistPearl"], disliked: ["fiber", "slimeGel"],
    titles: ["The Value of a Promise", "Unrecorded History", "A Key Without a Lock"],
    moments: [
      "Lyra explains why a promise can be more valuable than gold when both people remember its true cost.",
      "Lyra opens an archive of expeditions omitted from official history and trusts you with the names of those who made them possible.",
      "Lyra gives you a ceremonial key that opens no vault, only the certainty that the Exchange will never close its doors to you.",
    ],
  },
  jax: {
    role: "Hunter and monster specialist", birthday: ["autumn", 17], eventInterior: "blacksmith", rewardItem: "caveTonic",
    loved: ["fang", "hide"], liked: ["potion", "venom", "ash"], disliked: ["tea", "turnip"],
    titles: ["Every Scar Has a Lesson", "The Hunt Not Taken", "Watching Your Back"],
    moments: [
      "Jax points out old scars and the monster mistake behind each one. He seems pleased when you notice the lessons rather than the damage.",
      "Jax tells you about the only hunt he abandoned, choosing to rescue another hunter instead. He has never regretted the decision.",
      "Jax promises to watch your back in any region, then admits that trusting someone else to do the same is the harder skill.",
    ],
  },
  mei: {
    role: "Cartographer of continental roads", birthday: ["autumn", 24], eventInterior: "cityHall", rewardItem: "sunShell",
    loved: ["mistPearl", "relic"], liked: ["crystal", "apple", "sunShell"], disliked: ["ash", "venom"],
    titles: ["A Road That Moved", "The Hidden Annotation", "Mapped by Memory"],
    moments: [
      "Mei shows you a road that shifted overnight and asks whether a map should record where a path was or where it hopes to lead.",
      "Mei reveals tiny annotations hidden in the continental map: places where friends helped one another without asking for recognition.",
      "Mei says she no longer needs ink to find the road back to you. Some destinations are mapped by memory.",
    ],
  },
  tor: {
    role: "Guild contract officer", birthday: ["winter", 4], eventInterior: "cityHall", rewardItem: "potion",
    loved: ["relic", "obsidian"], liked: ["iron", "potion", "fang"], disliked: ["berry", "tea"],
    titles: ["The Contract's Margin", "A Name Crossed Out", "No Rank Required"],
    moments: [
      "Tor shows you the margin where contract officers record risks that official forms cannot measure.",
      "Tor explains why one old name was crossed out—not for failure, but because the hunter retired safely and chose another life.",
      "Tor says you need no rank or contract to call on him. The strongest obligations are the ones freely chosen.",
    ],
  },
  eno: {
    role: "Farmer and caravan trader", birthday: ["winter", 11], eventInterior: "cityMarket", rewardItem: "apple",
    loved: ["apple", "turnip"], liked: ["berry", "moonbean", "fish"], disliked: ["ash", "voidshard"],
    titles: ["The Crooked Apple", "Caravan Weather", "A Shared Harvest"],
    moments: [
      "Eno gives you the most crooked apple in a shipment and insists it is always the sweetest. For once, the claim is completely true.",
      "Eno teaches you to predict road weather from wagon wheels, animal behavior, and the complaints of experienced merchants.",
      "Eno proposes that your farms share their first harvest every year, not as business, but as proof that both places endured.",
    ],
  },
  faye: {
    role: "Crystal jeweler and light artist", birthday: ["winter", 20], eventInterior: "observatory", rewardItem: "crystal",
    loved: ["crystal", "frostcore"], liked: ["mistPearl", "starShard", "moonbean"], disliked: ["hide", "ash"],
    titles: ["Light Through a Flaw", "The Uncut Stone", "A Familiar Glow"],
    moments: [
      "Faye demonstrates how a crystal's flaw can split one beam into many colors. Perfect stones, she says, are often less interesting.",
      "Faye shows you an uncut crystal kept for years because no design felt worthy of it. Your adventures finally suggest one.",
      "Faye finishes a small golden pin that catches familiar light, meant to remind you that someone in Silvercrest is thinking of you.",
    ],
  },
};

function makeEvents(profile) {
  const [from, to] = EVENT_WINDOWS[profile.eventInterior];
  return [3, 6, 9].map((threshold, index) => ({
    threshold,
    title: profile.titles[index],
    text: profile.moments[index],
    interiorId: profile.eventInterior,
    from,
    to,
    reward: threshold === 3
      ? { item: profile.rewardItem, amount: 1, coins: 50 }
      : threshold === 6
        ? { item: profile.rewardItem, amount: 2, coins: 125 }
        : { item: "friendshipPin", amount: 1, coins: 300 },
  }));
}

export const RELATIONSHIP_PROFILES = Object.fromEntries(
  Object.entries(definitions).map(([id, profile]) => [id, { id, ...profile, heartEvents: makeEvents(profile) }]),
);

export const RELATIONSHIP_NPC_IDS = Object.keys(RELATIONSHIP_PROFILES);

export function profileForNpc(id) {
  return RELATIONSHIP_PROFILES[id] || null;
}

export function eventKey(npcId, threshold) {
  return `${npcId}:${threshold}`;
}

export function heartEventForKey(key) {
  const [npcId, thresholdText] = String(key).split(":");
  const threshold = Number(thresholdText);
  const profile = profileForNpc(npcId);
  const event = profile?.heartEvents.find((entry) => entry.threshold === threshold);
  return event ? { key: eventKey(npcId, threshold), npcId, profile, ...event } : null;
}

export function giftAffinity(npcId, itemId) {
  const profile = profileForNpc(npcId);
  if (!profile) return "neutral";
  if (profile.loved.includes(itemId)) return "loved";
  if (profile.liked.includes(itemId)) return "liked";
  if (profile.disliked.includes(itemId)) return "disliked";
  return "neutral";
}

export function birthdayForNpc(npcId, day) {
  const profile = profileForNpc(npcId);
  if (!profile) return false;
  const calendar = calendarForDay(day);
  return profile.birthday[0] === calendar.season.id && profile.birthday[1] === calendar.seasonDay;
}

export function birthdayResidents(day) {
  return RELATIONSHIP_NPC_IDS.filter((id) => birthdayForNpc(id, day));
}

export function friendshipTier(value) {
  const friendship = Math.max(0, Math.min(10, Number(value) || 0));
  if (friendship >= 9) return { id: "kindred", name: "Kindred Friend", icon: "💛" };
  if (friendship >= 6) return { id: "trusted", name: "Trusted Friend", icon: "🧡" };
  if (friendship >= 3) return { id: "friend", name: "Friend", icon: "💚" };
  return { id: "acquaintance", name: "Acquaintance", icon: "🤍" };
}

export function validateRelationshipProfiles() {
  const npcIds = new Set(NPC_DEFS.map((npc) => npc.id));
  return RELATIONSHIP_NPC_IDS.every((id) => {
    const profile = RELATIONSHIP_PROFILES[id];
    return npcIds.has(id)
      && profile.heartEvents.length === 3
      && profile.heartEvents.every((event) => SOCIAL_EVENT_SPOTS[event.interiorId])
      && profile.birthday[1] >= 1 && profile.birthday[1] <= 28;
  });
}
