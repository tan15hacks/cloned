import { ITEMS } from "./game-shared.js";
import { EQUIPMENT_DEFS } from "./game-combat.js";

ITEMS.riftFragment ||= { name: "Rift Fragment", icon: "🜂", value: 145 };
ITEMS.waystoneStabilizer ||= { name: "Waystone Stabilizer", icon: "🧭", value: 0 };
EQUIPMENT_DEFS.riftCompass ||= {
  name: "Rift Compass",
  icon: "🧭",
  slot: "charm",
  rarity: "epic",
  moveSpeed: .05,
  statusResist: .12,
  lootBonus: .06,
  value: 0,
};

export const CHAPTER_TWO_STEPS = [
  { id: "summons", title: "An Urgent Summons", text: "Report to Guildmaster Aria in Silvercrest." },
  { id: "observatory", title: "Read the Broken Sky", text: "Speak with Sora at Starwatch Observatory." },
  { id: "inspect-veilmoor", title: "The Fractured Waystone", text: "Inspect the damaged Waystone in Veilmoor." },
  { id: "mist-hunt", title: "Corruption in the Fog", text: "Defeat 4 corrupted creatures around the Veilmoor Waystone.", goal: 4 },
  { id: "materials", title: "A Stabilizer's Heart", text: "Gather 3 Mist Pearls, 8 Iron Ore, 2 Hearth Crystals, and 6 Rift Fragments." },
  { id: "oren", title: "A Practical Design", text: "Bring the materials to Oren in Hearthvale Village." },
  { id: "bram", title: "Forge the Stabilizer", text: "Ask Bram Ironhart to build the Waystone Stabilizer." },
  { id: "mei", title: "The Cartographer", text: "Recruit Mei in Silvercrest for the repair expedition." },
  { id: "escort", title: "Through the Vanishing Road", text: "Escort Mei to the Veilmoor Waystone." },
  { id: "defense", title: "Hold the Repair Circle", text: "Defend Mei from 6 corrupted attackers during the ritual.", goal: 6 },
  { id: "trail", title: "The Road Rewritten", text: "Follow the revealed trail into Suncleft Ruins." },
  { id: "surface-runes", title: "Three Ancient Runes", text: "Activate the Moon, Crown, and Ember runes in Suncleft Ruins.", goal: 3 },
  { id: "enter-archive", title: "Beneath Suncleft", text: "Enter the hidden Waystone Archive beneath the ruins." },
  { id: "archive-switches", title: "The Archive Gates", text: "Activate all 3 archive rune switches.", goal: 3 },
  { id: "sentinel", title: "Riftbound Sentinel", text: "Defeat the guardian sealing the final archive wing." },
  { id: "cartographer", title: "The Hollow Cartographer", text: "Defeat the source of the fractured routes." },
  { id: "return-aria", title: "A Map Made Whole", text: "Return to Guildmaster Aria in Silvercrest." },
  { id: "complete", title: "Chapter 2 Complete", text: "The Waystones are stable and the continent's roads remember you." },
];

export const CHAPTER_TWO_TARGETS = {
  guild: { x: 130.5, y: 20.5, label: "Guildmaster Aria" },
  observatory: { x: 220.5, y: 19.5, label: "Sora" },
  veilmoor: { x: 166.5, y: 112.5, label: "Fractured Waystone" },
  oren: { x: 68.5, y: 34.5, label: "Oren" },
  bram: { x: 172.5, y: 18.5, label: "Bram" },
  mei: { x: 142.5, y: 66.5, label: "Mei" },
  ruins: { x: 108.5, y: 201.5, label: "Suncleft Ruins" },
  archive: { x: 92.5, y: 212.5, label: "Hidden Archive" },
};

export const SURFACE_RUNES = [
  { id: "moon", name: "Moon Rune", x: 76.5, y: 190.5 },
  { id: "crown", name: "Crown Rune", x: 91.5, y: 184.5 },
  { id: "ember", name: "Ember Rune", x: 109.5, y: 216.5 },
];

export const STABILIZER_COST = { mistPearl: 3, iron: 8, crystal: 2, riftFragment: 6 };

export function chapterTwoEligible(state) {
  return Boolean(
    state?.chapterOne?.completed
    && (state?.progression?.adventureLevel || 1) >= 4
    && state?.progression?.bossRewards?.includes(10)
  );
}

export function createChapterTwoState(existing = {}) {
  const base = {
    version: 1,
    step: 0,
    started: false,
    completed: false,
    announced: false,
    soraBriefed: false,
    inspectedWaystone: false,
    blueprintReady: false,
    stabilizerForged: false,
    meiRecruited: false,
    escortActive: false,
    repairComplete: false,
    dungeonEntered: false,
    counters: { mistKills: 0, defenseKills: 0, surfaceRunes: 0, archiveSwitches: 0 },
    surfaceRunes: [],
    defeatedWorldEncounters: [],
    dungeon: {
      defeatedIds: [], switches: [], miniBossDefeated: false, finalBossDefeated: false,
      chestOpened: false, checkpoint: false, completed: false,
    },
    cutscene: null,
    equipmentPresets: [null, null],
    secondPresetUnlocked: false,
  };
  const value = existing && typeof existing === "object" ? existing : {};
  const result = {
    ...base,
    ...value,
    counters: { ...base.counters, ...(value.counters || {}) },
    surfaceRunes: Array.isArray(value.surfaceRunes) ? [...new Set(value.surfaceRunes)] : [],
    defeatedWorldEncounters: Array.isArray(value.defeatedWorldEncounters) ? [...new Set(value.defeatedWorldEncounters)] : [],
    dungeon: {
      ...base.dungeon,
      ...(value.dungeon || {}),
      defeatedIds: Array.isArray(value.dungeon?.defeatedIds) ? [...new Set(value.dungeon.defeatedIds)] : [],
      switches: Array.isArray(value.dungeon?.switches) ? [...new Set(value.dungeon.switches)] : [],
    },
    equipmentPresets: Array.isArray(value.equipmentPresets) ? value.equipmentPresets.slice(0, 2) : [null, null],
  };
  while (result.equipmentPresets.length < 2) result.equipmentPresets.push(null);
  result.step = Math.max(0, Math.min(CHAPTER_TWO_STEPS.length - 1, Number(result.step) || 0));
  if (result.completed) result.step = CHAPTER_TWO_STEPS.length - 1;
  return result;
}

export function chapterTwoProgress(chapter, state) {
  if (!chapter) return { value: 0, goal: 0 };
  if (chapter.step === 3) return { value: chapter.counters.mistKills, goal: 4 };
  if (chapter.step === 4) {
    const inventory = state?.inventory || {};
    const values = Object.entries(STABILIZER_COST).map(([id, amount]) => Math.min(amount, inventory[id] || 0));
    return { value: values.reduce((sum, n) => sum + n, 0), goal: Object.values(STABILIZER_COST).reduce((sum, n) => sum + n, 0) };
  }
  if (chapter.step === 9) return { value: chapter.counters.defenseKills, goal: 6 };
  if (chapter.step === 11) return { value: chapter.surfaceRunes.length, goal: 3 };
  if (chapter.step === 13) return { value: chapter.dungeon.switches.length, goal: 3 };
  return { value: 0, goal: 0 };
}

export const STORY_DUNGEON_W = 52;
export const STORY_DUNGEON_H = 34;

const carve = (tiles, x, y, w, h) => {
  for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) {
    if (yy > 0 && xx > 0 && yy < STORY_DUNGEON_H - 1 && xx < STORY_DUNGEON_W - 1) tiles[yy][xx] = "floor";
  }
};

const storyMonster = (id, type, name, x, y, hp, damage, role = "normal") => ({
  id, type, storyName: name, x, y, homeX: x, homeY: y,
  hp, maxHp: hp, cooldown: 0, storyDamage: damage, storyRole: role,
});

export function generateStoryDungeon(chapterDungeon = {}) {
  const tiles = Array.from({ length: STORY_DUNGEON_H }, () => Array(STORY_DUNGEON_W).fill("wall"));
  carve(tiles, 2, 11, 9, 12);
  carve(tiles, 11, 4, 10, 13);
  carve(tiles, 21, 17, 11, 12);
  carve(tiles, 32, 4, 10, 13);
  carve(tiles, 42, 10, 8, 14);
  carve(tiles, 9, 15, 5, 3);
  carve(tiles, 18, 13, 7, 7);
  carve(tiles, 29, 14, 7, 7);
  carve(tiles, 39, 13, 6, 5);

  const gates = [
    { id: "gate-1", x: 11, y: 15, required: 1 },
    { id: "gate-2", x: 21, y: 18, required: 2 },
    { id: "gate-3", x: 32, y: 14, required: 3 },
    { id: "boss-gate", x: 42, y: 15, boss: true },
  ];
  const switches = [
    { id: "archive-moon", name: "Moon Switch", x: 16.5, y: 8.5 },
    { id: "archive-crown", name: "Crown Switch", x: 26.5, y: 24.5 },
    { id: "archive-ember", name: "Ember Switch", x: 37.5, y: 8.5 },
  ];
  const traps = [
    { x: 14.5, y: 13.5 }, { x: 18.5, y: 14.5 }, { x: 24.5, y: 20.5 },
    { x: 28.5, y: 24.5 }, { x: 35.5, y: 13.5 }, { x: 39.5, y: 15.5 },
    { x: 45.5, y: 19.5 },
  ];
  const defeated = new Set(chapterDungeon.defeatedIds || []);
  const monsters = [
    storyMonster("archive-rift-slime-1", "meadowSlime", "Rift Slime", 7.5, 14.5, 20, 10),
    storyMonster("archive-hollow-wolf-1", "shadowWolf", "Hollow Wolf", 16.5, 12.5, 32, 16),
    storyMonster("archive-wraith-1", "fogWraith", "Mistbound Wraith", 25.5, 21.5, 38, 19),
    storyMonster("archive-guardian-1", "stoneSentinel", "Ruin Guardian", 29.5, 25.5, 52, 22),
    storyMonster("archive-mage-1", "ruinMage", "Shattered Mage", 36.5, 11.5, 45, 24),
  ].filter((monster) => !defeated.has(monster.id));

  if (!chapterDungeon.miniBossDefeated && (chapterDungeon.switches || []).length >= 3) {
    monsters.push(storyMonster("archive-sentinel", "stoneSentinel", "Riftbound Sentinel", 37.5, 12.5, 145, 29, "sentinel"));
  }
  if (!chapterDungeon.finalBossDefeated && chapterDungeon.miniBossDefeated) {
    monsters.push(storyMonster("archive-cartographer", "ruinMage", "The Hollow Cartographer", 46.5, 16.5, 240, 36, "cartographer"));
  }

  return {
    width: STORY_DUNGEON_W,
    height: STORY_DUNGEON_H,
    tiles,
    entry: { x: 5.5, y: 17.5 },
    exit: { x: 4.5, y: 17.5 },
    finalPortal: { x: 47.5, y: 20.5 },
    checkpoint: { x: 35.5, y: 8.5 },
    hiddenChest: { x: 27.5, y: 20.5 },
    gates,
    switches,
    traps,
    notes: [
      { id: "note-1", x: 6.5, y: 20.5, text: "The Waystones were not roads. They were promises between places." },
      { id: "note-2", x: 25.5, y: 19.5, text: "A cartographer tried to redraw every route at once. The map hollowed him in return." },
      { id: "note-3", x: 44.5, y: 12.5, text: "No traveler should command every destination. A path must also remember where it began." },
    ],
    monsters,
  };
}
