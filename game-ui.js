import { TILE, WORLD_W, WORLD_H, SAVE_KEY, LEGACY_SAVE_KEYS, SETTINGS_KEY, ITEMS, CROPS, TOOLS, RECIPES, WEATHER, REGIONS, BUILDINGS, WAYSTONES, CAVE_ENTRANCES, INTERACTIONS, NPC_DEFS, MONSTER_TYPES, isWaterTile, isPathTile, isBridgeTile, buildingAtTile, isReservedTile, isFarmableTile, regionAt, terrainAt, generateResources, generateMonsters, generateQuests, generateGuildBounties, CAVE_W, CAVE_H, CAVE_MONSTERS, caveTier, generateCaveFloor, chestLoot, caveMerchantStock, $, clamp, keyOf, distance, randomChoice, safeParse, formatTime, randomInt, GUILD_RANKS, FORAGE_TYPES, AXE_TYPES, PICK_TYPES, forecastWeather } from "./game-shared.js";

export const game_ui = {
closeModal() {
    if (this.fishingTimer) { clearInterval(this.fishingTimer); this.fishingTimer = null; }
    this.modalOpen = false; this.paused = !this.running; $("modal").classList.add("hidden");
  },

toast(message) {
    const element = $("toast"); element.textContent = message; element.classList.remove("hidden"); requestAnimationFrame(() => element.classList.add("show")); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => { element.classList.remove("show"); setTimeout(() => element.classList.add("hidden"), 200); }, 2500);
  },

sound(type) {
    if (!this.settings.sound) return;
    try {
      if (!this.audio) this.audio = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = this.audio.createOscillator(); const gain = this.audio.createGain(); const map = { dig: 150, water: 310, plant: 420, hit: 130, swing: 220, harvest: 520, success: 690, coin: 610, eat: 360, hurt: 95 };
      oscillator.frequency.value = map[type] || 300; oscillator.type = type === "success" ? "triangle" : "square"; gain.gain.setValueAtTime(.04, this.audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, this.audio.currentTime + .12); oscillator.connect(gain); gain.connect(this.audio.destination); oscillator.start(); oscillator.stop(this.audio.currentTime + .12);
    } catch {}
  },

vibrate(milliseconds) { if (this.settings.vibration) navigator.vibrate?.(milliseconds); }
};
