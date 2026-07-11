import {
  TILE, WORLD_W, WORLD_H, ITEMS, WAYSTONES, clamp, distance, regionAt, $, randomInt,
} from "./game-shared.js";
import { EQUIPMENT_DEFS, EQUIPMENT_SLOTS } from "./game-combat.js";
import {
  CHAPTER_TWO_STEPS, CHAPTER_TWO_TARGETS, SURFACE_RUNES, STABILIZER_COST,
  chapterTwoEligible, createChapterTwoState, chapterTwoProgress,
} from "./chapter-two-data.js";

const WORLD_ENCOUNTERS = {
  hunt: [
    ["c2-mist-1", "fogWraith", "Mistbound Wraith", 161.5, 108.5, 34, 19],
    ["c2-mist-2", "veilHound", "Hollow Hound", 171.5, 109.5, 38, 20],
    ["c2-mist-3", "lanternMoth", "Shattered Moth", 160.5, 118.5, 30, 17],
    ["c2-mist-4", "fogWraith", "Rift Wraith", 173.5, 117.5, 40, 21],
  ],
  defense: [
    ["c2-defense-1", "fogWraith", "Mistbound Wraith", 159.5, 106.5, 38, 20],
    ["c2-defense-2", "veilHound", "Hollow Hound", 174.5, 107.5, 42, 21],
    ["c2-defense-3", "lanternMoth", "Shattered Moth", 158.5, 114.5, 34, 18],
    ["c2-defense-4", "fogWraith", "Rift Wraith", 174.5, 115.5, 44, 22],
    ["c2-defense-5", "stoneSentinel", "Ruin Guardian", 163.5, 121.5, 56, 24],
    ["c2-defense-6", "ruinMage", "Shattered Mage", 170.5, 121.5, 50, 26],
  ],
};

const hasCost = (inventory) => Object.entries(STABILIZER_COST).every(([id, amount]) => (inventory[id] || 0) >= amount);
const consumeCost = (inventory) => Object.entries(STABILIZER_COST).forEach(([id, amount]) => { inventory[id] -= amount; });
const addJournal = (game, text) => {
  game.state.journal.unshift(`Chapter 2: ${text}`);
  game.state.journal = game.state.journal.slice(0, 30);
};

function npcById(game, id) { return game.state.npcs.find((npc) => npc.id === id); }
function worldTarget(x, y, label) { return { mode: "world", x, y, label }; }
function dungeonTarget(x, y, label) { return { mode: "storyDungeon", x, y, label }; }

export function chapterTwoTargets(game) {
  const chapter = game.state?.chapterTwo;
  if (!chapter || chapter.completed || !chapter.started) return [];
  const step = chapter.step;
  if (step === 0 || step === 16) return [worldTarget(CHAPTER_TWO_TARGETS.guild.x, CHAPTER_TWO_TARGETS.guild.y, CHAPTER_TWO_TARGETS.guild.label)];
  if (step === 1) return [worldTarget(CHAPTER_TWO_TARGETS.observatory.x, CHAPTER_TWO_TARGETS.observatory.y, CHAPTER_TWO_TARGETS.observatory.label)];
  if ([2, 8].includes(step)) return [worldTarget(CHAPTER_TWO_TARGETS.veilmoor.x, CHAPTER_TWO_TARGETS.veilmoor.y, CHAPTER_TWO_TARGETS.veilmoor.label)];
  if ([3, 9].includes(step)) {
    const kind = step === 3 ? "hunt" : "defense";
    const alive = game.state.monsters
      .filter((monster) => monster.chapterTwoEncounter === kind && monster.hp > 0 && !monster.combat?.dead)
      .sort((a, b) => distance(game.state.player, a) - distance(game.state.player, b));
    return alive.length ? [worldTarget(alive[0].x, alive[0].y, alive[0].storyName || "Corrupted creature")] : [worldTarget(166.5, 112.5, "Veilmoor repair circle")];
  }
  if (step === 4) return [worldTarget(166.5, 112.5, "Gather stabilizer materials")];
  if (step === 5) return [worldTarget(CHAPTER_TWO_TARGETS.oren.x, CHAPTER_TWO_TARGETS.oren.y, CHAPTER_TWO_TARGETS.oren.label)];
  if (step === 6) return [worldTarget(CHAPTER_TWO_TARGETS.bram.x, CHAPTER_TWO_TARGETS.bram.y, CHAPTER_TWO_TARGETS.bram.label)];
  if (step === 7) return [worldTarget(CHAPTER_TWO_TARGETS.mei.x, CHAPTER_TWO_TARGETS.mei.y, CHAPTER_TWO_TARGETS.mei.label)];
  if (step === 10) return [worldTarget(CHAPTER_TWO_TARGETS.ruins.x, CHAPTER_TWO_TARGETS.ruins.y, CHAPTER_TWO_TARGETS.ruins.label)];
  if (step === 11) return SURFACE_RUNES.filter((rune) => !chapter.surfaceRunes.includes(rune.id)).map((rune) => worldTarget(rune.x, rune.y, rune.name));
  if (step === 12) return [worldTarget(CHAPTER_TWO_TARGETS.archive.x, CHAPTER_TWO_TARGETS.archive.y, CHAPTER_TWO_TARGETS.archive.label)];
  if (step === 13 && game.currentStoryDungeon) return game.currentStoryDungeon.switches
    .filter((entry) => !chapter.dungeon.switches.includes(entry.id))
    .map((entry) => dungeonTarget(entry.x, entry.y, entry.name));
  if (step === 14 && game.currentStoryDungeon) {
    const boss = game.currentStoryDungeon.monsters.find((monster) => monster.storyRole === "sentinel");
    return boss ? [dungeonTarget(boss.x, boss.y, boss.storyName)] : [];
  }
  if (step === 15 && game.currentStoryDungeon) {
    const boss = game.currentStoryDungeon.monsters.find((monster) => monster.storyRole === "cartographer");
    return boss ? [dungeonTarget(boss.x, boss.y, boss.storyName)] : [];
  }
  return [];
}

export function installChapterTwo(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    update: proto.update,
    updatePlayer: proto.updatePlayer,
    updateCamera: proto.updateCamera,
    updateHUD: proto.updateHUD,
    updateChapterHUD: proto.updateChapterHUD,
    talkToNPC: proto.talkToNPC,
    openGuild: proto.openGuild,
    openWaystone: proto.openWaystone,
    discoverLocation: proto.discoverLocation,
    interact: proto.interact,
    addItem: proto.addItem,
    finalizeMonsterDefeat: proto.finalizeMonsterDefeat,
    drawWorld: proto.drawWorld,
    render: proto.render,
    toggleGameMenu: proto.toggleGameMenu,
  };

  proto.defaultState = function defaultStateWithChapterTwo() {
    const state = original.defaultState.call(this);
    state.chapterTwo = createChapterTwoState();
    return state;
  };

  proto.migrateState = function migrateStateWithChapterTwo(data) {
    const state = original.migrateState.call(this, data);
    state.chapterTwo = createChapterTwoState(data?.chapterTwo || state.chapterTwo);
    return state;
  };

  proto.enterGame = function enterGameWithChapterTwo() {
    original.enterGame.call(this);
    this.state.chapterTwo = createChapterTwoState(this.state.chapterTwo);
    this.currentStoryDungeon = null;
    this.updateChapterHUD(true);
    if (chapterTwoEligible(this.state) && !this.state.chapterTwo.started && !this.state.chapterTwo.announced) {
      this.state.chapterTwo.announced = true;
      setTimeout(() => this.toast("Chapter 2 unlocked: Guildmaster Aria has sent an urgent summons."), 500);
    }
  };

  proto.updatePlayer = function updatePlayerChapterTwo(dt) {
    if (this.state?.chapterTwo?.cutscene) return;
    original.updatePlayer.call(this, dt);
  };

  proto.updateCamera = function updateCameraChapterTwo() {
    const scene = this.state?.chapterTwo?.cutscene;
    if (scene && this.state.mode === "world") {
      const targetX = scene.x * TILE - this.screen.width / 2;
      const targetY = scene.y * TILE - this.screen.height / 2;
      this.camera.x += (clamp(targetX, 0, WORLD_W * TILE - this.screen.width) - this.camera.x) * .08;
      this.camera.y += (clamp(targetY, 0, WORLD_H * TILE - this.screen.height) - this.camera.y) * .08;
      return;
    }
    original.updateCamera.call(this);
  };

  proto.update = function updateChapterTwo(dt) {
    original.update.call(this, dt);
    const chapter = this.state?.chapterTwo;
    if (!chapter) return;
    if (chapter.cutscene) {
      chapter.cutscene.timer -= dt;
      if (chapter.cutscene.timer <= 0) chapter.cutscene = null;
    }
    if (!chapter.started && chapterTwoEligible(this.state) && !chapter.announced) {
      chapter.announced = true;
      this.toast("Chapter 2 unlocked: report to Guildmaster Aria.");
      this.updateChapterHUD(true);
    }
    if (this.state.mode !== "world" || !chapter.started || chapter.completed) return;
    this.ensureChapterTwoWorldEncounters();
    this.updateChapterTwoEscort(dt);
    this.checkChapterTwoMaterials();
  };

  proto.playChapterTwoCutscene = function playChapterTwoCutscene(title, text, x, y, duration = 3.2) {
    this.state.chapterTwo.cutscene = { title, text, x, y, timer: duration, duration };
    this.showZoneBanner(title);
  };

  proto.advanceChapterTwo = function advanceChapterTwo(nextStep, journalText = "") {
    const chapter = this.state.chapterTwo;
    if (chapter.completed || nextStep <= chapter.step) return;
    chapter.step = clamp(nextStep, 0, CHAPTER_TWO_STEPS.length - 1);
    if (journalText) addJournal(this, journalText);
    const objective = CHAPTER_TWO_STEPS[chapter.step];
    this.sound("success");
    this.showZoneBanner(`Chapter 2 · ${objective.title}`);
    this.toast(`New objective: ${objective.title}`);
    this.updateChapterHUD(true);
    this.saveGame(true);
  };

  proto.startChapterTwo = function startChapterTwo() {
    const chapter = this.state.chapterTwo;
    if (chapter.started) return;
    if (!chapterTwoEligible(this.state)) return this.toast("Chapter 2 requires Chapter 1, Adventure Level 4, and the Floor 10 guardian reward.");
    chapter.started = true;
    chapter.step = 0;
    addJournal(this, "Guildmaster Aria issued an urgent summons after the Waystone network fractured.");
    this.playChapterTwoCutscene("THE FRACTURED WAYSTONES", "Silver light tears across the ancient travel network.", 186.5, 41.5, 3.5);
    this.updateChapterHUD(true);
  };

  proto.showChapterTwoGuildScene = function showChapterTwoGuildScene() {
    const chapter = this.state.chapterTwo;
    if (!chapter.started) this.startChapterTwo();
    if (chapter.step === 0) {
      this.showDialogue(
        npcById(this, "aria") || { name: "Guildmaster Aria", emoji: "🧝🏽‍♀️" },
        "Three Waystones screamed at once. Sora traced the first fracture to Veilmoor. I need someone who knows the roads, the wilds, and the Depths—and that is now you.",
        [
          { label: "I will investigate", action: () => { this.closeDialogue(); this.advanceChapterTwo(1, "Accepted Aria's investigation of the fractured Waystones."); } },
          { label: "Why me?", action: () => this.showDialogue({ name: "Guildmaster Aria", emoji: "🧝🏽‍♀️" }, "Because you rebuilt a life, crossed the continent, and survived the first guardian. Maps trust people who understand both beginnings and endings.", [{ label: "Then I will go", action: () => { this.closeDialogue(); this.advanceChapterTwo(1, "Accepted Aria's investigation of the fractured Waystones."); } }]) },
        ],
      );
      return true;
    }
    if (chapter.step === 16) {
      this.completeChapterTwo();
      return true;
    }
    return false;
  };

  proto.openGuild = function openGuildChapterTwo() {
    const chapter = this.state.chapterTwo;
    if ((!chapter.started && chapterTwoEligible(this.state)) || chapter.step === 0 || chapter.step === 16) {
      if (this.showChapterTwoGuildScene()) return;
    }
    original.openGuild.call(this);
  };

  proto.talkToNPC = function talkToNPCChapterTwo(npc) {
    const chapter = this.state.chapterTwo;
    if (npc.id === "aria" && ((!chapter.started && chapterTwoEligible(this.state)) || chapter.step === 0 || chapter.step === 16)) return this.showChapterTwoGuildScene();
    if (chapter.started && !chapter.completed) {
      if (npc.id === "sora" && chapter.step === 1) {
        this.showDialogue(npc, "The fracture is not random. Something beneath Suncleft is drawing paths toward itself. Veilmoor's Waystone carries the strongest echo.", [
          { label: "Can the stone be repaired?", action: () => { chapter.soraBriefed = true; this.closeDialogue(); this.advanceChapterTwo(2, "Sora traced the first fracture to Veilmoor and Suncleft Ruins."); } },
          { label: "What created the echo?", action: () => { chapter.soraBriefed = true; this.closeDialogue(); this.advanceChapterTwo(2, "Sora traced an impossible map beneath Suncleft Ruins."); } },
        ]);
        return;
      }
      if (npc.id === "oren" && chapter.step === 5) {
        this.showDialogue(npc, "Mist Pearls can hold a route in place, but the frame needs iron and Hearth Crystal. Bram can forge it if I draw the stabilizing rings.", [
          { label: "Prepare the blueprint", action: () => { chapter.blueprintReady = true; this.closeDialogue(); this.advanceChapterTwo(6, "Oren designed a Waystone Stabilizer from the gathered materials."); } },
        ]);
        return;
      }
      if (npc.id === "bram" && chapter.step === 6) {
        if (!chapter.blueprintReady || !hasCost(this.state.inventory)) return this.toast("Bram still needs Oren's blueprint and every stabilizer material.");
        this.showDialogue(npc, "This device will not tame the Waystone. It will remind the stone which road is real. Hold it steady when the rift fights back.", [
          { label: "Forge the stabilizer", action: () => {
            consumeCost(this.state.inventory);
            this.addItem("waystoneStabilizer", 1, false);
            chapter.stabilizerForged = true;
            this.closeDialogue();
            this.advanceChapterTwo(7, "Bram forged the Waystone Stabilizer.");
          } },
        ]);
        return;
      }
      if (npc.id === "mei" && chapter.step === 7) {
        this.showDialogue(npc, "I have charted every safe road to Veilmoor, but the fog is rewriting them. Stay close and I will mark the path while you protect the stabilizer.", [
          { label: "Travel together", action: () => {
            chapter.meiRecruited = true;
            chapter.escortActive = true;
            this.closeDialogue();
            this.advanceChapterTwo(8, "Mei joined the expedition to Veilmoor.");
          } },
        ]);
        return;
      }
    }
    if (chapter.completed && ["aria", "sora", "mei"].includes(npc.id)) {
      const line = npc.id === "aria" ? "The Guild now calls you Pathfinder. Every stable route bears your mark."
        : npc.id === "sora" ? "The stars have stopped bending around Suncleft. For now, the sky agrees with the map."
          : "The roads are finally staying where I draw them. I never thought that sentence would feel miraculous.";
      this.showDialogue(npc, line, [{ label: "Goodbye", action: () => this.closeDialogue() }]);
      return;
    }
    original.talkToNPC.call(this, npc);
  };

  proto.openWaystone = function openWaystoneChapterTwo(stone) {
    const chapter = this.state.chapterTwo;
    if (chapter.started && stone.id === "veilmoor" && chapter.step === 2) {
      chapter.inspectedWaystone = true;
      this.playChapterTwoCutscene("THE FRACTURED WAYSTONE", "The stone reflects roads that do not exist.", stone.x, stone.y, 3.4);
      this.advanceChapterTwo(3, "Inspected the Veilmoor Waystone and drew out its corrupted guardians.");
      this.ensureChapterTwoWorldEncounters(true);
      return;
    }
    if (!this.state.discoveredWaystones.includes(stone.id)) this.state.discoveredWaystones.push(stone.id);
    const stabilized = chapter.completed;
    if (!stabilized && this.state.beacon.level < 2) return original.openWaystone.call(this, stone);
    const destinations = WAYSTONES.filter((entry) => (stabilized || this.state.discoveredWaystones.includes(entry.id)) && entry.id !== stone.id);
    const energyCost = stabilized ? 0 : 5;
    this.openModal(stabilized ? "Stabilized Waystone Travel" : "Waystone Travel", `<p>${stabilized ? "Every continental route is stable." : `Travel strain: ${energyCost} energy.`}</p><div class="menu-grid">${destinations.map((entry) => `<button data-c2-travel="${entry.id}">${entry.name}</button>`).join("")}</div>`, [{ label: "Cancel", action: () => this.closeModal() }]);
    document.querySelectorAll("[data-c2-travel]").forEach((button) => button.onclick = () => {
      if (this.state.player.energy < energyCost) return this.toast("Not enough energy for Waystone travel.");
      const destination = WAYSTONES.find((entry) => entry.id === button.dataset.c2Travel);
      this.state.player.energy -= energyCost;
      this.state.player.x = destination.spawn.x;
      this.state.player.y = destination.spawn.y;
      this.activeChunkSignature = "";
      this.refreshActiveWorldChunks?.(true);
      this.closeModal();
      this.showZoneBanner(destination.name);
      this.toast(stabilized ? `Stabilized route: ${destination.name}.` : `Traveled to ${destination.name} for ${energyCost} energy.`);
    });
  };

  proto.discoverLocation = function discoverLocationChapterTwo() {
    original.discoverLocation.call(this);
    const chapter = this.state.chapterTwo;
    if (chapter.started && chapter.step === 10 && this.state.mode === "world" && regionAt(this.state.player.x, this.state.player.y).id === "ruins") {
      this.playChapterTwoCutscene("SUNCLEFT REMEMBERS", "Three runes ignite beneath the broken columns.", 92.5, 201.5, 3);
      this.advanceChapterTwo(11, "Followed the repaired route into Suncleft Ruins.");
    }
  };

  proto.interact = function interactChapterTwo() {
    const chapter = this.state.chapterTwo;
    if (this.state.mode === "world" && chapter?.started && !chapter.completed) {
      if (chapter.step === 11) {
        const rune = SURFACE_RUNES.find((entry) => !chapter.surfaceRunes.includes(entry.id) && distance(this.state.player, entry) < 1.7);
        if (rune) {
          chapter.surfaceRunes.push(rune.id);
          chapter.counters.surfaceRunes = chapter.surfaceRunes.length;
          this.sound("success");
          addJournal(this, `Activated the ${rune.name}.`);
          if (chapter.surfaceRunes.length >= 3) this.advanceChapterTwo(12, "The three Suncleft runes revealed a hidden Waystone Archive.");
          else this.updateChapterHUD(true);
          return;
        }
      }
      if (chapter.step === 12 && distance(this.state.player, CHAPTER_TWO_TARGETS.archive) < 2) return this.enterStoryDungeon();
    }
    original.interact.call(this);
  };

  proto.addItem = function addItemChapterTwo(id, amount = 1, announce = false) {
    original.addItem.call(this, id, amount, announce);
    this.checkChapterTwoMaterials();
  };

  proto.checkChapterTwoMaterials = function checkChapterTwoMaterials() {
    const chapter = this.state?.chapterTwo;
    if (!chapter?.started || chapter.step !== 4 || !hasCost(this.state.inventory)) return;
    this.advanceChapterTwo(5, "Collected Mist Pearls, Iron, Hearth Crystals, and Rift Fragments for the stabilizer.");
  };

  proto.ensureChapterTwoWorldEncounters = function ensureChapterTwoWorldEncounters(force = false) {
    const chapter = this.state.chapterTwo;
    const kind = chapter.step === 3 ? "hunt" : chapter.step === 9 ? "defense" : null;
    if (!kind) return;
    if (!force && distance(this.state.player, CHAPTER_TWO_TARGETS.veilmoor) > 32) return;
    for (const [id, type, name, x, y, hp, damage] of WORLD_ENCOUNTERS[kind]) {
      if (chapter.defeatedWorldEncounters.includes(id) || this.state.monsters.some((monster) => monster.id === id)) continue;
      this.state.monsters.push({
        id, type, storyName: name, chapterTwoEncounter: kind, x, y, homeX: x, homeY: y,
        hp, maxHp: hp, storyDamage: damage, cooldown: 0,
      });
    }
  };

  proto.updateChapterTwoEscort = function updateChapterTwoEscort(dt) {
    const chapter = this.state.chapterTwo;
    const mei = npcById(this, "mei");
    if (!mei) return;
    if (chapter.step === 8 && chapter.escortActive) {
      const player = this.state.player;
      const d = distance(mei, player);
      if (d > 1.8) {
        const speed = Math.min(3.3, Math.max(1.2, d));
        mei.x += (player.x - mei.x) / d * speed * dt;
        mei.y += (player.y - mei.y) / d * speed * dt;
        mei.moving = true;
      }
      if (distance(player, CHAPTER_TWO_TARGETS.veilmoor) < 4.5 && d < 4) {
        chapter.escortActive = false;
        mei.x = 164.5; mei.y = 112.5;
        this.advanceChapterTwo(9, "Mei began the Waystone repair ritual.");
        this.playChapterTwoCutscene("DEFEND THE REPAIR", "The rift opens and corrupted shapes pour through.", 166.5, 112.5, 2.8);
        this.ensureChapterTwoWorldEncounters(true);
      }
    } else if (chapter.step === 9) {
      mei.x = 164.5; mei.y = 112.5; mei.moving = false;
    }
  };

  proto.finalizeMonsterDefeat = function finalizeMonsterDefeatChapterTwo(monster, def) {
    if (this.state.mode !== "world" || !monster?.chapterTwoEncounter) return original.finalizeMonsterDefeat.call(this, monster, def);
    const chapter = this.state.chapterTwo;
    const kind = monster.chapterTwoEncounter;
    const id = monster.id;
    const before = this.state.combat.lootDrops.length;
    original.finalizeMonsterDefeat.call(this, monster, def);
    const drop = this.state.combat.lootDrops.slice(before)[0] || this.state.combat.lootDrops.at(-1);
    if (drop) {
      const storyItems = [{ id: "riftFragment", amount: kind === "hunt" ? 2 : 1 }];
      if (kind === "hunt" && ["c2-mist-1", "c2-mist-2", "c2-mist-3"].includes(id)) storyItems.push({ id: "mistPearl", amount: 1 });
      drop.items = [...(drop.items || []), ...storyItems];
    }
    if (!chapter.defeatedWorldEncounters.includes(id)) chapter.defeatedWorldEncounters.push(id);
    if (kind === "hunt" && chapter.step === 3) {
      chapter.counters.mistKills += 1;
      if (chapter.counters.mistKills >= 4) this.advanceChapterTwo(4, "Cleared the corrupted creatures surrounding the Veilmoor Waystone.");
      else this.updateChapterHUD(true);
    }
    if (kind === "defense" && chapter.step === 9) {
      chapter.counters.defenseKills += 1;
      if (chapter.counters.defenseKills >= 6) {
        chapter.repairComplete = true;
        this.state.inventory.waystoneStabilizer = Math.max(0, (this.state.inventory.waystoneStabilizer || 0) - 1);
        this.playChapterTwoCutscene("ROUTE STABILIZED", "A golden road appears beneath the fog and points south-west.", 166.5, 112.5, 3.4);
        this.advanceChapterTwo(10, "Protected Mei until the Veilmoor Waystone was stabilized.");
      } else this.updateChapterHUD(true);
    }
  };

  proto.updateChapterHUD = function updateChapterHUDChapterTwo(force = false) {
    const chapterOneActive = this.state?.chapterOne && !this.state.chapterOne.completed;
    if (chapterOneActive) { $("objectiveTracker")?.classList.remove("chapter-two"); return original.updateChapterHUD?.call(this, force); }
    const tracker = $("objectiveTracker");
    if (!tracker || !this.state?.chapterTwo) return;
    const chapter = this.state.chapterTwo;
    tracker.classList.add("chapter-two");
    if (!chapter.started) {
      if (!this.state.chapterOne?.completed) return;
      tracker.classList.remove("hidden");
      tracker.classList.remove("complete");
      $("objectiveChapter").textContent = chapterTwoEligible(this.state) ? "CHAPTER 2 READY" : "CHAPTER 2 LOCKED";
      $("objectiveTitle").textContent = chapterTwoEligible(this.state) ? "The Fractured Waystones" : "Prepare for the Fracture";
      $("objectiveText").textContent = chapterTwoEligible(this.state)
        ? "Report to Guildmaster Aria in Silvercrest."
        : "Complete Chapter 1, reach Adventure Level 4, and defeat the Floor 10 guardian.";
      $("objectiveProgress").classList.add("hidden");
      return;
    }
    const objective = CHAPTER_TWO_STEPS[chapter.step] || CHAPTER_TWO_STEPS.at(-1);
    const progress = chapterTwoProgress(chapter, this.state);
    const signature = `c2:${chapter.step}:${progress.value}:${chapter.completed}`;
    if (!force && this.chapterTwoHudSignature === signature) return;
    this.chapterTwoHudSignature = signature;
    tracker.classList.remove("hidden");
    tracker.classList.toggle("complete", chapter.completed);
    $("objectiveChapter").textContent = chapter.completed ? "CHAPTER 2 COMPLETE" : `CHAPTER 2 · ${chapter.step + 1}/${CHAPTER_TWO_STEPS.length - 1}`;
    $("objectiveTitle").textContent = objective.title;
    $("objectiveText").textContent = objective.text;
    const wrap = $("objectiveProgress");
    if (progress.goal > 0) {
      wrap.classList.remove("hidden");
      $("objectiveProgressFill").style.width = `${clamp(progress.value / progress.goal * 100, 0, 100)}%`;
      $("objectiveProgressText").textContent = `${Math.min(progress.goal, progress.value)}/${progress.goal}`;
    } else wrap.classList.add("hidden");
  };

  proto.updateHUD = function updateHUDChapterTwo() {
    original.updateHUD.call(this);
    if (this.state.chapterOne?.completed) this.updateChapterHUD();
  };

  proto.drawChapterTwoMarkers = function drawChapterTwoMarkers(ctx) {
    for (const target of chapterTwoTargets(this)) {
      if (target.mode !== this.state.mode) continue;
      const bounds = this.visibleBounds(this.state.mode === "storyDungeon" ? 52 : WORLD_W, this.state.mode === "storyDungeon" ? 34 : WORLD_H);
      if (target.x < bounds.startX - 1 || target.x > bounds.endX + 1 || target.y < bounds.startY - 1 || target.y > bounds.endY + 1) continue;
      const bob = Math.sin(performance.now() / 210 + target.x) * 5;
      const x = target.x * TILE; const y = target.y * TILE - 35 + bob;
      ctx.save(); ctx.shadowColor = "#bca6ff"; ctx.shadowBlur = 18; ctx.fillStyle = "#8f72d8"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 11, y); ctx.lineTo(x, y + 12); ctx.lineTo(x - 11, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = "#fff1c8"; ctx.font = "bold 10px Trebuchet MS"; ctx.textAlign = "center"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3;
      ctx.strokeText(target.label, x, y - 18); ctx.fillText(target.label, x, y - 18); ctx.restore();
    }
  };

  proto.drawWorld = function drawWorldChapterTwo(ctx) {
    original.drawWorld.call(this, ctx);
    const chapter = this.state.chapterTwo;
    if (chapter?.started && !chapter.completed) {
      if ([2, 3, 8, 9].includes(chapter.step)) this.drawFracturedWaystone(ctx);
      if ([10, 11, 12].includes(chapter.step)) this.drawSuncleftStoryFeatures(ctx);
      this.drawChapterTwoMarkers(ctx);
    }
  };

  proto.drawFracturedWaystone = function drawFracturedWaystone(ctx) {
    const x = 166.5 * TILE; const y = 112.5 * TILE; const time = performance.now() / 450;
    ctx.save(); ctx.strokeStyle = "rgba(188,166,255,.7)"; ctx.lineWidth = 4; ctx.shadowColor = "#9c7ee8"; ctx.shadowBlur = 16;
    for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.arc(x, y, (24 + i * 15) * (1 + Math.sin(time + i) * .06), time + i, time + Math.PI * 1.2 + i); ctx.stroke(); }
    ctx.restore();
  };

  proto.drawSuncleftStoryFeatures = function drawSuncleftStoryFeatures(ctx) {
    const chapter = this.state.chapterTwo;
    for (const rune of SURFACE_RUNES) {
      const active = chapter.surfaceRunes.includes(rune.id); const x = rune.x * TILE; const y = rune.y * TILE;
      ctx.save(); ctx.shadowColor = active ? "#ffe69b" : "#9c7ee8"; ctx.shadowBlur = active ? 18 : 8; ctx.strokeStyle = active ? "#efb94a" : "#7d69b5"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 9, y + 8); ctx.lineTo(x - 9, y + 8); ctx.closePath(); ctx.stroke(); ctx.restore();
    }
    if (chapter.step >= 12) {
      const x = CHAPTER_TWO_TARGETS.archive.x * TILE; const y = CHAPTER_TWO_TARGETS.archive.y * TILE;
      ctx.save(); ctx.fillStyle = "rgba(75,54,108,.8)"; ctx.shadowColor = "#bca6ff"; ctx.shadowBlur = 20; ctx.beginPath(); ctx.ellipse(x, y, 22, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  };

  proto.drawChapterTwoCompass = function drawChapterTwoCompass(ctx, width, height) {
    const targets = chapterTwoTargets(this).filter((target) => target.mode === this.state.mode);
    if (!targets.length) return;
    const target = [...targets].sort((a, b) => distance(this.state.player, a) - distance(this.state.player, b))[0];
    const sx = target.x * TILE - this.camera.x; const sy = target.y * TILE - this.camera.y; const margin = 64;
    if (sx >= margin && sx <= width - margin && sy >= margin && sy <= height - margin) return;
    const cx = width / 2; const cy = height / 2; const angle = Math.atan2(sy - cy, sx - cx);
    const rx = Math.max(40, width / 2 - 48); const ry = Math.max(40, height / 2 - 84);
    const scale = Math.min(Math.abs(Math.cos(angle)) > .001 ? rx / Math.abs(Math.cos(angle)) : Infinity, Math.abs(Math.sin(angle)) > .001 ? ry / Math.abs(Math.sin(angle)) : Infinity);
    const x = cx + Math.cos(angle) * scale; const y = cy + Math.sin(angle) * scale;
    ctx.save(); ctx.setTransform(this.screen.dpr, 0, 0, this.screen.dpr, 0, 0); ctx.translate(x, y);
    ctx.fillStyle = "rgba(16,36,29,.94)"; ctx.strokeStyle = "#9f83e8"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.rotate(angle); ctx.fillStyle = "#bca6ff"; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-8, -9); ctx.lineTo(-3, 0); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.rotate(-angle);
    ctx.fillStyle = "#fff1c8"; ctx.font = "bold 10px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(`${Math.max(1, Math.round(distance(this.state.player, target)))}t`, 0, 38); ctx.restore();
  };

  proto.render = function renderChapterTwo() {
    original.render.call(this);
    if (!this.running || !this.state || this.state.mode === "storyDungeon") return;
    const chapter = this.state.chapterTwo;
    if (chapter?.started && !chapter.completed) this.drawChapterTwoCompass(this.ctx, this.screen.width, this.screen.height);
    if (chapter?.cutscene) this.drawChapterTwoCutscene(this.ctx, this.screen.width, this.screen.height);
  };

  proto.drawChapterTwoCutscene = function drawChapterTwoCutscene(ctx, width, height) {
    const scene = this.state.chapterTwo.cutscene; if (!scene) return;
    const fade = Math.min(1, (scene.duration - scene.timer) * 2, scene.timer * 2);
    ctx.save(); ctx.setTransform(this.screen.dpr, 0, 0, this.screen.dpr, 0, 0); ctx.globalAlpha = clamp(fade, 0, 1);
    ctx.fillStyle = "rgba(10,19,24,.68)"; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#bca6ff"; ctx.font = "bold 24px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(scene.title, width / 2, height * .39);
    ctx.fillStyle = "#fff1c8"; ctx.font = "15px Trebuchet MS"; ctx.fillText(scene.text, width / 2, height * .39 + 34); ctx.restore();
  };

  proto.completeChapterTwo = function completeChapterTwo() {
    const chapter = this.state.chapterTwo;
    if (chapter.completed) return;
    chapter.completed = true; chapter.step = CHAPTER_TWO_STEPS.length - 1; chapter.secondPresetUnlocked = true;
    this.state.coins += 1200; this.state.guild.xp += 250; this.state.upgrades.backpack += 8;
    this.awardAdventureXp?.(400); this.awardSkillXp?.("combat", 160, .25); this.awardSkillXp?.("mining", 120, .2);
    this.state.discoveredWaystones = WAYSTONES.map((entry) => entry.id);
    if (!this.state.combat.owned.includes("riftCompass")) this.state.combat.owned.push("riftCompass");
    if (!this.state.combat.equipment.charm) this.state.combat.equipment.charm = "riftCompass";
    this.applyEquipmentVitals?.(); this.updateGuildRank();
    this.checkAchievement("chapter-two", true, "Pathfinder of Hearthvale", "Stabilize the Waystone network and defeat the Hollow Cartographer.");
    addJournal(this, "Complete: the Waystone network is stable, every route is unlocked, and the Hollow Cartographer is gone.");
    this.updateChapterHUD(true); this.saveGame(true);
    this.openModal("Chapter 2 Complete — Pathfinder of Hearthvale", "<p>You repaired Veilmoor, followed the impossible route beneath Suncleft, defeated the Riftbound Sentinel, and ended the Hollow Cartographer.</p><p><strong>Rewards:</strong> 1,200 coins, 250 Guild XP, 400 Adventure XP, skill XP, 8 backpack spaces, the Rift Compass charm, a second equipment preset, and fully stabilized Waystone travel.</p>", [{ label: "Walk the Stable Roads", action: () => this.closeModal() }]);
  };

  proto.showEquipmentPresets = function showEquipmentPresets() {
    const chapter = this.state.chapterTwo;
    const slots = chapter.secondPresetUnlocked ? 2 : 1;
    const html = Array.from({ length: slots }, (_, index) => {
      const preset = chapter.equipmentPresets[index];
      const names = preset ? EQUIPMENT_SLOTS.map((slot) => EQUIPMENT_DEFS[preset[slot]]?.name || "Empty").join(" · ") : "Not saved";
      return `<article class="progression-upgrade"><strong>Preset ${index + 1}</strong><p>${names}</p><button data-save-preset="${index}">Save Current</button><button data-load-preset="${index}" ${preset ? "" : "disabled"}>Equip</button></article>`;
    }).join("");
    this.openModal("Equipment Presets", `<p>${chapter.secondPresetUnlocked ? "Two loadouts are available." : "Complete Chapter 2 to unlock the second loadout."}</p>${html}`, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
    document.querySelectorAll("[data-save-preset]").forEach((button) => button.onclick = () => {
      chapter.equipmentPresets[Number(button.dataset.savePreset)] = { ...this.state.combat.equipment };
      this.closeModal(); this.showEquipmentPresets(); this.saveGame(true);
    });
    document.querySelectorAll("[data-load-preset]").forEach((button) => button.onclick = () => {
      const preset = chapter.equipmentPresets[Number(button.dataset.loadPreset)]; if (!preset) return;
      for (const slot of EQUIPMENT_SLOTS) if (!preset[slot] || this.state.combat.owned.includes(preset[slot])) this.state.combat.equipment[slot] = preset[slot] || null;
      this.applyEquipmentVitals(); this.closeModal(); this.showEquipmentPresets(); this.toast("Equipment preset equipped."); this.saveGame(true);
    });
  };

  proto.showChapterTwoRecap = function showChapterTwoRecap() {
    const chapter = this.state.chapterTwo;
    const current = chapter.started ? CHAPTER_TWO_STEPS[chapter.step] : null;
    this.openModal("Chapter 2 — The Fractured Waystones", `<p>${chapter.completed ? "The Waystone network is stable." : chapter.started ? `<strong>Current objective:</strong> ${current.title}<br>${current.text}` : chapterTwoEligible(this.state) ? "Guildmaster Aria is waiting in Silvercrest." : "Requirements: Chapter 1, Adventure Level 4, and the Floor 10 guardian."}</p><p>Surface runes: ${chapter.surfaceRunes.length}/3 · Archive switches: ${chapter.dungeon.switches.length}/3 · Rift Fragments: ${this.state.inventory.riftFragment || 0}</p>`, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
  };

  proto.toggleGameMenu = function toggleGameMenuChapterTwo() {
    original.toggleGameMenu.call(this);
    const grid = document.querySelector("#modalBody .menu-grid");
    if (!grid || document.getElementById("chapterTwoMenu")) return;
    const chapterButton = document.createElement("button"); chapterButton.id = "chapterTwoMenu"; chapterButton.textContent = "🜂 Chapter 2"; chapterButton.onclick = () => this.showChapterTwoRecap(); grid.appendChild(chapterButton);
    const presetButton = document.createElement("button"); presetButton.id = "presetMenu"; presetButton.textContent = "🎛 Equipment Presets"; presetButton.onclick = () => this.showEquipmentPresets(); grid.appendChild(presetButton);
  };
}
