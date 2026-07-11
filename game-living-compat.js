import { ITEMS, clamp, distance, randomChoice } from "./game-shared.js";
import { scheduleForNpc } from "./living-world-data.js";

function contextualLine(game, npc) {
  const schedule = scheduleForNpc(npc.id, game.state.minutes, game.state.weather);
  const period = game.state.minutes < 720 ? "morning" : game.state.minutes < 1080 ? "afternoon" : "evening";
  const parts = [];
  if (schedule?.activity) parts.push(`${schedule.activity}.`);
  if (game.state.weather === "Rain") parts.push("The rain has changed everyone's routine today.");
  else if (game.state.weather === "Snow") parts.push("The roads are quieter beneath the snow.");
  else if (game.state.weather === "Sparkfall") parts.push("Sparkfall makes the whole continent feel different.");
  if ((npc.friendship || 0) >= 8) parts.push(`I'm glad you stopped by this ${period}. You have become someone I trust.`);
  else if ((npc.friendship || 0) >= 5) parts.push(`It is good to see a familiar face this ${period}.`);
  return parts.join(" ");
}

export function installLivingWorldCompatibility(GameClass) {
  const proto = GameClass.prototype;
  const originalInteract = proto.interact;
  const originalTalkToNPC = proto.talkToNPC;

  proto.interact = function interactWithQuestSafeLivingWorld() {
    if (this.state.mode === "interior") return this.interactInterior();
    const npc = this.state.npcs.find((entry) => distance(this.state.player, entry) < 1.5);
    if (npc) return this.talkToNPC(npc);
    return originalInteract.call(this);
  };

  proto.talkToNPC = function talkToNPCWithLivingContext(npc) {
    const context = contextualLine(this, npc);
    const originalLines = npc.lines;
    if (context) npc.lines = [context, ...originalLines];
    try {
      return originalTalkToNPC.call(this, npc);
    } finally {
      npc.lines = originalLines;
    }
  };
}
