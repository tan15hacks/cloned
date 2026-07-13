import { TILE, NPC_DEFS, ITEMS } from "./game-shared.js";
import { ANIMAL_SPECIES } from "./ranch-data.js";

const FACING_DIRECTIONS = ["down", "left", "right", "up"];
const HAIR_STYLES = ["short", "bob", "ponytail", "bun", "long", "curls", "hood", "cap", "bald"];
const CITIZEN_SKINS = ["#f0cfaa", "#dfb187", "#ca9067", "#a96f4d", "#7d4d36"];
const CITIZEN_HAIR = ["#2b201d", "#4b3024", "#6a4229", "#9a6535", "#d5ad68", "#493b4e"];
const CITIZEN_OUTFITS = ["#4f7f68", "#587aa0", "#9b6556", "#7b6797", "#a88445", "#6b8052"];

export const CHARACTER_APPEARANCES = {
  mira: { skin: "#b97852", hair: "#3b251d", style: "ponytail", accessory: "strawHat", accent: "#f0c45d" },
  oren: { skin: "#b87650", hair: "#3a2a24", style: "short", accessory: "workCap", beard: true, accent: "#d39b56" },
  lumi: { skin: "#e7bd99", hair: "#3d2b35", style: "bob", accessory: "beret", accent: "#d3a4e3" },
  tavi: { skin: "#8a5237", hair: "#211b1a", style: "curls", accessory: "scarf", accent: "#f2c34f" },
  sora: { skin: "#e4bc98", hair: "#29252d", style: "bun", accessory: "goggles", accent: "#8eb9e8" },
  aria: { skin: "#b97855", hair: "#4a2825", style: "long", accessory: "circlet", accent: "#e8b95c" },
  bram: { skin: "#855236", hair: "#30241f", style: "short", accessory: "apron", beard: true, accent: "#d99b54" },
  niva: { skin: "#e2b894", hair: "#433552", style: "hood", accessory: "rune", accent: "#c9b3ff" },
  pella: { skin: "#d7aa84", hair: "#594030", style: "bun", accessory: "glasses", accent: "#9ed7d4" },
  cass: { skin: "#b97853", hair: "#2f2621", style: "short", accessory: "vest", accent: "#d8be67" },
  rowan: { skin: "#ddb08b", hair: "#6b4030", style: "short", accessory: "chefHat", accent: "#f3e5c5" },
  ves: { skin: "#b57652", hair: "#311f2e", style: "long", accessory: "feather", accent: "#e5a9d4" },
  lyra: { skin: "#e6c09d", hair: "#6d4c3b", style: "bob", accessory: "glasses", accent: "#c6d59a" },
  jax: { skin: "#d1a17d", hair: "#34261f", style: "short", accessory: "hunterCap", beard: true, accent: "#c89459" },
  mei: { skin: "#e7c19c", hair: "#9d4f2f", style: "ponytail", accessory: "satchel", accent: "#8ebad1" },
  tor: { skin: "#70452f", hair: "#1e1a18", style: "short", accessory: "guildCap", accent: "#d2a461" },
  eno: { skin: "#b87853", hair: "#3b2b22", style: "short", accessory: "strawHat", accent: "#a8bd69" },
  faye: { skin: "#8f563b", hair: "#2a2029", style: "curls", accessory: "beret", accent: "#d2acec" },
};

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value || "hearthvale")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shadeColor(color, amount) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(color || ""));
  if (!match) return color || "#4f7f68";
  const value = Number.parseInt(match[1], 16);
  const channel = (shift) => Math.max(0, Math.min(255, ((value >> shift) & 255) + amount));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

export function characterAppearanceFor(entity = {}, player = false, citizen = false) {
  if (player) return {
    skin: "#d7a77d", hair: "#35271f", style: "short", accessory: "player",
    accent: "#e5bd65", outfit: entity.color || "#2e6f57",
  };
  const configured = CHARACTER_APPEARANCES[entity.id];
  if (configured) return { ...configured, outfit: entity.color || "#5e7a68" };
  const seed = hashString(entity.id || entity.name || `${entity.x}:${entity.y}`);
  return {
    skin: CITIZEN_SKINS[seed % CITIZEN_SKINS.length],
    hair: CITIZEN_HAIR[(seed >>> 3) % CITIZEN_HAIR.length],
    style: HAIR_STYLES[(seed >>> 6) % 6],
    accessory: citizen && seed % 4 === 0 ? "cap" : "none",
    accent: shadeColor(CITIZEN_OUTFITS[(seed >>> 9) % CITIZEN_OUTFITS.length], 30),
    outfit: entity.color || CITIZEN_OUTFITS[(seed >>> 9) % CITIZEN_OUTFITS.length],
  };
}

export function animalArtScale(animal = {}) {
  const species = ANIMAL_SPECIES[animal.species];
  if (!species) return 1;
  const mature = Math.max(1, Number(species.matureDays) || 1);
  const ageRatio = Math.max(0, Math.min(1, (Number(animal.ageDays) || 0) / mature));
  const base = ["chicken", "duck"].includes(animal.species) ? .82 : 1.08;
  return base * (.72 + ageRatio * .28);
}

export function characterArtTargets() {
  return {
    residents: NPC_DEFS.map((npc) => npc.id),
    configuredResidents: Object.keys(CHARACTER_APPEARANCES),
    animalSpecies: Object.keys(ANIMAL_SPECIES),
    facings: [...FACING_DIRECTIONS],
    hooks: ["drawAnimatedCharacter", "drawRanchAnimal"],
  };
}

function drawLeafShape(ctx, x, y, radiusX, radiusY, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHair(ctx, x, y, appearance, facing) {
  const hair = appearance.hair;
  const style = appearance.style;
  ctx.fillStyle = hair;
  if (style === "bald") return;
  if (style === "hood") {
    ctx.fillStyle = shadeColor(appearance.outfit, -18);
    ctx.beginPath(); ctx.arc(x, y - 14, 11, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 11, y - 14, 22, 8);
    return;
  }
  if (style === "bun") {
    ctx.beginPath(); ctx.arc(x, y - 20, 5, 0, Math.PI * 2); ctx.fill();
  }
  if (style === "ponytail" && facing !== "up") {
    ctx.beginPath(); ctx.ellipse(x + (facing === "left" ? 8 : -8), y - 10, 5, 9, .2, 0, Math.PI * 2); ctx.fill();
  }
  if (style === "long") {
    roundedRect(ctx, x - 10, y - 17, 20, 20, 8); ctx.fill();
  } else if (style === "bob") {
    roundedRect(ctx, x - 10, y - 18, 20, 15, 7); ctx.fill();
  } else if (style === "curls") {
    for (const [dx, dy, radius] of [[-7,-17,5],[0,-20,5],[7,-17,5],[-9,-10,4],[9,-10,4]]) {
      ctx.beginPath(); ctx.arc(x + dx, y + dy, radius, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    ctx.beginPath(); ctx.arc(x, y - 16, 10, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 10, y - 16, 20, 5);
  }
}

function drawAccessory(ctx, x, y, appearance, facing) {
  const accessory = appearance.accessory;
  ctx.save();
  if (accessory === "strawHat") {
    ctx.fillStyle = "#d9b65d";
    ctx.beginPath(); ctx.ellipse(x, y - 20, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e9c970"; ctx.beginPath(); ctx.ellipse(x, y - 23, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#a95d45"; ctx.fillRect(x - 9, y - 22, 18, 2);
  } else if (["workCap", "hunterCap", "guildCap", "cap"].includes(accessory)) {
    ctx.fillStyle = accessory === "guildCap" ? "#824f48" : accessory === "hunterCap" ? "#6f5a43" : shadeColor(appearance.outfit, -12);
    ctx.beginPath(); ctx.arc(x, y - 20, 10, Math.PI, Math.PI * 2); ctx.fill();
    const brim = facing === "left" ? -1 : 1;
    ctx.fillRect(x + brim * 5 - (brim < 0 ? 7 : 0), y - 20, 8, 3);
  } else if (accessory === "beret") {
    ctx.fillStyle = appearance.accent; ctx.beginPath(); ctx.ellipse(x - 2, y - 21, 11, 5, -.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2, y - 26, 2, 0, Math.PI * 2); ctx.fill();
  } else if (accessory === "chefHat") {
    ctx.fillStyle = "#f3ead5";
    for (const dx of [-6, 0, 6]) { ctx.beginPath(); ctx.arc(x + dx, y - 25, 6, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillRect(x - 10, y - 24, 20, 7);
  } else if (accessory === "circlet") {
    ctx.strokeStyle = appearance.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 16, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.fillStyle = "#c7efff"; ctx.beginPath(); ctx.arc(x, y - 24, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (accessory === "goggles") {
    ctx.strokeStyle = "#c7d8df"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x - 5, y - 16, 4, 0, Math.PI * 2); ctx.arc(x + 5, y - 16, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 1, y - 16); ctx.lineTo(x + 1, y - 16); ctx.stroke();
  } else if (accessory === "glasses" && facing !== "up") {
    ctx.strokeStyle = "#4c4038"; ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 8, y - 16, 6, 5); ctx.strokeRect(x + 2, y - 16, 6, 5);
    ctx.beginPath(); ctx.moveTo(x - 2, y - 14); ctx.lineTo(x + 2, y - 14); ctx.stroke();
  } else if (accessory === "rune") {
    ctx.fillStyle = appearance.accent; ctx.shadowColor = appearance.accent; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(x, y - 25); ctx.lineTo(x + 3, y - 20); ctx.lineTo(x, y - 18); ctx.lineTo(x - 3, y - 20); ctx.closePath(); ctx.fill();
  } else if (accessory === "feather") {
    drawLeafShape(ctx, x + 8, y - 24, 3, 8, .45, appearance.accent);
  }
  ctx.restore();
}

function drawPlayerEquipment(ctx, game, x, y, facing) {
  const equipment = game.state?.combat?.equipment || {};
  const armor = equipment.armor;
  const helmet = equipment.helmet;
  if (armor === "ironMail" || armor === "frostPlate") {
    ctx.save();
    ctx.strokeStyle = armor === "frostPlate" ? "#b9e2ee" : "#b5b8b5";
    ctx.lineWidth = 2;
    roundedRect(ctx, x - 9, y - 5, 18, 18, 5); ctx.stroke();
    if (armor === "frostPlate") {
      ctx.fillStyle = "rgba(190,235,245,.55)";
      ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y + 2); ctx.lineTo(x, y + 8); ctx.lineTo(x - 5, y + 2); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  if (helmet === "leatherCap" || helmet === "hunterHelm") {
    ctx.save();
    ctx.fillStyle = helmet === "hunterHelm" ? "#4e4a44" : "#72553f";
    ctx.beginPath(); ctx.arc(x, y - 20, 11, Math.PI, Math.PI * 2); ctx.fill();
    if (helmet === "hunterHelm") { ctx.fillRect(x - 10, y - 19, 20, 5); }
    else {
      const brim = facing === "left" ? -1 : 1;
      ctx.fillRect(x + brim * 5 - (brim < 0 ? 7 : 0), y - 20, 8, 3);
    }
    ctx.restore();
  }
  if (equipment.weapon && facing === "up") {
    ctx.save(); ctx.translate(x + 8, y + 4); ctx.rotate(-.55);
    ctx.strokeStyle = "#75543a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -12); ctx.stroke();
    ctx.fillStyle = equipment.weapon === "emberEdge" ? "#f28a43" : equipment.weapon === "voidbrand" ? "#a78be4" : "#d9e3e6";
    ctx.fillRect(-2, -20, 4, 10); ctx.restore();
  }
}

function drawCharacterStatus(ctx, game, x, y) {
  const statuses = game.state?.combat?.statuses;
  if (!statuses) return;
  const active = statuses.burn?.time > 0 ? "#ff8b3d" : statuses.poison?.time > 0 ? "#91cf5b" : statuses.slow?.time > 0 ? "#9edaf0" : null;
  if (!active) return;
  ctx.save(); ctx.globalAlpha = .55 + Math.sin(performance.now() / 140) * .15; ctx.strokeStyle = active; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y - 3, 15, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

function drawCharacter(ctx, game, entity, color, name, player, citizen) {
  const moving = Boolean(entity.moving);
  const walkTime = Number(entity.walkTime ?? game.state?.living?.walkTime ?? 0);
  const phase = moving ? Math.sin(walkTime * 1.8) : 0;
  const bob = moving ? Math.abs(Math.sin(walkTime * 1.8)) * 1.8 : Math.sin(performance.now() / 750 + Number(entity.x || 0)) * .45;
  const groundX = Number(entity.x || 0) * TILE;
  const groundY = Number(entity.y || 0) * TILE;
  const x = groundX;
  const y = groundY - bob;
  const facing = FACING_DIRECTIONS.includes(entity.facing) ? entity.facing : "down";
  const appearance = characterAppearanceFor({ ...entity, color }, player, citizen);
  const outfit = appearance.outfit || color || "#4f7f68";
  const darkOutfit = shadeColor(outfit, -28);
  const skin = appearance.skin;
  const sideFacing = facing === "left" ? -1 : facing === "right" ? 1 : 0;
  const blink = player ? game.state?.living?.blink > 0 : Math.floor((performance.now() / 120 + Number(entity.x || 0) * 7) % 47) === 0;

  ctx.save();
  ctx.fillStyle = "rgba(16,36,29,.24)";
  ctx.beginPath(); ctx.ellipse(groundX, groundY + 12, 12, 5, 0, 0, Math.PI * 2); ctx.fill();

  const leftStep = phase * 3;
  ctx.strokeStyle = "#3b302c"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x - 4, y + 9); ctx.lineTo(x - 5 - leftStep, y + 17); ctx.moveTo(x + 4, y + 9); ctx.lineTo(x + 5 + leftStep, y + 17); ctx.stroke();
  ctx.fillStyle = "#4c382e";
  ctx.beginPath(); ctx.ellipse(x - 6 - leftStep, y + 18, 5, 2.5, 0, 0, Math.PI * 2); ctx.ellipse(x + 6 + leftStep, y + 18, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = skin; ctx.lineWidth = 5; ctx.lineCap = "round";
  const armSwing = phase * 4;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 1); ctx.lineTo(x - 11 + armSwing, y + 8);
  ctx.moveTo(x + 8, y - 1); ctx.lineTo(x + 11 - armSwing, y + 8);
  ctx.stroke();

  ctx.fillStyle = outfit; roundedRect(ctx, x - 9, y - 7, 18, 22, 6); ctx.fill();
  ctx.fillStyle = darkOutfit; roundedRect(ctx, x - 9, y + 8, 18, 7, 4); ctx.fill();
  ctx.fillStyle = appearance.accent;
  if (["apron", "vest", "satchel", "scarf"].includes(appearance.accessory)) {
    if (appearance.accessory === "apron") { roundedRect(ctx, x - 6, y - 1, 12, 15, 4); ctx.fill(); }
    else if (appearance.accessory === "vest") { ctx.fillRect(x - 7, y - 4, 4, 15); ctx.fillRect(x + 3, y - 4, 4, 15); }
    else if (appearance.accessory === "satchel") { ctx.strokeStyle = appearance.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 7, y - 5); ctx.lineTo(x + 7, y + 11); ctx.stroke(); ctx.fillRect(x + 5, y + 7, 6, 7); }
    else { ctx.fillRect(x - 8, y - 5, 16, 4); }
  } else {
    ctx.beginPath(); ctx.moveTo(x - 5, y - 6); ctx.lineTo(x, y - 1); ctx.lineTo(x + 5, y - 6); ctx.closePath(); ctx.fill();
  }

  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(x, y - 13, 9.5, 10, 0, 0, Math.PI * 2); ctx.fill();
  if (appearance.beard && facing !== "up") {
    ctx.fillStyle = appearance.hair; ctx.beginPath(); ctx.ellipse(x, y - 9, 7.5, 5.5, 0, 0, Math.PI); ctx.fill();
  }
  drawHair(ctx, x, y, appearance, facing);

  if (facing !== "up") {
    ctx.fillStyle = "#17231d";
    const eyeShift = sideFacing * 2;
    if (blink) {
      ctx.fillRect(x - 5 + eyeShift, y - 14, 3, 1); ctx.fillRect(x + 2 + eyeShift, y - 14, 3, 1);
    } else if (sideFacing) {
      ctx.fillRect(x + eyeShift - 1, y - 15, 3, 3);
    } else {
      ctx.fillRect(x - 5, y - 15, 3, 3); ctx.fillRect(x + 2, y - 15, 3, 3);
    }
    ctx.fillStyle = "rgba(197,92,83,.3)";
    if (!sideFacing) { ctx.beginPath(); ctx.arc(x - 7, y - 10, 2, 0, Math.PI * 2); ctx.arc(x + 7, y - 10, 2, 0, Math.PI * 2); ctx.fill(); }
  }

  drawAccessory(ctx, x, y, appearance, facing);
  if (player) drawPlayerEquipment(ctx, game, x, y, facing);
  if (player) drawCharacterStatus(ctx, game, x, y);

  if (player && game.state?.living?.actionTimer > 0) game.drawToolAction(ctx, x, y, facing);

  if (["Rain", "Snow"].includes(game.state?.weather) && !player) {
    ctx.strokeStyle = "#3e465a"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y - 21); ctx.lineTo(x, y + 3); ctx.stroke();
    ctx.fillStyle = game.state.weather === "Snow" ? "#879eb3" : "#6b83a6";
    ctx.beginPath(); ctx.arc(x, y - 22, 16, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 22, 12, Math.PI, 0); ctx.stroke();
  }

  if (name) {
    ctx.font = "bold 10px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillStyle = "#fff1c8"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3;
    ctx.strokeText(name, x, y - 33); ctx.fillText(name, x, y - 33);
  }
  ctx.restore();
}

function drawAnimalEye(ctx, x, y) {
  ctx.fillStyle = "#17231d"; ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.beginPath(); ctx.arc(x - .5, y - .6, .55, 0, Math.PI * 2); ctx.fill();
}

function drawBird(ctx, speciesId, bodyColor, rare) {
  const duck = speciesId === "duck";
  ctx.fillStyle = shadeColor(bodyColor, -18); ctx.beginPath(); ctx.ellipse(-3, 2, 12, 9, -.08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = bodyColor; ctx.beginPath(); ctx.ellipse(-1, 0, 12, 10, -.08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shadeColor(bodyColor, -10); ctx.beginPath(); ctx.ellipse(-5, 1, 7, 5, -.35, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = bodyColor; ctx.beginPath(); ctx.arc(8, -7, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = duck ? "#df9d42" : "#e9b443"; ctx.beginPath(); ctx.moveTo(14, -7); ctx.lineTo(21, -4); ctx.lineTo(14, -1); ctx.closePath(); ctx.fill();
  if (!duck) {
    ctx.fillStyle = rare ? "#b975dc" : "#d8564f";
    for (const [dx, dy, radius] of [[5,-14,3],[9,-15,3],[12,-13,3]]) { ctx.beginPath(); ctx.arc(dx, dy, radius, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(9, 0, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  drawAnimalEye(ctx, 10, -8);
  ctx.strokeStyle = "#a87939"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, 9); ctx.lineTo(-5, 14); ctx.moveTo(3, 9); ctx.lineTo(4, 14); ctx.stroke();
}

function drawCow(ctx, bodyColor, rare) {
  ctx.fillStyle = shadeColor(bodyColor, -20); roundedRect(ctx, -18, -9, 34, 22, 10); ctx.fill();
  ctx.fillStyle = bodyColor; roundedRect(ctx, -17, -11, 34, 22, 10); ctx.fill();
  ctx.fillStyle = rare ? "#9f6fc2" : "#51463f";
  ctx.beginPath(); ctx.ellipse(-7, -4, 6, 5, .2, 0, Math.PI * 2); ctx.ellipse(5, 4, 5, 4, -.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = bodyColor; roundedRect(ctx, 10, -12, 16, 17, 7); ctx.fill();
  ctx.fillStyle = "#dca9a0"; ctx.beginPath(); ctx.ellipse(24, 0, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#8a725d"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(14,-12);ctx.lineTo(11,-18);ctx.moveTo(20,-12);ctx.lineTo(24,-18);ctx.stroke();
  drawAnimalEye(ctx, 20, -7);
  ctx.strokeStyle = "#5a483e"; ctx.lineWidth = 4; for (const lx of [-11,-2,8,15]) { ctx.beginPath(); ctx.moveTo(lx,9); ctx.lineTo(lx,16); ctx.stroke(); }
  ctx.fillStyle="#e3b3ad";ctx.beginPath();ctx.ellipse(-1,10,6,4,0,0,Math.PI*2);ctx.fill();
}

function drawGoat(ctx, bodyColor, rare) {
  ctx.fillStyle = shadeColor(bodyColor, -18); roundedRect(ctx, -17, -8, 32, 20, 9); ctx.fill();
  ctx.fillStyle = bodyColor; roundedRect(ctx, -16, -10, 32, 20, 9); ctx.fill();
  ctx.fillStyle = bodyColor; ctx.beginPath(); ctx.ellipse(16,-7,10,8,-.15,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = rare ? "#b888d4" : "#7c694f"; ctx.lineWidth = 2.5;
  ctx.beginPath();ctx.moveTo(14,-13);ctx.quadraticCurveTo(12,-22,18,-24);ctx.moveTo(20,-13);ctx.quadraticCurveTo(23,-22,27,-21);ctx.stroke();
  ctx.fillStyle=shadeColor(bodyColor,-25);ctx.beginPath();ctx.moveTo(21,-1);ctx.lineTo(18,9);ctx.lineTo(24,4);ctx.closePath();ctx.fill();
  drawAnimalEye(ctx, 21,-8);
  ctx.strokeStyle="#5a483e";ctx.lineWidth=3.5;for(const lx of[-11,-2,8,14]){ctx.beginPath();ctx.moveTo(lx,8);ctx.lineTo(lx,16);ctx.stroke();}
}

function drawSheep(ctx, bodyColor, rare) {
  const wool = rare ? "#d4b5ea" : bodyColor;
  ctx.fillStyle = shadeColor(wool, -16);
  for (const [dx,dy,r] of [[-10,-4,9],[0,-7,10],[10,-3,9],[-7,5,9],[5,6,10]]){ctx.beginPath();ctx.arc(dx,dy,r,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle = wool;
  for (const [dx,dy,r] of [[-10,-6,8],[0,-9,9],[10,-5,8],[-7,3,8],[5,4,9]]){ctx.beginPath();ctx.arc(dx,dy,r,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="#59483f";ctx.beginPath();ctx.ellipse(18,-6,9,8,-.05,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#55463d";ctx.lineWidth=3.5;for(const lx of[-9,-1,7,13]){ctx.beginPath();ctx.moveTo(lx,9);ctx.lineTo(lx,16);ctx.stroke();}
  drawAnimalEye(ctx,21,-8);
}

function drawPig(ctx, bodyColor, rare) {
  ctx.fillStyle=shadeColor(bodyColor,-15);ctx.beginPath();ctx.ellipse(-2,0,18,12,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=bodyColor;ctx.beginPath();ctx.ellipse(-2,-2,18,12,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(15,-6,10,9,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=rare?"#c37bdd":"#ba7375";ctx.beginPath();ctx.ellipse(22,-4,6,4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=shadeColor(bodyColor,-25);ctx.beginPath();ctx.moveTo(11,-13);ctx.lineTo(15,-22);ctx.lineTo(20,-13);ctx.closePath();ctx.fill();
  ctx.strokeStyle=shadeColor(bodyColor,-30);ctx.lineWidth=2;ctx.beginPath();ctx.arc(-20,-2,5,-Math.PI*.5,Math.PI*1.1);ctx.stroke();
  drawAnimalEye(ctx,19,-9);
  ctx.strokeStyle="#80575a";ctx.lineWidth=3.5;for(const lx of[-10,-1,8,15]){ctx.beginPath();ctx.moveTo(lx,8);ctx.lineTo(lx,15);ctx.stroke();}
}

function drawAnimal(ctx, game, animal) {
  const species = ANIMAL_SPECIES[animal.species];
  if (!species) return;
  const x = Number(animal.x || 0) * TILE;
  const groundY = Number(animal.y || 0) * TILE;
  const bounce = Math.abs(Math.sin(Number(animal.walkTime || 0))) * 1.4;
  const y = groundY - bounce;
  const scale = animalArtScale(animal);
  const rare = animal.colorVariant === "rare";
  const bodyColor = rare ? "#d5b0e9" : species.color;
  const facing = animal.facing || (Number(animal.targetX) < Number(animal.x) ? "left" : "right");
  const flip = facing === "left" ? -1 : 1;

  ctx.save();
  ctx.fillStyle="rgba(16,36,29,.23)";ctx.beginPath();ctx.ellipse(x,groundY+11,15*scale,5*scale,0,0,Math.PI*2);ctx.fill();
  ctx.translate(x,y);ctx.scale(scale*flip,scale);
  if(animal.species==="chicken"||animal.species==="duck")drawBird(ctx,animal.species,bodyColor,rare);
  else if(animal.species==="cow")drawCow(ctx,bodyColor,rare);
  else if(animal.species==="goat")drawGoat(ctx,bodyColor,rare);
  else if(animal.species==="sheep")drawSheep(ctx,bodyColor,rare);
  else drawPig(ctx,bodyColor,rare);
  ctx.restore();

  ctx.save();ctx.font="bold 10px Trebuchet MS";ctx.textAlign="center";ctx.strokeStyle="#10241d";ctx.lineWidth=3;ctx.fillStyle="#fff1c8";
  ctx.strokeText(animal.name,x,y-30*scale);ctx.fillText(animal.name,x,y-30*scale);
  const indicator=animal.sick?"✚":animal.productReady?ITEMS[animal.productReady.id]?.icon||"📦":animal.pettedDay===game.state.day?"♥":!animal.fedToday?"…":"";
  if(indicator){ctx.font="15px serif";ctx.strokeText(indicator,x,y-43*scale);ctx.fillText(indicator,x,y-43*scale);}ctx.restore();
}

export function installCharacterArt(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    drawAnimatedCharacter: proto.drawAnimatedCharacter,
    drawRanchAnimal: proto.drawRanchAnimal,
  };

  proto.drawAnimatedCharacter = function drawPaintedCharacter(ctx, entity, color, name, player = false, citizen = false) {
    if (!ctx || !entity || !Number.isFinite(Number(entity.x)) || !Number.isFinite(Number(entity.y))) {
      return original.drawAnimatedCharacter?.call(this, ctx, entity, color, name, player, citizen);
    }
    return drawCharacter(ctx, this, entity, color, name, player, citizen);
  };

  proto.drawRanchAnimal = function drawPaintedRanchAnimal(ctx, animal) {
    if (!ctx || !animal || !ANIMAL_SPECIES[animal.species]) return original.drawRanchAnimal?.call(this, ctx, animal);
    return drawAnimal(ctx, this, animal);
  };
}
