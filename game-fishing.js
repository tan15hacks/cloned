import { ITEMS, clamp, isWaterTile, regionAt, $, randomInt } from "./game-shared.js";
import { QUALITY_TIERS, qualityRoll } from "./progression-data.js";
import { calendarForDay } from "./seasons-data.js";
import {
  FISH_SPECIES, FISH_SPECIES_MAP, LEGENDARY_FISH, FISH_QUALITY_ORDER, FISH_QUALITY,
  BAIT_DEFS, TACKLE_DEFS, FISHING_SHOP_STOCK, FISHING_TREASURES,
  fishAvailability, selectFishSpecies, fishSize, formatFishingWindow,
} from "./fishing-data.js";

const FISHING_VERSION = 1;
const QUALITY_RANK = Object.fromEntries(FISH_QUALITY_ORDER.map((id, index) => [id, index]));
const rarityLabel = (id) => id === "legendary" ? "Legendary" : id[0].toUpperCase() + id.slice(1);
const qualityName = (id) => QUALITY_TIERS.find((entry) => entry.id === id)?.name || FISH_QUALITY[id]?.name || "Normal";
const qualityIcon = (id) => QUALITY_TIERS.find((entry) => entry.id === id)?.icon || FISH_QUALITY[id]?.icon || "●";

function emptyFishingShop() {
  return Object.fromEntries(FISHING_SHOP_STOCK.map((entry) => [entry.id, entry.daily]));
}

export function createFishingState(existing = {}) {
  const value = existing && typeof existing === "object" ? existing : {};
  const journal = {};
  for (const [id, record] of Object.entries(value.journal || {})) {
    if (!FISH_SPECIES_MAP[id] || !record || typeof record !== "object") continue;
    journal[id] = {
      count: Math.max(0, Math.floor(Number(record.count) || 0)),
      bestQuality: FISH_QUALITY_ORDER.includes(record.bestQuality) ? record.bestQuality : "normal",
      largestSize: Math.max(0, Number(record.largestSize) || 0),
      firstDay: Math.max(1, Math.floor(Number(record.firstDay) || 1)),
      lastDay: Math.max(1, Math.floor(Number(record.lastDay) || 1)),
    };
  }
  const selectedBait = BAIT_DEFS[value.selectedBait] ? value.selectedBait : "none";
  const selectedTackle = TACKLE_DEFS[value.selectedTackle] ? value.selectedTackle : "none";
  return {
    version: FISHING_VERSION,
    journal,
    legendaryCaught: Array.isArray(value.legendaryCaught) ? [...new Set(value.legendaryCaught.filter((id) => FISH_SPECIES_MAP[id]?.legendary))] : [],
    selectedBait,
    selectedTackle,
    tackleUses: {
      spinner: Math.max(0, Math.floor(Number(value.tackleUses?.spinner) || 0)),
      lucky: Math.max(0, Math.floor(Number(value.tackleUses?.lucky) || 0)),
    },
    streak: Math.max(0, Math.floor(Number(value.streak) || 0)),
    bestStreak: Math.max(0, Math.floor(Number(value.bestStreak) || 0)),
    lastCatchDay: Math.max(0, Math.floor(Number(value.lastCatchDay) || 0)),
    totalCasts: Math.max(0, Math.floor(Number(value.totalCasts) || 0)),
    totalEscapes: Math.max(0, Math.floor(Number(value.totalEscapes) || 0)),
    treasuresFound: Math.max(0, Math.floor(Number(value.treasuresFound) || 0)),
    perfectCatches: Math.max(0, Math.floor(Number(value.perfectCatches) || 0)),
    shopDay: Math.max(0, Math.floor(Number(value.shopDay) || 0)),
    shopStock: value.shopStock && typeof value.shopStock === "object" ? { ...emptyFishingShop(), ...value.shopStock } : emptyFishingShop(),
    introQueued: Boolean(value.introQueued),
  };
}

export function ensureFishingShopState(state) {
  state.fishing ||= createFishingState();
  if (state.fishing.shopDay !== state.day) {
    state.fishing.shopDay = state.day;
    state.fishing.shopStock = emptyFishingShop();
  }
  return state.fishing.shopStock;
}

function currentGear(state) {
  const bait = BAIT_DEFS[state.fishing.selectedBait] || BAIT_DEFS.none;
  const tackle = TACKLE_DEFS[state.fishing.selectedTackle] || TACKLE_DEFS.none;
  const baitAvailable = !bait.item || (state.inventory[bait.item] || 0) > 0;
  const tackleAvailable = tackle.id === "none" || (state.fishing.tackleUses[tackle.id] || 0) > 0;
  return {
    bait: baitAvailable ? bait : BAIT_DEFS.none,
    tackle: tackleAvailable ? tackle : TACKLE_DEFS.none,
  };
}

function consumeCurrentGear(state, gear) {
  if (gear.bait.item) state.inventory[gear.bait.item] = Math.max(0, (state.inventory[gear.bait.item] || 0) - 1);
  if (gear.tackle.id !== "none") state.fishing.tackleUses[gear.tackle.id] = Math.max(0, (state.fishing.tackleUses[gear.tackle.id] || 0) - 1);
}

function chooseTreasure(roll = Math.random()) {
  const total = FISHING_TREASURES.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = clamp(Number(roll) || 0, 0, .999999) * total;
  for (const entry of FISHING_TREASURES) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry;
  }
  return FISHING_TREASURES.at(-1);
}

function giveTreasure(game, entry) {
  const amount = randomInt(entry.amount[0], entry.amount[1]);
  if (entry.type === "coins") {
    game.state.coins += amount;
    game.state.stats.totalEarned += amount;
    return `${entry.label}: ◈ ${amount} coins`;
  }
  game.addItem(entry.id, amount, false);
  return `${entry.label}: ${ITEMS[entry.id].icon} ${ITEMS[entry.id].name} ×${amount}`;
}

function recordCatch(state, species, quality, size) {
  const previous = state.fishing.journal[species.id];
  const record = previous || {
    count: 0,
    bestQuality: "normal",
    largestSize: 0,
    firstDay: state.day,
    lastDay: state.day,
  };
  record.count += 1;
  if ((QUALITY_RANK[quality] || 0) > (QUALITY_RANK[record.bestQuality] || 0)) record.bestQuality = quality;
  record.largestSize = Math.max(record.largestSize, size);
  record.lastDay = state.day;
  state.fishing.journal[species.id] = record;
  return { record, firstCatch: !previous, sizeRecord: size >= record.largestSize };
}

function speciesConditions(species) {
  const weather = species.weather ? species.weather.join("/") : "Any weather";
  return `${species.seasons.join("/")} · ${formatFishingWindow(species)} · ${weather} · Fishing Lv ${species.minLevel}`;
}

export function installFishingOverhaul(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    toggleGameMenu: proto.toggleGameMenu,
    beginFishing: proto.beginFishing,
  };

  proto.defaultState = function defaultStateFishing() {
    const state = original.defaultState.call(this);
    state.fishing = createFishingState();
    return state;
  };

  proto.migrateState = function migrateStateFishing(data) {
    const state = original.migrateState.call(this, data);
    state.fishing = createFishingState(data?.fishing || state.fishing);
    ensureFishingShopState(state);
    return state;
  };

  proto.enterGame = function enterGameFishing() {
    const result = original.enterGame.call(this);
    this.state.fishing = createFishingState(this.state.fishing);
    ensureFishingShopState(this.state);
    if (!this.state.fishing.introQueued && this.state.social?.letters) {
      this.state.fishing.introQueued = true;
      if (!this.state.social.letters.some((letter) => letter.id === "fishing-overhaul-welcome")) this.state.social.letters.push({
        id: "fishing-overhaul-welcome",
        from: "Tavi",
        subject: "A Proper Angler's Journal",
        body: "I catalogued the continent's waters for you. Fish now respond to region, season, weather, and hour. Worms attract uncommon catches; Glow Bait calls to night legends. Check the Fishing Journal from your Adventure Menu, then visit my tackle listing when you need supplies.",
        reward: { item: "wormBait", amount: 5, coins: 80 },
        read: false,
        claimed: false,
        eventKey: null,
        day: this.state.day,
      });
      this.toast?.("Tavi sent an updated fishing journal and starter bait.");
      this.saveGame?.(true);
    }
    return result;
  };

  proto.nextDay = function nextDayFishing(passedOut) {
    const result = original.nextDay.call(this, passedOut);
    this.state.fishing = createFishingState(this.state.fishing);
    this.state.fishing.streak = 0;
    ensureFishingShopState(this.state);
    return result;
  };

  proto.beginFishing = function beginFishingOverhaul() {
    if (this.state.mode !== "world") return this.toast("Fishing requires open continental water.");
    const player = this.state.player;
    let nearWater = false;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      if (isWaterTile(Math.floor(player.x + dx), Math.floor(player.y + dy))) nearWater = true;
    }
    if (!nearWater) return this.toast("Stand beside water to cast the fishing rod.");
    this.state.fishing = createFishingState(this.state.fishing);
    const region = regionAt(player.x, player.y);
    const gear = currentGear(this.state);
    if (this.state.fishing.selectedBait !== "none" && gear.bait.id === "none") this.toast(`${BAIT_DEFS[this.state.fishing.selectedBait].name} is empty; casting without bait.`);
    if (this.state.fishing.selectedTackle !== "none" && gear.tackle.id === "none") this.toast(`${TACKLE_DEFS[this.state.fishing.selectedTackle].name} has no uses remaining.`);
    consumeCurrentGear(this.state, gear);
    this.spendEnergy(2);
    this.state.fishing.totalCasts += 1;
    const species = selectFishSpecies(this.state, region.id, gear.bait.id);
    this.openFishingGame(species, region.id, gear);
  };

  proto.openFishingGame = function openFishingOverhaul(species, regionId, gear = currentGear(this.state)) {
    if (!species) species = selectFishSpecies(this.state, regionId || regionAt(this.state.player.x, this.state.player.y).id, gear.bait.id);
    const fishingLevel = this.state.progression?.skillLevels?.fishing || 1;
    const baseZone = 25 - species.difficulty * 3 + Math.min(7, fishingLevel - 1);
    const zoneWidth = clamp(baseZone + (gear.tackle.zoneBonus || 0), 12, 36);
    const requiredHits = clamp(2 + Math.ceil(species.difficulty / 1.4), 3, 5);
    const maxMisses = 3;
    const baseSpeed = clamp(1.15 + species.difficulty * .3 - (fishingLevel - 1) * .045 - (gear.tackle.speedReduction || 0), .85, 2.45);
    let zoneStart = randomInt(10, Math.max(11, Math.floor(88 - zoneWidth)));
    let pos = 0;
    let dir = 1;
    let hits = 0;
    let misses = 0;
    let accuracyTotal = 0;
    let perfectHits = 0;
    let speed = baseSpeed;

    this.modalOpen = true;
    this.paused = true;
    $("modalTitle").textContent = "Fishing — Hold the Line";
    $("modalBody").innerHTML = `<section class="fishing-hook-card"><span>🌊</span><div><strong>Something is fighting the hook!</strong><small>${rarityLabel(species.rarity)} bite · Difficulty ${species.difficulty.toFixed(1)} · ${gear.bait.icon} ${gear.bait.name} · ${gear.tackle.icon} ${gear.tackle.name}</small></div></section><p>Land <strong>${requiredHits} accurate reels</strong> before missing ${maxMisses} times. Center hits improve fish quality and treasure chance.</p><div class="fishing-track"><div id="fishingZone" class="fishing-zone" style="left:${zoneStart}%;width:${zoneWidth}%"></div><div id="fishMarker" class="fishing-marker">🐟</div></div><div class="fishing-progress"><i id="fishingProgressFill" style="width:0%"></i></div><p id="fishStatus"><strong>Reels:</strong> 0/${requiredHits} · <strong>Misses:</strong> 0/${maxMisses}</p>`;
    $("modalActions").innerHTML = `<button id="reelButton">REEL</button><button id="cancelFishing">Cut Line</button>`;
    $("modal").classList.remove("hidden");
    const marker = $("fishMarker");
    const zone = $("fishingZone");
    const progress = $("fishingProgressFill");
    const status = $("fishStatus");

    const stop = () => {
      if (this.fishingTimer) clearInterval(this.fishingTimer);
      this.fishingTimer = null;
    };
    this.fishingTimer = setInterval(() => {
      pos += dir * speed;
      if (pos >= 92) { pos = 92; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      marker.style.left = `${pos}%`;
    }, 16);

    $("reelButton").onclick = () => {
      const center = zoneStart + zoneWidth / 2;
      const inside = pos >= zoneStart - 3 && pos <= zoneStart + zoneWidth;
      if (inside) {
        const accuracy = clamp(1 - Math.abs(pos - center) / (zoneWidth / 2 + 3), 0, 1);
        accuracyTotal += accuracy;
        if (accuracy >= .82) perfectHits += 1;
        hits += 1;
        progress.style.width = `${hits / requiredHits * 100}%`;
        this.sound?.("hit");
        if (hits >= requiredHits) {
          stop();
          const averageAccuracy = accuracyTotal / requiredHits;
          this.finishFishingCatch(species, regionId, gear, averageAccuracy, perfectHits === requiredHits);
          return;
        }
        zoneStart = randomInt(8, Math.max(9, Math.floor(90 - zoneWidth)));
        zone.style.left = `${zoneStart}%`;
        speed = Math.min(2.7, speed * 1.04);
        dir *= -1;
        status.innerHTML = `<strong>Reels:</strong> ${hits}/${requiredHits} · <strong>Misses:</strong> ${misses}/${maxMisses}${accuracy >= .82 ? " · Perfect center!" : ""}`;
      } else {
        misses += 1;
        this.vibrate?.(45);
        status.innerHTML = `<strong>Reels:</strong> ${hits}/${requiredHits} · <strong>Misses:</strong> ${misses}/${maxMisses} · The line slipped!`;
        if (misses >= maxMisses) {
          stop();
          this.state.fishing.totalEscapes += 1;
          this.state.fishing.streak = 0;
          this.closeModal();
          this.toast(`${rarityLabel(species.rarity)} fish escaped the line.`);
          this.saveGame?.(true);
        }
      }
    };

    $("cancelFishing").onclick = () => {
      stop();
      this.state.fishing.streak = 0;
      this.closeModal();
      this.toast("The line was cut before the catch was landed.");
      this.saveGame?.(true);
    };
  };

  proto.finishFishingCatch = function finishFishingCatch(species, regionId, gear, accuracy, perfect) {
    const fishingLevel = this.state.progression?.skillLevels?.fishing || 1;
    const qualityBoost = accuracy * 3 + (gear.tackle.qualityBonus || 0);
    const quality = qualityRoll(fishingLevel, qualityBoost, 0, this.state.weather);
    const size = fishSize(species, fishingLevel, accuracy);
    this.addItem(species.category, 1, false);
    this.recordQuality?.(species.category, quality, 1);
    this.state.questStats.fish += 1;
    this.state.stats.fishCaught += 1;
    this.checkQuests?.();
    this.awardSkillXp?.("fishing", Math.round(10 + species.difficulty * 5 + (species.legendary ? 50 : 0)), .4);

    const result = recordCatch(this.state, species, quality, size);
    this.state.fishing.streak = this.state.fishing.lastCatchDay === this.state.day ? this.state.fishing.streak + 1 : 1;
    this.state.fishing.lastCatchDay = this.state.day;
    this.state.fishing.bestStreak = Math.max(this.state.fishing.bestStreak, this.state.fishing.streak);
    if (perfect) this.state.fishing.perfectCatches += 1;

    let legendaryReward = "";
    if (species.legendary && !this.state.fishing.legendaryCaught.includes(species.id)) {
      this.state.fishing.legendaryCaught.push(species.id);
      this.state.coins += 600;
      this.state.stats.totalEarned += 600;
      this.addItem("anglerToken", 1, false);
      legendaryReward = `<p class="legendary-catch">🌟 Legendary first catch reward: 600 coins and an Angler's Token.</p>`;
      this.state.journal.unshift(`Legendary catch: ${species.name}, ${size.toFixed(1)} cm, on Day ${this.state.day}.`);
      this.state.journal = this.state.journal.slice(0, 30);
    }

    const treasureChance = clamp(.035 + accuracy * .055 + (gear.tackle.treasureBonus || 0) + (perfect ? .04 : 0), 0, .36);
    let treasureText = "";
    if (Math.random() < treasureChance) {
      const treasure = chooseTreasure();
      treasureText = giveTreasure(this, treasure);
      this.state.fishing.treasuresFound += 1;
    }

    this.sound?.("success");
    this.checkFishingAchievements();
    this.closeModal();
    this.openModal(`${species.icon} ${species.name} Landed`, `<section class="fishing-result"><span>${species.icon}</span><div><strong>${qualityIcon(quality)} ${qualityName(quality)} ${species.name}</strong><small>${size.toFixed(1)} cm · ${rarityLabel(species.rarity)} · ${Math.round(accuracy * 100)}% reel accuracy</small></div></section><p>${species.description}</p><p>Catch streak: <strong>${this.state.fishing.streak}</strong> · Species caught: <strong>${Object.keys(this.state.fishing.journal).length}/${FISH_SPECIES.length}</strong>${result.firstCatch ? " · New journal entry!" : ""}${perfect ? " · Perfect catch!" : ""}</p>${treasureText ? `<p class="fishing-treasure">🎁 ${treasureText}</p>` : ""}${legendaryReward}`, [
      { label: "Open Fishing Journal", action: () => { this.closeModal(); this.showFishingJournal(); } },
      { label: "Continue", action: () => this.closeModal() },
    ]);
    this.saveGame?.(true);
  };

  proto.checkFishingAchievements = function checkFishingAchievements() {
    const fishing = this.state.fishing;
    const speciesCount = Object.keys(fishing.journal).length;
    this.checkAchievement?.("first-species", speciesCount >= 1, "First Entry", "Record the first species in the Fishing Journal.");
    this.checkAchievement?.("continental-angler", speciesCount >= 12, "Continental Angler", "Catch 12 different fish species.");
    this.checkAchievement?.("complete-fish-journal", speciesCount >= FISH_SPECIES.length, "Living Waters", "Catch every fish species in Hearthvale.");
    this.checkAchievement?.("ten-catch-streak", fishing.bestStreak >= 10, "Unbroken Line", "Land 10 catches in one day without an escape.");
    this.checkAchievement?.("fishing-treasure", fishing.treasuresFound >= 1, "Something Beneath", "Recover treasure while fishing.");
    this.checkAchievement?.("perfect-angler", fishing.perfectCatches >= 5, "Perfect Rhythm", "Land five perfect catches.");
    this.checkAchievement?.("legendary-angler", fishing.legendaryCaught.length >= LEGENDARY_FISH.length, "Legend of Every Water", "Catch all four legendary fish.");
  };

  proto.showFishingJournal = function showFishingJournal() {
    this.state.fishing = createFishingState(this.state.fishing);
    const fishing = this.state.fishing;
    const currentRegion = this.state.mode === "world" ? regionAt(this.state.player.x, this.state.player.y) : null;
    const calendar = calendarForDay(this.state.day);
    const cards = FISH_SPECIES.map((species) => {
      const record = fishing.journal[species.id];
      const status = currentRegion ? fishAvailability(species, this.state, currentRegion.id) : { available: false, reason: "Return outdoors" };
      return `<article class="fish-journal-card ${record ? "caught" : "unknown"} ${species.legendary ? "legendary" : ""}"><header><span>${record ? species.icon : "❔"}</span><div><strong>${record ? species.name : "Unknown Species"}</strong><small>${rarityLabel(species.rarity)} · ${record ? species.regions.join(", ") : species.regions.join("/")}</small></div></header>${record ? `<p>${species.description}</p><small>Caught ${record.count} · Best ${qualityIcon(record.bestQuality)} ${qualityName(record.bestQuality)} · Largest ${record.largestSize.toFixed(1)} cm · First Day ${record.firstDay}</small>` : `<p>${speciesConditions(species)}</p>`}<span class="fish-availability ${status.available ? "available" : "unavailable"}">${status.available ? "Biting here now" : status.reason}</span></article>`;
    }).join("");
    const bait = BAIT_DEFS[fishing.selectedBait];
    const tackle = TACKLE_DEFS[fishing.selectedTackle];
    this.openModal("Continental Fishing Journal", `<section class="fishing-summary"><div><strong>${Object.keys(fishing.journal).length}/${FISH_SPECIES.length}</strong><small>species recorded</small></div><div><strong>${fishing.legendaryCaught.length}/${LEGENDARY_FISH.length}</strong><small>legends landed</small></div><div><strong>${fishing.bestStreak}</strong><small>best daily streak</small></div><div><strong>${fishing.treasuresFound}</strong><small>treasures recovered</small></div></section><section class="fishing-loadout"><div><strong>${bait.icon} ${bait.name}</strong><small>${bait.item ? `${this.state.inventory[bait.item] || 0} remaining` : bait.description}</small></div><div><strong>${tackle.icon} ${tackle.name}</strong><small>${tackle.id === "none" ? tackle.description : `${fishing.tackleUses[tackle.id] || 0} uses remaining`}</small></div></section><p>${calendar.season.icon} ${calendar.season.name}, Day ${calendar.seasonDay} · ${this.state.weather} · ${currentRegion?.name || "Indoors"}</p><div class="fish-journal-grid">${cards}</div>`, [
      { label: "Bait, Tackle & Supplies", action: () => { this.closeModal(); this.showFishingGear(); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
  };

  proto.showFishingGear = function showFishingGear() {
    const fishing = this.state.fishing = createFishingState(this.state.fishing);
    const stock = ensureFishingShopState(this.state);
    const fishingLevel = this.state.progression?.skillLevels?.fishing || 1;
    const baitButtons = Object.values(BAIT_DEFS).map((bait) => `<button data-select-bait="${bait.id}" ${bait.item && (this.state.inventory[bait.item] || 0) <= 0 ? "disabled" : ""}>${bait.icon} ${bait.name}${bait.item ? ` ×${this.state.inventory[bait.item] || 0}` : ""}${fishing.selectedBait === bait.id ? " ✓" : ""}</button>`).join("");
    const tackleButtons = Object.values(TACKLE_DEFS).map((tackle) => `<button data-select-tackle="${tackle.id}" ${tackle.id !== "none" && (fishing.tackleUses[tackle.id] || 0) <= 0 ? "disabled" : ""}>${tackle.icon} ${tackle.name}${tackle.id !== "none" ? ` · ${fishing.tackleUses[tackle.id] || 0} uses` : ""}${fishing.selectedTackle === tackle.id ? " ✓" : ""}</button>`).join("");
    const shop = FISHING_SHOP_STOCK.map((entry) => {
      const remaining = Math.max(0, Number(stock[entry.id]) || 0);
      const unlocked = fishingLevel >= entry.minLevel;
      return `<article class="fishing-shop-item"><div><strong>${entry.label}</strong><small>${entry.price} coins · Daily stock ${remaining} · Fishing Lv ${entry.minLevel}</small></div><button data-buy-fishing="${entry.id}" ${!unlocked || remaining <= 0 ? "disabled" : ""}>${!unlocked ? `Lv ${entry.minLevel}` : remaining <= 0 ? "Sold Out" : "Buy"}</button></article>`;
    }).join("");
    this.openModal("Tavi's Tackle Ledger", `<p>Coins: <strong>${this.state.coins}</strong> · Fishing Level <strong>${fishingLevel}</strong></p><h3>Selected Bait</h3><div class="menu-grid fishing-gear-grid">${baitButtons}</div><h3>Selected Tackle</h3><div class="menu-grid fishing-gear-grid">${tackleButtons}</div><h3>Daily Supplies</h3><div class="fishing-shop-list">${shop}</div>`, [
      { label: "Fishing Journal", action: () => { this.closeModal(); this.showFishingJournal(); } },
      { label: "Close", action: () => this.closeModal() },
    ]);
    document.querySelectorAll("[data-select-bait]").forEach((button) => { button.onclick = () => { fishing.selectedBait = button.dataset.selectBait; this.saveGame?.(true); this.closeModal(); this.showFishingGear(); }; });
    document.querySelectorAll("[data-select-tackle]").forEach((button) => { button.onclick = () => { fishing.selectedTackle = button.dataset.selectTackle; this.saveGame?.(true); this.closeModal(); this.showFishingGear(); }; });
    document.querySelectorAll("[data-buy-fishing]").forEach((button) => { button.onclick = () => this.buyFishingSupply(button.dataset.buyFishing); });
  };

  proto.buyFishingSupply = function buyFishingSupply(id) {
    const entry = FISHING_SHOP_STOCK.find((item) => item.id === id);
    const stock = ensureFishingShopState(this.state);
    const fishingLevel = this.state.progression?.skillLevels?.fishing || 1;
    if (!entry || fishingLevel < entry.minLevel || (stock[id] || 0) <= 0) return this.toast("That fishing supply is unavailable today.");
    if (this.state.coins < entry.price) return this.toast("Not enough coins.");
    this.state.coins -= entry.price;
    stock[id] -= 1;
    if (entry.id === "spinner" || entry.id === "lucky") this.state.fishing.tackleUses[entry.id] += entry.amount;
    else this.addItem(entry.id, entry.amount, false);
    this.sound?.("coin");
    this.saveGame?.(true);
    this.closeModal();
    this.toast(`Bought ${entry.label}.`);
    this.showFishingGear();
  };

  proto.toggleGameMenu = function toggleGameMenuFishing() {
    const result = original.toggleGameMenu.call(this);
    const grid = document.querySelector("#modalBody .menu-grid");
    if (!grid || document.getElementById("fishingJournalMenu")) return result;
    const button = document.createElement("button");
    button.id = "fishingJournalMenu";
    button.textContent = "🎣 Fishing Journal";
    grid.appendChild(button);
    button.onclick = () => { this.closeModal(); this.showFishingJournal(); };
    return result;
  };
}
