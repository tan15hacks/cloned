import { $ } from "./game-shared.js";
import { game_base } from "./game-base.js";
import { game_actions_1 } from "./game-actions-1.js";
import { game_actions_2 } from "./game-actions-2.js";
import { game_actions_3 } from "./game-actions-3.js";
import { game_services_1 } from "./game-services-1.js";
import { game_services_2 } from "./game-services-2.js";
import { game_services_3 } from "./game-services-3.js";
import { game_services_4 } from "./game-services-4.js";
import { game_render_1 } from "./game-render-1.js";
import { game_render_2 } from "./game-render-2.js";
import { game_render_3 } from "./game-render-3.js";
import { game_ui } from "./game-ui.js";
import { installPerformanceStreaming } from "./game-performance.js";
import { installWorldPolish } from "./game-world-polish.js";
import { installWorldPolishRuntime } from "./game-world-polish-runtime.js";
import { installLivingWorld } from "./game-living-world.js";
import { installChapterOne } from "./chapter-one.js";
import { installLivingWorldCompatibility } from "./game-living-compat.js";
import { installCombatOverhaul } from "./game-combat.js";
import { installCombatRuntimeHardening } from "./game-combat-runtime.js";
import { installProgressionCore } from "./game-progression-core.js";
import { installProgressionCaves } from "./game-progression-cave.js";
import { installProgressionCaveRuntime } from "./game-progression-cave-runtime.js";
import { installProgressionEconomy } from "./game-progression-economy.js";
import { installChapterTwo } from "./game-chapter-two.js";
import { installStoryDungeon } from "./game-story-dungeon.js";
import { installChapterTwoRuntime } from "./game-chapter-two-runtime.js";
import { installSeasonsAndFestivals } from "./game-seasons.js";
import { installSeasonsRuntime } from "./game-seasons-runtime.js";
import { installRanching } from "./game-ranch-core.js";
import { installRanchingRender } from "./game-ranch-render.js";
import { installRanchingUI } from "./game-ranch-ui-main.js";
import { installRanchingMachines } from "./game-ranch-machines.js";
import { installRanchingRuntime } from "./game-ranch-runtime.js";
import { installRanchingRenderRuntime } from "./game-ranch-render-runtime.js";
import { installExpandedInteriors } from "./game-expanded-interiors.js";
import { installExpandedInteriorRender } from "./game-expanded-interiors-render.js";
import { installExpandedInteriorsRuntime } from "./game-expanded-interiors-runtime.js";
import { installRelationships } from "./game-relationships.js";
import { installRelationshipsRuntime } from "./game-relationships-runtime.js";
import { installRelationshipSecurity } from "./game-relationships-security.js";
import { installCooking } from "./game-cooking.js";
import { installCookingRuntime } from "./game-cooking-runtime.js";
import "./fishing-region-data.js";
import { installFishingOverhaul } from "./game-fishing.js";
import { installFishingRuntime } from "./game-fishing-runtime.js";
import { installMuseumCollections } from "./game-museum.js";
import { installMuseumRuntime } from "./game-museum-runtime.js";
import { installStorageAndShipping } from "./game-storage.js";
import { installStorageRuntime } from "./game-storage-runtime.js";
import { installStorageOverflowRuntime } from "./game-storage-overflow-runtime.js";
import { installFarmsteadExpansion } from "./game-farmstead-expansion.js";
import { installFarmsteadExpansionRuntime } from "./game-farmstead-expansion-runtime.js";
import { installFarmsteadStreamRuntime } from "./game-farmstead-stream-runtime.js";
import { installWorkshopAutomation } from "./game-workshop-automation.js";
import { installWorkshopAutomationRuntime } from "./game-workshop-automation-runtime.js";
import { installWorkshopAutomationStreamRuntime } from "./game-workshop-automation-stream-runtime.js";
import { installFarmsteadTerrainArt } from "./game-farmstead-art.js";
import { installFarmsteadPropArt } from "./game-farmstead-prop-art.js";

class HearthvaleGame {
  constructor() {
    this.canvas = $("game");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.keys = new Set();
    this.justPressed = new Set();
    this.touchVector = { x: 0, y: 0 };
    this.lastFrame = performance.now();
    this.running = false;
    this.paused = true;
    this.modalOpen = false;
    this.dialogueOpen = false;
    this.fishingTimer = null;
    this.activeFishingSession = null;
    this.festivalTimer = null;
    this.festivalSequenceToken = 0;
    this.toastTimer = null;
    this.audio = null;
    this.state = null;
    this.currentCave = null;
    this.currentStoryDungeon = null;
    this.resourceMap = new Map();
    this.camera = { x: 0, y: 0 };
    this.screen = { width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 };
    this.settings = this.loadSettings();
    this.currentRegion = null;
    this.zoneBanner = { text: "", timer: 0 };
    this.attackFlash = 0;
    this.activeChunkSignature = "";
    this.lateWarningShown = false;
    this.chapterHudSignature = "";
    this.chapterTwoHudSignature = "";
    this.bindUI();
    this.resize();
    this.updateContinueState();
    requestAnimationFrame((time) => this.loop(time));
  }
}

Object.assign(
  HearthvaleGame.prototype,
  game_base,
  game_actions_1,
  game_actions_2,
  game_actions_3,
  game_services_1,
  game_services_2,
  game_services_3,
  game_services_4,
  game_render_1,
  game_render_2,
  game_render_3,
  game_ui,
);

installPerformanceStreaming(HearthvaleGame);
installWorldPolish(HearthvaleGame);
installWorldPolishRuntime(HearthvaleGame);
installLivingWorld(HearthvaleGame);
installChapterOne(HearthvaleGame);
installLivingWorldCompatibility(HearthvaleGame);
installCombatOverhaul(HearthvaleGame);
installCombatRuntimeHardening(HearthvaleGame);
installProgressionCore(HearthvaleGame);
installProgressionCaves(HearthvaleGame);
installProgressionCaveRuntime(HearthvaleGame);
installProgressionEconomy(HearthvaleGame);
installChapterTwo(HearthvaleGame);
installStoryDungeon(HearthvaleGame);
installChapterTwoRuntime(HearthvaleGame);
installSeasonsAndFestivals(HearthvaleGame);
installSeasonsRuntime(HearthvaleGame);
installRanching(HearthvaleGame);
installRanchingRender(HearthvaleGame);
installRanchingUI(HearthvaleGame);
installRanchingMachines(HearthvaleGame);
installRanchingRuntime(HearthvaleGame);
installRanchingRenderRuntime(HearthvaleGame);
installExpandedInteriors(HearthvaleGame);
installExpandedInteriorRender(HearthvaleGame);
installExpandedInteriorsRuntime(HearthvaleGame);
installRelationships(HearthvaleGame);
installRelationshipsRuntime(HearthvaleGame);
installRelationshipSecurity(HearthvaleGame);
installCooking(HearthvaleGame);
installCookingRuntime(HearthvaleGame);
installFishingOverhaul(HearthvaleGame);
installFishingRuntime(HearthvaleGame);
installMuseumCollections(HearthvaleGame);
installMuseumRuntime(HearthvaleGame);
installStorageAndShipping(HearthvaleGame);
installStorageRuntime(HearthvaleGame);
installStorageOverflowRuntime(HearthvaleGame);
installFarmsteadExpansion(HearthvaleGame);
installFarmsteadExpansionRuntime(HearthvaleGame);
installFarmsteadStreamRuntime(HearthvaleGame);
installWorkshopAutomation(HearthvaleGame);
installWorkshopAutomationRuntime(HearthvaleGame);
installWorkshopAutomationStreamRuntime(HearthvaleGame);
installFarmsteadTerrainArt(HearthvaleGame);
installFarmsteadPropArt(HearthvaleGame);
window.__hearthvale = new HearthvaleGame();
