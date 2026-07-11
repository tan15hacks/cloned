import {
  TILE,
  CAVE_W,
  CAVE_H,
  ITEMS,
  WAYSTONES,
  CAVE_ENTRANCES,
  regionAt,
  distance,
  clamp,
  $,
} from "./game-shared.js";

export const CHAPTER_ONE_STEPS = [
  { id: "meet-mira", title: "Seeds for a New Start", text: "Talk to Mira beside her seed shop in Hearthvale Village." },
  { id: "till-soil", title: "Prepare the Field", text: "Use the hoe to till 3 empty tiles on the Farmstead crop field.", goal: 3 },
  { id: "water-soil", title: "Wake the Soil", text: "Water the 3 tilled farm tiles.", goal: 3 },
  { id: "plant-crops", title: "Plant the First Crop", text: "Select Seeds and plant 3 crops in the prepared soil.", goal: 3 },
  { id: "visit-village", title: "Follow the Village Road", text: "Travel east and enter Hearthvale Village." },
  { id: "village-waystone", title: "Awaken the Village Waystone", text: "Find and interact with the Waystone in Hearthvale Village." },
  { id: "visit-city", title: "Road to Silvercrest", text: "Continue east and enter Silvercrest City." },
  { id: "register-guild", title: "Join the Adventurers' Guild", text: "Speak with Guildmaster Aria or enter the guild hall to register." },
  { id: "accept-patrol", title: "Accept Your First Contract", text: "Accept the Greenfield Patrol beginner contract at the guild." },
  { id: "greenfield-hunt", title: "Greenfield Patrol", text: "Defeat 3 monsters in Greenfield Wilds.", goal: 3 },
  { id: "claim-patrol", title: "Report to the Guild", text: "Return to Silvercrest and claim the beginner contract reward." },
  { id: "enter-depths", title: "The Grand Depths", text: "Enter the Grand Depths through the cave entrance south of Silvercrest." },
  { id: "reach-floor-three", title: "First Descent", text: "Descend through the cave and reach Floor 3.", goal: 3 },
  { id: "return-home", title: "Return to the Farmstead", text: "Leave the cave, return to the farmhouse, and interact with its door." },
  { id: "complete", title: "Chapter 1 Complete", text: "The continent is open. Farm, explore, hunt, trade, and descend at your own pace." },
];

const CHAPTER_VERSION = 1;
const FARM_FIELD_TARGET = { x: 18.5, y: 22.5 };
const VILLAGE_ENTRY_TARGET = { x: 58.5, y: 31.5 };
const CITY_ENTRY_TARGET = { x: 118.5, y: 31.5 };
const GREENFIELD_TARGET = { x: 43.5, y: 89.5 };
const GUILD_TARGET = { x: 130.5, y: 18.5 };
const FARMHOUSE_TARGET = { x: 11.5, y: 13.5 };

export function createChapterOneState(existing = {}) {
  const base = {
    version: CHAPTER_VERSION,
    step: 0,
    completed: false,
    introShown: false,
    announced: false,
    registered: false,
    contractAccepted: false,
    contractClaimed: false,
    counters: { tilled: 0, watered: 0, planted: 0, greenfieldKills: 0 },
  };
  const merged = {
    ...base,
    ...(existing && typeof existing === "object" ? existing : {}),
    counters: { ...base.counters, ...(existing?.counters || {}) },
  };
  merged.step = clamp(Number(merged.step) || 0, 0, CHAPTER_ONE_STEPS.length - 1);
  if (merged.completed) merged.step = CHAPTER_ONE_STEPS.length - 1;
  return merged;
}

export function chapterProgressValue(chapter, state) {
  const step = chapter?.step || 0;
  if (step === 1) return { value: chapter.counters.tilled, goal: 3 };
  if (step === 2) return { value: chapter.counters.watered, goal: 3 };
  if (step === 3) return { value: chapter.counters.planted, goal: 3 };
  if (step === 9) return { value: chapter.counters.greenfieldKills, goal: 3 };
  if (step === 12) return { value: Math.min(3, state?.cave?.maxFloor || 1), goal: 3 };
  return { value: 0, goal: 0 };
}

function addJournalEntry(game, text) {
  game.state.journal.unshift(text);
  game.state.journal = game.state.journal.slice(0, 30);
}

function findNpc(game, id) {
  return game.state.npcs.find((npc) => npc.id === id);
}

function targetForObjective(game) {
  if (!game.state?.chapterOne || game.state.chapterOne.completed) return null;
  const step = game.state.chapterOne.step;
  const worldTarget = (x, y, label) => ({ mode: "world", x, y, label });
  const caveTarget = (x, y, label) => ({ mode: "cave", x, y, label });
  if (step === 0) {
    const mira = findNpc(game, "mira");
    return worldTarget(mira?.x ?? 68.5, mira?.y ?? 16.5, "Mira");
  }
  if ([1, 2, 3].includes(step)) return worldTarget(FARM_FIELD_TARGET.x, FARM_FIELD_TARGET.y, "Farm field");
  if (step === 4) return worldTarget(VILLAGE_ENTRY_TARGET.x, VILLAGE_ENTRY_TARGET.y, "Hearthvale Village");
  if (step === 5) {
    const stone = WAYSTONES.find((entry) => entry.id === "village");
    return worldTarget(stone.x, stone.y, "Village Waystone");
  }
  if (step === 6) return worldTarget(CITY_ENTRY_TARGET.x, CITY_ENTRY_TARGET.y, "Silvercrest City");
  if ([7, 8, 10].includes(step)) {
    const aria = findNpc(game, "aria");
    return worldTarget(aria?.x ?? GUILD_TARGET.x, aria?.y ?? GUILD_TARGET.y, "Adventurers' Guild");
  }
  if (step === 9) {
    const nearbyMonster = game.state.monsters
      .filter((monster) => monster.hp > 0 && regionAt(monster.x, monster.y).id === "greenfields")
      .sort((a, b) => distance(game.state.player, a) - distance(game.state.player, b))[0];
    if (nearbyMonster && regionAt(game.state.player.x, game.state.player.y).id === "greenfields") {
      return worldTarget(nearbyMonster.x, nearbyMonster.y, "Patrol target");
    }
    return worldTarget(GREENFIELD_TARGET.x, GREENFIELD_TARGET.y, "Greenfield Wilds");
  }
  if (step === 11) {
    const entrance = CAVE_ENTRANCES.find((entry) => entry.id === "grandDepths");
    return worldTarget(entrance.x, entrance.y, "Grand Depths");
  }
  if (step === 12) {
    if (game.state.mode === "cave" && game.currentCave) return caveTarget(game.currentCave.exit.x, game.currentCave.exit.y, "Down stairs");
    const entrance = CAVE_ENTRANCES.find((entry) => entry.id === "grandDepths");
    return worldTarget(entrance.x, entrance.y, "Grand Depths");
  }
  if (step === 13) {
    if (game.state.mode === "cave" && game.currentCave) return caveTarget(game.currentCave.entry.x, game.currentCave.entry.y, "Up stairs");
    return worldTarget(FARMHOUSE_TARGET.x, FARMHOUSE_TARGET.y, "Farmhouse");
  }
  return null;
}

function chapterGuildModal(game) {
  const chapter = game.state.chapterOne;
  if (chapter.step === 7) {
    game.openModal(
      "Silvercrest Adventurers' Guild",
      "<p>Guildmaster Aria offers you a provisional adventurer registration.</p><p><strong>Registration kit:</strong> 100 coins, 1 potion, and 20 Guild XP.</p>",
      [
        {
          label: "Register",
          action: () => {
            chapter.registered = true;
            game.state.coins += 100;
            game.addItem("potion", 1, false);
            game.state.guild.xp += 20;
            game.updateGuildRank();
            game.closeModal();
            game.advanceChapterOne(8, "Registered with the Silvercrest Adventurers' Guild.");
          },
        },
        { label: "Later", action: () => game.closeModal() },
      ],
    );
    return true;
  }
  if (chapter.step === 8) {
    game.openModal(
      "Beginner Contract: Greenfield Patrol",
      "<p>Greenfield Wilds lies southwest of Hearthvale. Defeat three local monsters and return safely.</p><p><strong>Reward:</strong> 250 coins, 80 Guild XP, two potions, and a weapon upgrade.</p>",
      [
        {
          label: "Accept Contract",
          action: () => {
            chapter.contractAccepted = true;
            chapter.counters.greenfieldKills = 0;
            game.closeModal();
            game.advanceChapterOne(9, "Greenfield Patrol accepted.");
          },
        },
        { label: "Later", action: () => game.closeModal() },
      ],
    );
    return true;
  }
  if (chapter.step === 9) {
    const progress = Math.min(3, chapter.counters.greenfieldKills);
    game.openModal(
      "Greenfield Patrol",
      `<p>Defeat three monsters in Greenfield Wilds.</p><div class="progress"><i style="width:${progress / 3 * 100}%"></i></div><p>${progress}/3 defeated</p>`,
      [{ label: "Close", action: () => game.closeModal() }],
    );
    return true;
  }
  if (chapter.step === 10) {
    game.openModal(
      "Greenfield Patrol Complete",
      "<p>Guildmaster Aria approves your first field report.</p><p><strong>Reward:</strong> 250 coins, 80 Guild XP, two potions, and Weapon Power 2.</p>",
      [
        {
          label: "Claim Reward",
          action: () => {
            chapter.contractClaimed = true;
            game.state.coins += 250;
            game.state.guild.xp += 80;
            game.state.upgrades.weaponPower = Math.max(2, game.state.upgrades.weaponPower);
            game.addItem("potion", 2, false);
            game.updateGuildRank();
            game.closeModal();
            game.advanceChapterOne(11, "The guild assigned your first cave expedition.");
          },
        },
      ],
    );
    return true;
  }
  return false;
}

export function installChapterOne(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    leaveToTitle: proto.leaveToTitle,
    showIntro: proto.showIntro,
    updateHUD: proto.updateHUD,
    talkToNPC: proto.talkToNPC,
    useHoe: proto.useHoe,
    useWater: proto.useWater,
    plantSeed: proto.plantSeed,
    discoverLocation: proto.discoverLocation,
    openWaystone: proto.openWaystone,
    openGuild: proto.openGuild,
    defeatMonster: proto.defeatMonster,
    enterCave: proto.enterCave,
    changeCaveFloor: proto.changeCaveFloor,
    openBuildingService: proto.openBuildingService,
    drawWorld: proto.drawWorld,
    drawCave: proto.drawCave,
    render: proto.render,
  };

  proto.defaultState = function defaultStateWithChapterOne() {
    const state = original.defaultState.call(this);
    state.chapterOne = createChapterOneState();
    return state;
  };

  proto.migrateState = function migrateStateWithChapterOne(data) {
    const state = original.migrateState.call(this, data);
    state.chapterOne = createChapterOneState(data?.chapterOne || state.chapterOne);
    return state;
  };

  proto.enterGame = function enterGameWithChapterOne() {
    original.enterGame.call(this);
    this.state.chapterOne = createChapterOneState(this.state.chapterOne);
    $("objectiveTracker")?.classList.remove("hidden");
    this.updateChapterHUD(true);
    if (this.state.flags.introSeen && !this.state.chapterOne.announced) {
      this.state.chapterOne.announced = true;
      setTimeout(() => this.toast("Chapter 1 started: follow the golden objective marker."), 350);
    }
  };

  proto.leaveToTitle = function leaveToTitleWithChapterOne() {
    $("objectiveTracker")?.classList.add("hidden");
    original.leaveToTitle.call(this);
  };

  proto.showIntro = function showChapterOneIntro() {
    const chapter = this.state?.chapterOne;
    if (!chapter || chapter.introShown) return original.showIntro.call(this);
    chapter.introShown = true;
    chapter.announced = true;
    this.state.flags.introSeen = true;
    this.showDialogue(
      { name: "Mira", emoji: "👩🏽‍🌾" },
      "Welcome to Hearthvale. Meet me beside the seed shop, and I will help you prepare your first field before you travel to Silvercrest.",
      [{ label: "Find Mira", action: () => { this.closeDialogue(); this.toast("Follow the golden marker to Mira."); } }],
    );
  };

  proto.advanceChapterOne = function advanceChapterOne(nextStep, journalText = "") {
    const chapter = this.state.chapterOne;
    if (chapter.completed || nextStep <= chapter.step) return;
    chapter.step = clamp(nextStep, 0, CHAPTER_ONE_STEPS.length - 1);
    if (journalText) addJournalEntry(this, `Chapter 1: ${journalText}`);
    const objective = CHAPTER_ONE_STEPS[chapter.step];
    this.sound("success");
    this.showZoneBanner(`Chapter 1 · ${objective.title}`);
    this.toast(`New objective: ${objective.title}`);
    this.updateChapterHUD(true);
    this.saveGame(true);
  };

  proto.completeChapterOne = function completeChapterOne() {
    const chapter = this.state.chapterOne;
    if (chapter.completed) return;
    chapter.completed = true;
    chapter.step = CHAPTER_ONE_STEPS.length - 1;
    this.state.coins += 500;
    this.state.guild.xp += 100;
    this.addItem("berrySeed", 5, false);
    this.addItem("moonSeed", 2, false);
    this.addItem("caveTonic", 2, false);
    this.updateGuildRank();
    this.checkAchievement("chapter-one", true, "A Wider Horizon", "Complete Chapter 1 of Hearthvale.");
    addJournalEntry(this, "Chapter 1 complete: the Farmstead, Silvercrest Guild, Greenfield Wilds, and Grand Depths are now part of your story.");
    this.updateChapterHUD(true);
    this.saveGame(true);
    this.openModal(
      "Chapter 1 Complete — A Wider Horizon",
      "<p>You restored the first field, awakened the village route, joined the Adventurers' Guild, completed your first hunt, and reached Cave Floor 3.</p><p><strong>Final rewards:</strong> 500 coins, 100 Guild XP, 5 Sunberry Seeds, 2 Moonbean Seeds, and 2 Cave Tonics.</p><p>The full continent is now yours to explore freely.</p>",
      [{ label: "Continue the Adventure", action: () => this.closeModal() }],
    );
  };

  proto.updateChapterHUD = function updateChapterHUD(force = false) {
    const tracker = $("objectiveTracker");
    if (!tracker || !this.state?.chapterOne) return;
    const chapter = this.state.chapterOne;
    const objective = CHAPTER_ONE_STEPS[chapter.step] || CHAPTER_ONE_STEPS.at(-1);
    const progress = chapterProgressValue(chapter, this.state);
    const signature = `${chapter.step}:${progress.value}:${chapter.completed}`;
    if (!force && this.chapterHudSignature === signature) return;
    this.chapterHudSignature = signature;
    tracker.classList.remove("hidden");
    tracker.classList.toggle("complete", chapter.completed);
    $("objectiveChapter").textContent = chapter.completed ? "CHAPTER 1 COMPLETE" : `CHAPTER 1 · ${chapter.step + 1}/${CHAPTER_ONE_STEPS.length - 1}`;
    $("objectiveTitle").textContent = objective.title;
    $("objectiveText").textContent = objective.text;
    const progressWrap = $("objectiveProgress");
    if (progress.goal > 0) {
      progressWrap.classList.remove("hidden");
      $("objectiveProgressFill").style.width = `${clamp(progress.value / progress.goal * 100, 0, 100)}%`;
      $("objectiveProgressText").textContent = `${Math.min(progress.goal, progress.value)}/${progress.goal}`;
    } else progressWrap.classList.add("hidden");
  };

  proto.updateHUD = function updateHUDWithChapterOne() {
    original.updateHUD.call(this);
    this.updateChapterHUD();
  };

  proto.talkToNPC = function talkToNPCWithChapterOne(npc) {
    const chapter = this.state.chapterOne;
    if (npc.id === "mira" && chapter.step === 0) {
      const firstToday = npc.talkedDay !== this.state.day;
      if (firstToday) {
        npc.talkedDay = this.state.day;
        npc.friendship = clamp(npc.friendship + 1, 0, 10);
        this.state.questStats.talk += 1;
      }
      this.showDialogue(
        npc,
        "Start with three small plots. Till them, water them, then plant seeds. Once the field is growing, follow the main road through Hearthvale Village to Silvercrest.",
        [
          {
            label: "Take Mira's seeds",
            action: () => {
              this.addItem("turnipSeed", 5, false);
              this.addItem("berrySeed", 3, false);
              this.closeDialogue();
              this.advanceChapterOne(1, "Mira supplied the first seeds and explained how to prepare the field.");
            },
          },
        ],
      );
      return;
    }
    if (npc.id === "aria" && chapter.step >= 7 && chapter.step <= 10) return this.openGuild();
    original.talkToNPC.call(this, npc);
  };

  proto.useHoe = function useHoeWithChapterOne(target) {
    const key = `${target.x},${target.y}`;
    const before = Boolean(this.state.soil[key]?.tilled);
    original.useHoe.call(this, target);
    const after = Boolean(this.state.soil[key]?.tilled);
    if (this.state.chapterOne.step === 1 && !before && after) {
      this.state.chapterOne.counters.tilled += 1;
      if (this.state.chapterOne.counters.tilled >= 3) this.advanceChapterOne(2, "Three farm tiles were tilled.");
      else this.updateChapterHUD(true);
    }
  };

  proto.useWater = function useWaterWithChapterOne(target) {
    const key = `${target.x},${target.y}`;
    const before = Boolean(this.state.soil[key]?.watered);
    original.useWater.call(this, target);
    const after = Boolean(this.state.soil[key]?.watered);
    if (this.state.chapterOne.step === 2 && !before && after) {
      this.state.chapterOne.counters.watered += 1;
      if (this.state.chapterOne.counters.watered >= 3) this.advanceChapterOne(3, "The prepared soil was watered.");
      else this.updateChapterHUD(true);
    }
  };

  proto.plantSeed = function plantSeedWithChapterOne(target) {
    const key = `${target.x},${target.y}`;
    const before = Boolean(this.state.soil[key]?.crop);
    original.plantSeed.call(this, target);
    const after = Boolean(this.state.soil[key]?.crop);
    if (this.state.chapterOne.step === 3 && !before && after) {
      this.state.chapterOne.counters.planted += 1;
      if (this.state.chapterOne.counters.planted >= 3) {
        this.state.coins += 75;
        this.advanceChapterOne(4, "The first three crops were planted. Mira left 75 travel coins.");
      } else this.updateChapterHUD(true);
    }
  };

  proto.discoverLocation = function discoverLocationWithChapterOne() {
    original.discoverLocation.call(this);
    const chapter = this.state.chapterOne;
    if (this.state.mode !== "world") return;
    const region = regionAt(this.state.player.x, this.state.player.y).id;
    if (chapter.step === 4 && region === "village") this.advanceChapterOne(5, "Reached Hearthvale Village.");
    else if (chapter.step === 6 && region === "city") this.advanceChapterOne(7, "Reached Silvercrest City and found the Adventurers' Guild.");
  };

  proto.openWaystone = function openWaystoneWithChapterOne(stone) {
    original.openWaystone.call(this, stone);
    if (this.state.chapterOne.step === 5 && stone.id === "village") {
      this.addItem("potion", 1, false);
      this.advanceChapterOne(6, "Awakened the Hearthvale Village Waystone and received a travel potion.");
    }
  };

  proto.openGuild = function openGuildWithChapterOne() {
    if (chapterGuildModal(this)) return;
    original.openGuild.call(this);
  };

  proto.defeatMonster = function defeatMonsterWithChapterOne(monster) {
    const worldMode = this.state.mode === "world";
    const region = worldMode && monster ? regionAt(monster.x, monster.y).id : null;
    original.defeatMonster.call(this, monster);
    const chapter = this.state.chapterOne;
    if (worldMode && region === "greenfields" && chapter.step === 9) {
      chapter.counters.greenfieldKills += 1;
      if (chapter.counters.greenfieldKills >= 3) this.advanceChapterOne(10, "Completed the Greenfield Patrol hunt.");
      else this.updateChapterHUD(true);
    }
  };

  proto.enterCave = function enterCaveWithChapterOne(floor = 1) {
    original.enterCave.call(this, floor);
    if (this.state.chapterOne.step === 11) this.advanceChapterOne(12, "Entered the Grand Depths expedition hub.");
  };

  proto.changeCaveFloor = function changeCaveFloorWithChapterOne(floor) {
    original.changeCaveFloor.call(this, floor);
    if (this.state.chapterOne.step === 12 && floor >= 3) {
      this.addItem("caveTonic", 1, false);
      this.advanceChapterOne(13, "Reached Cave Floor 3 and earned a Cave Tonic.");
    }
  };

  proto.openBuildingService = function openBuildingServiceWithChapterOne(building) {
    if (building.id === "farmhouse" && this.state.chapterOne.step === 13 && this.state.mode === "world") return this.completeChapterOne();
    original.openBuildingService.call(this, building);
  };

  proto.drawChapterObjectiveMarker = function drawChapterObjectiveMarker(ctx) {
    const target = targetForObjective(this);
    if (!target || target.mode !== this.state.mode) return;
    const bounds = this.visibleBounds(this.state.mode === "cave" ? CAVE_W : 256, this.state.mode === "cave" ? CAVE_H : 224);
    if (target.x < bounds.startX - 1 || target.x > bounds.endX + 1 || target.y < bounds.startY - 1 || target.y > bounds.endY + 1) return;
    const bob = Math.sin(performance.now() / 220) * 5;
    const x = target.x * TILE;
    const y = target.y * TILE - 34 + bob;
    ctx.save();
    ctx.shadowColor = "#ffe69b";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#efb94a";
    ctx.strokeStyle = "#10241d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 11);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x, y + 11);
    ctx.lineTo(x - 10, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff1c8";
    ctx.font = "bold 10px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#10241d";
    ctx.lineWidth = 3;
    ctx.strokeText(target.label, x, y - 17);
    ctx.fillText(target.label, x, y - 17);
    ctx.restore();
  };

  proto.drawWorld = function drawWorldWithChapterMarker(ctx) {
    original.drawWorld.call(this, ctx);
    this.drawChapterObjectiveMarker(ctx);
  };

  proto.drawCave = function drawCaveWithChapterMarker(ctx) {
    original.drawCave.call(this, ctx);
    this.drawChapterObjectiveMarker(ctx);
  };

  proto.drawChapterCompass = function drawChapterCompass(ctx, width, height) {
    const target = targetForObjective(this);
    if (!target || target.mode !== this.state.mode) return;
    const screenX = target.x * TILE - this.camera.x;
    const screenY = target.y * TILE - this.camera.y;
    const margin = 64;
    if (screenX >= margin && screenX <= width - margin && screenY >= margin && screenY <= height - margin) return;
    const centerX = width / 2;
    const centerY = height / 2;
    const angle = Math.atan2(screenY - centerY, screenX - centerX);
    const radiusX = Math.max(40, width / 2 - 48);
    const radiusY = Math.max(40, height / 2 - 84);
    const scale = Math.min(
      Math.abs(Math.cos(angle)) > .001 ? radiusX / Math.abs(Math.cos(angle)) : Infinity,
      Math.abs(Math.sin(angle)) > .001 ? radiusY / Math.abs(Math.sin(angle)) : Infinity,
    );
    const x = centerX + Math.cos(angle) * scale;
    const y = centerY + Math.sin(angle) * scale;
    const tiles = Math.max(1, Math.round(distance(this.state.player, target)));
    ctx.save();
    ctx.setTransform(this.screen.dpr, 0, 0, this.screen.dpr, 0, 0);
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(16,36,29,.94)";
    ctx.strokeStyle = "#efb94a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(angle);
    ctx.fillStyle = "#efb94a";
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-angle);
    ctx.fillStyle = "#fff1c8";
    ctx.font = "bold 10px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(`${tiles}t`, 0, 38);
    ctx.restore();
  };

  proto.render = function renderWithChapterCompass() {
    original.render.call(this);
    if (this.running && this.state && !this.state.chapterOne.completed) this.drawChapterCompass(this.ctx, this.screen.width, this.screen.height);
  };
}
