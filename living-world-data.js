export const INTERIOR_MAPS = {
  farmhouse: {
    id: "farmhouse", name: "Farmhouse", width: 20, height: 14,
    floor: "#b99062", wall: "#6f4c3b", trim: "#d7b07b",
    exit: { x: 10.5, y: 12.5, world: { x: 11.5, y: 14.5 } },
    objects: [
      { type: "bed", x: 2, y: 2, w: 4, h: 3, solid: true },
      { type: "table", x: 8, y: 4, w: 4, h: 3, solid: true },
      { type: "chest", x: 15, y: 2, w: 2, h: 2, solid: true },
      { type: "rug", x: 7, y: 8, w: 6, h: 3, solid: false },
      { type: "hearth", x: 16, y: 8, w: 2, h: 3, solid: true },
    ],
    interactions: [
      { id: "sleep", x: 4.5, y: 5.5, label: "Sleep" },
      { id: "storage", x: 15.5, y: 4.5, label: "Storage" },
      { id: "journal", x: 10.5, y: 7.5, label: "Journal" },
    ],
  },
  guild: {
    id: "guild", name: "Silvercrest Adventurers' Guild", width: 28, height: 18,
    floor: "#aa8b63", wall: "#563d39", trim: "#d6b678",
    exit: { x: 14.5, y: 16.5, world: { x: 130.5, y: 19.5 } },
    objects: [
      { type: "counter", x: 9, y: 3, w: 10, h: 2, solid: true },
      { type: "board", x: 3, y: 3, w: 3, h: 4, solid: true },
      { type: "table", x: 4, y: 10, w: 5, h: 3, solid: true },
      { type: "table", x: 19, y: 10, w: 5, h: 3, solid: true },
      { type: "rug", x: 10, y: 7, w: 8, h: 6, solid: false },
      { type: "banner", x: 12, y: 1, w: 4, h: 2, solid: false },
    ],
    interactions: [
      { id: "guildDesk", x: 14.5, y: 6.5, label: "Guild Desk" },
      { id: "guildBoard", x: 6.5, y: 6.5, label: "Bounty Board" },
      { id: "training", x: 21.5, y: 8.5, label: "Training Notes" },
    ],
    residents: [
      { id: "aria", x: 14.5, y: 6.5 },
      { id: "tor", x: 11.5, y: 8.5 },
    ],
  },
};

export const NPC_SCHEDULES = {
  mira: [{ from: 360, to: 720, x: 68.5, y: 16.5, activity: "Opening Mira's Seeds" }, { from: 720, to: 1020, x: 60.5, y: 21.5, activity: "Tending the village garden" }, { from: 1020, to: 1320, x: 87.5, y: 18.5, activity: "Dinner at Hearth & Kettle" }],
  oren: [{ from: 360, to: 1020, x: 68.5, y: 34.5, activity: "Working at the forge" }, { from: 1020, to: 1320, x: 87.5, y: 18.5, activity: "Relaxing at the inn" }],
  lumi: [{ from: 360, to: 840, x: 88.5, y: 34.5, activity: "Painting near Hearthlight Hall" }, { from: 840, to: 1200, x: 100.5, y: 31.5, activity: "Sketching the Waystone" }],
  tavi: [{ from: 360, to: 780, x: 37.5, y: 45.5, activity: "Fishing by the farm pond" }, { from: 780, to: 1200, x: 44.5, y: 31.5, activity: "Watching travelers" }],
  sora: [{ from: 360, to: 960, x: 220.5, y: 19.5, activity: "Resting near Starwatch" }, { from: 960, to: 1440, x: 220.5, y: 19.5, activity: "Observing the night sky" }],
  aria: [{ from: 360, to: 540, x: 118.5, y: 25.5, activity: "Morning guild training" }, { from: 540, to: 1080, x: 130.5, y: 20.5, activity: "Managing guild contracts" }, { from: 1080, to: 1320, x: 152.5, y: 45.5, activity: "Walking through the city plaza" }],
  bram: [{ from: 360, to: 1020, x: 172.5, y: 18.5, activity: "Forging equipment" }, { from: 1020, to: 1200, x: 152.5, y: 24.5, activity: "Buying market supplies" }],
  niva: [{ from: 420, to: 1080, x: 149.5, y: 39.5, activity: "Studying runes" }, { from: 1080, to: 1320, x: 152.5, y: 45.5, activity: "Reading by the fountain" }],
  pella: [{ from: 360, to: 1020, x: 128.5, y: 39.5, activity: "Brewing remedies" }, { from: 1020, to: 1260, x: 145.5, y: 24.5, activity: "Shopping for herbs" }],
  cass: [{ from: 360, to: 1020, x: 152.5, y: 18.5, activity: "Running the market" }, { from: 1020, to: 1260, x: 152.5, y: 45.5, activity: "Counting the day's sales" }],
  rowan: [{ from: 480, to: 1320, x: 129.5, y: 61.5, activity: "Serving guests at the Golden Griffin" }],
  ves: [{ from: 600, to: 1020, x: 155.5, y: 63.5, activity: "Rehearsing at City Hall" }, { from: 1020, to: 1320, x: 152.5, y: 45.5, activity: "Performing in the plaza" }],
  lyra: [{ from: 420, to: 1080, x: 171.5, y: 39.5, activity: "Managing the Exchange" }],
  jax: [{ from: 420, to: 960, x: 177.5, y: 61.5, activity: "Preparing hunter supplies" }, { from: 960, to: 1200, x: 118.5, y: 25.5, activity: "Training at the guild yard" }],
  mei: [{ from: 420, to: 840, x: 142.5, y: 66.5, activity: "Updating city maps" }, { from: 840, to: 1200, x: 186.5, y: 41.5, activity: "Surveying the city Waystone" }],
  tor: [{ from: 360, to: 960, x: 134.5, y: 21.5, activity: "Reviewing contracts" }, { from: 960, to: 1200, x: 118.5, y: 25.5, activity: "Leading combat drills" }],
  eno: [{ from: 360, to: 960, x: 119.5, y: 67.5, activity: "Unloading trade wagons" }, { from: 960, to: 1200, x: 145.5, y: 24.5, activity: "Selling produce" }],
  rhea: [{ from: 420, to: 1020, x: 184.5, y: 67.5, activity: "Patrolling the east gate" }, { from: 1020, to: 1200, x: 152.5, y: 45.5, activity: "Reporting at the plaza" }],
};

export const CITIZEN_ROUTES = [
  { id: "city-a", region: "city", points: [[118.5,32.5],[130.5,32.5],[152.5,32.5],[170.5,32.5],[184.5,42.5],[170.5,62.5],[150.5,62.5],[128.5,62.5]], color: "#b86a5c" },
  { id: "city-b", region: "city", points: [[152.5,22.5],[152.5,42.5],[152.5,62.5],[170.5,62.5],[170.5,42.5],[170.5,22.5]], color: "#5b7fa4" },
  { id: "city-c", region: "city", points: [[120.5,42.5],[138.5,42.5],[152.5,45.5],[166.5,42.5],[184.5,42.5]], color: "#8b6d9f" },
  { id: "village-a", region: "village", points: [[60.5,32.5],[68.5,32.5],[78.5,32.5],[88.5,32.5],[100.5,32.5]], color: "#c5894f" },
  { id: "village-b", region: "village", points: [[68.5,17.5],[68.5,32.5],[78.5,32.5],[87.5,17.5]], color: "#6f8e67" },
];

export function scheduleForNpc(id, minutes, weather) {
  const entries = NPC_SCHEDULES[id] || [];
  let chosen = entries.find((entry) => minutes >= entry.from && minutes < entry.to) || entries[entries.length - 1];
  if (!chosen) return null;
  if (["Rain", "Snow"].includes(weather) && minutes > 540 && id !== "sora") {
    const sheltered = entries[0];
    if (sheltered) chosen = { ...sheltered, activity: weather === "Rain" ? "Sheltering from the rain" : "Keeping warm indoors" };
  }
  return chosen;
}

export function shopIsOpen(service, minutes) {
  const hours = {
    seedshop: [420, 1020], workshop: [480, 1080], blacksmith: [420, 1080], guild: [360, 1200], market: [420, 1080],
    apothecary: [480, 1080], arcane: [600, 1200], bank: [480, 1020], hunter: [420, 1080], observatory: [900, 1440],
    cityHall: [480, 1020], inn: [360, 1380], cityInn: [360, 1380], sleep: [0, 1440], beacon: [0, 1440],
  };
  const [open, close] = hours[service] || [0, 1440];
  return minutes >= open && minutes < close;
}
