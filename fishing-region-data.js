import { FISH_SPECIES } from "./fishing-data.js";

export const FISHING_REGION_ALIASES = {
  dread: "dreadwild",
  coast: "suncoast",
};

export function normalizeFishingRegionIds() {
  for (const species of FISH_SPECIES) {
    species.regions = [...new Set(species.regions.map((id) => FISHING_REGION_ALIASES[id] || id))];
  }
  return FISH_SPECIES;
}

normalizeFishingRegionIds();
