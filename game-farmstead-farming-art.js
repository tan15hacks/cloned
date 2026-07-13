import { TILE, CROPS, clamp, regionAt } from "./game-shared.js";
import { AUTOMATION_TYPES } from "./workshop-automation-data.js";
import { SHIPPING_BIN } from "./inventory-storage-data.js";
import { FARM_BUILDINGS, FARM_PROJECT_BOARD } from "./farmstead-expansion-data.js";

const FARM_REGION = "farm";
const PAINTED_PLACED_TYPES = new Set(["sprinkler", "lantern", ...AUTOMATION_TYPES]);
const CROP_STAGES = 5;

function roundedRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

function visiblePoint(point, bounds, padding = 2) {
  return point.x >= bounds.startX - padding && point.x <= bounds.endX + padding
    && point.y >= bounds.startY - padding && point.y <= bounds.endY + padding;
}

function visibleBuilding(building, bounds, padding = 2) {
  return building.x + building.w >= bounds.startX - padding
    && building.x <= bounds.endX + padding
    && building.y + building.h >= bounds.startY - padding
    && building.y <= bounds.endY + padding;
}

function onFarm(point) {
  return regionAt(Number(point.x) || 0, Number(point.y) || 0).id === FARM_REGION;
}

export function cropStageFor(cropState) {
  const crop = CROPS[cropState?.type];
  if (!crop) return 0;
  const ratio = clamp((Number(cropState.growth) || 0) / crop.days, 0, 1);
  if (ratio >= 1) return 4;
  if (ratio >= .7) return 3;
  if (ratio >= .4) return 2;
  if (ratio >= .14) return 1;
  return 0;
}

export function farmsteadFarmingArtTargets() {
  return {
    cropTypes: Object.keys(CROPS),
    placedTypes: [...PAINTED_PLACED_TYPES].sort(),
    buildings: Object.keys(FARM_BUILDINGS),
    shippingBin: { x: SHIPPING_BIN.x, y: SHIPPING_BIN.y },
    projectBoard: { x: FARM_PROJECT_BOARD.x, y: FARM_PROJECT_BOARD.y },
  };
}

function drawLeaf(ctx, x, y, rx, ry, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(27,70,42,.42)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-rx * .65, 0); ctx.lineTo(rx * .65, 0); ctx.stroke();
  ctx.restore();
}

function drawSeedMound(ctx, cx, base) {
  ctx.fillStyle = "rgba(45,30,20,.35)";
  ctx.beginPath(); ctx.ellipse(cx, base + 1, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#8c6a42";
  ctx.beginPath(); ctx.ellipse(cx, base - 1, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
}

function drawTurnip(ctx, cx, base, stage, sway) {
  if (stage === 0) { drawSeedMound(ctx, cx, base); return; }
  const height = 6 + stage * 3;
  ctx.strokeStyle = "#4f7c3a";
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(cx, base); ctx.quadraticCurveTo(cx + sway, base - height * .6, cx + sway * .6, base - height); ctx.stroke();
  const leafCount = stage + 1;
  for (let index = 0; index < leafCount; index += 1) {
    const side = index % 2 ? 1 : -1;
    const lift = Math.floor(index / 2) * 2;
    drawLeaf(ctx, cx + side * (3 + lift), base - height + 2 + lift, 5 + stage, 2.5 + stage * .35, side * .45, index % 3 ? "#63a249" : "#78b85a");
  }
  if (stage >= 4) {
    ctx.fillStyle = "#eadfd0";
    ctx.beginPath(); ctx.ellipse(cx, base - 3, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#b889ae";
    ctx.beginPath(); ctx.ellipse(cx, base - 7, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#bbaf9d"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, base + 2); ctx.lineTo(cx, base + 6); ctx.stroke();
  }
}

function drawSunberry(ctx, cx, base, stage, sway) {
  if (stage === 0) { drawSeedMound(ctx, cx, base); return; }
  const height = 7 + stage * 4;
  ctx.strokeStyle = "#416e45";
  ctx.lineWidth = 2.3;
  ctx.beginPath(); ctx.moveTo(cx, base); ctx.quadraticCurveTo(cx + sway, base - height * .55, cx + sway * .5, base - height); ctx.stroke();
  if (stage >= 2) {
    ctx.beginPath(); ctx.moveTo(cx, base - 7); ctx.lineTo(cx - 7, base - 12); ctx.moveTo(cx, base - 8); ctx.lineTo(cx + 8, base - 14); ctx.stroke();
  }
  for (let index = 0; index < stage + 2; index += 1) {
    const angle = -2.5 + index * (5 / (stage + 1));
    const radius = 5 + stage * 1.2;
    drawLeaf(ctx, cx + Math.cos(angle) * radius, base - height * .66 + Math.sin(angle) * 4, 5.5 + stage * .7, 3.2 + stage * .25, angle, index % 2 ? "#3f8958" : "#58a766");
  }
  if (stage === 3) {
    ctx.fillStyle = "#f5dc72";
    for (const [dx, dy] of [[-5,-height],[5,-height+2],[0,-height-3]]) { ctx.beginPath(); ctx.arc(cx+dx,base+dy,2.2,0,Math.PI*2); ctx.fill(); }
  }
  if (stage >= 4) {
    ctx.fillStyle = "#e45f4f";
    for (const [dx, dy] of [[-7,-height+3],[5,-height],[0,-height-6],[8,-height+7]]) { ctx.beginPath(); ctx.arc(cx+dx,base+dy,3.4,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle = "rgba(255,220,150,.42)";
    ctx.beginPath(); ctx.arc(cx - 8, base - height + 2, 1.2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawMoonbean(ctx, cx, base, stage, sway, time) {
  if (stage === 0) { drawSeedMound(ctx, cx, base); return; }
  const height = 8 + stage * 4;
  ctx.strokeStyle = "#5e64a0";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx, base);
  ctx.bezierCurveTo(cx - 7 + sway, base - height * .35, cx + 7 + sway, base - height * .7, cx + sway, base - height);
  ctx.stroke();
  for (let index = 0; index < stage + 1; index += 1) {
    const side = index % 2 ? 1 : -1;
    drawLeaf(ctx, cx + side * (4 + index), base - 6 - index * 4, 5 + stage * .5, 2.8, side * .55, index % 2 ? "#6875b7" : "#7986c9");
  }
  if (stage >= 3) {
    ctx.fillStyle = "#c8c5ff";
    for (const [dx, dy] of [[-5,-height+2],[5,-height-1]]) { ctx.beginPath(); ctx.arc(cx+dx,base+dy,2.4,0,Math.PI*2); ctx.fill(); }
  }
  if (stage >= 4) {
    ctx.shadowColor = "#bfc7ff";
    ctx.shadowBlur = 7 + Math.sin(time * 2) * 2;
    for (const [dx, dy, rotation] of [[-7,-height+5,-.45],[5,-height+2,.42],[1,-height-7,.1]]) {
      ctx.save(); ctx.translate(cx+dx,base+dy); ctx.rotate(rotation); ctx.fillStyle="#aeb8ff"; roundedRect(ctx,-3,-7,6,14,3); ctx.fill(); ctx.restore();
    }
    ctx.shadowBlur = 0;
  }
}

function drawFarmCrop(ctx, x, y, cropState) {
  const stage = cropStageFor(cropState);
  const cx = x * TILE + TILE / 2;
  const base = y * TILE + TILE - 5;
  const time = performance.now() / 900;
  const sway = Math.sin(time + x * .8 + y * .45) * Math.min(2.2, stage * .6);
  ctx.save();
  ctx.fillStyle = "rgba(20,42,27,.17)";
  ctx.beginPath(); ctx.ellipse(cx, base + 2, 7 + stage * 1.8, 3 + stage * .4, 0, 0, Math.PI * 2); ctx.fill();
  if (cropState.type === "turnip") drawTurnip(ctx, cx, base, stage, sway);
  else if (cropState.type === "berry") drawSunberry(ctx, cx, base, stage, sway);
  else if (cropState.type === "moonbean") drawMoonbean(ctx, cx, base, stage, sway, time);
  else {
    const crop = CROPS[cropState.type];
    ctx.strokeStyle = crop?.colors?.[1] || "#5f9148";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, base); ctx.lineTo(cx + sway, base - 8 - stage * 3); ctx.stroke();
  }
  ctx.restore();
}

function drawOutputBadge(ctx, x, y, amount = 1) {
  ctx.save();
  ctx.fillStyle = "#f3c95b";
  ctx.strokeStyle = "#604221";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#18352a";
  ctx.font = "bold 9px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(amount > 1 ? String(Math.min(99, amount)) : "!", x, y + 3);
  ctx.restore();
}

function drawBasicSprinkler(ctx, x, y, advanced = false) {
  const pulse = (Math.sin(performance.now() / 300 + x * .05) + 1) * .5;
  ctx.fillStyle = "rgba(18,42,33,.2)"; ctx.beginPath(); ctx.ellipse(x,y+10,14,5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = advanced ? "#62629a" : "#667b82"; roundedRect(ctx,x-6,y-7,12,19,4);ctx.fill();
  ctx.fillStyle = advanced ? "#aeb6ff" : "#9ed8e5"; roundedRect(ctx,x-14,y-12,28,6,3);ctx.fill();
  ctx.fillStyle = "#d8f3f1"; ctx.beginPath();ctx.arc(x,y-13,advanced?6:4,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle = advanced ? `rgba(194,201,255,${.22+pulse*.18})` : `rgba(185,237,247,${.18+pulse*.14})`;
  ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(x,y+1,advanced?22:15,0,Math.PI*2);ctx.stroke();
}

function drawBeeHouse(ctx, x, y, device) {
  const time = performance.now()/500;
  ctx.fillStyle="rgba(22,39,27,.2)";ctx.beginPath();ctx.ellipse(x,y+11,16,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#6d482a";roundedRect(ctx,x-14,y-15,28,27,5);ctx.fill();
  ctx.fillStyle="#bc7b35";ctx.beginPath();ctx.moveTo(x-17,y-14);ctx.lineTo(x,y-24);ctx.lineTo(x+17,y-14);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#4e301e";ctx.lineWidth=2;for(let row=0;row<3;row++){ctx.beginPath();ctx.moveTo(x-10,y-8+row*7);ctx.lineTo(x+10,y-8+row*7);ctx.stroke();}
  ctx.fillStyle="#2c2018";ctx.beginPath();ctx.ellipse(x,y+5,5,3,0,0,Math.PI*2);ctx.fill();
  for(let index=0;index<2;index++){const angle=time+index*Math.PI;const bx=x+Math.cos(angle)*18;const by=y-9+Math.sin(angle*1.7)*7;ctx.fillStyle="#efc34f";ctx.beginPath();ctx.ellipse(bx,by,3,2,angle,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#2d251c";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx,by-2);ctx.lineTo(bx,by+2);ctx.stroke();}
  if(device.output)drawOutputBadge(ctx,x+15,y-22,device.output.amount);
}

function drawSparkRod(ctx, x, y, device) {
  const pulse=(Math.sin(performance.now()/180+x)+1)*.5;
  ctx.fillStyle="rgba(20,35,31,.2)";ctx.beginPath();ctx.ellipse(x,y+11,15,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#666a73";ctx.beginPath();ctx.moveTo(x-12,y+10);ctx.lineTo(x-8,y-1);ctx.lineTo(x+9,y-1);ctx.lineTo(x+13,y+10);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#a9b7bf";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y+2);ctx.lineTo(x,y-22);ctx.stroke();
  ctx.fillStyle=device.output?"#d6d1ff":"#8ac4d3";ctx.shadowColor=device.output?"#d6d1ff":"#8ac4d3";ctx.shadowBlur=device.output?12+pulse*8:5;ctx.beginPath();ctx.moveTo(x,y-30);ctx.lineTo(x+6,y-22);ctx.lineTo(x,y-15);ctx.lineTo(x-6,y-22);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
  if(device.output){ctx.strokeStyle=`rgba(225,220,255,${.45+pulse*.4})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y-31);ctx.lineTo(x-7,y-37);ctx.lineTo(x-2,y-41);ctx.moveTo(x+1,y-31);ctx.lineTo(x+8,y-37);ctx.stroke();drawOutputBadge(ctx,x+14,y-23,device.output.amount);}
}

function drawSeedMaker(ctx, x, y, device) {
  const busy=Boolean(device.input);const ready=Boolean(device.output);
  ctx.fillStyle="rgba(20,37,27,.2)";ctx.beginPath();ctx.ellipse(x,y+12,17,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#49624f";roundedRect(ctx,x-14,y-14,28,27,5);ctx.fill();ctx.strokeStyle="#2f4034";ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle="#b78a50";ctx.beginPath();ctx.moveTo(x-10,y-15);ctx.lineTo(x+10,y-15);ctx.lineTo(x+7,y-6);ctx.lineTo(x-7,y-6);ctx.closePath();ctx.fill();
  ctx.fillStyle="#d6bb78";roundedRect(ctx,x-8,y-3,16,8,3);ctx.fill();
  ctx.fillStyle=ready?"#f1c752":busy?"#79b16b":"#26372d";ctx.beginPath();ctx.arc(x+8,y+8,3.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#d5b56f";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x-6,y+7,5,0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.moveTo(x-6+Math.cos(a)*5,y+7+Math.sin(a)*5);ctx.lineTo(x-6+Math.cos(a)*8,y+7+Math.sin(a)*8);ctx.stroke();}
  if(ready)drawOutputBadge(ctx,x+15,y-22,device.output.amount);
}

function drawLantern(ctx,x,y){const pulse=(Math.sin(performance.now()/350+x)+1)*.5;ctx.fillStyle="rgba(19,34,25,.2)";ctx.beginPath();ctx.ellipse(x,y+10,11,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#5e3d28";roundedRect(ctx,x-3,y-4,6,18,3);ctx.fill();ctx.fillStyle="#eebf50";ctx.shadowColor="#ffe398";ctx.shadowBlur=10+pulse*6;roundedRect(ctx,x-8,y-18,16,14,5);ctx.fill();ctx.fillStyle="rgba(255,249,190,.72)";roundedRect(ctx,x-4,y-15,8,8,3);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle="#473225";ctx.lineWidth=2;ctx.strokeRect(x-8,y-18,16,14);}

function drawPlacedArt(ctx, device) {
  const x=device.x*TILE;const y=device.y*TILE;ctx.save();
  if(device.type==="sprinkler"||device.type==="qualitySprinkler")drawBasicSprinkler(ctx,x,y,false);
  else if(device.type==="hearthSprinkler")drawBasicSprinkler(ctx,x,y,true);
  else if(device.type==="beeHouse")drawBeeHouse(ctx,x,y,device);
  else if(device.type==="lightningRod")drawSparkRod(ctx,x,y,device);
  else if(device.type==="seedMaker")drawSeedMaker(ctx,x,y,device);
  else if(device.type==="lantern")drawLantern(ctx,x,y);
  ctx.restore();
}

function drawProjectBoard(ctx) {
  const x=FARM_PROJECT_BOARD.x*TILE;const y=FARM_PROJECT_BOARD.y*TILE;
  ctx.save();ctx.fillStyle="rgba(18,35,24,.2)";ctx.beginPath();ctx.ellipse(x,y+18,20,6,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#654025";roundedRect(ctx,x-4,y-4,8,31,3);ctx.fill();
  ctx.fillStyle="#9b693b";roundedRect(ctx,x-23,y-24,46,27,5);ctx.fill();ctx.strokeStyle="#52311e";ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle="#d9c59a";ctx.save();ctx.translate(x-9,y-18);ctx.rotate(-.08);ctx.fillRect(-7,-4,14,11);ctx.restore();ctx.save();ctx.translate(x+9,y-14);ctx.rotate(.1);ctx.fillRect(-7,-4,14,11);ctx.restore();
  ctx.fillStyle="#d95e52";for(const [dx,dy]of[[-14,-22],[4,-19]]){ctx.beginPath();ctx.arc(x+dx,y+dy,2,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="#345e4e";ctx.font="bold 13px Trebuchet MS";ctx.textAlign="center";ctx.fillText("⌂",x,y-5);ctx.restore();
}

function drawShippingBin(ctx, count) {
  const x=SHIPPING_BIN.x*TILE;const y=SHIPPING_BIN.y*TILE;
  ctx.save();ctx.fillStyle="rgba(18,35,24,.23)";ctx.beginPath();ctx.ellipse(x,y+14,22,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#704526";roundedRect(ctx,x-20,y-14,40,31,6);ctx.fill();ctx.strokeStyle="#3f281a";ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle="#a96d36";roundedRect(ctx,x-22,y-20,44,9,4);ctx.fill();ctx.stroke();
  ctx.strokeStyle="#d3a45f";ctx.lineWidth=2;for(let px=x-13;px<=x+13;px+=13){ctx.beginPath();ctx.moveTo(px,y-11);ctx.lineTo(px,y+14);ctx.stroke();}
  ctx.fillStyle="#ead69e";ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+8,y+4);ctx.lineTo(x+3,y+4);ctx.lineTo(x+3,y+10);ctx.lineTo(x-3,y+10);ctx.lineTo(x-3,y+4);ctx.lineTo(x-8,y+4);ctx.closePath();ctx.fill();
  if(count>0)drawOutputBadge(ctx,x+21,y-21,count);ctx.restore();
}

function drawConstruction(ctx, building) {
  const x=building.x*TILE,y=building.y*TILE,w=building.w*TILE,h=building.h*TILE;
  ctx.save();ctx.fillStyle="rgba(15,32,23,.23)";ctx.fillRect(x+8,y+h-3,w-16,10);ctx.fillStyle="#8e6a46";ctx.fillRect(x+12,y+24,w-24,h-28);ctx.strokeStyle="#dfb878";ctx.lineWidth=5;
  for(let px=x+18;px<x+w;px+=38){ctx.beginPath();ctx.moveTo(px,y+7);ctx.lineTo(px,y+h);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(x+7,y+12);ctx.lineTo(x+w-7,y+h-5);ctx.moveTo(x+w-7,y+12);ctx.lineTo(x+7,y+h-5);ctx.stroke();ctx.fillStyle="#f0c35b";ctx.font="bold 12px Trebuchet MS";ctx.textAlign="center";ctx.fillText("BUILDING",x+w/2,y+h/2);ctx.restore();
}

function drawWorkshop(ctx, building) {
  const x=building.x*TILE,y=building.y*TILE,w=building.w*TILE,h=building.h*TILE;const doorX=building.door.x*TILE;
  ctx.save();ctx.fillStyle="rgba(16,34,25,.25)";ctx.beginPath();ctx.ellipse(x+w/2,y+h+4,w*.46,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#b88c5c";roundedRect(ctx,x+7,y+48,w-14,h-49,8);ctx.fill();
  ctx.strokeStyle="#70482c";ctx.lineWidth=5;for(let px=x+22;px<x+w;px+=46){ctx.beginPath();ctx.moveTo(px,y+51);ctx.lineTo(px,y+h-3);ctx.stroke();}
  ctx.fillStyle="#586b75";ctx.beginPath();ctx.moveTo(x-9,y+58);ctx.lineTo(x+w/2,y+3);ctx.lineTo(x+w+9,y+58);ctx.lineTo(x+w-4,y+76);ctx.lineTo(x+4,y+76);ctx.closePath();ctx.fill();ctx.fillStyle="#768c96";ctx.beginPath();ctx.moveTo(x+10,y+55);ctx.lineTo(x+w/2,y+14);ctx.lineTo(x+w/2,y+64);ctx.closePath();ctx.fill();
  ctx.fillStyle="#553727";roundedRect(ctx,doorX-17,y+h-54,34,54,8);ctx.fill();ctx.fillStyle="#e4b85d";ctx.beginPath();ctx.arc(doorX+9,y+h-28,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#d7c088";roundedRect(ctx,x+34,y+h-69,34,28,5);ctx.fill();ctx.strokeStyle="#5a4632";ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle="#72513a";ctx.fillRect(x+w-66,y+h-35,50,10);ctx.fillRect(x+w-61,y+h-25,6,22);ctx.fillRect(x+w-27,y+h-25,6,22);
  ctx.fillStyle="#f0c45e";ctx.beginPath();ctx.arc(x+w-40,y+h-42,6,0,Math.PI*2);ctx.fill();ctx.fillStyle="#19372b";ctx.font="bold 11px Trebuchet MS";ctx.textAlign="center";ctx.fillText("⚒",x+w/2,y+91);ctx.restore();
}

function drawGreenhouse(ctx, building, deluxe) {
  const x=building.x*TILE,y=building.y*TILE,w=building.w*TILE,h=building.h*TILE;const doorX=building.door.x*TILE;
  ctx.save();ctx.fillStyle="rgba(16,34,25,.23)";ctx.beginPath();ctx.ellipse(x+w/2,y+h+4,w*.47,12,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(133,201,205,.76)";roundedRect(ctx,x+7,y+40,w-14,h-43,7);ctx.fill();ctx.strokeStyle="#3f725d";ctx.lineWidth=5;ctx.stroke();
  ctx.fillStyle="rgba(178,229,235,.85)";ctx.beginPath();ctx.moveTo(x-5,y+45);ctx.lineTo(x+w/2,y+3);ctx.lineTo(x+w+5,y+45);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle="rgba(255,255,255,.68)";ctx.lineWidth=2;for(let px=x+28;px<x+w;px+=38){ctx.beginPath();ctx.moveTo(px,y+37);ctx.lineTo(px,y+h-6);ctx.stroke();}
  ctx.fillStyle="#3b6d56";roundedRect(ctx,doorX-18,y+h-55,36,55,7);ctx.fill();ctx.fillStyle="rgba(184,230,231,.9)";roundedRect(ctx,doorX-13,y+h-49,26,43,4);ctx.fill();ctx.strokeStyle="#f2f5dd";ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle="#4f914f";for(let px=x+28;px<x+w-24;px+=28){ctx.beginPath();ctx.arc(px,y+h-18,9,0,Math.PI*2);ctx.fill();ctx.fillStyle="#e6c55b";ctx.beginPath();ctx.arc(px+4,y+h-24,2,0,Math.PI*2);ctx.fill();ctx.fillStyle="#4f914f";}
  if(deluxe){ctx.shadowColor="#d4f1df";ctx.shadowBlur=10;ctx.strokeStyle="#d5efdf";ctx.lineWidth=3;ctx.strokeRect(x+12,y+46,w-24,h-53);ctx.shadowBlur=0;}
  ctx.fillStyle="rgba(17,47,35,.86)";roundedRect(ctx,x+w/2-60,y-18,120,18,6);ctx.fill();ctx.fillStyle="#eff6d2";ctx.font="bold 10px Trebuchet MS";ctx.textAlign="center";ctx.fillText(deluxe?"DELUXE HEARTHGLASS":"HEARTHGLASS",x+w/2,y-6);ctx.restore();
}

export function installFarmsteadFarmingArt(GameClass) {
  const proto=GameClass.prototype;
  const original={drawCrop:proto.drawCrop,drawPlaced:proto.drawPlaced,drawBuildings:proto.drawBuildings};

  proto.drawCrop=function drawFarmsteadCropArt(ctx,x,y,cropState){
    const greenhouse=this.state?.mode==="interior"&&this.state?.living?.interiorId==="greenhouse";
    const farmWorld=this.state?.mode==="world"&&regionAt(x,y).id===FARM_REGION;
    if(!greenhouse&&!farmWorld)return original.drawCrop.call(this,ctx,x,y,cropState);
    return drawFarmCrop(ctx,x,y,cropState);
  };

  proto.drawPlaced=function drawFarmsteadPlacedArt(ctx,bounds){
    const all=this.state.placed||[];
    const replacements=all.filter((entry)=>PAINTED_PLACED_TYPES.has(entry.type)&&onFarm(entry));
    this.state.placed=replacements.length?all.filter((entry)=>!replacements.includes(entry)):all;
    try{original.drawPlaced.call(this,ctx,bounds);}finally{this.state.placed=all;}
    for(const device of replacements){if(visiblePoint(device,bounds,1))drawPlacedArt(ctx,device);}
  };

  proto.drawBuildings=function drawFarmsteadServiceArt(ctx,bounds){
    original.drawBuildings.call(this,ctx,bounds);
    if(visiblePoint(FARM_PROJECT_BOARD,bounds,2))drawProjectBoard(ctx);
    if(visiblePoint(SHIPPING_BIN,bounds,2)){
      const count=Object.values(this.state.storage?.shipping?.items||{}).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
      drawShippingBin(ctx,count);
    }
    const expansion=this.state.farmExpansion;
    if(!expansion)return;
    for(const [key,building] of Object.entries(FARM_BUILDINGS)){
      if(!visibleBuilding(building,bounds,2))continue;
      const construction=expansion.project?.id===key;
      const complete=expansion.completed.includes(key)||(key==="greenhouse"&&expansion.completed.includes("greenhouseDeluxe"));
      if(!construction&&!complete)continue;
      if(construction)drawConstruction(ctx,building);
      else if(key==="workshop")drawWorkshop(ctx,building);
      else drawGreenhouse(ctx,building,expansion.completed.includes("greenhouseDeluxe"));
    }
  };
}
