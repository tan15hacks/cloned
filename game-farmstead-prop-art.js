import { TILE, BUILDINGS, regionAt } from "./game-shared.js";

const FARM = "farm";
const TREE_TYPES = new Set(["tree", "fruitTree"]);
const ROCK_TYPES = new Set(["rock"]);

function onFarm(point) {
  return regionAt(point.x, point.y).id === FARM;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawFarmTree(ctx, resource) {
  const x = resource.x * TILE;
  const y = resource.y * TILE;
  ctx.save();
  ctx.fillStyle = "rgba(18,36,24,.24)";
  ctx.beginPath(); ctx.ellipse(x, y + 12, 27, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#654029";
  roundedRect(ctx, x - 6, y - 12, 12, 31, 5); ctx.fill();
  ctx.fillStyle = "#8a5a32";
  roundedRect(ctx, x - 3, y - 11, 4, 28, 2); ctx.fill();
  const clusters = [
    [-18,-25,17,"#477d39"], [0,-34,21,"#559243"], [19,-24,18,"#3f7335"],
    [-10,-11,20,"#4e873e"], [12,-9,21,"#397033"], [0,-21,24,"#5b9847"],
  ];
  for (const [dx, dy, radius, color] of clusters) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x + dx, y + dy, radius, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "rgba(235,247,170,.24)";
  ctx.beginPath(); ctx.arc(x - 9, y - 34, 12, 0, Math.PI * 2); ctx.fill();
  if (resource.type === "fruitTree") {
    ctx.fillStyle = "#d9604c";
    for (const [dx,dy] of [[-15,-23],[7,-36],[18,-17],[-2,-10]]) { ctx.beginPath(); ctx.arc(x+dx,y+dy,3,0,Math.PI*2); ctx.fill(); }
  }
  ctx.restore();
}

function drawFarmRock(ctx, resource) {
  const x = resource.x * TILE;
  const y = resource.y * TILE;
  ctx.save();
  ctx.fillStyle = "rgba(22,35,27,.22)";
  ctx.beginPath(); ctx.ellipse(x, y + 11, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#737a72";
  ctx.beginPath(); ctx.moveTo(x-18,y+9); ctx.lineTo(x-15,y-7); ctx.lineTo(x-5,y-16); ctx.lineTo(x+11,y-12); ctx.lineTo(x+18,y+6); ctx.lineTo(x+8,y+13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#92998e";
  ctx.beginPath(); ctx.moveTo(x-12,y-6); ctx.lineTo(x-4,y-13); ctx.lineTo(x+8,y-10); ctx.lineTo(x+2,y-2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#555b55"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x+2,y-2); ctx.lineTo(x+8,y+7); ctx.lineTo(x+14,y+4); ctx.stroke();
  ctx.restore();
}

function drawFarmCrate(ctx, decor) {
  const x = (decor.x + .5) * TILE;
  const y = (decor.y + .5) * TILE;
  ctx.save();
  ctx.fillStyle = "rgba(20,30,22,.2)"; ctx.fillRect(x-10,y+8,22,5);
  ctx.fillStyle = "#9c6736"; roundedRect(ctx,x-11,y-10,22,22,3); ctx.fill();
  ctx.strokeStyle = "#5b3823"; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x-9,y-8); ctx.lineTo(x+9,y+10); ctx.moveTo(x+9,y-8); ctx.lineTo(x-9,y+10); ctx.stroke();
  ctx.strokeStyle = "#d09a57"; ctx.beginPath(); ctx.moveTo(x-7,y-7); ctx.lineTo(x+7,y-7); ctx.stroke();
  ctx.restore();
}

function drawFarmFence(ctx, structure) {
  const x = structure.x * TILE;
  const y = structure.y * TILE;
  const w = structure.w * TILE;
  const h = structure.h * TILE;
  ctx.save();
  ctx.fillStyle = "rgba(21,32,24,.18)";
  if (structure.type === "fenceH") ctx.fillRect(x, y + 24, w, 6); else ctx.fillRect(x + 24, y, 6, h);
  ctx.fillStyle = "#81512d";
  ctx.strokeStyle = "#4d301e"; ctx.lineWidth = 2;
  if (structure.type === "fenceH") {
    for (let px = x; px < x + w; px += TILE) {
      roundedRect(ctx, px + 2, y + 7, TILE - 4, 7, 3); ctx.fill(); ctx.stroke();
      roundedRect(ctx, px + 2, y + 19, TILE - 4, 7, 3); ctx.fill(); ctx.stroke();
    }
    for (let px = x; px <= x + w; px += TILE * 2) { roundedRect(ctx, px - 3, y + 2, 8, 29, 3); ctx.fill(); ctx.stroke(); }
  } else {
    for (let py = y; py < y + h; py += TILE) {
      roundedRect(ctx, x + 7, py + 2, 7, TILE - 4, 3); ctx.fill(); ctx.stroke();
      roundedRect(ctx, x + 19, py + 2, 7, TILE - 4, 3); ctx.fill(); ctx.stroke();
    }
    for (let py = y; py <= y + h; py += TILE * 2) { roundedRect(ctx, x + 2, py - 3, 29, 8, 3); ctx.fill(); ctx.stroke(); }
  }
  ctx.restore();
}

function drawFarmhouse(ctx, building) {
  const x = building.x * TILE;
  const y = building.y * TILE;
  const w = building.w * TILE;
  const h = building.h * TILE;
  ctx.save();
  ctx.fillStyle = "rgba(12,28,20,.26)"; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+3,w*.48,14,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#a79370"; ctx.fillRect(x+4,y+h-13,w-8,13);
  ctx.fillStyle = "#e4c992"; roundedRect(ctx,x+8,y+64,w-16,h-65,8); ctx.fill();
  ctx.fillStyle = "#47749a";
  ctx.beginPath(); ctx.moveTo(x-10,y+72); ctx.lineTo(x+w/2,y+5); ctx.lineTo(x+w+10,y+72); ctx.lineTo(x+w-5,y+92); ctx.lineTo(x+5,y+92); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#6e9abd";
  ctx.beginPath(); ctx.moveTo(x+7,y+69); ctx.lineTo(x+w/2,y+15); ctx.lineTo(x+w/2,y+78); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(35,60,80,.5)"; ctx.lineWidth=3;
  for(let py=y+34;py<y+86;py+=12){ctx.beginPath();ctx.moveTo(x+15,py);ctx.lineTo(x+w-15,py);ctx.stroke();}
  const doorX=(building.door.x+.5)*TILE;
  ctx.fillStyle="#6b4129"; roundedRect(ctx,doorX-15,y+h-51,30,51,10);ctx.fill();
  ctx.fillStyle="#d8a757";ctx.beginPath();ctx.arc(doorX+8,y+h-25,2.5,0,Math.PI*2);ctx.fill();
  for(const wx of [x+48,x+w-70]){ctx.fillStyle="#5c86a5";roundedRect(ctx,wx,y+h-62,28,28,5);ctx.fill();ctx.strokeStyle="#f3dfaa";ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.moveTo(wx+14,y+h-60);ctx.lineTo(wx+14,y+h-36);ctx.moveTo(wx+2,y+h-48);ctx.lineTo(wx+26,y+h-48);ctx.stroke();}
  ctx.fillStyle="#8a5940";ctx.fillRect(x+w-53,y+15,20,45);ctx.fillStyle="#b47a55";ctx.fillRect(x+w-57,y+10,28,10);
  ctx.fillStyle="#488346";for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(x+38+i*8,y+h-13-(i%2)*4,7,0,Math.PI*2);ctx.fill();}
  ctx.font="bold 12px Trebuchet MS";ctx.textAlign="center";ctx.fillStyle="#fff1c8";ctx.strokeStyle="#173326";ctx.lineWidth=4;ctx.strokeText(building.name,x+w/2,y+105);ctx.fillText(building.name,x+w/2,y+105);
  ctx.restore();
}

export function installFarmsteadPropArt(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    drawResource: proto.drawResource,
    drawBuildings: proto.drawBuildings,
    drawWorldDecorations: proto.drawWorldDecorations,
    drawAuthoredStructures: proto.drawAuthoredStructures,
  };

  proto.drawResource = function drawFarmsteadResourceArt(ctx, resource) {
    if (onFarm(resource) && TREE_TYPES.has(resource.type)) return drawFarmTree(ctx, resource);
    if (onFarm(resource) && ROCK_TYPES.has(resource.type)) return drawFarmRock(ctx, resource);
    return original.drawResource.call(this, ctx, resource);
  };

  proto.drawBuildings = function drawFarmsteadBuildingArt(ctx, bounds) {
    const farmhouse = BUILDINGS.find((entry) => entry.id === "farmhouse");
    const hideFarmhouse = farmhouse && farmhouse.x + farmhouse.w >= bounds.startX && farmhouse.x <= bounds.endX && farmhouse.y + farmhouse.h >= bounds.startY && farmhouse.y <= bounds.endY;
    if (!hideFarmhouse) return original.drawBuildings.call(this, ctx, bounds);
    const originalBuildings = BUILDINGS.filter((entry) => entry.id !== "farmhouse");
    const saved = BUILDINGS.slice();
    BUILDINGS.splice(0, BUILDINGS.length, ...originalBuildings);
    try { original.drawBuildings.call(this, ctx, bounds); } finally { BUILDINGS.splice(0, BUILDINGS.length, ...saved); }
    drawFarmhouse(ctx, farmhouse);
  };

  proto.drawWorldDecorations = function drawFarmsteadDecorationsArt(ctx, decorations, solidLayer) {
    const replacements = decorations.filter((decor) => decor.type === "crate" && regionAt(decor.x, decor.y).id === FARM);
    const remaining = replacements.length ? decorations.filter((decor) => !replacements.includes(decor)) : decorations;
    original.drawWorldDecorations.call(this, ctx, remaining, solidLayer);
    for (const decor of replacements) drawFarmCrate(ctx, decor);
  };

  proto.drawAuthoredStructures = function drawFarmsteadStructuresArt(ctx, bounds) {
    const originalStructures = globalThis.__hearthvaleAuthoredStructures;
    original.drawAuthoredStructures.call(this, ctx, bounds);
    // Overlay richer Farmstead fence art without changing collision geometry.
    const structures = this.getFarmsteadFenceStructures?.() || [];
    for (const structure of structures) drawFarmFence(ctx, structure);
  };
}
