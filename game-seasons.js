import { TILE, ITEMS, CROPS, WAYSTONES, clamp, distance, $, randomInt, terrainAt } from "./game-shared.js";
import { EQUIPMENT_DEFS } from "./game-combat.js";
import {
  DAYS_PER_SEASON, DAYS_PER_YEAR, SEASONS, FESTIVALS, CROP_SEASON_TABLE,
  calendarForDay, festivalForDay, festivalKey, seasonalWeather,
  seasonalGrowthMultiplier, createSeasonState, festivalRewardTier,
} from "./seasons-data.js";

const FESTIVAL_OPEN = 480;
const FESTIVAL_CLOSE = 1320;
const PRODUCE_IDS = ["turnip", "berry", "moonbean", "apple"];
const SEED_ICONS = ["🌰", "🫘", "✨", "🌱"];
const LANTERN_ICONS = ["🔴", "🟡", "🔵", "🟣"];

function addJournal(game, text) {
  game.state.journal.unshift(text);
  game.state.journal = game.state.journal.slice(0, 30);
}

function seasonById(id) { return SEASONS.find((season) => season.id === id) || SEASONS[0]; }
function festivalCompleted(game, festival) { return game.state.seasons.completedFestivals.includes(festivalKey(game.state.day, festival)); }
function festivalIsOpen(game, festival) {
  return Boolean(festival && game.state.mode === "world" && game.state.minutes >= FESTIVAL_OPEN && game.state.minutes <= FESTIVAL_CLOSE);
}

function deterministic01(a, b, c = 0) {
  let value = Math.imul(a + 17, 73856093) ^ Math.imul(b + 29, 19349663) ^ Math.imul(c + 43, 83492791);
  value ^= value >>> 13;
  return (value >>> 0) / 4294967296;
}

function qualityContribution(game, id) {
  const quality = game.state.progression?.qualityInventory?.[id] || {};
  if ((quality.iridium || 0) > 0) return { score: 100, quality: "Iridium", key: "iridium" };
  if ((quality.gold || 0) > 0) return { score: 86, quality: "Gold", key: "gold" };
  if ((quality.silver || 0) > 0) return { score: 68, quality: "Silver", key: "silver" };
  return { score: 48, quality: "Normal", key: "normal" };
}

export function installSeasonsAndFestivals(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    update: proto.update,
    updateHUD: proto.updateHUD,
    interact: proto.interact,
    talkToNPC: proto.talkToNPC,
    drawWorld: proto.drawWorld,
    drawTerrainTile: proto.drawTerrainTile,
    render: proto.render,
    toggleGameMenu: proto.toggleGameMenu,
    closeModal: proto.closeModal,
  };

  proto.defaultState = function defaultStateSeasons() {
    const state = original.defaultState.call(this);
    state.seasons = createSeasonState({}, state.day);
    state.weather = seasonalWeather(state.day);
    state.tomorrowWeather = seasonalWeather(state.day + 1);
    return state;
  };

  proto.migrateState = function migrateStateSeasons(data) {
    const state = original.migrateState.call(this, data);
    state.seasons = createSeasonState(data?.seasons || state.seasons, state.day);
    if (!state.weather) state.weather = seasonalWeather(state.day);
    state.tomorrowWeather = seasonalWeather(state.day + 1);
    return state;
  };

  proto.enterGame = function enterGameSeasons() {
    original.enterGame.call(this);
    this.state.seasons = createSeasonState(this.state.seasons, this.state.day);
    this.syncSeasonState(false);
    const festival = festivalForDay(this.state.day);
    if (festival && this.state.seasons.announcedFestivalKey !== festivalKey(this.state.day, festival)) {
      setTimeout(() => this.announceFestivalDay(festival), 550);
    }
  };

  proto.syncSeasonState = function syncSeasonState(announce = true) {
    const calendar = calendarForDay(this.state.day);
    const seasons = this.state.seasons;
    const previous = seasons.seasonId;
    seasons.year = calendar.year;
    seasons.seasonId = calendar.season.id;
    seasons.seasonDay = calendar.seasonDay;
    const key = `y${calendar.year}:${calendar.season.id}`;
    if (announce && previous !== calendar.season.id && seasons.announcedSeasonKey !== key) {
      seasons.announcedSeasonKey = key;
      this.showZoneBanner(`${calendar.season.icon} ${calendar.season.name} · Year ${calendar.year}`);
      this.toast(`${calendar.season.name} has begun.`);
      addJournal(this, `Year ${calendar.year}, ${calendar.season.name} Day 1: ${calendar.season.line}`);
    }
  };

  proto.nextDay = function nextDaySeasons(passedOut) {
    const growthBefore = Object.fromEntries(Object.entries(this.state.soil || {}).map(([key, soil]) => [key, Number(soil.crop?.growth) || 0]));
    const oldCalendar = calendarForDay(this.state.day);
    original.nextDay.call(this, passedOut);
    const calendar = calendarForDay(this.state.day);
    this.state.weather = seasonalWeather(this.state.day);
    this.state.tomorrowWeather = seasonalWeather(this.state.day + 1);
    for (const [key, soil] of Object.entries(this.state.soil || {})) {
      if (!soil.crop) continue;
      const before = growthBefore[key] ?? (Number(soil.crop.growth) || 0);
      const delta = (Number(soil.crop.growth) || 0) - before;
      if (delta <= 0) continue;
      const multiplier = seasonalGrowthMultiplier(soil.crop.type, calendar.season.id);
      soil.crop.growth = Math.max(before, before + delta * multiplier);
    }
    if (this.state.weather === "Rain") for (const soil of Object.values(this.state.soil || {})) soil.watered = true;
    this.syncSeasonState(oldCalendar.season.id !== calendar.season.id);
    const festival = festivalForDay(this.state.day);
    if (festival) this.announceFestivalDay(festival);
    this.saveGame(true);
  };

  proto.announceFestivalDay = function announceFestivalDay(festival) {
    const key = festivalKey(this.state.day, festival);
    if (this.state.seasons.announcedFestivalKey === key) return;
    this.state.seasons.announcedFestivalKey = key;
    this.showZoneBanner(`${festival.icon} ${festival.name}`);
    this.toast(`${festival.name} is open from 8:00 AM to 10:00 PM at ${festival.location.label}.`);
    addJournal(this, `${festival.name} is being held today at ${festival.location.label}.`);
  };

  proto.update = function updateSeasons(dt) {
    original.update.call(this, dt);
    if (!this.state?.seasons) return;
    const festival = festivalForDay(this.state.day);
    if (festival && this.state.seasons.announcedFestivalKey !== festivalKey(this.state.day, festival)) this.announceFestivalDay(festival);
  };

  proto.updateHUD = function updateHUDSeasons() {
    original.updateHUD.call(this);
    if (!this.state?.seasons) return;
    const calendar = calendarForDay(this.state.day);
    const floor = this.state.mode === "cave" ? ` · F${this.state.cave.currentFloor}` : this.state.mode === "storyDungeon" ? " · Archive" : "";
    $("dayLabel").textContent = `Y${calendar.year} · ${calendar.season.icon} ${calendar.seasonDay}${floor}`;
  };

  proto.interact = function interactSeasons() {
    const festival = festivalForDay(this.state.day);
    if (festival && this.state.mode === "world" && distance(this.state.player, festival.location) < 2.2) {
      if (!festivalIsOpen(this, festival)) return this.toast(`${festival.name} opens at 8:00 AM and closes at 10:00 PM.`);
      return this.openFestival(festival);
    }
    return original.interact.call(this);
  };

  proto.talkToNPC = function talkToNPCSeasons(npc) {
    const calendar = calendarForDay(this.state.day);
    const festival = festivalForDay(this.state.day);
    const originalLines = npc.lines;
    const seasonal = festival
      ? `${festival.name} has everyone talking today. ${calendar.season.line}`
      : calendar.season.line;
    npc.lines = [seasonal, ...(originalLines || [])];
    try { return original.talkToNPC.call(this, npc); }
    finally { npc.lines = originalLines; }
  };

  proto.drawTerrainTile = function drawTerrainTileSeasons(ctx, x, y) {
    original.drawTerrainTile.call(this, ctx, x, y);
    const calendar = calendarForDay(this.state.day);
    const season = calendar.season;
    const terrain = terrainAt(x, y);
    if (["water", "lava", "path", "bridge", "city"].includes(terrain)) return;
    const roll = deterministic01(x, y, calendar.seasonIndex);
    if (roll > .025) return;
    const px = (x + .25 + roll * 12) * TILE;
    const py = (y + .58) * TILE;
    ctx.save(); ctx.globalAlpha = .62;
    if (season.id === "spring") {
      ctx.fillStyle = roll > .012 ? "#ffd1df" : "#fff0a8";
      ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (season.id === "summer") {
      ctx.fillStyle = "#ffe788"; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
    } else if (season.id === "autumn") {
      ctx.fillStyle = roll > .012 ? "#d96b3f" : "#e7a94c"; ctx.fillRect(px - 3, py - 1, 6, 3);
    } else {
      ctx.fillStyle = "rgba(238,248,255,.8)"; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  proto.drawWorld = function drawWorldSeasons(ctx) {
    original.drawWorld.call(this, ctx);
    const festival = festivalForDay(this.state.day);
    if (festival) this.drawFestivalGround(ctx, festival);
  };

  proto.drawFestivalGround = function drawFestivalGround(ctx, festival) {
    const x = festival.location.x * TILE; const y = festival.location.y * TILE;
    ctx.save(); ctx.shadowColor = seasonById(festival.season).color; ctx.shadowBlur = 18;
    ctx.strokeStyle = seasonById(festival.season).color; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = "rgba(16,36,29,.9)"; ctx.fillRect(x - 54, y - 55, 108, 23);
    ctx.fillStyle = "#fff1c8"; ctx.font = "bold 11px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(`${festival.icon} ${festival.name}`, x, y - 39);
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2; const bx = x + Math.cos(angle) * 31; const by = y + Math.sin(angle) * 21;
      ctx.fillStyle = index % 2 ? "#efb94a" : seasonById(festival.season).color;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 7, by + 5); ctx.lineTo(bx, by + 10); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  proto.render = function renderSeasons() {
    original.render.call(this);
    if (!this.running || !this.state || this.state.mode !== "world") return;
    this.drawSeasonScreenOverlay(this.ctx, this.screen.width, this.screen.height);
  };

  proto.drawSeasonScreenOverlay = function drawSeasonScreenOverlay(ctx, width, height) {
    const calendar = calendarForDay(this.state.day); const season = calendar.season;
    const time = performance.now() / 1000;
    ctx.save(); ctx.setTransform(this.screen.dpr, 0, 0, this.screen.dpr, 0, 0);
    ctx.fillStyle = season.tint; ctx.fillRect(0, 0, width, height);
    const count = Math.min(42, Math.max(18, Math.floor(width / 28)));
    for (let index = 0; index < count; index += 1) {
      const seed = deterministic01(index, calendar.seasonIndex, calendar.year);
      const x = (seed * width + time * (season.id === "autumn" ? 16 : 7) * (index % 2 ? 1 : -1) + width) % width;
      const y = (deterministic01(index, calendar.year, 7) * height + time * (season.id === "summer" ? 5 : 13) + index * 17) % height;
      ctx.globalAlpha = .22 + seed * .28;
      if (season.id === "spring") { ctx.fillStyle = index % 2 ? "#ffd1df" : "#fff0a8"; ctx.beginPath(); ctx.ellipse(x, y, 3.5, 1.8, time + index, 0, Math.PI * 2); ctx.fill(); }
      else if (season.id === "summer") { ctx.fillStyle = "#ffe788"; ctx.beginPath(); ctx.arc(x, y, 1.7 + seed * 1.5, 0, Math.PI * 2); ctx.fill(); }
      else if (season.id === "autumn") { ctx.fillStyle = index % 2 ? "#d96b3f" : "#e7a94c"; ctx.save(); ctx.translate(x, y); ctx.rotate(time + seed * 4); ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
      else { ctx.fillStyle = "#f4fbff"; ctx.beginPath(); ctx.arc(x, y, 2 + seed * 2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  };

  proto.toggleGameMenu = function toggleGameMenuSeasons() {
    original.toggleGameMenu.call(this);
    const grid = document.querySelector("#modalBody .menu-grid");
    if (!grid || document.getElementById("seasonCalendarMenu")) return;
    const calendar = document.createElement("button"); calendar.id = "seasonCalendarMenu"; calendar.textContent = "📅 Seasons & Festivals"; calendar.onclick = () => this.showSeasonCalendar(); grid.appendChild(calendar);
    const album = document.createElement("button"); album.id = "festivalAlbumMenu"; album.textContent = "🎪 Festival Album"; album.onclick = () => this.showFestivalAlbum(); grid.appendChild(album);
  };

  proto.showSeasonCalendar = function showSeasonCalendar() {
    const current = calendarForDay(this.state.day);
    const cards = SEASONS.map((season) => {
      const festival = FESTIVALS.find((entry) => entry.season === season.id);
      const crops = season.crops.map((id) => CROPS[id]?.name || id).join(", ") || "No crop affinity";
      return `<article class="season-card ${current.season.id === season.id ? "current" : ""}" style="--season:${season.color}"><h3>${season.icon} ${season.name}</h3><p>Days 1–${DAYS_PER_SEASON} · Favored crops: ${crops}</p><p>${festival.icon} <strong>Day ${festival.day}:</strong> ${festival.name}</p></article>`;
    }).join("");
    const festival = festivalForDay(this.state.day);
    this.openModal("Continental Calendar", `<p><strong>Year ${current.year} · ${current.season.name} Day ${current.seasonDay}</strong></p><p>Favored crops grow 25% faster. Other crops grow 25% slower but never wither.</p>${festival ? `<div class="festival-today">${festival.icon} Today: ${festival.name} at ${festival.location.label}</div>` : ""}<div class="season-grid">${cards}</div>`, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
  };

  proto.showFestivalAlbum = function showFestivalAlbum() {
    const current = calendarForDay(this.state.day);
    const entries = FESTIVALS.map((festival) => {
      const best = Object.entries(this.state.seasons.festivalScores).filter(([key]) => key.endsWith(`:${festival.id}`)).reduce((max, [, score]) => Math.max(max, score), 0);
      const completedThisYear = this.state.seasons.completedFestivals.includes(`y${current.year}:${festival.id}`);
      return `<article class="festival-record"><span>${festival.icon}</span><div><strong>${festival.name}</strong><p>${completedThisYear ? "✅ Completed this year" : `Day ${festival.day} of ${seasonById(festival.season).name}`} · Best score ${best}/100</p></div></article>`;
    }).join("");
    this.openModal("Festival Album", `<p>Festival Tokens: <strong>${this.state.inventory.festivalToken || 0}</strong></p>${entries}`, [{ label: "Back", action: () => { this.closeModal(); this.toggleGameMenu(); } }]);
  };

  proto.openFestival = function openFestival(festival) {
    const completed = festivalCompleted(this, festival);
    const body = `<div class="festival-hero"><span>${festival.icon}</span><div><h3>${festival.name}</h3><p>${festival.description}</p></div></div><p>${completed ? "You already competed this year, but the festival shop remains open." : "Compete for Festival Tokens, skill XP, a seasonal keepsake, and rare equipment."}</p>`;
    const actions = [];
    if (!completed) actions.push({ label: "Enter Festival Contest", action: () => this.startFestivalMinigame(festival) });
    actions.push({ label: "Festival Shop", action: () => this.openFestivalShop(festival) });
    actions.push({ label: "Leave", action: () => this.closeModal() });
    this.openModal(festival.name, body, actions);
  };

  proto.startFestivalMinigame = function startFestivalMinigame(festival) {
    this.clearFestivalTimer();
    if (festival.minigame === "seedSort") return this.startSeedSort(festival);
    if (festival.minigame === "riverDash") return this.startRiverDash(festival);
    if (festival.minigame === "produceJudge") return this.startProduceJudge(festival);
    return this.startLanternMemory(festival);
  };

  proto.startSeedSort = function startSeedSort(festival) {
    let target = SEED_ICONS[randomInt(0, SEED_ICONS.length - 1)]; let score = 0; let seconds = 18;
    const render = () => {
      const buttons = Array.from({ length: 12 }, (_, index) => {
        const icon = SEED_ICONS[(index * 7 + score * 3 + this.state.day) % SEED_ICONS.length];
        return `<button class="festival-tile" data-seed-icon="${icon}">${icon}</button>`;
      }).join("");
      $("modalTitle").textContent = `${festival.icon} Enchanted Seed Sort`;
      $("modalBody").innerHTML = `<p>Tap every <strong>${target}</strong> seed before time runs out.</p><div class="festival-status"><b>Score ${score}</b><b>${seconds}s</b></div><div class="festival-tile-grid">${buttons}</div>`;
      $("modalActions").innerHTML = `<button id="festivalQuit">Quit</button>`;
      document.querySelectorAll("[data-seed-icon]").forEach((button) => button.onclick = () => {
        if (button.dataset.seedIcon === target) { score += 1; button.disabled = true; button.classList.add("correct"); target = SEED_ICONS[randomInt(0, SEED_ICONS.length - 1)]; }
        else { score = Math.max(0, score - 1); button.classList.add("wrong"); }
        if (score >= 12) this.finishFestival(festival, 100);
        else render();
      });
      $("festivalQuit").onclick = () => { this.clearFestivalTimer(); this.closeModal(); };
    };
    render();
    this.festivalTimer = setInterval(() => { seconds -= 1; if (seconds <= 0) this.finishFestival(festival, Math.min(100, score * 8)); else render(); }, 1000);
  };

  proto.startRiverDash = function startRiverDash(festival) {
    let progress = 0; let seconds = 12;
    const fishing = this.state.progression?.skillLevels?.fishing || 1;
    const render = () => {
      $("modalTitle").textContent = `${festival.icon} Moonlake River Dash`;
      $("modalBody").innerHTML = `<p>Tap ROW to push the skiff across Moonlake. Fishing skill improves each stroke.</p><div class="festival-status"><b>${Math.floor(progress)}%</b><b>${seconds}s</b></div><div class="festival-race"><i style="width:${clamp(progress, 0, 100)}%"></i><span style="left:${clamp(progress, 0, 100)}%">⛵</span></div>`;
      $("modalActions").innerHTML = `<button id="festivalRow" class="primary">ROW!</button><button id="festivalQuit">Quit</button>`;
      $("festivalRow").onclick = () => { progress += 4.5 + fishing * .55; if (progress >= 100) this.finishFestival(festival, 100); else render(); };
      $("festivalQuit").onclick = () => { this.clearFestivalTimer(); this.closeModal(); };
    };
    render();
    this.festivalTimer = setInterval(() => { seconds -= 1; progress = Math.max(0, progress - 1.8); if (seconds <= 0) this.finishFestival(festival, Math.floor(progress)); else render(); }, 1000);
  };

  proto.startProduceJudge = function startProduceJudge(festival) {
    const available = PRODUCE_IDS.filter((id) => (this.state.inventory[id] || 0) > 0);
    const rows = available.map((id) => {
      const quality = qualityContribution(this, id);
      return `<button data-judge-produce="${id}">${ITEMS[id].icon} ${ITEMS[id].name}<small>${quality.quality} entry · ${this.state.inventory[id]} owned</small></button>`;
    }).join("");
    $("modalTitle").textContent = `${festival.icon} Harvest Crown Judging`;
    $("modalBody").innerHTML = `<p>Submit one piece of produce. Quality, value, and Farming Level determine the judges' score.</p><div class="produce-entries">${rows || "<p>You brought no eligible produce.</p>"}</div>`;
    $("modalActions").innerHTML = `<button id="festivalQuit">Leave Contest</button>`;
    document.querySelectorAll("[data-judge-produce]").forEach((button) => button.onclick = () => {
      const id = button.dataset.judgeProduce; const quality = qualityContribution(this, id);
      this.state.inventory[id] -= 1;
      const record = this.state.progression?.qualityInventory?.[id];
      if (record && (record[quality.key] || 0) > 0) record[quality.key] -= 1;
      const farming = this.state.progression?.skillLevels?.farming || 1;
      const valueBonus = Math.min(12, Math.floor((ITEMS[id].value || 0) / 15));
      this.finishFestival(festival, clamp(quality.score + farming * 2 + valueBonus, 0, 100));
    });
    $("festivalQuit").onclick = () => this.closeModal();
  };

  proto.startLanternMemory = function startLanternMemory(festival) {
    this.festivalSequenceToken = (this.festivalSequenceToken || 0) + 1;
    const token = this.festivalSequenceToken;
    const foraging = this.state.progression?.skillLevels?.foraging || 1;
    const length = Math.min(7, 4 + Math.floor(foraging / 3));
    const sequence = Array.from({ length }, (_, index) => (this.state.day * 3 + index * 7 + randomInt(0, 3)) % 4);
    let input = []; let accepting = false;
    $("modalTitle").textContent = `${festival.icon} Starfall Lantern Memory`;
    $("modalBody").innerHTML = `<p>Watch the lanterns, then repeat their order.</p><div id="lanternDisplay" class="lantern-display">🌠</div><div class="lantern-grid">${LANTERN_ICONS.map((icon, index) => `<button data-lantern="${index}" disabled>${icon}</button>`).join("")}</div>`;
    $("modalActions").innerHTML = `<button id="festivalQuit">Quit</button>`;
    const buttons = [...document.querySelectorAll("[data-lantern]")];
    const display = $("lanternDisplay");
    sequence.forEach((value, index) => {
      setTimeout(() => { if (!this.modalOpen || this.festivalSequenceToken !== token) return; display.textContent = LANTERN_ICONS[value]; }, 500 + index * 650);
      setTimeout(() => { if (!this.modalOpen || this.festivalSequenceToken !== token) return; display.textContent = "✦"; }, 900 + index * 650);
    });
    setTimeout(() => {
      if (!this.modalOpen || this.festivalSequenceToken !== token) return; accepting = true; display.textContent = "Your turn"; buttons.forEach((button) => { button.disabled = false; });
    }, 700 + sequence.length * 650);
    buttons.forEach((button) => button.onclick = () => {
      if (!accepting) return;
      input.push(Number(button.dataset.lantern));
      const index = input.length - 1;
      if (input[index] !== sequence[index]) return this.finishFestival(festival, Math.floor(index / sequence.length * 100));
      display.textContent = `${input.length}/${sequence.length}`;
      if (input.length >= sequence.length) this.finishFestival(festival, 100);
    });
    $("festivalQuit").onclick = () => this.closeModal();
  };

  proto.finishFestival = function finishFestival(festival, rawScore) {
    this.clearFestivalTimer();
    const score = clamp(Math.round(rawScore), 0, 100);
    const tier = festivalRewardTier(score);
    const key = festivalKey(this.state.day, festival);
    if (!this.state.seasons.completedFestivals.includes(key)) this.state.seasons.completedFestivals.push(key);
    this.state.seasons.festivalScores[key] = Math.max(score, this.state.seasons.festivalScores[key] || 0);
    this.state.inventory.festivalToken = (this.state.inventory.festivalToken || 0) + tier.tokens;
    this.addItem(festival.rewardItem, tier.quantity, false);
    this.awardAdventureXp?.(tier.xp);
    this.awardSkillXp?.(festival.skill, Math.round(tier.xp * .65), .2);
    for (const npc of this.state.npcs) npc.friendship = clamp((npc.friendship || 0) + (tier.id === "gold" ? 1 : 0), 0, 10);
    let gearText = "";
    if (tier.id === "gold" && !this.state.combat.owned.includes(festival.gear)) {
      this.state.combat.owned.push(festival.gear);
      gearText = ` You also earned ${EQUIPMENT_DEFS[festival.gear].name}.`;
    }
    const calendar = calendarForDay(this.state.day);
    const yearSet = this.state.seasons.yearlySets[calendar.year] ||= [];
    if (!yearSet.includes(festival.id)) yearSet.push(festival.id);
    if (yearSet.length >= FESTIVALS.length) this.checkAchievement("festival-year", true, "A Year of Celebration", "Complete all four seasonal festivals in one year.");
    addJournal(this, `${festival.name}: ${tier.name} result with ${score}/100, earning ${tier.tokens} Festival Tokens.${gearText}`);
    this.saveGame(true);
    this.openModal(`${tier.name} — ${festival.name}`, `<div class="festival-result"><span>${festival.icon}</span><h3>${score}/100</h3><p>${tier.name} award: ${tier.tokens} Festival Tokens, ${tier.quantity} ${ITEMS[festival.rewardItem].name}, Adventure XP, and ${festival.skill} XP.${gearText}</p></div>`, [
      { label: "Festival Shop", action: () => this.openFestivalShop(festival) },
      { label: "Leave Festival", action: () => this.closeModal() },
    ]);
  };

  proto.openFestivalShop = function openFestivalShop(festival) {
    const tokens = this.state.inventory.festivalToken || 0;
    const gearOwned = this.state.combat.owned.includes(festival.gear);
    this.openModal(`${festival.icon} Festival Shop`, `<p>Festival Tokens: <strong>${tokens}</strong></p><div class="festival-shop"><button data-festival-buy="potion:2">🧴 Potion · 2</button><button data-festival-buy="caveTonic:4">🫗 Cave Tonic · 4</button><button data-festival-buy="${festival.gear}:12" ${gearOwned ? "disabled" : ""}>${EQUIPMENT_DEFS[festival.gear].icon} ${EQUIPMENT_DEFS[festival.gear].name} · ${gearOwned ? "Owned" : "12"}</button></div>`, [{ label: "Back", action: () => this.openFestival(festival) }]);
    document.querySelectorAll("[data-festival-buy]").forEach((button) => button.onclick = () => {
      const [id, priceRaw] = button.dataset.festivalBuy.split(":"); const price = Number(priceRaw);
      if ((this.state.inventory.festivalToken || 0) < price) return this.toast("Not enough Festival Tokens.");
      this.state.inventory.festivalToken -= price;
      if (EQUIPMENT_DEFS[id]) {
        if (!this.state.combat.owned.includes(id)) this.state.combat.owned.push(id);
        const def = EQUIPMENT_DEFS[id]; if (!this.state.combat.equipment[def.slot]) this.state.combat.equipment[def.slot] = id;
        this.applyEquipmentVitals?.();
      } else this.addItem(id, 1, false);
      this.saveGame(true); this.toast(`${EQUIPMENT_DEFS[id]?.name || ITEMS[id]?.name || id} purchased.`); this.openFestivalShop(festival);
    });
  };

  proto.clearFestivalTimer = function clearFestivalTimer() {
    if (this.festivalTimer) clearInterval(this.festivalTimer);
    this.festivalTimer = null;
    this.festivalSequenceToken = (this.festivalSequenceToken || 0) + 1;
  };

  proto.closeModal = function closeModalSeasons() {
    this.clearFestivalTimer();
    original.closeModal.call(this);
  };
}
