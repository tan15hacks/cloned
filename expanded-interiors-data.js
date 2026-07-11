import { INTERIOR_MAPS, shopIsOpen } from "./living-world-data.js";

const shopMap = ({ id, name, width, height, floor, wall, trim, exit, objects, interactions, residents = [], lights = [], ambience = null }) => ({
  id, name, width, height, floor, wall, trim, exit, objects, interactions, residents, lights, ambience,
});

export const EXPANDED_INTERIOR_MAPS = {
  seedshop: shopMap({
    id: "seedshop", name: "Mira's Seeds", width: 22, height: 15,
    floor: "#c79c66", wall: "#704936", trim: "#e4c982", ambience: "greenhouse",
    exit: { x: 11.5, y: 13.5, world: { x: 68.5, y: 16.5 } },
    objects: [
      { type: "counter", x: 4, y: 3, w: 14, h: 2, solid: true },
      { type: "shelf", x: 2, y: 2, w: 2, h: 7, solid: true },
      { type: "shelf", x: 18, y: 2, w: 2, h: 7, solid: true },
      { type: "seedDisplay", x: 5, y: 9, w: 4, h: 2, solid: true },
      { type: "seedDisplay", x: 13, y: 9, w: 4, h: 2, solid: true },
      { type: "plant", x: 2, y: 11, w: 2, h: 2, solid: true },
      { type: "plant", x: 18, y: 11, w: 2, h: 2, solid: true },
      { type: "rug", x: 9, y: 7, w: 4, h: 4, solid: false },
    ],
    interactions: [
      { id: "seedCounter", x: 11.5, y: 6.5, label: "Browse Seeds" },
      { id: "cropCalendar", x: 5.5, y: 8.5, label: "Seasonal Crop Board" },
      { id: "seedDisplay", x: 15.5, y: 8.5, label: "Inspect Seed Displays" },
    ],
    residents: [
      { id: "mira", x: 11.5, y: 2.5, from: 360, to: 720, rainTo: 1020, hideFromWorld: true },
    ],
    lights: [{ x: 6, y: 6, radius: 5, color: "#ffe7a5" }, { x: 16, y: 6, radius: 5, color: "#ffe7a5" }],
  }),

  villageInn: shopMap({
    id: "villageInn", name: "Hearth & Kettle", width: 26, height: 18,
    floor: "#aa7d57", wall: "#533d32", trim: "#d8b87c", ambience: "hearth",
    exit: { x: 13.5, y: 16.5, world: { x: 87.5, y: 16.5 } },
    objects: [
      { type: "counter", x: 3, y: 3, w: 9, h: 2, solid: true },
      { type: "stove", x: 2, y: 7, w: 3, h: 3, solid: true },
      { type: "hearth", x: 20, y: 3, w: 3, h: 3, solid: true },
      { type: "table", x: 8, y: 8, w: 4, h: 3, solid: true },
      { type: "table", x: 15, y: 8, w: 4, h: 3, solid: true },
      { type: "table", x: 8, y: 13, w: 4, h: 2, solid: true },
      { type: "table", x: 15, y: 13, w: 4, h: 2, solid: true },
      { type: "barrel", x: 22, y: 9, w: 2, h: 2, solid: true },
      { type: "piano", x: 20, y: 13, w: 4, h: 2, solid: true },
      { type: "rug", x: 11, y: 6, w: 5, h: 4, solid: false },
    ],
    interactions: [
      { id: "villageInnCounter", x: 7.5, y: 6.5, label: "Order a Meal or Room" },
      { id: "villageKitchen", x: 5.5, y: 8.5, label: "Kitchen Specials" },
      { id: "villageGuestbook", x: 20.5, y: 12.5, label: "Read the Guestbook" },
    ],
    residents: [
      { id: "oren", x: 17.5, y: 12.5, from: 1020, to: 1320, hideFromWorld: true },
    ],
    lights: [{ x: 21.5, y: 5, radius: 7, color: "#ffb24d" }, { x: 13, y: 9, radius: 6, color: "#ffd98a" }],
  }),

  blacksmith: shopMap({
    id: "blacksmith", name: "Ironhart Smithy", width: 24, height: 16,
    floor: "#88715f", wall: "#3f4249", trim: "#c29b67", ambience: "forge",
    exit: { x: 12.5, y: 14.5, world: { x: 172.5, y: 18.5 } },
    objects: [
      { type: "counter", x: 3, y: 3, w: 8, h: 2, solid: true },
      { type: "forge", x: 17, y: 2, w: 4, h: 4, solid: true },
      { type: "anvil", x: 15, y: 8, w: 3, h: 2, solid: true },
      { type: "toolRack", x: 2, y: 7, w: 2, h: 5, solid: true },
      { type: "oreBin", x: 19, y: 9, w: 3, h: 3, solid: true },
      { type: "workbench", x: 6, y: 9, w: 5, h: 2, solid: true },
      { type: "rug", x: 10, y: 6, w: 4, h: 4, solid: false },
    ],
    interactions: [
      { id: "smithCounter", x: 7.5, y: 6.5, label: "Blacksmith Services" },
      { id: "smithAnvil", x: 15.5, y: 11.5, label: "Use the Tempering Anvil" },
      { id: "forgeLedger", x: 10.5, y: 8.5, label: "Read Upgrade Requirements" },
    ],
    residents: [
      { id: "bram", x: 15.5, y: 6.5, from: 360, to: 1020, rainTo: 1080, hideFromWorld: true },
    ],
    lights: [{ x: 19, y: 5, radius: 8, color: "#ff6b35" }, { x: 8, y: 7, radius: 4, color: "#ffd07a" }],
  }),

  apothecary: shopMap({
    id: "apothecary", name: "Blue Vial Apothecary", width: 22, height: 15,
    floor: "#8f84a7", wall: "#403b58", trim: "#c8bbe3", ambience: "alchemy",
    exit: { x: 11.5, y: 13.5, world: { x: 128.5, y: 39.5 } },
    objects: [
      { type: "counter", x: 4, y: 3, w: 12, h: 2, solid: true },
      { type: "shelf", x: 2, y: 2, w: 2, h: 8, solid: true },
      { type: "shelf", x: 18, y: 2, w: 2, h: 8, solid: true },
      { type: "cauldron", x: 9, y: 8, w: 4, h: 3, solid: true },
      { type: "herbTable", x: 4, y: 10, w: 4, h: 2, solid: true },
      { type: "herbTable", x: 14, y: 10, w: 4, h: 2, solid: true },
      { type: "rug", x: 8, y: 6, w: 6, h: 5, solid: false },
    ],
    interactions: [
      { id: "apothecaryCounter", x: 10.5, y: 6.5, label: "Browse Remedies" },
      { id: "apothecaryCauldron", x: 11.5, y: 12.5, label: "Inspect the Brewing Cauldron" },
      { id: "remedyNotes", x: 5.5, y: 9.5, label: "Read Remedy Notes" },
    ],
    residents: [
      { id: "pella", x: 10.5, y: 2.5, from: 360, to: 1020, rainTo: 1080, hideFromWorld: true },
    ],
    lights: [{ x: 11, y: 9, radius: 7, color: "#8fe7da" }, { x: 5, y: 5, radius: 4, color: "#c8b8ff" }],
  }),

  cityInn: shopMap({
    id: "cityInn", name: "The Golden Griffin", width: 28, height: 19,
    floor: "#b78758", wall: "#573a31", trim: "#e5c678", ambience: "grandInn",
    exit: { x: 14.5, y: 17.5, world: { x: 129.5, y: 61.5 } },
    objects: [
      { type: "counter", x: 3, y: 3, w: 10, h: 2, solid: true },
      { type: "hearth", x: 22, y: 3, w: 3, h: 3, solid: true },
      { type: "table", x: 6, y: 8, w: 4, h: 3, solid: true },
      { type: "table", x: 13, y: 8, w: 4, h: 3, solid: true },
      { type: "table", x: 20, y: 8, w: 4, h: 3, solid: true },
      { type: "bed", x: 3, y: 13, w: 5, h: 3, solid: true },
      { type: "bed", x: 20, y: 13, w: 5, h: 3, solid: true },
      { type: "piano", x: 11, y: 13, w: 6, h: 2, solid: true },
      { type: "rug", x: 11, y: 6, w: 7, h: 5, solid: false },
    ],
    interactions: [
      { id: "cityInnCounter", x: 8.5, y: 6.5, label: "Golden Griffin Services" },
      { id: "cityInnBed", x: 8.5, y: 14.5, label: "Rent a Guest Bed" },
      { id: "cityInnPiano", x: 14.5, y: 12.5, label: "Listen to the Evening Music" },
    ],
    residents: [
      { id: "rowan", x: 8.5, y: 2.5, from: 480, to: 1320, hideFromWorld: true },
    ],
    lights: [{ x: 23.5, y: 5, radius: 8, color: "#ffad55" }, { x: 14, y: 9, radius: 7, color: "#ffe19c" }],
  }),

  cityMarket: shopMap({
    id: "cityMarket", name: "Silvercrest Grand Market", width: 30, height: 19,
    floor: "#bc9a68", wall: "#654735", trim: "#ecd18c", ambience: "market",
    exit: { x: 15.5, y: 17.5, world: { x: 152.5, y: 18.5 } },
    objects: [
      { type: "counter", x: 9, y: 3, w: 12, h: 2, solid: true },
      { type: "produceStall", x: 3, y: 7, w: 5, h: 3, solid: true },
      { type: "produceStall", x: 11, y: 7, w: 5, h: 3, solid: true },
      { type: "produceStall", x: 19, y: 7, w: 5, h: 3, solid: true },
      { type: "crate", x: 25, y: 3, w: 3, h: 3, solid: true },
      { type: "crate", x: 2, y: 3, w: 3, h: 3, solid: true },
      { type: "display", x: 4, y: 13, w: 5, h: 2, solid: true },
      { type: "display", x: 21, y: 13, w: 5, h: 2, solid: true },
      { type: "rug", x: 12, y: 11, w: 6, h: 4, solid: false },
    ],
    interactions: [
      { id: "marketCounter", x: 15.5, y: 6.5, label: "Grand Market Counter" },
      { id: "produceStall", x: 5.5, y: 11.5, label: "Browse Produce Stalls" },
      { id: "marketBoard", x: 24.5, y: 12.5, label: "Read Market Prices" },
    ],
    residents: [
      { id: "cass", x: 15.5, y: 2.5, from: 360, to: 1020, rainTo: 1080, hideFromWorld: true },
      { id: "eno", x: 5.5, y: 11.5, from: 960, to: 1200, hideFromWorld: true },
    ],
    lights: [{ x: 8, y: 7, radius: 5, color: "#ffe2a0" }, { x: 22, y: 7, radius: 5, color: "#ffe2a0" }],
  }),

  observatory: shopMap({
    id: "observatory", name: "Starwatch Observatory", width: 24, height: 17,
    floor: "#5d6381", wall: "#282d47", trim: "#aeb8e8", ambience: "stars",
    exit: { x: 12.5, y: 15.5, world: { x: 220.5, y: 19.5 } },
    objects: [
      { type: "telescope", x: 9, y: 3, w: 6, h: 4, solid: true },
      { type: "starTable", x: 4, y: 9, w: 5, h: 3, solid: true },
      { type: "starTable", x: 15, y: 9, w: 5, h: 3, solid: true },
      { type: "bookshelf", x: 2, y: 2, w: 2, h: 7, solid: true },
      { type: "bookshelf", x: 20, y: 2, w: 2, h: 7, solid: true },
      { type: "rug", x: 9, y: 8, w: 6, h: 5, solid: false },
    ],
    interactions: [
      { id: "observatoryTelescope", x: 12.5, y: 8.5, label: "Use the Great Telescope" },
      { id: "observatoryDesk", x: 7.5, y: 13.5, label: "Read Sora's Forecast" },
      { id: "starChart", x: 17.5, y: 13.5, label: "Study the Star Chart" },
    ],
    residents: [
      { id: "sora", x: 12.5, y: 7.5, from: 960, to: 1440, rainFrom: 720, hideFromWorld: true },
    ],
    lights: [{ x: 12, y: 5, radius: 9, color: "#8da9ff" }, { x: 6, y: 11, radius: 4, color: "#b6c9ff" }],
  }),

  cityHall: shopMap({
    id: "cityHall", name: "Silvercrest Hall", width: 32, height: 21,
    floor: "#a59a7e", wall: "#394e5c", trim: "#d8d0ad", ambience: "civic",
    exit: { x: 16.5, y: 19.5, world: { x: 155.5, y: 61.5 } },
    objects: [
      { type: "counter", x: 9, y: 4, w: 14, h: 2, solid: true },
      { type: "podium", x: 14, y: 8, w: 4, h: 3, solid: true },
      { type: "mapTable", x: 4, y: 10, w: 6, h: 4, solid: true },
      { type: "records", x: 22, y: 9, w: 6, h: 5, solid: true },
      { type: "bench", x: 4, y: 16, w: 7, h: 2, solid: true },
      { type: "bench", x: 21, y: 16, w: 7, h: 2, solid: true },
      { type: "banner", x: 3, y: 2, w: 4, h: 2, solid: false },
      { type: "banner", x: 25, y: 2, w: 4, h: 2, solid: false },
      { type: "rug", x: 12, y: 7, w: 8, h: 9, solid: false },
    ],
    interactions: [
      { id: "cityHallDesk", x: 16.5, y: 7.5, label: "City Services" },
      { id: "cityMap", x: 10.5, y: 12.5, label: "Inspect the Continental Map" },
      { id: "cityRecords", x: 21.5, y: 12.5, label: "Read Civic Records" },
    ],
    residents: [
      { id: "mei", x: 12.5, y: 7.5, from: 420, to: 840, hideFromWorld: true },
      { id: "ves", x: 20.5, y: 7.5, from: 600, to: 1020, hideFromWorld: true },
    ],
    lights: [{ x: 10, y: 8, radius: 6, color: "#e5e1c2" }, { x: 22, y: 8, radius: 6, color: "#e5e1c2" }],
  }),
};

export const BUILDING_INTERIOR_MAP = {
  seedshop: "seedshop",
  villageInn: "villageInn",
  blacksmith: "blacksmith",
  apothecary: "apothecary",
  cityInn: "cityInn",
  cityMarket: "cityMarket",
  observatory: "observatory",
  cityHall: "cityHall",
};

export function registerExpandedInteriors() {
  Object.assign(INTERIOR_MAPS, EXPANDED_INTERIOR_MAPS);
  return INTERIOR_MAPS;
}

export function residentActive(resident, minutes, weather) {
  const badWeather = weather === "Rain" || weather === "Snow";
  const from = badWeather && Number.isFinite(resident.rainFrom) ? resident.rainFrom : resident.from;
  const to = badWeather && Number.isFinite(resident.rainTo) ? resident.rainTo : resident.to;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return true;
  return minutes >= from && minutes < to;
}

export function activeInteriorResidents(map, state) {
  return (map?.residents || []).filter((resident) => residentActive(resident, state.minutes, state.weather));
}

export function interiorAssignmentForNpc(npcId, state) {
  for (const map of Object.values(INTERIOR_MAPS)) {
    const resident = activeInteriorResidents(map, state).find((entry) => entry.id === npcId && entry.hideFromWorld);
    if (resident) return { interiorId: map.id, resident };
  }
  return null;
}

export function interiorIsOpenForBuilding(building, state) {
  if (!building?.service) return true;
  return shopIsOpen(building.service, state.minutes);
}
