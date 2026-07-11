import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock, $, clamp, keyOf, distance, randomChoice, safeParse, formatTime, randomInt, GUILD_RANKS, FORAGE_TYPES, AXE_TYPES, PICK_TYPES, forecastWeather } from "./game-shared.js";

export const game_actions_3 = {
beginFishing() {
    if (this.state.mode === "cave") return this.toast("There are no fish in the Grand Depths.");
    const player = this.state.player;
    let nearWater = false;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) if (isWaterTile(Math.floor(player.x + dx), Math.floor(player.y + dy))) nearWater = true;
    if (!nearWater) return this.toast("Stand beside water to fish.");
    this.spendEnergy(2);
    this.openFishingGame();
  },

openFishingGame() {
    this.modalOpen = true; this.paused = true;
    $("modalTitle").textContent = "Fishing — Reel in the Gold Zone";
    $("modalBody").innerHTML = `<p>Press <strong>REEL</strong> while the fish overlaps the gold zone. You have three attempts.</p><div id="fishTrack" style="position:relative;height:58px;background:#8ec6d8;border:3px solid #10241d;border-radius:12px;overflow:hidden;margin:18px 0"><div style="position:absolute;left:58%;width:19%;top:0;bottom:0;background:rgba(239,185,74,.75);border-left:3px solid #10241d;border-right:3px solid #10241d"></div><div id="fishMarker" style="position:absolute;left:0;top:8px;font-size:34px">🐟</div></div><p id="fishStatus"><strong>Attempts:</strong> 3</p>`;
    $("modalActions").innerHTML = `<button id="reelButton">REEL</button><button id="cancelFishing">Cancel</button>`;
    $("modal").classList.remove("hidden");
    let pos = 0; let dir = 1; let attempts = 3;
    const marker = $("fishMarker");
    this.fishingTimer = setInterval(() => { pos += dir * 1.6; if (pos >= 91) { pos = 91; dir = -1; } if (pos <= 0) { pos = 0; dir = 1; } marker.style.left = `${pos}%`; }, 16);
    $("reelButton").onclick = () => {
      if (pos >= 53 && pos <= 78) {
        clearInterval(this.fishingTimer); this.fishingTimer = null;
        const region = regionAt(this.state.player.x, this.state.player.y).id;
        const rareChance = this.state.weather === "Sparkfall" || region === "moonlake" ? .25 : .1;
        const item = Math.random() < rareChance ? "rareFish" : "fish";
        this.addItem(item, 1, false); this.state.questStats.fish += 1; this.state.stats.fishCaught += 1; this.checkQuests(); this.closeModal(); this.toast(`Caught ${ITEMS[item].name}!`);
      } else {
        attempts -= 1; this.vibrate(45); $("fishStatus").innerHTML = `<strong>Attempts:</strong> ${attempts} — The fish slipped away.`;
        if (attempts <= 0) { clearInterval(this.fishingTimer); this.fishingTimer = null; this.closeModal(); this.toast("The fish escaped."); }
      }
    };
    $("cancelFishing").onclick = () => { clearInterval(this.fishingTimer); this.fishingTimer = null; this.closeModal(); };
  },

swingSword() {
    const player = this.state.player;
    const monsters = this.currentMonsters();
    let hit = false;
    this.attackFlash = .18;
    for (const monster of monsters) {
      if (monster.hp <= 0 || distance(player, monster) > 1.55) continue;
      const damage = 2 + this.state.upgrades.weaponPower * 2;
      monster.hp -= damage;
      const angle = Math.atan2(monster.y - player.y, monster.x - player.x);
      monster.x += Math.cos(angle) * .45; monster.y += Math.sin(angle) * .45;
      hit = true;
      if (monster.hp <= 0) this.defeatMonster(monster);
    }
    this.sound(hit ? "hit" : "swing");
  },

currentMonsters() { return this.state.mode === "cave" ? (this.currentCave?.monsters || []) : this.state.monsters; },

defeatMonster(monster) {
    const def = this.state.mode === "cave" ? CAVE_MONSTERS[monster.type] : MONSTER_TYPES[monster.type];
    const coins = randomInt(def.coins[0], def.coins[1]);
    this.state.coins += coins;
    this.state.guild.xp += def.xp;
    this.state.stats.monstersDefeated += 1;
    this.state.questStats.monsters += 1;
    def.drops.forEach(([id, chance]) => { if (Math.random() < chance) this.addItem(id, 1, false); });
    if (this.state.mode === "cave") {
      this.state.cave.clearedMonsters.push(monster.id);
      this.currentCave.monsters = this.currentCave.monsters.filter((entry) => entry.id !== monster.id);
      if (monster.type === "depthWarden") { this.state.flags.caveBossDefeated = true; this.toast("The Floor 50 Warden has fallen. The final gate is open."); }
    } else {
      const region = regionAt(monster.x, monster.y).id;
      this.state.guild.dailyKills[region] = (this.state.guild.dailyKills[region] || 0) + 1;
      this.state.monsters = this.state.monsters.filter((entry) => entry.id !== monster.id);
    }
    this.updateGuildRank();
    this.checkQuests();
    this.toast(`Defeated ${def.name}: +${coins} coins, +${def.xp} Guild XP.`);
  },

updateGuildRank() {
    const old = this.state.guild.rank;
    const rank = [...GUILD_RANKS].reverse().find((entry) => this.state.guild.xp >= entry.xp)?.name || "F";
    this.state.guild.rank = rank;
    if (rank !== old) { this.sound("success"); this.toast(`Guild rank advanced: ${old} → ${rank}!`); }
  },

updateMonsters(dt) {
    const player = this.state.player;
    for (const monster of this.currentMonsters()) {
      if (monster.hp <= 0) continue;
      monster.cooldown = Math.max(0, monster.cooldown - dt);
      const d = distance(player, monster);
      if (d < 8 && d > .72) {
        const def = this.state.mode === "cave" ? CAVE_MONSTERS[monster.type] : MONSTER_TYPES[monster.type];
        const dx = (player.x - monster.x) / d;
        const dy = (player.y - monster.y) / d;
        const nx = monster.x + dx * def.speed * dt;
        const ny = monster.y + dy * def.speed * dt;
        if (!this.monsterCollides(nx, ny)) { monster.x = nx; monster.y = ny; }
      }
      if (d < .8 && monster.cooldown <= 0) {
        const def = this.state.mode === "cave" ? CAVE_MONSTERS[monster.type] : MONSTER_TYPES[monster.type];
        const damage = Math.max(1, def.damage - this.state.upgrades.armor * 2);
        player.health = clamp(player.health - damage, 0, player.maxHealth);
        monster.cooldown = 1.45;
        this.vibrate(65); this.sound("hurt"); this.toast(`${def.name} dealt ${damage} damage.`);
        if (player.health <= 0) this.knockedOut();
      }
    }
  },

monsterCollides(x, y) {
    if (this.state.mode === "cave") {
      const tx = Math.floor(x); const ty = Math.floor(y);
      return tx < 1 || ty < 1 || tx >= CAVE_W - 1 || ty >= CAVE_H - 1 || this.currentCave.tiles[ty][tx] === "wall";
    }
    return isWaterTile(Math.floor(x), Math.floor(y)) || Boolean(buildingAtTile(x, y));
  },

knockedOut() {
    const fee = Math.min(250, Math.floor(this.state.coins * .12));
    this.state.coins -= fee;
    this.state.player.health = Math.ceil(this.state.player.maxHealth * .55);
    this.state.player.energy = Math.ceil(this.state.player.maxEnergy * .45);
    if (this.state.mode === "cave") {
      this.state.cave.currentFloor = 1; this.loadCaveFloor(1); this.state.player.x = 5.5; this.state.player.y = 16.5;
      this.toast(`The expedition healer rescued you. Recovery fee: ${fee} coins.`);
    } else {
      this.state.player.x = 130.5; this.state.player.y = 20.5;
      this.toast(`Silvercrest Guild rescued you. Recovery fee: ${fee} coins.`);
    }
  },

useConsumable() {
    const order = this.state.mode === "cave" ? ["caveTonic", "potion", "tea", "snack"] : ["potion", "tea", "snack", "caveTonic"];
    const id = order.find((item) => (this.state.inventory[item] || 0) > 0);
    if (!id) return this.toast("You have no consumables.");
    if (this.state.player.energy >= this.state.player.maxEnergy && this.state.player.health >= this.state.player.maxHealth) return this.toast("Health and energy are already full.");
    this.state.inventory[id] -= 1;
    const effects = { snack: [30, 0], tea: [45, 15], potion: [10, 45], caveTonic: [70, 45] };
    const [energy, health] = effects[id];
    this.state.player.energy = clamp(this.state.player.energy + energy, 0, this.state.player.maxEnergy);
    this.state.player.health = clamp(this.state.player.health + health, 0, this.state.player.maxHealth);
    this.toast(`${ITEMS[id].name} restored ${energy} energy and ${health} health.`);
    this.sound("eat");
  },

offerSleep() {
    this.openModal("Sleep Until Morning", `<p>End Day ${this.state.day}, restore health and energy, regrow the wilderness, and save?</p>`, [
      { label: "Stay Awake", action: () => this.closeModal() },
      { label: "Sleep", action: () => { this.closeModal(); this.nextDay(false); } },
    ]);
  },

passOut() {
    const fee = Math.min(120, Math.floor(this.state.coins * .1));
    this.state.coins -= fee;
    if (this.state.mode === "cave") this.leaveCave();
    this.toast(`You passed out. Recovery cost ${fee} coins.`);
    this.nextDay(true);
  }
};
