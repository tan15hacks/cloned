import { ITEMS, REGIONS, clamp } from "./game-shared.js";
import { INTERIOR_MAPS } from "./living-world-data.js";
import { registerExpandedInteriors } from "./expanded-interiors-data.js";
import { COOKING_RECIPE_MAP, COOKING_QUALITY_ORDER } from "./cooking-data.js";
import { removePreparedMealRecords } from "./game-cooking-runtime.js";
import {
  MUSEUM_BUNDLES, MUSEUM_BUNDLE_MAP, MUSEUM_TOTAL_ENTRIES,
  createMuseumState, museumBundleProgress, museumOverallProgress,
  museumRankForReputation,
} from "./museum-data.js";

const QUALITY_ORDER = ["normal", "silver", "gold", "iridium"];

export function registerMuseumWing() {
  registerExpandedInteriors();
  const map = INTERIOR_MAPS.cityHall;
  if (!map) return null;
  if (!map.objects.some((object) => object.id === "museum-left-display")) map.objects.push({ id: "museum-left-display", type: "display", x: 2, y: 4, w: 5, h: 2, solid: true });
  if (!map.objects.some((object) => object.id === "museum-right-display")) map.objects.push({ id: "museum-right-display", type: "display", x: 25, y: 4, w: 5, h: 2, solid: true });
  if (!map.interactions.some((entry) => entry.id === "museumGallery")) map.interactions.push({ id: "museumGallery", x: 4.5, y: 7.5, label: "Browse Museum Collections" });
  if (!map.interactions.some((entry) => entry.id === "museumLedger")) map.interactions.push({ id: "museumLedger", x: 27.5, y: 7.5, label: "Review Donation Ledger" });
  map.lights ||= [];
  if (!map.lights.some((light) => light.id === "museum-left-light")) map.lights.push({ id: "museum-left-light", x: 4.5, y: 5.5, radius: 4, color: "#e9d79b" });
  if (!map.lights.some((light) => light.id === "museum-right-light")) map.lights.push({ id: "museum-right-light", x: 27.5, y: 5.5, radius: 4, color: "#e9d79b" });
  return map;
}

function removeQualityUnits(qualityInventory, itemId, amount) {
  const record = qualityInventory?.[itemId];
  if (!record || typeof record !== "object") return 0;
  let remaining = Math.max(0, Math.floor(Number(amount) || 0));
  let removed = 0;
  for (const quality of QUALITY_ORDER) {
    if (remaining <= 0) break;
    const available = Math.max(0, Math.floor(Number(record[quality]) || 0));
    const take = Math.min(available, remaining);
    record[quality] = available - take;
    remaining -= take;
    removed += take;
  }
  return removed;
}

export function consumeMuseumItem(state, itemId, amount = 1) {
  if (!state?.inventory || !ITEMS[itemId]) return 0;
  const available = Math.max(0, Math.floor(Number(state.inventory[itemId]) || 0));
  const take = Math.min(available, Math.max(0, Math.floor(Number(amount) || 0)));
  if (take <= 0) return 0;
  if (COOKING_RECIPE_MAP[itemId]) removePreparedMealRecords(state, itemId, take);
  else if (state.ranch?.qualityInventory?.[itemId]) removeQualityUnits(state.ranch.qualityInventory, itemId, take);
  else if (state.progression?.qualityInventory?.[itemId]) removeQualityUnits(state.progression.qualityInventory, itemId, take);
  state.inventory[itemId] = available - take;
  return take;
}

function bundleRewardText(bundleEntry) {
  return `${bundleEntry.reward.coins} coins · ${bundleEntry.reward.xp} Adventure XP · 🏛️ Museum Token`;
}

export function installMuseumCollections(GameClass) {
  registerMuseumWing();
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState,
    migrateState: proto.migrateState,
    enterGame: proto.enterGame,
    nextDay: proto.nextDay,
    enterInterior: proto.enterInterior,
    handleExpandedInteriorInteraction: proto.handleExpandedInteriorInteraction,
    toggleGameMenu: proto.toggleGameMenu,
  };

  proto.defaultState = function defaultStateMuseum() {
    const state = original.defaultState.call(this);
    state.museum = createMuseumState();
    return state;
  };

  proto.migrateState = function migrateStateMuseum(data) {
    const state = original.migrateState.call(this, data);
    state.museum = createMuseumState(data?.museum || state.museum);
    return state;
  };

  proto.enterGame = function enterGameMuseum() {
    const result = original.enterGame.call(this);
    registerMuseumWing();
    this.state.museum = createMuseumState(this.state.museum);
    if (!this.state.museum.introQueued && this.state.social?.letters) {
      this.state.museum.introQueued = true;
      if (!this.state.social.letters.some((letter) => letter.id === "museum-opening")) this.state.social.letters.push({
        id: "museum-opening",
        from: "Archivist Ves",
        subject: "The Silvercrest Museum Wing",
        body: "Silvercrest Hall has opened its west and east galleries to continental donations. We are cataloguing crops, fish, ranch products, artisan goods, wild specimens, ores, monster materials, relics, and historic meals. Visit the museum displays inside Silvercrest Hall or open Collections from your Adventure Menu.",
        reward: { coins: 250 },
        read: false,
        claimed: false,
        eventKey: null,
        day: this.state.day,
      });
      this.toast?.("Archivist Ves sent an invitation to the Silvercrest Museum.");
      this.saveGame?.(true);
    }
    return result;
  };

  proto.nextDay = function nextDayMuseum(passedOut) {
    const result = original.nextDay.call(this, passedOut);
    this.state.museum = createMuseumState(this.state.museum);
    return result;
  };

  proto.enterInterior = function enterInteriorMuseum(id, building) {
    const result = original.enterInterior.call(this, id, building);
    if (id === "cityHall" && this.state?.mode === "interior") {
      this.state.museum = createMuseumState(this.state.museum);
      this.state.museum.visits = clamp(this.state.museum.visits + 1, 0, 999999);
    }
    return result;
  };

  proto.handleExpandedInteriorInteraction = function handleMuseumInteriorInteraction(interaction, map) {
    if (interaction?.id === "museumGallery" || interaction?.id === "museumLedger") return this.showMuseumCollections();
    return original.handleExpandedInteriorInteraction.call(this, interaction, map);
  };

  proto.showMuseumCollections = function showMuseumCollections() {
    this.state.museum = createMuseumState(this.state.museum);
    const museum = this.state.museum;
    const overall = museumOverallProgress(this.state);
    const rank = museumRankForReputation(museum.reputation);
    const fishEntries = Object.keys(this.state.fishing?.journal || {}).length;
    const recipesCooked = this.state.cooking?.stats?.uniqueRecipesCooked?.length || 0;
    const cards = MUSEUM_BUNDLES.map((bundleEntry) => {
      const progress = museumBundleProgress(this.state, bundleEntry);
      const requirements = bundleEntry.requirements.map((entry) => {
        const donated = museum.donated[bundleEntry.id]?.[entry.item] || 0;
        const inventory = this.state.inventory[entry.item] || 0;
        const complete = donated >= entry.amount;
        return `<li class="museum-requirement ${complete ? "complete" : "pending"}"><span>${ITEMS[entry.item].icon}</span><div><strong>${ITEMS[entry.item].name}</strong><small>Donated ${donated}/${entry.amount} · Backpack ${inventory}</small></div>${complete ? "<b>✓</b>" : `<button data-museum-donate="${bundleEntry.id}:${entry.item}" ${inventory <= 0 ? "disabled" : ""}>Donate</button>`}</li>`;
      }).join("");
      const canDonate = bundleEntry.requirements.some((entry) => (museum.donated[bundleEntry.id]?.[entry.item] || 0) < entry.amount && (this.state.inventory[entry.item] || 0) > 0);
      return `<article class="museum-bundle ${progress.complete ? "complete" : ""}"><header><span>${bundleEntry.icon}</span><div><strong>${bundleEntry.name}</strong><small>${progress.entries}/${progress.entryTotal} entries · ${progress.units}/${progress.total} units</small></div>${progress.complete ? "<em>Complete</em>" : ""}</header><p>${bundleEntry.description}</p><div class="museum-progress"><i style="width:${progress.total ? progress.units / progress.total * 100 : 0}%"></i></div><ul>${requirements}</ul><footer><small>Reward: ${bundleRewardText(bundleEntry)}</small>${progress.complete ? "" : `<button data-museum-bundle="${bundleEntry.id}" ${canDonate ? "" : "disabled"}>Donate Available</button>`}</footer></article>`;
    }).join("");
    this.openModal("Silvercrest Museum Collections", `<section class="museum-hero"><div><span>${rank.icon}</span><strong>${rank.name}</strong><small>${museum.reputation} museum reputation</small></div><p>Permanent donations are removed from the backpack and preserved in Silvercrest Hall. Quality records and prepared-meal pantry counts remain synchronized.</p></section><section class="museum-summary"><div><strong>${overall.entries}/${overall.totalEntries}</strong><small>display entries</small></div><div><strong>${overall.bundles}/${overall.totalBundles}</strong><small>completed galleries</small></div><div><strong>${fishEntries}/21</strong><small>fish records</small></div><div><strong>${this.state.visitedRegions.length}/${REGIONS.length}</strong><small>regions mapped</small></div><div><strong>${recipesCooked}/16</strong><small>recipes prepared</small></div></section><div class="museum-grid">${cards}</div>`, [
      { label: "Close", action: () => this.closeModal() },
    ]);
    document.querySelectorAll("[data-museum-donate]").forEach((button) => {
      button.onclick = () => {
        const [bundleId, itemId] = button.dataset.museumDonate.split(":");
        this.donateMuseumItem(bundleId, itemId, 1);
      };
    });
    document.querySelectorAll("[data-museum-bundle]").forEach((button) => { button.onclick = () => this.donateMuseumAvailable(button.dataset.museumBundle); });
  };

  proto.finalizeMuseumDonations = function finalizeMuseumDonations(previousCompleted = new Set()) {
    this.state.museum = createMuseumState(this.state.museum);
    const museum = this.state.museum;
    for (const bundleId of museum.completedBundles) {
      if (previousCompleted.has(bundleId) || museum.rewardedBundles.includes(bundleId)) continue;
      const bundleEntry = MUSEUM_BUNDLE_MAP[bundleId];
      museum.rewardedBundles.push(bundleId);
      this.state.coins += bundleEntry.reward.coins;
      if (this.state.stats) this.state.stats.totalEarned = (this.state.stats.totalEarned || 0) + bundleEntry.reward.coins;
      this.awardAdventureXp?.(bundleEntry.reward.xp);
      this.addItem("museumToken", bundleEntry.reward.token || 1, false);
      this.state.journal.unshift(`Completed the ${bundleEntry.name} at the Silvercrest Museum.`);
      this.state.journal = this.state.journal.slice(0, 30);
      this.sound?.("success");
      this.toast(`Museum gallery complete: ${bundleEntry.name}!`);
    }
    if (museum.completedBundles.length === MUSEUM_BUNDLES.length && !museum.allRewardClaimed) {
      museum.allRewardClaimed = true;
      this.state.coins += 5000;
      if (this.state.stats) this.state.stats.totalEarned = (this.state.stats.totalEarned || 0) + 5000;
      this.awardAdventureXp?.(400);
      this.addItem("curatorSeal", 1, false);
      this.state.journal.unshift("Completed every Silvercrest Museum collection and received the Continental Curator Seal.");
      this.state.journal = this.state.journal.slice(0, 30);
    }
    museum.reputation = museumOverallProgress(this.state).units + museum.completedBundles.length * 2;
    museum.rank = museumRankForReputation(museum.reputation).name;
    this.checkMuseumAchievements();
    this.saveGame?.(true);
  };

  proto.donateMuseumItem = function donateMuseumItem(bundleId, itemId, amount = 1) {
    this.state.museum = createMuseumState(this.state.museum);
    const bundleEntry = MUSEUM_BUNDLE_MAP[bundleId];
    const requirement = bundleEntry?.requirements.find((entry) => entry.item === itemId);
    if (!bundleEntry || !requirement) return this.toast("That item does not belong in this museum collection.");
    const donated = this.state.museum.donated[bundleId][itemId] || 0;
    const needed = Math.max(0, requirement.amount - donated);
    const previousCompleted = new Set(this.state.museum.completedBundles);
    const removed = consumeMuseumItem(this.state, itemId, Math.min(needed, Math.max(1, Math.floor(Number(amount) || 1))));
    if (removed <= 0) return this.toast(`No ${ITEMS[itemId].name} is available to donate.`);
    this.state.museum.donated[bundleId][itemId] = donated + removed;
    this.state.museum.lastDonationDay = this.state.day;
    this.finalizeMuseumDonations(previousCompleted);
    this.closeModal();
    this.showMuseumCollections();
  };

  proto.donateMuseumAvailable = function donateMuseumAvailable(bundleId) {
    this.state.museum = createMuseumState(this.state.museum);
    const bundleEntry = MUSEUM_BUNDLE_MAP[bundleId];
    if (!bundleEntry) return this.toast("Museum collection not found.");
    const previousCompleted = new Set(this.state.museum.completedBundles);
    let donatedTotal = 0;
    for (const requirement of bundleEntry.requirements) {
      const donated = this.state.museum.donated[bundleId][requirement.item] || 0;
      const needed = Math.max(0, requirement.amount - donated);
      const removed = consumeMuseumItem(this.state, requirement.item, needed);
      if (removed > 0) {
        this.state.museum.donated[bundleId][requirement.item] = donated + removed;
        donatedTotal += removed;
      }
    }
    if (donatedTotal <= 0) return this.toast("No required items are currently available.");
    this.state.museum.lastDonationDay = this.state.day;
    this.finalizeMuseumDonations(previousCompleted);
    this.closeModal();
    this.showMuseumCollections();
  };

  proto.checkMuseumAchievements = function checkMuseumAchievements() {
    const overall = museumOverallProgress(this.state);
    this.checkAchievement?.("museum-first-donation", overall.units >= 1, "A Place in History", "Make the first donation to the Silvercrest Museum.");
    this.checkAchievement?.("museum-first-gallery", overall.bundles >= 1, "Gallery Opening", "Complete one museum collection.");
    this.checkAchievement?.("museum-five-galleries", overall.bundles >= 5, "Patron of Silvercrest", "Complete five museum collections.");
    this.checkAchievement?.("museum-complete", overall.bundles >= MUSEUM_BUNDLES.length, "Continental Curator", "Complete all nine Silvercrest Museum collections.");
    const fullArchive = overall.bundles >= MUSEUM_BUNDLES.length
      && Object.keys(this.state.fishing?.journal || {}).length >= 21
      && this.state.visitedRegions.length >= REGIONS.length
      && (this.state.cooking?.stats?.uniqueRecipesCooked?.length || 0) >= 16;
    this.checkAchievement?.("museum-living-archive", fullArchive, "The Living Archive", "Complete the museum, map every region, record every fish, and cook every recipe.");
  };

  proto.toggleGameMenu = function toggleGameMenuMuseum() {
    const result = original.toggleGameMenu.call(this);
    if (typeof document === "undefined") return result;
    const grid = document.querySelector("#modalBody .menu-grid");
    if (!grid || document.getElementById("museumMenu")) return result;
    const button = document.createElement("button");
    button.id = "museumMenu";
    button.textContent = "🏛️ Collections";
    grid.appendChild(button);
    button.onclick = () => { this.closeModal(); this.showMuseumCollections(); };
    return result;
  };
}
