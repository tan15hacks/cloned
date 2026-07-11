export const TILE = 32;
export const WORLD_W = 256;
export const WORLD_H = 224;
export const SAVE_KEY = "hearthvale-save-v3";
export const LEGACY_SAVE_KEYS = ["hearthvale-save-v2", "hearthvale-save-v1"];
export const SETTINGS_KEY = "hearthvale-settings-v1";

export const ITEMS = {
  wood: { name: "Wood", icon: "🪵", value: 8 },
  stone: { name: "Stone", icon: "🪨", value: 7 },
  copper: { name: "Copper Ore", icon: "🟠", value: 22 },
  iron: { name: "Iron Ore", icon: "⚙️", value: 45 },
  silver: { name: "Silver Ore", icon: "🥈", value: 78 },
  gold: { name: "Gold Ore", icon: "🥇", value: 125 },
  obsidian: { name: "Obsidian", icon: "⬛", value: 180 },
  crystal: { name: "Hearth Crystal", icon: "💎", value: 180 },
  frostcore: { name: "Frost Core", icon: "❄️", value: 210 },
  embercore: { name: "Ember Core", icon: "🔥", value: 240 },
  voidshard: { name: "Void Shard", icon: "🔮", value: 360 },
  turnipSeed: { name: "Turnip Seeds", icon: "🌰", value: 12 },
  berrySeed: { name: "Sunberry Seeds", icon: "🫘", value: 22 },
  moonSeed: { name: "Moonbean Seeds", icon: "✨", value: 35 },
  turnip: { name: "Turnip", icon: "🥬", value: 34 },
  berry: { name: "Sunberry", icon: "🍓", value: 58 },
  moonbean: { name: "Moonbean", icon: "🫛", value: 95 },
  fish: { name: "River Fish", icon: "🐟", value: 45 },
  rareFish: { name: "Glimmerfin", icon: "🐠", value: 135 },
  fiber: { name: "Fiber", icon: "🌿", value: 5 },
  herb: { name: "Silverleaf", icon: "🍃", value: 24 },
  mushroom: { name: "Glowcap", icon: "🍄", value: 38 },
  apple: { name: "Orchard Apple", icon: "🍎", value: 42 },
  swampBloom: { name: "Swamp Bloom", icon: "🪷", value: 68 },
  mistPearl: { name: "Mist Pearl", icon: "⚪", value: 92 },
  snowHerb: { name: "Frostmint", icon: "🌱", value: 88 },
  volcanicGlass: { name: "Volcanic Glass", icon: "🔶", value: 115 },
  slimeGel: { name: "Slime Gel", icon: "🟢", value: 18 },
  fang: { name: "Monster Fang", icon: "🦷", value: 42 },
  venom: { name: "Venom Sac", icon: "🧪", value: 66 },
  hide: { name: "Beast Hide", icon: "🟫", value: 54 },
  ash: { name: "Living Ash", icon: "🌋", value: 76 },
  relic: { name: "Ancient Relic", icon: "🏺", value: 250 },
  snack: { name: "Trail Snack", icon: "🥨", value: 30 },
  tea: { name: "Forest Tea", icon: "🍵", value: 55 },
  potion: { name: "Red Potion", icon: "🧴", value: 80 },
  caveTonic: { name: "Cave Tonic", icon: "🫗", value: 140 },
};

export const CROPS = {
  turnip: { name: "Turnip", days: 2, seed: "turnipSeed", produce: "turnip", colors: ["#775a2d", "#6a9d45", "#d9ead0"] },
  berry: { name: "Sunberry", days: 3, seed: "berrySeed", produce: "berry", colors: ["#775a2d", "#3f8a61", "#d95e52"] },
  moonbean: { name: "Moonbean", days: 4, seed: "moonSeed", produce: "moonbean", colors: ["#775a2d", "#5c69a8", "#c9c8ff"] },
};

export const TOOLS = [
  { id: "hoe", name: "Hoe", icon: "⛏️" },
  { id: "water", name: "Watering Can", icon: "🚿" },
  { id: "axe", name: "Axe", icon: "🪓" },
  { id: "pick", name: "Pickaxe", icon: "🔨" },
  { id: "seed", name: "Seeds", icon: "🌱" },
  { id: "rod", name: "Fishing Rod", icon: "🎣" },
  { id: "sword", name: "Adventurer Blade", icon: "🗡️" },
  { id: "snack", name: "Consumable", icon: "🥨" },
];

export const RECIPES = [
  { id: "sprinkler", name: "Dewdrop Sprinkler", icon: "💦", description: "Waters the four neighboring farm tiles each morning.", cost: { wood: 8, stone: 8, copper: 2 } },
  { id: "snack", name: "Trail Snack", icon: "🥨", description: "Restores 30 energy.", cost: { berry: 1, turnip: 1 } },
  { id: "lantern", name: "Glow Lantern", icon: "🏮", description: "Boosts crop Harmony within three tiles.", cost: { wood: 6, crystal: 1 } },
  { id: "forestTea", name: "Forest Tea", icon: "🍵", description: "Restores 45 energy and 15 health.", cost: { herb: 2, mushroom: 1 } },
  { id: "caveTonic", name: "Cave Tonic", icon: "🫗", description: "Restores 70 energy and 45 health underground.", cost: { potion: 1, mushroom: 1, frostcore: 1 } },
];

export const WEATHER = {
  Clear: { icon: "☀️", tint: "rgba(255,232,155,.03)" },
  Cloudy: { icon: "☁️", tint: "rgba(110,130,145,.10)" },
  Rain: { icon: "🌧️", tint: "rgba(55,92,125,.16)" },
  Sparkfall: { icon: "✨", tint: "rgba(91,76,145,.12)" },
  Snow: { icon: "🌨️", tint: "rgba(205,225,240,.12)" },
};

export const REGIONS = [
  { id: "farm", name: "Hearthvale Farmstead", x: 0, y: 0, w: 56, h: 64, terrain: "farm", safe: true, color: "#6fa85e" },
  { id: "village", name: "Hearthvale Village", x: 56, y: 0, w: 56, h: 56, terrain: "village", safe: true, color: "#83ae68" },
  { id: "city", name: "Silvercrest City", x: 112, y: 0, w: 80, h: 80, terrain: "city", safe: true, color: "#9eb07b" },
  { id: "northwatch", name: "Northwatch Foothills", x: 192, y: 0, w: 64, h: 48, terrain: "highland", safe: true, color: "#829b83" },
  { id: "greenfields", name: "Greenfield Wilds", x: 0, y: 64, w: 56, h: 56, terrain: "meadow", safe: false, reward: "low", color: "#75ad65" },
  { id: "moonlake", name: "Moonlake Basin", x: 56, y: 56, w: 56, h: 56, terrain: "lake", safe: false, reward: "low", color: "#72a98d" },
  { id: "veilmoor", name: "Veilmoor", x: 112, y: 80, w: 64, h: 64, terrain: "mist", safe: false, reward: "medium", color: "#718d82" },
  { id: "frostpeak", name: "Frostpeak Mountains", x: 176, y: 48, w: 80, h: 80, terrain: "snow", safe: false, reward: "high", color: "#b8ccd2" },
  { id: "darkforest", name: "The Lightless Wood", x: 0, y: 120, w: 64, h: 56, terrain: "darkforest", safe: false, reward: "medium", color: "#294b3b" },
  { id: "swamp", name: "Murkfen Swamp", x: 56, y: 112, w: 64, h: 64, terrain: "swamp", safe: false, reward: "medium", color: "#566e49" },
  { id: "dreadwild", name: "Dreadwild Expanse", x: 120, y: 144, w: 56, h: 80, terrain: "dread", safe: false, reward: "elite", color: "#4b455b" },
  { id: "volcano", name: "Cinderwake Caldera", x: 176, y: 128, w: 80, h: 96, terrain: "volcano", safe: false, reward: "high", color: "#6a4a3f" },
  { id: "suncoast", name: "Suncoast Reach", x: 0, y: 176, w: 64, h: 48, terrain: "coast", safe: false, reward: "low", color: "#d2bd7b" },
  { id: "ruins", name: "Suncleft Ruins", x: 64, y: 176, w: 56, h: 48, terrain: "ruins", safe: false, reward: "high", color: "#a88c67" },
];

export const BUILDINGS = [
  { id: "farmhouse", name: "Farmhouse", x: 6, y: 5, w: 11, h: 8, door: { x: 11, y: 13 }, wall: "#d7a15f", roof: "#8b4e3f", service: "sleep" },
  { id: "barn", name: "Old Barn", x: 23, y: 6, w: 10, h: 7, door: { x: 28, y: 13 }, wall: "#c88c5a", roof: "#7d4439" },
  { id: "seedshop", name: "Mira's Seeds", x: 63, y: 7, w: 11, h: 8, door: { x: 68, y: 15 }, wall: "#e4b867", roof: "#a85143", service: "seedshop" },
  { id: "villageInn", name: "Hearth & Kettle", x: 81, y: 6, w: 13, h: 9, door: { x: 87, y: 15 }, wall: "#d0a773", roof: "#436f63", service: "inn" },
  { id: "workshop", name: "Oren's Workshop", x: 62, y: 25, w: 12, h: 8, door: { x: 68, y: 33 }, wall: "#ba9a76", roof: "#61727c", service: "workshop" },
  { id: "oldhall", name: "Hearthlight Hall", x: 82, y: 25, w: 12, h: 8, door: { x: 88, y: 33 }, wall: "#b9a185", roof: "#6f596f", service: "beacon" },
  { id: "guild", name: "Silvercrest Adventurers' Guild", x: 121, y: 7, w: 18, h: 11, door: { x: 130, y: 18 }, wall: "#c8a66d", roof: "#6f3f3b", service: "guild" },
  { id: "cityMarket", name: "Grand Market", x: 145, y: 7, w: 14, h: 10, door: { x: 152, y: 17 }, wall: "#d9b879", roof: "#8c5944", service: "market" },
  { id: "blacksmith", name: "Ironhart Smithy", x: 165, y: 7, w: 14, h: 10, door: { x: 172, y: 17 }, wall: "#a58c76", roof: "#4f5660", service: "blacksmith" },
  { id: "apothecary", name: "Blue Vial Apothecary", x: 121, y: 29, w: 14, h: 9, door: { x: 128, y: 38 }, wall: "#b9a8c8", roof: "#59658c", service: "apothecary" },
  { id: "arcane", name: "Moon & Rune", x: 142, y: 29, w: 14, h: 9, door: { x: 149, y: 38 }, wall: "#a798bd", roof: "#584a72", service: "arcane" },
  { id: "bank", name: "Silvercrest Exchange", x: 163, y: 29, w: 16, h: 9, door: { x: 171, y: 38 }, wall: "#d0c291", roof: "#58654e", service: "bank" },
  { id: "cityInn", name: "The Golden Griffin", x: 121, y: 50, w: 16, h: 10, door: { x: 129, y: 60 }, wall: "#d4aa70", roof: "#8b4e3f", service: "cityInn" },
  { id: "cityHall", name: "Silvercrest Hall", x: 145, y: 49, w: 20, h: 11, door: { x: 155, y: 60 }, wall: "#cbbd96", roof: "#526b75", service: "cityHall" },
  { id: "monsterShop", name: "Hunter's Provisioner", x: 171, y: 50, w: 13, h: 10, door: { x: 177, y: 60 }, wall: "#b8926f", roof: "#5c493d", service: "hunter" },
  { id: "observatory", name: "Starwatch Observatory", x: 213, y: 8, w: 14, h: 10, door: { x: 220, y: 18 }, wall: "#c9b88e", roof: "#59658c", service: "observatory" },
];

export const WAYSTONES = [
  { id: "farm", name: "Farmstead", x: 44.5, y: 31.5, spawn: { x: 42.5, y: 31.5 } },
  { id: "village", name: "Hearthvale Village", x: 100.5, y: 31.5, spawn: { x: 98.5, y: 31.5 } },
  { id: "city", name: "Silvercrest City", x: 186.5, y: 41.5, spawn: { x: 184.5, y: 41.5 } },
  { id: "greenfields", name: "Greenfield Wilds", x: 43.5, y: 89.5, spawn: { x: 41.5, y: 89.5 } },
  { id: "moonlake", name: "Moonlake", x: 102.5, y: 88.5, spawn: { x: 100.5, y: 88.5 } },
  { id: "veilmoor", name: "Veilmoor", x: 166.5, y: 112.5, spawn: { x: 164.5, y: 112.5 } },
  { id: "frostpeak", name: "Frostpeak", x: 219.5, y: 105.5, spawn: { x: 217.5, y: 105.5 } },
  { id: "darkforest", name: "Lightless Wood", x: 52.5, y: 147.5, spawn: { x: 50.5, y: 147.5 } },
  { id: "swamp", name: "Murkfen", x: 109.5, y: 151.5, spawn: { x: 107.5, y: 151.5 } },
  { id: "dreadwild", name: "Dreadwild", x: 165.5, y: 188.5, spawn: { x: 163.5, y: 188.5 } },
  { id: "volcano", name: "Cinderwake", x: 224.5, y: 182.5, spawn: { x: 222.5, y: 182.5 } },
  { id: "suncoast", name: "Suncoast", x: 51.5, y: 199.5, spawn: { x: 49.5, y: 199.5 } },
  { id: "ruins", name: "Suncleft Ruins", x: 108.5, y: 201.5, spawn: { x: 106.5, y: 201.5 } },
];

export const CAVE_ENTRANCES = [
  { id: "grandDepths", name: "Grand Depths", x: 189.5, y: 69.5, shortcut: 1, description: "The main 50-floor expedition beneath Silvercrest." },
  { id: "copperHollow", name: "Copper Hollow", x: 48.5, y: 105.5, shortcut: 1, description: "A western tunnel joining the Grand Depths hub." },
  { id: "mireSink", name: "Mire Sinkhole", x: 91.5, y: 165.5, shortcut: 10, description: "A damp shortcut unlocked after reaching Floor 10." },
  { id: "frostRift", name: "Frost Rift", x: 244.5, y: 112.5, shortcut: 30, description: "An icy shortcut unlocked after reaching Floor 30." },
  { id: "calderaMaw", name: "Caldera Maw", x: 240.5, y: 205.5, shortcut: 40, description: "A volcanic shortcut unlocked after reaching Floor 40." },
];

export const INTERACTIONS = {
  questBoard: { x: 58.5, y: 31.5 },
  beacon: { x: 88.5, y: 35.5 },
  villageDock: { x: 81.5, y: 84.5 },
  guildBoard: { x: 130.5, y: 20.5 },
};

export const NPC_DEFS = [
  { id: "mira", name: "Mira", emoji: "👩🏽‍🌾", color: "#d95e52", home: { x: 68.5, y: 16.5 }, favorite: "berry", region: "village", lines: ["Silvercrest buys almost anything, but Hearthvale still grows the sweetest crops.", "Plant different mature crops side by side to build Harmony.", "The roads now reach every corner of the continent."] },
  { id: "oren", name: "Oren", emoji: "🧔🏽", color: "#4d7891", home: { x: 68.5, y: 34.5 }, favorite: "copper", region: "village", lines: ["The Grand Depths change every ten floors.", "Copper is only the beginning. Deeper rock carries iron, silver, gold, and stranger things.", "A tempered tool saves energy and breaks richer nodes."] },
  { id: "lumi", name: "Lumi", emoji: "🧑🏻‍🎨", color: "#8d68a6", home: { x: 88.5, y: 34.5 }, favorite: "moonbean", region: "village", lines: ["Veilmoor has colors that only appear through fog.", "The dark forest swallows ordinary lantern light.", "Waystones remember every traveler who wakes them."] },
  { id: "tavi", name: "Tavi", emoji: "🧒🏾", color: "#d7a23a", home: { x: 37.5, y: 45.5 }, favorite: "fish", region: "farm", lines: ["Greenfield monsters are easy enough for new adventurers.", "Do not enter Dreadwild without potions.", "I heard a chest appears on only one expedition floor out of a hundred!"] },
  { id: "sora", name: "Sora", emoji: "🧑🏻‍🔭", color: "#576da6", home: { x: 220.5, y: 19.5 }, favorite: "crystal", region: "northwatch", lines: ["Frostpeak storms can turn clear weather into snow.", "The observatory tracks Sparkfall and volcanic ash clouds.", "The deepest cave crystals bend starlight strangely."] },
  { id: "aria", name: "Guildmaster Aria", emoji: "🧝🏽‍♀️", color: "#8d5048", home: { x: 130.5, y: 20.5 }, favorite: "relic", region: "city", lines: ["Silvercrest welcomes farmers, miners, and monster hunters alike.", "Complete bounties to rise from Rank F to Rank S.", "Dreadwild contracts pay well because many hunters never finish them."] },
  { id: "bram", name: "Bram Ironhart", emoji: "🧑🏾‍🏭", color: "#58636a", home: { x: 172.5, y: 18.5 }, favorite: "iron", region: "city", lines: ["A blade is only as brave as the hand holding it.", "Bring ores from deeper floors and I can temper your equipment.", "Obsidian holds an edge, but Ember Cores make it sing."] },
  { id: "niva", name: "Niva", emoji: "🧙🏻‍♀️", color: "#6f62a5", home: { x: 149.5, y: 39.5 }, favorite: "mistPearl", region: "city", lines: ["Mist Pearls form where Veilmoor spirits vanish.", "My runes can identify relics from cave chests.", "Void Shards are dangerous, beautiful, and extremely expensive."] },
  { id: "pella", name: "Pella", emoji: "👩🏼‍🔬", color: "#527e87", home: { x: 128.5, y: 39.5 }, favorite: "herb", region: "city", lines: ["Bring monster parts and I can brew stronger tonics.", "Frostmint cools burns from the Caldera.", "Never mix Living Ash with ordinary tea."] },
  { id: "cass", name: "Cass", emoji: "🧑🏽‍💼", color: "#6f7b4a", home: { x: 152.5, y: 18.5 }, favorite: "gold", region: "city", lines: ["The Grand Market adjusts prices to regional demand.", "Rare monster drops sell best in Silvercrest.", "Guild rank opens special merchant stock."] },
  { id: "rowan", name: "Rowan", emoji: "🧑🏼‍🍳", color: "#a5634f", home: { x: 129.5, y: 61.5 }, favorite: "apple", region: "city", lines: ["The Golden Griffin serves hunters at any hour.", "Cave Tonic tastes awful and works wonderfully.", "Bring an apple and I will make the stew sweeter."] },
  { id: "ves", name: "Ves", emoji: "🧑🏽‍🎤", color: "#9b6b8d", home: { x: 155.5, y: 63.5 }, favorite: "moonbean", region: "city", lines: ["Silvercrest has festivals whenever a hunter reaches Rank A.", "The city is louder than Hearthvale, but every alley has a story.", "The guild keeps monster reports in the city hall archive."] },
  { id: "lyra", name: "Lyra Vale", emoji: "👩🏻‍💼", color: "#788c62", home: { x: 171.5, y: 39.5 }, favorite: "silver", region: "city", lines: ["The Exchange records every great expedition.", "Gold is valuable, but information is often worth more.", "I can help keep your exported save secure."] },
  { id: "jax", name: "Jax", emoji: "🧔🏻‍♂️", color: "#795548", home: { x: 177.5, y: 61.5 }, favorite: "fang", region: "city", lines: ["Dreadwild trophies command the best price.", "A hunter who packs potions is a hunter who returns.", "Every monster has a tell before it strikes."] },
  { id: "mei", name: "Mei", emoji: "🧑🏻‍🦰", color: "#4e7891", home: { x: 142.5, y: 66.5 }, favorite: "mistPearl", region: "city", lines: ["I am charting every Waystone on the continent.", "Veilmoor roads vanish under the fog, so trust the stone markers.", "The world map records regions the moment you enter them."] },
  { id: "tor", name: "Tor", emoji: "🧑🏿‍✈️", color: "#7a4f48", home: { x: 134.5, y: 21.5 }, favorite: "relic", region: "city", lines: ["Guild contracts reset every morning.", "Rank S hunters earn respect, not immunity.", "The floor gate remembers every milestone you reach."] },
  { id: "eno", name: "Eno", emoji: "👨🏽‍🌾", color: "#688354", home: { x: 119.5, y: 67.5 }, favorite: "apple", region: "city", lines: ["Trade caravans use the southern city road.", "Suncoast fruit arrives before noon.", "Hearthvale farmers keep Silvercrest fed."] },
  { id: "faye", name: "Faye", emoji: "👩🏾‍🎨", color: "#8065a1", home: { x: 158.5, y: 67.5 }, favorite: "crystal", region: "city", lines: ["Crystals from Floor 20 glow in six colors.", "I set monster cores into jewelry for veteran hunters.", "The rarest cave chests carry stones no surface mine can produce."] },
];
