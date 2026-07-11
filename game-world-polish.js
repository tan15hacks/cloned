import {
  TILE,
  WORLD_W,
  WORLD_H,
  BUILDINGS,
  WAYSTONES,
  CAVE_ENTRANCES,
  CAVE_W,
  CAVE_H,
  CAVE_MONSTERS,
  MONSTER_TYPES,
  regionAt,
  terrainAt,
  clamp,
  distance,
} from "./game-shared.js";
import {
  AUTHORED_STRUCTURES,
  visibleDecorations,
  structureAtTile,
  solidDecorationAtTile,
  transitionInfo,
} from "./world-polish-data.js";

const TERRAIN_COLORS = {
  farm: "#6fa85e",
  field: "#75a95e",
  village: "#83ae68",
  city: "#9ca77b",
  highland: "#7c9585",
  meadow: "#75ad65",
  lake: "#6fa589",
  mist: "#718d82",
  snow: "#c5d6da",
  darkforest: "#294b3b",
  swamp: "#566e49",
  dread: "#4b455b",
  volcano: "#68483e",
  coast: "#d2bd7b",
  ruins: "#a88c67",
  path: "#c5aa73",
  bridge: "#8a6744",
  water: "#4e9cbc",
  lava: "#d55a2c",
};

const hexToRgb = (hex) => {
  const value = hex.replace("#", "");
  const parsed = Number.parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value, 16);
  return { r: parsed >> 16 & 255, g: parsed >> 8 & 255, b: parsed & 255 };
};

const mix = (a, b, amount) => {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const t = clamp(amount, 0, 1);
  return `rgb(${Math.round(ca.r + (cb.r - ca.r) * t)},${Math.round(ca.g + (cb.g - ca.g) * t)},${Math.round(ca.b + (cb.b - ca.b) * t)})`;
};

const tileVisible = (item, bounds, pad = 1) => item.x + (item.w || 1) >= bounds.startX - pad
  && item.x <= bounds.endX + pad
  && item.y + (item.h || 1) >= bounds.startY - pad
  && item.y <= bounds.endY + pad;

const caveSafeDistance = (point, target, radius) => Math.hypot(point.x - target.x, point.y - target.y) >= radius;

export function installWorldPolish(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    collides: proto.collides,
    monsterCollides: proto.monsterCollides,
    drawTerrainTile: proto.drawTerrainTile,
    drawWorld: proto.drawWorld,
    drawBuildings: proto.drawBuildings,
    drawLandmarks: proto.drawLandmarks,
    drawCave: proto.drawCave,
    loadCaveFloor: proto.loadCaveFloor,
  };

  proto.collides = function collidesWithPolishedWorld(x, y, radius = .3) {
    if (original.collides.call(this, x, y, radius)) return true;
    if (this.state.mode !== "world") return false;
    const corners = [[x - radius, y - radius], [x + radius, y - radius], [x - radius, y + radius], [x + radius, y + radius]];
    return corners.some(([cx, cy]) => structureAtTile(Math.floor(cx), Math.floor(cy)) || solidDecorationAtTile(Math.floor(cx), Math.floor(cy)));
  };

  proto.monsterCollides = function monsterCollidesWithPolishedWorld(x, y) {
    if (original.monsterCollides.call(this, x, y)) return true;
    if (this.state.mode !== "world") return false;
    return Boolean(structureAtTile(Math.floor(x), Math.floor(y)) || solidDecorationAtTile(Math.floor(x), Math.floor(y)));
  };

  proto.loadCaveFloor = function loadPolishedCaveFloor(floor) {
    original.loadCaveFloor.call(this, floor);
    const cave = this.currentCave;
    if (!cave) return;
    cave.nodes = cave.nodes.filter((node) => caveSafeDistance(node, cave.entry, 3.2)
      && caveSafeDistance(node, cave.exit, 2.5)
      && cave.merchants.every((merchant) => caveSafeDistance(node, merchant, 2)));
    cave.monsters = cave.monsters.filter((monster) => caveSafeDistance(monster, cave.entry, floor === 50 ? 4 : 5.5)
      && caveSafeDistance(monster, cave.exit, 2.7)
      && cave.merchants.every((merchant) => caveSafeDistance(monster, merchant, 3)));
    cave.polishSeed = cave.runSeed + floor * 991;
  };

  proto.drawTerrainTile = function drawPolishedTerrainTile(ctx, x, y) {
    original.drawTerrainTile.call(this, ctx, x, y);
    const terrain = terrainAt(x, y);
    const transition = transitionInfo(x, y);
    if (transition && !["path", "bridge", "water", "lava", "field"].includes(terrain)) {
      const from = TERRAIN_COLORS[transition.from.terrain] || transition.from.color;
      const to = TERRAIN_COLORS[transition.to.terrain] || transition.to.color;
      ctx.fillStyle = mix(from, to, transition.strength * .42);
      ctx.globalAlpha = .42;
      const variant = (x * 19 + y * 31) % 4;
      ctx.fillRect(x * TILE + variant * 4, y * TILE + 4 + variant * 3, 12, 8);
      ctx.globalAlpha = 1;
    }
    const time = performance.now() / 700;
    if (terrain === "water") {
      ctx.strokeStyle = "rgba(235,250,255,.35)";
      ctx.lineWidth = 2;
      const wave = Math.sin(time + x * .8 + y * .35) * 3;
      ctx.beginPath();
      ctx.moveTo(x * TILE + 5 + wave, y * TILE + 22);
      ctx.lineTo(x * TILE + 23 + wave, y * TILE + 22);
      ctx.stroke();
    } else if (terrain === "lava") {
      ctx.fillStyle = `rgba(255,210,80,${.28 + Math.sin(time * 2 + x + y) * .08})`;
      ctx.fillRect(x * TILE + 7, y * TILE + 7 + (x + y) % 9, 18, 3);
    } else if (["farm", "field", "meadow", "village"].includes(terrain) && (x * 11 + y * 7) % 17 === 0) {
      ctx.strokeStyle = "rgba(26,82,48,.25)";
      ctx.lineWidth = 1.5;
      const sway = Math.sin(time + x) * 2;
      ctx.beginPath();
      ctx.moveTo(x * TILE + 8, y * TILE + 27);
      ctx.lineTo(x * TILE + 8 + sway, y * TILE + 17);
      ctx.stroke();
    }
  };

  proto.drawWorld = function drawPolishedWorld(ctx) {
    const bounds = this.visibleBounds(WORLD_W, WORLD_H);
    for (let y = bounds.startY; y < bounds.endY; y += 1) {
      for (let x = bounds.startX; x < bounds.endX; x += 1) this.drawTerrainTile(ctx, x, y);
    }
    const decorations = visibleDecorations(bounds).filter((decor) => !["water", "lava", "path", "bridge", "field"].includes(terrainAt(decor.x, decor.y)));
    this.drawWorldDecorations(ctx, decorations.filter((decor) => !decor.solid), false);
    this.drawSoil(ctx, bounds);
    this.drawPlaced(ctx, bounds);
    this.drawResources(ctx, bounds);
    this.drawAuthoredStructures(ctx, bounds);
    this.drawBuildings(ctx, bounds);
    this.drawLandmarks(ctx, bounds);
    this.drawWorldDecorations(ctx, decorations.filter((decor) => decor.solid), true);
    this.drawNPCs(ctx, bounds);
    this.drawMonsters(ctx, this.state.monsters, bounds, false);
    if (this.state.mote.unlocked) this.drawMote(ctx);
    this.drawPlayer(ctx);
    this.drawTarget(ctx);
    this.drawWorldAmbient(ctx, bounds);
  };

  proto.drawWorldDecorations = function drawWorldDecorations(ctx, decorations, solidLayer) {
    const time = performance.now() / 550;
    for (const decor of decorations) {
      const x = (decor.x + .5) * TILE;
      const y = (decor.y + .5) * TILE;
      const sway = Math.sin(time + decor.x * .7 + decor.y * .3) * 2;
      ctx.save();
      switch (decor.type) {
        case "flower":
        case "paleFlower":
          ctx.fillStyle = decor.type === "paleFlower" ? "#d8e6df" : ((decor.x + decor.y) % 2 ? "#f0c85a" : "#e97d82");
          for (let i = 0; i < 4; i += 1) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = "#6f8e44"; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
          break;
        case "clover": case "tallGrass": case "windGrass": case "beachGrass":
          ctx.strokeStyle = decor.type === "beachGrass" ? "#7c9a58" : "#285f3b"; ctx.lineWidth = 2;
          for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(x + i * 3, y + 10); ctx.lineTo(x + i * 2 + sway, y - 4 - Math.abs(i)); ctx.stroke(); }
          break;
        case "pebble": case "rubble": case "stone":
          ctx.fillStyle = decor.type === "rubble" ? "#897760" : "#758078"; ctx.beginPath(); ctx.ellipse(x, y + 6, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
          break;
        case "shrub":
          ctx.fillStyle = "#346c45"; ctx.beginPath(); ctx.arc(x - 5, y + 2, 8, 0, Math.PI * 2); ctx.arc(x + 5, y, 9, 0, Math.PI * 2); ctx.fill();
          break;
        case "lamp": case "banner":
          ctx.fillStyle = "#5c4634"; ctx.fillRect(x - 2, y - 13, 4, 25);
          if (decor.type === "lamp") { ctx.shadowColor = "#ffe39b"; ctx.shadowBlur = 10; ctx.fillStyle = "#efb94a"; ctx.beginPath(); ctx.arc(x, y - 15, 6, 0, Math.PI * 2); ctx.fill(); }
          else { ctx.fillStyle = (decor.x + decor.y) % 2 ? "#8d5048" : "#526b75"; ctx.beginPath(); ctx.moveTo(x + 2, y - 12); ctx.lineTo(x + 13 + sway, y - 8); ctx.lineTo(x + 2, y); ctx.fill(); }
          break;
        case "crate":
          ctx.fillStyle = "#9a6a3f"; ctx.fillRect(x - 7, y - 5, 14, 14); ctx.strokeStyle = "#5c3d28"; ctx.strokeRect(x - 7, y - 5, 14, 14);
          break;
        case "reed":
          ctx.strokeStyle = "#496a3f"; ctx.lineWidth = 2; for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(x + i * 3, y + 10); ctx.lineTo(x + i * 2 + sway, y - 10); ctx.stroke(); }
          break;
        case "lily":
          ctx.fillStyle = "#5d9258"; ctx.beginPath(); ctx.ellipse(x, y + 5, 10, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#e7c2dc"; ctx.beginPath(); ctx.arc(x + 2, y + 1, 3, 0, Math.PI * 2); ctx.fill();
          break;
        case "fogTuft":
          ctx.fillStyle = "rgba(220,235,230,.22)"; ctx.beginPath(); ctx.ellipse(x, y + 4, 15, 7, 0, 0, Math.PI * 2); ctx.fill();
          break;
        case "snowdrift":
          ctx.fillStyle = "rgba(246,253,255,.82)"; ctx.beginPath(); ctx.ellipse(x, y + 7, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
          break;
        case "iceShard":
          ctx.fillStyle = "#c9eff5"; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 7, y + 8); ctx.lineTo(x - 6, y + 8); ctx.closePath(); ctx.fill();
          break;
        case "root": case "mangroveKnee": case "driftwood": case "charredStump": case "deadSapling":
          ctx.strokeStyle = decor.type === "charredStump" ? "#342b28" : "#604631"; ctx.lineWidth = decor.type === "deadSapling" ? 4 : 6;
          ctx.beginPath(); ctx.moveTo(x - 10, y + 9); ctx.lineTo(x, y - 5); ctx.lineTo(x + 11, y + 7); ctx.stroke();
          if (decor.type === "deadSapling") { ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + sway, y - 20); ctx.lineTo(x - 8, y - 27); ctx.stroke(); }
          break;
        case "glowMushroom":
          ctx.shadowColor = "#a7dca6"; ctx.shadowBlur = 10; ctx.fillStyle = "#bce0a4"; ctx.beginPath(); ctx.arc(x, y - 2, 7, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#e7dfc7"; ctx.fillRect(x - 2, y - 2, 4, 10);
          break;
        case "mireBubble":
          ctx.strokeStyle = "rgba(202,230,164,.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y + 4, 3 + (Math.sin(time + decor.x) + 1) * 2, 0, Math.PI * 2); ctx.stroke();
          break;
        case "bone":
          ctx.strokeStyle = "#d4ccb5"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 9, y + 5); ctx.lineTo(x + 9, y - 4); ctx.stroke();
          break;
        case "voidCrystal": case "standingStone": case "brokenPillar": case "pine": case "ashRock":
          this.drawSolidRegionDecoration(ctx, decor, x, y, solidLayer);
          break;
        case "emberVent":
          ctx.fillStyle = "#2f2928"; ctx.beginPath(); ctx.ellipse(x, y + 7, 10, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ff9b42"; ctx.globalAlpha = .65 + Math.sin(time * 2 + decor.x) * .2; ctx.fillRect(x - 4, y + 4, 8, 2); ctx.globalAlpha = 1;
          break;
        case "shell":
          ctx.strokeStyle = "#f0d7b5"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y + 4, 7, Math.PI, 2 * Math.PI); ctx.stroke();
          break;
        case "ancientTile":
          ctx.strokeStyle = "rgba(90,68,48,.35)"; ctx.lineWidth = 2; ctx.strokeRect(x - 10, y - 10, 20, 20); ctx.beginPath(); ctx.moveTo(x - 10, y - 10); ctx.lineTo(x + 10, y + 10); ctx.stroke();
          break;
        default:
          break;
      }
      ctx.restore();
    }
  };

  proto.drawSolidRegionDecoration = function drawSolidRegionDecoration(ctx, decor, x, y) {
    if (decor.type === "pine") {
      ctx.fillStyle = "#5d4632"; ctx.fillRect(x - 3, y - 4, 6, 18);
      ctx.fillStyle = "#315d4b"; for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.moveTo(x, y - 25 + i * 8); ctx.lineTo(x + 14 - i * 2, y - 5 + i * 7); ctx.lineTo(x - 14 + i * 2, y - 5 + i * 7); ctx.closePath(); ctx.fill(); }
    } else if (decor.type === "standingStone" || decor.type === "brokenPillar") {
      ctx.fillStyle = decor.type === "standingStone" ? "#6f7d76" : "#8f806b";
      ctx.beginPath(); ctx.moveTo(x - 8, y + 11); ctx.lineTo(x - 6, y - 17); ctx.lineTo(x + 6, y - 22); ctx.lineTo(x + 9, y + 11); ctx.closePath(); ctx.fill();
    } else if (decor.type === "voidCrystal") {
      ctx.shadowColor = "#a88cff"; ctx.shadowBlur = 12; ctx.fillStyle = "#7454a0"; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 10, y + 9); ctx.lineTo(x - 8, y + 9); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = "#4d3831"; ctx.beginPath(); ctx.moveTo(x - 11, y + 9); ctx.lineTo(x - 8, y - 7); ctx.lineTo(x + 5, y - 13); ctx.lineTo(x + 12, y + 7); ctx.closePath(); ctx.fill();
    }
  };

  proto.drawAuthoredStructures = function drawAuthoredStructures(ctx, bounds) {
    for (const structure of AUTHORED_STRUCTURES) {
      if (!tileVisible(structure, bounds, 2)) continue;
      const x = structure.x * TILE;
      const y = structure.y * TILE;
      const w = structure.w * TILE;
      const h = structure.h * TILE;
      ctx.save();
      if (structure.type.startsWith("fence")) {
        ctx.fillStyle = "#704b31";
        if (structure.type === "fenceH") {
          ctx.fillRect(x, y + 9, w, 5); ctx.fillRect(x, y + 20, w, 5);
          for (let px = x; px <= x + w; px += TILE * 2) ctx.fillRect(px, y + 3, 6, 27);
        } else {
          ctx.fillRect(x + 9, y, 5, h); ctx.fillRect(x + 20, y, 5, h);
          for (let py = y; py <= y + h; py += TILE * 2) ctx.fillRect(x + 3, py, 27, 6);
        }
      } else if (structure.type.startsWith("cityWall")) {
        ctx.fillStyle = "#6d6f68"; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#8d8e83";
        if (structure.type === "cityWallH") for (let px = x; px < x + w; px += TILE) ctx.fillRect(px + 3, y + 3, TILE - 6, 10);
        else for (let py = y; py < y + h; py += TILE) ctx.fillRect(x + 3, py + 3, 10, TILE - 6);
      } else if (structure.type === "hay") {
        ctx.fillStyle = "#d7ad4d"; ctx.fillRect(x + 3, y + 8, w - 6, h - 12); ctx.strokeStyle = "#8b692c"; ctx.lineWidth = 3; ctx.strokeRect(x + 3, y + 8, w - 6, h - 12);
      } else if (structure.type === "cart") {
        ctx.fillStyle = "#8b5d38"; ctx.fillRect(x + 5, y + 5, w - 10, h - 18); ctx.fillStyle = "#49372b";
        ctx.beginPath(); ctx.arc(x + 18, y + h - 9, 9, 0, Math.PI * 2); ctx.arc(x + w - 18, y + h - 9, 9, 0, Math.PI * 2); ctx.fill();
      } else if (structure.type === "well") {
        ctx.fillStyle = "#817b6e"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2 + 6, w * .42, h * .28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#293842"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2 + 3, w * .28, h * .17, 0, 0, Math.PI * 2); ctx.fill();
      } else if (structure.type === "garden") {
        ctx.fillStyle = "#684d35"; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
        for (let gy = y + 12; gy < y + h - 4; gy += 14) { ctx.fillStyle = ((gy / 14) | 0) % 2 ? "#e27d82" : "#e6c95a"; for (let gx = x + 12; gx < x + w - 4; gx += 16) { ctx.beginPath(); ctx.arc(gx, gy, 3, 0, Math.PI * 2); ctx.fill(); } }
      } else if (structure.type === "bench") {
        ctx.fillStyle = "#735038"; ctx.fillRect(x + 3, y + 7, w - 6, 7); ctx.fillRect(x + 5, y + 18, w - 10, 6); ctx.fillRect(x + 10, y + 24, 5, 7); ctx.fillRect(x + w - 15, y + 24, 5, 7);
      } else if (structure.type === "fountain") {
        ctx.fillStyle = "#777b77"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2 + 12, w * .46, h * .32, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#67a8c3"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2 + 8, w * .35, h * .22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(225,250,255,.8)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + w / 2, y + h / 2 + 8); ctx.quadraticCurveTo(x + w / 2 + 15, y + 4, x + w / 2 + Math.sin(performance.now() / 350) * 8, y + h / 2 - 8); ctx.stroke();
      } else if (structure.type === "stall") {
        ctx.fillStyle = "#8c633f"; ctx.fillRect(x + 4, y + 16, w - 8, h - 18); ctx.fillStyle = (structure.x % 2 ? "#d95e52" : "#4d7891");
        for (let sx = 0; sx < structure.w; sx += 1) ctx.fillRect(x + sx * TILE, y + 2, TILE, 13);
      } else if (structure.type === "dummy") {
        ctx.fillStyle = "#6b4b32"; ctx.fillRect(x + 13, y + 10, 6, h - 12); ctx.fillStyle = "#b58b5e"; ctx.beginPath(); ctx.arc(x + 16, y + 9, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x + 7, y + 19, 18, 20);
      } else if (structure.type === "house") {
        ctx.fillStyle = "rgba(20,30,25,.24)"; ctx.fillRect(x + 8, y + h - 3, w, 10);
        ctx.fillStyle = structure.wall; ctx.fillRect(x, y + TILE, w, h - TILE);
        ctx.fillStyle = structure.roof; ctx.beginPath(); ctx.moveTo(x - 5, y + TILE + 3); ctx.lineTo(x + w / 2, y - 10); ctx.lineTo(x + w + 5, y + TILE + 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#5b4030"; ctx.fillRect(x + w / 2 - 10, y + h - 30, 20, 30);
      }
      ctx.restore();
    }
  };

  proto.drawBuildings = function drawPolishedBuildings(ctx, bounds) {
    for (const building of BUILDINGS) {
      if (!tileVisible(building, bounds, 2)) continue;
      const x = building.x * TILE;
      const y = building.y * TILE;
      const w = building.w * TILE;
      const h = building.h * TILE;
      ctx.save();
      ctx.fillStyle = "rgba(10,25,18,.24)"; ctx.fillRect(x + 10, y + h - 4, w + 8, 14);
      ctx.fillStyle = "#83735f"; ctx.fillRect(x - 4, y + h - 9, w + 8, 9);
      ctx.fillStyle = building.wall; ctx.fillRect(x, y + TILE, w, h - TILE);
      ctx.fillStyle = mix(building.wall, "#ffffff", .16); ctx.fillRect(x + 8, y + TILE + 8, w - 16, 7);
      ctx.fillStyle = building.roof;
      ctx.beginPath(); ctx.moveTo(x - 12, y + TILE * 1.25); ctx.lineTo(x + w / 2, y - 22); ctx.lineTo(x + w + 12, y + TILE * 1.25); ctx.closePath(); ctx.fill();
      ctx.fillStyle = mix(building.roof, "#ffffff", .16);
      ctx.beginPath(); ctx.moveTo(x + 2, y + TILE * 1.12); ctx.lineTo(x + w / 2, y - 13); ctx.lineTo(x + w / 2, y + TILE * 1.12); ctx.closePath(); ctx.fill();
      const doorX = (building.door.x + .5) * TILE;
      const doorY = (building.door.y + 1) * TILE;
      ctx.fillStyle = "#665047"; ctx.fillRect(doorX - 14, doorY - 34, 28, 34);
      ctx.fillStyle = "#d9b25d"; ctx.beginPath(); ctx.arc(doorX + 8, doorY - 17, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#a18d72"; ctx.fillRect(doorX - 20, doorY, 40, 7);
      ctx.fillStyle = "#8ec6d8";
      const windowY = y + TILE * 2.25;
      ctx.fillRect(x + 22, windowY, 24, 19); ctx.fillRect(x + w - 46, windowY, 24, 19);
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2; ctx.strokeRect(x + 22, windowY, 24, 19); ctx.strokeRect(x + w - 46, windowY, 24, 19);
      ctx.fillStyle = "rgba(255,241,200,.94)"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3;
      const signW = Math.min(w - 30, Math.max(110, building.name.length * 7));
      ctx.fillRect(x + w / 2 - signW / 2, y + TILE * 1.33, signW, 23); ctx.strokeRect(x + w / 2 - signW / 2, y + TILE * 1.33, signW, 23);
      ctx.font = "bold 12px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillStyle = "#10241d"; ctx.fillText(building.name, x + w / 2, y + TILE * 1.33 + 16);
      ctx.restore();
    }
  };

  proto.drawLandmarks = function drawPolishedLandmarks(ctx, bounds) {
    for (const stone of WAYSTONES) {
      if (!tileVisible({ x: stone.x - 2, y: stone.y - 2, w: 4, h: 4 }, bounds, 1)) continue;
      const x = stone.x * TILE; const y = stone.y * TILE; const active = this.state.discoveredWaystones.includes(stone.id);
      ctx.save();
      ctx.fillStyle = "#817765"; ctx.beginPath(); ctx.ellipse(x, y + 17, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = active ? "#efb94a" : "#777"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y + 12, 23, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = "#5b4b3b"; ctx.fillRect(x - 9, y - 3, 18, 31);
      ctx.fillStyle = active ? "#efb94a" : "#777"; ctx.shadowColor = active ? "#ffe69b" : "transparent"; ctx.shadowBlur = active ? 13 : 0;
      ctx.beginPath(); ctx.moveTo(x, y - 27); ctx.lineTo(x + 15, y - 6); ctx.lineTo(x, y + 4); ctx.lineTo(x - 15, y - 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    for (const cave of CAVE_ENTRANCES) {
      if (!tileVisible({ x: cave.x - 3, y: cave.y - 3, w: 6, h: 6 }, bounds, 1)) continue;
      const x = cave.x * TILE; const y = cave.y * TILE;
      ctx.save();
      ctx.fillStyle = "#7a7169"; for (let i = 0; i < 3; i += 1) ctx.fillRect(x - 30 + i * 5, y + 24 + i * 5, 60 - i * 10, 5);
      ctx.fillStyle = "#454249"; ctx.beginPath(); ctx.arc(x, y + 8, 29, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 29, y + 8, 58, 20);
      ctx.fillStyle = "#1d1c21"; ctx.beginPath(); ctx.arc(x, y + 11, 17, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 17, y + 11, 34, 15);
      ctx.strokeStyle = "#9b8874"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y + 8, 25, Math.PI, 0); ctx.stroke();
      ctx.font = "bold 10px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillStyle = "#fff1c8"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3; ctx.strokeText(cave.name, x, y - 24); ctx.fillText(cave.name, x, y - 24);
      ctx.restore();
    }
  };

  proto.drawWorldAmbient = function drawWorldAmbient(ctx, bounds) {
    const region = regionAt(this.state.player.x, this.state.player.y).id;
    const time = performance.now() / 1000;
    ctx.save();
    if (region === "frostpeak") {
      ctx.fillStyle = "rgba(245,252,255,.78)";
      for (let i = 0; i < 28; i += 1) {
        const px = ((i * 97 + time * 24) % (this.screen.width + 80)) + this.camera.x - 40;
        const py = ((i * 53 + time * 42) % (this.screen.height + 80)) + this.camera.y - 40;
        ctx.beginPath(); ctx.arc(px, py, 2 + i % 2, 0, Math.PI * 2); ctx.fill();
      }
    } else if (region === "veilmoor") {
      ctx.fillStyle = "rgba(215,229,224,.12)";
      for (let i = 0; i < 9; i += 1) {
        const px = this.camera.x + ((i * 131 + time * 12) % (this.screen.width + 180)) - 90;
        const py = this.camera.y + 60 + (i * 73 % Math.max(100, this.screen.height - 100));
        ctx.beginPath(); ctx.ellipse(px, py, 85, 24, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (region === "volcano") {
      for (let i = 0; i < 22; i += 1) {
        const px = this.camera.x + (i * 83 % Math.max(100, this.screen.width));
        const py = this.camera.y + this.screen.height - ((i * 67 + time * 48) % (this.screen.height + 40));
        ctx.fillStyle = `rgba(255,${120 + i % 80},55,.65)`; ctx.fillRect(px, py, 3, 3);
      }
    } else if (region === "swamp") {
      ctx.fillStyle = "rgba(191,221,151,.18)";
      for (let i = 0; i < 12; i += 1) {
        const px = this.camera.x + (i * 101 % Math.max(100, this.screen.width));
        const py = this.camera.y + (i * 47 % Math.max(100, this.screen.height));
        const radius = 3 + (Math.sin(time * 2 + i) + 1) * 3;
        ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.strokeStyle = "rgba(210,235,170,.28)"; ctx.stroke();
      }
    } else if (region === "darkforest") {
      ctx.fillStyle = "rgba(6,18,13,.17)"; ctx.fillRect(this.camera.x, this.camera.y, this.screen.width, this.screen.height);
    } else if (region === "dreadwild") {
      ctx.fillStyle = "rgba(83,56,112,.11)"; ctx.fillRect(this.camera.x, this.camera.y, this.screen.width, this.screen.height);
    }
    ctx.restore();
  };

  proto.drawCave = function drawPolishedCave(ctx) {
    if (!this.currentCave) return;
    const bounds = this.visibleBounds(CAVE_W, CAVE_H);
    const tier = this.currentCave.tier;
    const time = performance.now() / 800;
    for (let y = bounds.startY; y < bounds.endY; y += 1) {
      for (let x = bounds.startX; x < bounds.endX; x += 1) {
        const wall = this.currentCave.tiles[y][x] === "wall";
        ctx.fillStyle = wall ? tier.wall : tier.floor;
        ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
        if (wall) {
          const shade = (x * 17 + y * 13 + this.currentCave.floor) % 3;
          ctx.fillStyle = `rgba(255,255,255,${.035 + shade * .018})`;
          ctx.beginPath(); ctx.moveTo(x * TILE + 3, y * TILE + 5); ctx.lineTo(x * TILE + 20, y * TILE + 3); ctx.lineTo(x * TILE + 28, y * TILE + 16); ctx.lineTo(x * TILE + 10, y * TILE + 22); ctx.closePath(); ctx.fill();
        } else {
          ctx.strokeStyle = "rgba(15,20,18,.12)"; ctx.lineWidth = 1; ctx.strokeRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
          this.drawCaveFloorAccent(ctx, x, y, tier, time);
        }
      }
    }
    if (this.currentCave.floor === 50) {
      const centerX = 24 * TILE; const centerY = 16 * TILE;
      ctx.strokeStyle = tier.accent; ctx.globalAlpha = .35 + Math.sin(time * 2) * .12; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(centerX, centerY, 8 * TILE, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    this.drawCaveSafePads(ctx);
    for (const node of this.currentCave.nodes) if (node.x >= bounds.startX - 1 && node.x <= bounds.endX + 1 && node.y >= bounds.startY - 1 && node.y <= bounds.endY + 1) {
      const x = node.x * TILE, y = node.y * TILE;
      ctx.shadowColor = tier.accent; ctx.shadowBlur = 7; ctx.fillStyle = tier.accent;
      ctx.beginPath(); ctx.moveTo(x, y - 17); ctx.lineTo(x + 12, y + 9); ctx.lineTo(x + 2, y + 6); ctx.lineTo(x - 10, y + 11); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    }
    if (this.currentCave.chest && !this.currentCave.chest.opened) {
      const x = this.currentCave.chest.x * TILE, y = this.currentCave.chest.y * TILE;
      ctx.shadowColor = "#efb94a"; ctx.shadowBlur = 12; ctx.fillStyle = "#8b5c2f"; ctx.fillRect(x - 15, y - 9, 30, 21); ctx.fillStyle = "#efb94a"; ctx.fillRect(x - 15, y - 5, 30, 5); ctx.fillRect(x - 3, y - 9, 6, 21); ctx.shadowBlur = 0;
    }
    for (const merchant of this.currentCave.merchants) this.drawCharacter(ctx, merchant.x, merchant.y, merchant.color, merchant.name);
    this.drawMonsters(ctx, this.currentCave.monsters, bounds, true);
    this.drawCaveDoor(ctx, this.currentCave.entry, "UP");
    this.drawCaveDoor(ctx, this.currentCave.exit, this.currentCave.floor === 50 ? "EXIT" : "DOWN");
    this.drawPlayer(ctx);
    this.drawTarget(ctx);
    this.drawCaveAmbient(ctx, bounds, tier, time);
  };

  proto.drawCaveFloorAccent = function drawCaveFloorAccent(ctx, x, y, tier, time) {
    const seed = (x * 19 + y * 37 + this.currentCave.floor * 11) % 41;
    if (seed > 4) return;
    const px = x * TILE + 16; const py = y * TILE + 18;
    ctx.save(); ctx.globalAlpha = .35;
    if (tier.id === "fungal") {
      ctx.fillStyle = tier.accent; ctx.beginPath(); ctx.arc(px, py, 5, Math.PI, 0); ctx.fill(); ctx.fillRect(px - 1, py, 2, 7);
    } else if (tier.id === "crystal" || tier.id === "heart") {
      ctx.fillStyle = tier.accent; ctx.beginPath(); ctx.moveTo(px, py - 9); ctx.lineTo(px + 5, py + 6); ctx.lineTo(px - 4, py + 6); ctx.closePath(); ctx.fill();
    } else if (tier.id === "frozen") {
      ctx.strokeStyle = tier.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 8, py); ctx.lineTo(px, py - 6); ctx.lineTo(px + 7, py + 4); ctx.stroke();
    } else if (tier.id === "infernal") {
      ctx.fillStyle = `rgba(255,155,66,${.3 + Math.sin(time + x) * .15})`; ctx.fillRect(px - 8, py, 16, 3);
    } else {
      ctx.fillStyle = tier.accent; ctx.beginPath(); ctx.ellipse(px, py + 4, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  proto.drawCaveSafePads = function drawCaveSafePads(ctx) {
    for (const [point, label] of [[this.currentCave.entry, "SAFE"], [this.currentCave.exit, this.currentCave.floor === 50 ? "HEART" : "DESCENT"]]) {
      const x = point.x * TILE; const y = point.y * TILE;
      ctx.fillStyle = "rgba(255,241,200,.08)"; ctx.beginPath(); ctx.arc(x, y, 2.25 * TILE, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = this.currentCave.tier.accent; ctx.globalAlpha = .35; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 1.6 * TILE, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.font = "bold 9px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,241,200,.7)"; ctx.fillText(label, x, y + 31);
    }
  };

  proto.drawCaveAmbient = function drawCaveAmbient(ctx, bounds, tier, time) {
    for (let y = bounds.startY; y < bounds.endY; y += 1) {
      for (let x = bounds.startX; x < bounds.endX; x += 1) {
        if (this.currentCave.tiles[y][x] !== "floor") continue;
        if ((x * 31 + y * 17 + this.currentCave.floor) % 53 !== 0) continue;
        const px = (x + .5) * TILE; const py = (y + .5) * TILE;
        ctx.save(); ctx.shadowColor = tier.accent; ctx.shadowBlur = 13; ctx.fillStyle = tier.accent; ctx.globalAlpha = .45 + Math.sin(time * 2 + x) * .2;
        ctx.beginPath(); ctx.arc(px, py - 7, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
  };
}
