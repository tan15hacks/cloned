import { TILE, ITEMS, MONSTER_TYPES, clamp, distance, $, randomInt } from "./game-shared.js";
import {
  STORY_DUNGEON_W, STORY_DUNGEON_H, generateStoryDungeon,
} from "./chapter-two-data.js";

function gateClosed(game, gate) {
  const dungeon = game.state.chapterTwo.dungeon;
  if (gate.boss) return !dungeon.miniBossDefeated;
  return dungeon.switches.length < gate.required;
}

function tileBlocked(game, tx, ty) {
  const map = game.currentStoryDungeon;
  if (!map || tx < 1 || ty < 1 || tx >= map.width - 1 || ty >= map.height - 1) return true;
  if (map.tiles[ty]?.[tx] !== "floor") return true;
  return map.gates.some((gate) => gate.x === tx && gate.y === ty && gateClosed(game, gate));
}

function addStoryJournal(game, text) {
  game.state.journal.unshift(`Chapter 2: ${text}`);
  game.state.journal = game.state.journal.slice(0, 30);
}

export function installStoryDungeon(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    update: proto.update,
    render: proto.render,
    collides: proto.collides,
    monsterCollides: proto.monsterCollides,
    currentMonsters: proto.currentMonsters,
    interact: proto.interact,
    updateCamera: proto.updateCamera,
    updateHUD: proto.updateHUD,
    updateContextHint: proto.updateContextHint,
    updateEnemyProjectiles: proto.updateEnemyProjectiles,
    executeMonsterAttack: proto.executeMonsterAttack,
    finalizeMonsterDefeat: proto.finalizeMonsterDefeat,
    knockedOut: proto.knockedOut,
  };

  proto.enterStoryDungeon = function enterStoryDungeon() {
    const chapter = this.state.chapterTwo;
    chapter.dungeonEntered = true;
    this.state.mode = "storyDungeon";
    this.currentCave = null;
    this.currentStoryDungeon = generateStoryDungeon(chapter.dungeon);
    this.state.player.x = this.currentStoryDungeon.entry.x;
    this.state.player.y = this.currentStoryDungeon.entry.y;
    this.state.combat.projectiles = [];
    this.state.combat.damageNumbers = [];
    this.camera.x = 0; this.camera.y = 0;
    this.showZoneBanner("Waystone Archive — Five Sealed Chambers");
    this.playChapterTwoCutscene?.("BENEATH SUNCLEFT", "The archive rearranges itself around an impossible map.", 18.5, 15.5, 3.2);
    if (chapter.step === 12) this.advanceChapterTwo(13, "Entered the hidden Waystone Archive beneath Suncleft Ruins.");
    this.saveGame(true);
  };

  proto.leaveStoryDungeon = function leaveStoryDungeon() {
    this.state.mode = "world";
    this.currentStoryDungeon = null;
    this.state.player.x = 92.5;
    this.state.player.y = 210.5;
    this.state.combat.projectiles = [];
    this.camera.x = 0; this.camera.y = 0;
    this.activeChunkSignature = "";
    this.refreshActiveWorldChunks?.(true);
    this.showZoneBanner("Suncleft Ruins");
    this.toast("Returned to the surface archive entrance.");
    this.saveGame(true);
  };

  proto.currentMonsters = function currentMonstersStory() {
    if (this.state?.mode === "storyDungeon") return this.currentStoryDungeon?.monsters || [];
    return original.currentMonsters.call(this);
  };

  proto.collides = function collidesStory(x, y, radius = .3) {
    if (this.state?.mode !== "storyDungeon") return original.collides.call(this, x, y, radius);
    const corners = [[x - radius, y - radius], [x + radius, y - radius], [x - radius, y + radius], [x + radius, y + radius]];
    return corners.some(([cx, cy]) => tileBlocked(this, Math.floor(cx), Math.floor(cy)));
  };

  proto.monsterCollides = function monsterCollidesStory(x, y) {
    if (this.state?.mode !== "storyDungeon") return original.monsterCollides.call(this, x, y);
    return tileBlocked(this, Math.floor(x), Math.floor(y));
  };

  proto.update = function updateStoryDungeon(dt) {
    if (this.state?.mode !== "storyDungeon") return original.update.call(this, dt);
    const chapter = this.state.chapterTwo;
    if (chapter.cutscene) {
      chapter.cutscene.timer -= dt;
      if (chapter.cutscene.timer <= 0) chapter.cutscene = null;
    }
    this.updateCombatTimers(dt);
    this.updatePlayer(dt);
    this.updateMonsters(dt);
    this.updateEnemyProjectiles(dt);
    this.updateLootDrops(dt);
    this.updateDamageNumbers(dt);
    this.updateStoryDungeonTraps(dt);
    this.attackFlash = Math.max(0, this.attackFlash - dt);
    this.zoneBanner.timer = Math.max(0, this.zoneBanner.timer - dt);
    this.state.minutes += dt * .55;
    if (this.state.minutes >= 1440) this.passOut();
    if (this.justPressed.has("e") || this.justPressed.has("enter")) this.interact();
    if (this.justPressed.has(" ") || this.justPressed.has("f")) this.useTool();
    this.updateStoryDungeonCheckpoint();
    this.updateCamera();
    this.updateHUD();
    this.updateContextHint();
  };

  proto.updateCamera = function updateCameraStory() {
    if (this.state?.mode !== "storyDungeon") return original.updateCamera.call(this);
    const targetX = this.state.player.x * TILE - this.screen.width / 2;
    const targetY = this.state.player.y * TILE - this.screen.height / 2;
    this.camera.x += (clamp(targetX, 0, Math.max(0, STORY_DUNGEON_W * TILE - this.screen.width)) - this.camera.x) * .14;
    this.camera.y += (clamp(targetY, 0, Math.max(0, STORY_DUNGEON_H * TILE - this.screen.height)) - this.camera.y) * .14;
  };

  proto.updateHUD = function updateHUDStory() {
    if (this.state?.mode !== "storyDungeon") return original.updateHUD.call(this);
    $("dayLabel").textContent = `${this.state.day} · ARCHIVE`;
    $("timeLabel").textContent = `${Math.floor(this.state.minutes / 60) % 24}:${String(Math.floor(this.state.minutes % 60)).padStart(2, "0")}`;
    $("weatherLabel").textContent = "🜂 Waystone Archive";
    $("coinLabel").textContent = Math.floor(this.state.coins);
    $("energyText").textContent = Math.ceil(this.state.player.energy);
    $("healthText").textContent = Math.ceil(this.state.player.health);
    $("energyFill").style.width = `${this.state.player.energy / this.state.player.maxEnergy * 100}%`;
    $("healthFill").style.width = `${this.state.player.health / this.state.player.maxHealth * 100}%`;
    this.updateChapterHUD?.();
  };

  proto.updateContextHint = function updateContextHintStory() {
    if (this.state?.mode !== "storyDungeon") return original.updateContextHint.call(this);
    const map = this.currentStoryDungeon; const player = this.state.player; let text = "Waystone Archive · Find the rune switches";
    const switchPoint = map.switches.find((entry) => !this.state.chapterTwo.dungeon.switches.includes(entry.id) && distance(player, entry) < 1.6);
    const note = map.notes.find((entry) => distance(player, entry) < 1.5);
    if (distance(player, map.exit) < 1.5) text = "Interact: Return to Suncleft Ruins";
    else if (switchPoint) text = `Interact: Activate ${switchPoint.name}`;
    else if (note) text = "Interact: Read archive inscription";
    else if (!this.state.chapterTwo.dungeon.chestOpened && distance(player, map.hiddenChest) < 1.5) text = "Interact: Open hidden archive cache";
    else if (this.state.chapterTwo.dungeon.finalBossDefeated && distance(player, map.finalPortal) < 1.7) text = "Interact: Return through the stabilized portal";
    $("contextHint").textContent = text;
    $("contextHint").classList.remove("hidden");
  };

  proto.interact = function interactStoryDungeon() {
    if (this.state?.mode !== "storyDungeon") return original.interact.call(this);
    const map = this.currentStoryDungeon; const player = this.state.player; const chapter = this.state.chapterTwo; const dungeon = chapter.dungeon;
    if (distance(player, map.exit) < 1.5) return this.leaveStoryDungeon();
    const rune = map.switches.find((entry) => !dungeon.switches.includes(entry.id) && distance(player, entry) < 1.6);
    if (rune) {
      dungeon.switches.push(rune.id);
      chapter.counters.archiveSwitches = dungeon.switches.length;
      this.sound("success");
      addStoryJournal(this, `Activated ${rune.name} inside the Waystone Archive.`);
      this.playChapterTwoCutscene?.("ARCHIVE GATE RELEASED", `${rune.name} aligns one section of the impossible map.`, rune.x, rune.y, 2.4);
      this.currentStoryDungeon = generateStoryDungeon(dungeon);
      if (dungeon.switches.length >= 3 && chapter.step === 13) {
        this.advanceChapterTwo(14, "Activated all three archive switches and awakened the Riftbound Sentinel.");
        this.playChapterTwoCutscene?.("RIFTBOUND SENTINEL", "The guardian tears itself free from the archive wall.", 37.5, 12.5, 3.2);
      } else this.updateChapterHUD?.(true);
      return;
    }
    const note = map.notes.find((entry) => distance(player, entry) < 1.5);
    if (note) return this.openModal("Archive Inscription", `<p>${note.text}</p>`, [{ label: "Remember", action: () => this.closeModal() }]);
    if (!dungeon.chestOpened && dungeon.switches.length >= 2 && distance(player, map.hiddenChest) < 1.5) {
      dungeon.chestOpened = true;
      this.addItem("riftFragment", 5, false); this.addItem("crystal", 2, false); this.addItem("potion", 2, false);
      this.state.stats.chestsFound += 1;
      addStoryJournal(this, "Found the hidden Archive Cache behind the second rune gate.");
      return this.openModal("Hidden Archive Cache", "<p>Recovered 5 Rift Fragments, 2 Hearth Crystals, and 2 Potions.</p>", [{ label: "Collect", action: () => this.closeModal() }]);
    }
    if (dungeon.finalBossDefeated && distance(player, map.finalPortal) < 1.7) {
      this.leaveStoryDungeon();
      if (chapter.step < 16) this.advanceChapterTwo(16, "Escaped the collapsing archive with the Waystone network restored.");
      return;
    }
    this.toast("Nothing nearby responds.");
  };

  proto.updateStoryDungeonCheckpoint = function updateStoryDungeonCheckpoint() {
    const dungeon = this.state.chapterTwo.dungeon;
    if (dungeon.checkpoint || dungeon.switches.length < 3 || !this.currentStoryDungeon) return;
    if (distance(this.state.player, this.currentStoryDungeon.checkpoint) < 2) {
      dungeon.checkpoint = true;
      addStoryJournal(this, "Activated the Archive checkpoint before the guardian chamber.");
      this.toast("Archive checkpoint activated.");
      this.saveGame(true);
    }
  };

  proto.updateStoryDungeonTraps = function updateStoryDungeonTraps(dt) {
    const dungeon = this.state.chapterTwo.dungeon;
    dungeon.trapCooldown = Math.max(0, (dungeon.trapCooldown || 0) - dt);
    const phaseActive = Math.sin(performance.now() / 280) > .05;
    if (!phaseActive || dungeon.trapCooldown > 0) return;
    const trap = this.currentStoryDungeon.traps.find((entry) => distance(this.state.player, entry) < .52);
    if (!trap) return;
    dungeon.trapCooldown = 1.1;
    this.damagePlayerCombat(11, null, trap, "Archive spikes");
  };

  proto.updateEnemyProjectiles = function updateEnemyProjectilesStory(dt) {
    if (this.state?.mode !== "storyDungeon") return original.updateEnemyProjectiles.call(this, dt);
    const projectiles = this.state.combat.projectiles;
    for (const projectile of projectiles) {
      if (projectile.mode !== "storyDungeon") continue;
      projectile.life -= dt; projectile.x += projectile.vx * dt; projectile.y += projectile.vy * dt;
      if (tileBlocked(this, Math.floor(projectile.x), Math.floor(projectile.y))) projectile.life = 0;
      if (projectile.life > 0 && distance(this.state.player, projectile) < .48) {
        this.damagePlayerCombat(projectile.damage, projectile.status, projectile, projectile.source);
        projectile.life = 0;
      }
    }
    this.state.combat.projectiles = projectiles.filter((projectile) => projectile.life > 0);
  };

  proto.executeMonsterAttack = function executeMonsterAttackStory(monster, def, attackType) {
    if (this.state?.mode !== "storyDungeon") return original.executeMonsterAttack.call(this, monster, def, attackType);
    const adjusted = monster?.storyDamage ? { ...def, damage: monster.storyDamage, name: monster.storyName || def.name } : def;
    return original.executeMonsterAttack.call(this, monster, adjusted, attackType);
  };

  proto.finalizeMonsterDefeat = function finalizeMonsterDefeatStory(monster, def) {
    if (this.state?.mode !== "storyDungeon") return original.finalizeMonsterDefeat.call(this, monster, def);
    const chapter = this.state.chapterTwo; const dungeon = chapter.dungeon;
    if (!dungeon.defeatedIds.includes(monster.id)) dungeon.defeatedIds.push(monster.id);
    this.currentStoryDungeon.monsters = this.currentStoryDungeon.monsters.filter((entry) => entry.id !== monster.id);
    const boss = monster.storyRole === "sentinel" || monster.storyRole === "cartographer";
    const fragments = monster.storyRole === "cartographer" ? 10 : monster.storyRole === "sentinel" ? 6 : randomInt(1, 2);
    const coins = monster.storyRole === "cartographer" ? 900 : monster.storyRole === "sentinel" ? 450 : randomInt(18, 48);
    const xp = monster.storyRole === "cartographer" ? 260 : monster.storyRole === "sentinel" ? 140 : 30;
    this.state.combat.lootDrops.push({
      id: `story-loot:${monster.id}:${Date.now()}`, x: monster.x, y: monster.y, mode: "storyDungeon", floor: 0,
      coins, xp, items: [{ id: "riftFragment", amount: fragments }], gear: [], bob: Math.random() * Math.PI * 2,
    });
    this.state.stats.monstersDefeated += 1; this.state.questStats.monsters += 1;
    this.awardSkillXp?.("combat", boss ? xp : 24, .2); this.awardAdventureXp?.(boss ? Math.round(xp * .75) : 18);
    if (monster.storyRole === "sentinel") {
      dungeon.miniBossDefeated = true;
      addStoryJournal(this, "Defeated the Riftbound Sentinel and opened the final archive wing.");
      this.advanceChapterTwo(15, "Defeated the Riftbound Sentinel guarding the Hollow Cartographer.");
      this.playChapterTwoCutscene?.("THE FINAL WING", "The last gate opens onto a map with a heartbeat.", 46.5, 16.5, 3.2);
      this.currentStoryDungeon = generateStoryDungeon(dungeon);
    } else if (monster.storyRole === "cartographer") {
      dungeon.finalBossDefeated = true; dungeon.completed = true;
      addStoryJournal(this, "Defeated the Hollow Cartographer and restored the true continental routes.");
      this.playChapterTwoCutscene?.("THE MAP REMEMBERS", "Every Waystone answers with one clear, golden route.", 47.5, 20.5, 4);
      this.advanceChapterTwo(16, "Defeated the Hollow Cartographer and stabilized the continental Waystone network.");
      this.currentStoryDungeon = generateStoryDungeon(dungeon);
    }
    this.checkQuests(); this.sound("success"); this.saveGame(true);
  };

  proto.knockedOut = function knockedOutStory() {
    if (this.state?.mode !== "storyDungeon") return original.knockedOut.call(this);
    const fee = Math.min(120, Math.floor(this.state.coins * .06));
    this.state.coins -= fee;
    this.state.player.health = Math.ceil(this.state.player.maxHealth * .62);
    this.state.player.energy = Math.ceil(this.state.player.maxEnergy * .5);
    this.state.combat.projectiles = [];
    for (const status of Object.values(this.state.combat.statuses || {})) status.time = 0;
    const checkpoint = this.state.chapterTwo.dungeon.checkpoint ? this.currentStoryDungeon.checkpoint : this.currentStoryDungeon.entry;
    this.state.player.x = checkpoint.x; this.state.player.y = checkpoint.y;
    this.currentStoryDungeon = generateStoryDungeon(this.state.chapterTwo.dungeon);
    this.toast(`The Archive returned you to its ${this.state.chapterTwo.dungeon.checkpoint ? "checkpoint" : "entrance"}. Recovery fee: ${fee} coins.`);
  };

  proto.render = function renderStoryDungeon() {
    if (!this.running || !this.state || this.state.mode !== "storyDungeon") return original.render.call(this);
    const ctx = this.ctx; const width = this.screen.width; const height = this.screen.height;
    ctx.save(); ctx.setTransform(this.screen.dpr, 0, 0, this.screen.dpr, 0, 0); ctx.clearRect(0, 0, width, height); ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));
    this.drawStoryDungeon(ctx); ctx.restore();
    this.drawStoryDungeonOverlay(ctx, width, height);
    this.drawCombatHud?.(ctx, width, height);
    if (this.state.chapterTwo.started && !this.state.chapterTwo.completed) this.drawChapterTwoCompass?.(ctx, width, height);
    if (this.state.chapterTwo.cutscene) this.drawChapterTwoCutscene?.(ctx, width, height);
    if (this.zoneBanner.timer > 0) this.drawZoneBanner(ctx, width);
  };

  proto.drawStoryDungeon = function drawStoryDungeon(ctx) {
    const map = this.currentStoryDungeon; const bounds = this.visibleBounds(map.width, map.height); const time = performance.now() / 500;
    for (let y = bounds.startY; y < bounds.endY; y += 1) for (let x = bounds.startX; x < bounds.endX; x += 1) {
      const wall = map.tiles[y][x] === "wall";
      ctx.fillStyle = wall ? "#27233a" : ((x + y) % 2 ? "#514a68" : "#57506f"); ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
      if (wall) { ctx.fillStyle = "rgba(188,166,255,.08)"; ctx.fillRect(x * TILE + 4, y * TILE + 5, 19, 3); }
      else if ((x * 17 + y * 23) % 19 === 0) { ctx.strokeStyle = "rgba(188,166,255,.2)"; ctx.beginPath(); ctx.arc(x * TILE + 16, y * TILE + 16, 8, 0, Math.PI * 2); ctx.stroke(); }
    }
    for (const gate of map.gates) {
      if (!gateClosed(this, gate)) continue;
      const x = gate.x * TILE; const y = gate.y * TILE;
      ctx.save(); ctx.shadowColor = "#bca6ff"; ctx.shadowBlur = 15; ctx.fillStyle = "rgba(82,58,124,.9)"; ctx.fillRect(x + 4, y, TILE - 8, TILE); ctx.strokeStyle = "#d2c2ff"; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.moveTo(x + 8 + i * 8, y + 3); ctx.lineTo(x + 8 + i * 8, y + TILE - 3); ctx.stroke(); } ctx.restore();
    }
    for (const trap of map.traps) {
      const active = Math.sin(performance.now() / 280) > .05; const x = trap.x * TILE; const y = trap.y * TILE;
      ctx.fillStyle = active ? "#d76b78" : "#756b87";
      for (let i = -1; i <= 1; i += 1) { ctx.beginPath(); ctx.moveTo(x + i * 7, y - (active ? 11 : 3)); ctx.lineTo(x + i * 7 + 5, y + 8); ctx.lineTo(x + i * 7 - 5, y + 8); ctx.closePath(); ctx.fill(); }
    }
    for (const rune of map.switches) {
      const active = this.state.chapterTwo.dungeon.switches.includes(rune.id); const x = rune.x * TILE; const y = rune.y * TILE;
      ctx.save(); ctx.shadowColor = active ? "#ffe69b" : "#9f83e8"; ctx.shadowBlur = 15; ctx.strokeStyle = active ? "#efb94a" : "#bca6ff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 13 + Math.sin(time + rune.x) * 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    for (const note of map.notes) { ctx.fillStyle = "#d2b56b"; ctx.fillRect(note.x * TILE - 7, note.y * TILE - 9, 14, 18); }
    if (!this.state.chapterTwo.dungeon.chestOpened && this.state.chapterTwo.dungeon.switches.length >= 2) {
      const x = map.hiddenChest.x * TILE; const y = map.hiddenChest.y * TILE; ctx.fillStyle = "#7c5834"; ctx.fillRect(x - 14, y - 10, 28, 21); ctx.fillStyle = "#bca6ff"; ctx.fillRect(x - 14, y - 5, 28, 5);
    }
    this.drawStoryPortal(ctx, map.exit, "SURFACE", true);
    if (this.state.chapterTwo.dungeon.finalBossDefeated) this.drawStoryPortal(ctx, map.finalPortal, "RETURN", false);
    this.drawMonsters(ctx, map.monsters, bounds, false);
    this.drawStoryMonsterNames(ctx, bounds);
    this.drawPlayer(ctx); this.drawTarget(ctx); this.drawCombatWorldEffects?.(ctx); this.drawChapterTwoMarkers?.(ctx);
  };

  proto.drawStoryPortal = function drawStoryPortal(ctx, point, label, small) {
    const x = point.x * TILE; const y = point.y * TILE; const pulse = .75 + Math.sin(performance.now() / 300) * .2;
    ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = "#bca6ff"; ctx.lineWidth = small ? 3 : 6; ctx.shadowColor = "#9f83e8"; ctx.shadowBlur = 18; ctx.beginPath(); ctx.ellipse(x, y, small ? 13 : 20, small ? 20 : 27, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.fillStyle = "#fff1c8"; ctx.font = "bold 9px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(label, x, y + 34);
  };

  proto.drawStoryMonsterNames = function drawStoryMonsterNames(ctx, bounds) {
    for (const monster of this.currentStoryDungeon.monsters) {
      if (!monster.storyName || monster.x < bounds.startX - 1 || monster.x > bounds.endX + 1 || monster.y < bounds.startY - 1 || monster.y > bounds.endY + 1 || monster.combat?.dead) continue;
      const x = monster.x * TILE; const y = monster.y * TILE - 44;
      ctx.fillStyle = monster.storyRole ? "#ffe29a" : "#e8dcff"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3; ctx.font = `bold ${monster.storyRole ? 12 : 9}px Trebuchet MS`; ctx.textAlign = "center"; ctx.strokeText(monster.storyName, x, y); ctx.fillText(monster.storyName, x, y);
    }
  };

  proto.drawStoryDungeonOverlay = function drawStoryDungeonOverlay(ctx, width, height) {
    ctx.save(); ctx.setTransform(this.screen.dpr, 0, 0, this.screen.dpr, 0, 0);
    const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .18, width / 2, height / 2, Math.max(width, height) * .7);
    gradient.addColorStop(0, "rgba(35,25,55,0)"); gradient.addColorStop(1, "rgba(13,10,25,.48)"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    ctx.restore();
  };
}
