import { TILE } from "./game-shared.js";
import { INTERIOR_MAPS } from "./living-world-data.js";
import { activeInteriorResidents } from "./expanded-interiors-data.js";

function objectRect(object) {
  return { x: object.x * TILE, y: object.y * TILE, w: object.w * TILE, h: object.h * TILE };
}

export function installExpandedInteriorRender(GameClass) {
  const proto = GameClass.prototype;
  const originalDrawInteriorObject = proto.drawInteriorObject;

  proto.renderInterior = function renderExpandedInterior() {
    const ctx = this.ctx;
    const width = this.screen.width;
    const height = this.screen.height;
    const map = INTERIOR_MAPS[this.state.living?.interiorId];
    if (!map) return;
    ctx.save();
    ctx.setTransform(this.screen.dpr, 0, 0, this.screen.dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

    ctx.fillStyle = map.wall;
    ctx.fillRect(0, 0, map.width * TILE, map.height * TILE);
    ctx.fillStyle = map.floor;
    ctx.fillRect(TILE, TILE, (map.width - 2) * TILE, (map.height - 2) * TILE);
    this.drawInteriorFloorPattern(ctx, map);
    this.drawInteriorWindows(ctx, map);
    for (const object of map.objects) this.drawInteriorObject(ctx, object);
    this.drawInteriorLights(ctx, map);

    for (const interaction of map.interactions) {
      const pulse = .13 + (Math.sin(performance.now() / 380 + interaction.x) + 1) * .035;
      ctx.fillStyle = `rgba(255,241,200,${pulse})`;
      ctx.strokeStyle = "rgba(239,185,74,.42)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(interaction.x * TILE, interaction.y * TILE, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const socialGuest = this.activeSocialHeartEvent?.();
    const residents = activeInteriorResidents(map, this.state);
    for (const resident of residents) {
      if (socialGuest?.npc?.id === resident.id) continue;
      const npc = this.state.npcs.find((entry) => entry.id === resident.id);
      if (!npc) continue;
      this.drawAnimatedCharacter(ctx, { ...npc, x: resident.x, y: resident.y, moving: false }, npc.color, npc.name, false);
    }
    this.drawSocialInteriorGuest?.(ctx, map);

    this.drawAnimatedCharacter(ctx, this.state.player, "#2e6f57", "", true);
    ctx.fillStyle = "#f2d59d";
    ctx.fillRect((map.exit.x - .65) * TILE, (map.exit.y - .25) * TILE, 1.3 * TILE, .5 * TILE);
    ctx.fillStyle = "rgba(16,36,29,.62)";
    ctx.font = "bold 9px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("EXIT", map.exit.x * TILE, (map.exit.y + .1) * TILE);
    this.drawInteriorAmbience(ctx, map);
    ctx.restore();
    if (this.zoneBanner.timer > 0) this.drawZoneBanner(ctx, width);
  };

  proto.drawInteriorFloorPattern = function drawInteriorFloorPattern(ctx, map) {
    ctx.save();
    ctx.globalAlpha = .12;
    ctx.strokeStyle = map.trim;
    ctx.lineWidth = 1;
    for (let y = 1; y < map.height - 1; y += 1) {
      for (let x = 1; x < map.width - 1; x += 1) {
        if ((x + y) % 2 === 0) ctx.strokeRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
      }
    }
    ctx.restore();
  };

  proto.drawInteriorWindows = function drawInteriorWindows(ctx, map) {
    const count = Math.max(2, Math.floor(map.width / 9));
    for (let i = 0; i < count; i += 1) {
      const x = (3 + i * (map.width - 6) / Math.max(1, count - 1)) * TILE;
      const y = TILE * .65;
      const night = this.state.minutes >= 1080 || this.state.minutes < 360;
      ctx.fillStyle = night ? "#31466f" : this.state.weather === "Rain" ? "#7793a7" : "#9ed7e8";
      ctx.fillRect(x - 15, y, 30, 18);
      ctx.strokeStyle = map.trim;
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 15, y, 30, 18);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 18); ctx.stroke();
      if (this.state.weather === "Rain") {
        ctx.strokeStyle = "rgba(225,240,255,.7)"; ctx.lineWidth = 1;
        for (let r = -10; r <= 10; r += 7) { ctx.beginPath(); ctx.moveTo(x + r, y + 3); ctx.lineTo(x + r - 4, y + 15); ctx.stroke(); }
      }
    }
  };

  proto.drawInteriorLights = function drawInteriorLights(ctx, map) {
    for (const light of map.lights || []) {
      const gradient = ctx.createRadialGradient(light.x * TILE, light.y * TILE, 0, light.x * TILE, light.y * TILE, light.radius * TILE);
      gradient.addColorStop(0, `${light.color}88`);
      gradient.addColorStop(.35, `${light.color}33`);
      gradient.addColorStop(1, `${light.color}00`);
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = gradient;
      ctx.fillRect((light.x - light.radius) * TILE, (light.y - light.radius) * TILE, light.radius * 2 * TILE, light.radius * 2 * TILE);
      ctx.restore();
    }
  };

  proto.drawInteriorAmbience = function drawInteriorAmbience(ctx, map) {
    const time = performance.now() / 1000;
    if (map.ambience === "forge") {
      ctx.fillStyle = "rgba(255,91,38,.45)";
      for (let i = 0; i < 8; i += 1) {
        const x = (18 + ((i * 1.7 + time * .7) % 3)) * TILE;
        const y = (6 - ((i * .9 + time * 1.8) % 4)) * TILE;
        ctx.fillRect(x, y, 3, 3);
      }
    } else if (map.ambience === "stars") {
      ctx.fillStyle = "rgba(220,229,255,.7)";
      for (let i = 0; i < 18; i += 1) {
        const x = (2 + ((i * 7.3 + time * .15) % (map.width - 4))) * TILE;
        const y = (2 + ((i * 3.9) % 4)) * TILE;
        ctx.fillRect(x, y, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2);
      }
    } else if (map.ambience === "alchemy") {
      ctx.fillStyle = "rgba(128,255,220,.45)";
      for (let i = 0; i < 5; i += 1) {
        const x = (10 + i * .7) * TILE;
        const y = (8 - ((time * .8 + i) % 2)) * TILE;
        ctx.beginPath(); ctx.arc(x, y, 2 + i % 2, 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  proto.drawInteriorObject = function drawExpandedInteriorObject(ctx, object) {
    const { x, y, w, h } = objectRect(object);
    if (object.type === "shelf" || object.type === "bookshelf") {
      ctx.fillStyle = "#5b3d2f"; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#2e241f"; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
      for (let row = 1; row < object.h; row += 1) {
        ctx.fillStyle = object.type === "bookshelf" ? ["#a25b58", "#5f7da8", "#d3a54d"][row % 3] : "#d5ad68";
        ctx.fillRect(x + 5, y + row * TILE - 12, w - 10, 7);
      }
      return;
    }
    if (["seedDisplay", "produceStall", "display"].includes(object.type)) {
      ctx.fillStyle = "#79543e"; ctx.fillRect(x, y + h * .35, w, h * .65);
      ctx.fillStyle = object.type === "seedDisplay" ? "#d6b05f" : object.type === "produceStall" ? "#6fa85e" : "#c9a86d";
      for (let i = 0; i < Math.max(2, object.w); i += 1) {
        ctx.beginPath(); ctx.arc(x + 12 + i * (w - 24) / Math.max(1, object.w - 1), y + h * .35, 6, 0, Math.PI * 2); ctx.fill();
      }
      return;
    }
    if (object.type === "stove" || object.type === "forge") {
      ctx.fillStyle = object.type === "forge" ? "#3d3d42" : "#5b5148"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = object.type === "forge" ? "#f06b32" : "#c7c3ba";
      ctx.beginPath(); ctx.arc(x + w / 2, y + h * .6, Math.min(w, h) * .2 + Math.sin(performance.now() / 140) * 2, 0, Math.PI * 2); ctx.fill();
      return;
    }
    if (object.type === "anvil") {
      ctx.fillStyle = "#626a70"; ctx.fillRect(x + w * .2, y + h * .3, w * .65, h * .35); ctx.fillRect(x + w * .42, y + h * .55, w * .2, h * .45); return;
    }
    if (object.type === "cauldron") {
      ctx.fillStyle = "#2f3337"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * .58, w * .42, h * .3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#69d8bd"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * .48, w * .31, h * .13, 0, 0, Math.PI * 2); ctx.fill(); return;
    }
    if (object.type === "telescope") {
      ctx.strokeStyle = "#7f756e"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x + w * .25, y + h * .8); ctx.lineTo(x + w * .55, y + h * .35); ctx.stroke();
      ctx.fillStyle = "#4a5474"; ctx.save(); ctx.translate(x + w * .58, y + h * .32); ctx.rotate(-.45); ctx.fillRect(-w * .25, -9, w * .5, 18); ctx.restore(); return;
    }
    if (["starTable", "mapTable"].includes(object.type)) {
      ctx.fillStyle = "#674c3c"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = object.type === "starTable" ? "#5e6a94" : "#7ba087"; ctx.fillRect(x + 7, y + 7, w - 14, h - 14);
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 12, y + h * .7); ctx.lineTo(x + w * .5, y + 12); ctx.lineTo(x + w - 12, y + h * .55); ctx.stroke(); return;
    }
    if (["toolRack", "oreBin", "workbench", "herbTable", "records", "crate", "barrel", "podium", "piano", "bench"].includes(object.type)) {
      const colors = { toolRack: "#4c3a2f", oreBin: "#69645e", workbench: "#71503a", herbTable: "#52735d", records: "#596476", crate: "#8a5b36", barrel: "#765036", podium: "#6a4d3c", piano: "#3e3332", bench: "#71503a" };
      ctx.fillStyle = colors[object.type]; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#302620"; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
      if (object.type === "piano") { ctx.fillStyle = "#eee6d4"; for (let i = 0; i < object.w * 3; i += 1) ctx.fillRect(x + 5 + i * 6, y + h * .25, 4, h * .35); }
      return;
    }
    originalDrawInteriorObject.call(this, ctx, object);
  };
}
