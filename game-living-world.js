import {
  TILE, WORLD_W, WORLD_H, BUILDINGS, TOOLS, ITEMS,
  CAVE_W, CAVE_H, clamp, distance, randomChoice, regionAt,
  isWaterTile, buildingAtTile,
} from "./game-shared.js";
import { structureAtTile, solidDecorationAtTile } from "./world-polish-data.js";
import { INTERIOR_MAPS, CITIZEN_ROUTES, scheduleForNpc, shopIsOpen } from "./living-world-data.js";

const ACTION_DURATIONS = { hoe: .34, water: .42, axe: .34, pick: .34, seed: .28, rod: .55, sword: .24, snack: .42, interact: .25 };
const clamp01 = (value) => clamp(value, 0, 1);
const objectContains = (object, x, y) => x >= object.x && x < object.x + object.w && y >= object.y && y < object.y + object.h;

function createLivingState(existing = {}) {
  return {
    version: 1, action: null, actionTimer: 0, walkTime: 0,
    blinkTimer: 2 + Math.random() * 3, blink: 0, interiorId: null,
    worldReturn: null, citizens: [], dialogueMemory: {}, friendshipEvents: [],
    ...existing,
    citizens: Array.isArray(existing?.citizens) ? existing.citizens : [],
    dialogueMemory: existing?.dialogueMemory || {},
    friendshipEvents: Array.isArray(existing?.friendshipEvents) ? existing.friendshipEvents : [],
  };
}

function createCitizens() {
  return CITIZEN_ROUTES.map((route, index) => ({
    id: route.id, route: index, point: index % route.points.length,
    x: route.points[index % route.points.length][0], y: route.points[index % route.points.length][1],
    color: route.color, facing: "down", walkTime: index * .37,
  }));
}

function facingFromDelta(dx, dy, fallback = "down") {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  if (Math.abs(dy) > .01) return dy > 0 ? "down" : "up";
  return fallback;
}

function contextualLine(game, npc) {
  const friendship = npc.friendship || 0;
  const schedule = scheduleForNpc(npc.id, game.state.minutes, game.state.weather);
  const period = game.state.minutes < 720 ? "morning" : game.state.minutes < 1080 ? "afternoon" : "evening";
  const memories = game.state.living.dialogueMemory[npc.id] || {};
  const lines = [];
  if (schedule?.activity) lines.push(`${schedule.activity}.`);
  if (game.state.weather === "Rain") lines.push("The rain changes everyone's routine today.");
  else if (game.state.weather === "Snow") lines.push("Even Silvercrest feels quieter under the snow.");
  else if (game.state.weather === "Sparkfall") lines.push("Sparkfall nights make old stories feel true.");
  if (friendship >= 8) lines.push(`I'm glad you stopped by this ${period}. You have become someone I trust.`);
  else if (friendship >= 5) lines.push(`It is always good to see a familiar face this ${period}.`);
  if (memories.lastGiftDay === game.state.day) lines.push("I am still thinking about your thoughtful gift.");
  lines.push(randomChoice(npc.lines));
  return lines.join(" ");
}

export function installLivingWorld(GameClass) {
  const proto = GameClass.prototype;
  const original = {
    defaultState: proto.defaultState, migrateState: proto.migrateState, enterGame: proto.enterGame,
    update: proto.update, updatePlayer: proto.updatePlayer, collides: proto.collides,
    interact: proto.interact, useTool: proto.useTool, openBuildingService: proto.openBuildingService,
    drawBuildings: proto.drawBuildings, drawWorld: proto.drawWorld, render: proto.render,
    nextDay: proto.nextDay,
  };

  proto.defaultState = function defaultStateLiving() {
    const state = original.defaultState.call(this);
    state.living = createLivingState();
    state.living.citizens = createCitizens();
    return state;
  };

  proto.migrateState = function migrateStateLiving(data) {
    const state = original.migrateState.call(this, data);
    state.living = createLivingState(data?.living || state.living);
    if (!state.living.citizens.length) state.living.citizens = createCitizens();
    if (state.mode === "interior") state.mode = "world";
    state.living.interiorId = null;
    return state;
  };

  proto.enterGame = function enterGameLiving() {
    original.enterGame.call(this);
    this.state.living = createLivingState(this.state.living);
    if (!this.state.living.citizens.length) this.state.living.citizens = createCitizens();
    this.state.living.interiorId = null;
  };

  proto.startActionAnimation = function startActionAnimation(type) {
    const duration = ACTION_DURATIONS[type] || .3;
    this.state.living.action = type;
    this.state.living.actionTimer = duration;
    this.state.living.actionDuration = duration;
  };

  proto.useTool = function useToolAnimated() {
    const tool = TOOLS[this.state.selectedTool];
    if (tool) this.startActionAnimation(tool.id);
    original.useTool.call(this);
  };

  proto.updatePlayer = function updatePlayerAnimated(dt) {
    const beforeX = this.state.player.x;
    const beforeY = this.state.player.y;
    original.updatePlayer.call(this, dt);
    const moved = Math.hypot(this.state.player.x - beforeX, this.state.player.y - beforeY);
    this.state.player.moving = moved > .001;
    if (this.state.player.moving) this.state.living.walkTime += dt * 8;
  };

  proto.update = function updateLiving(dt) {
    const living = this.state.living;
    living.actionTimer = Math.max(0, living.actionTimer - dt);
    if (living.actionTimer <= 0) living.action = null;
    living.blinkTimer -= dt;
    living.blink = Math.max(0, living.blink - dt);
    if (living.blinkTimer <= 0) { living.blink = .12; living.blinkTimer = 2.2 + Math.random() * 3.8; }
    if (this.state.mode === "interior") return this.updateInterior(dt);
    original.update.call(this, dt);
    if (this.state.mode === "world") { this.updateNpcSchedules(dt); this.updateCitizens(dt); }
  };

  proto.updateInterior = function updateInterior(dt) {
    this.updatePlayer(dt);
    this.state.minutes += dt;
    if (this.state.minutes >= 1440) return this.passOut();
    if (this.justPressed.has("e") || this.justPressed.has("enter")) this.interactInterior();
    if (this.justPressed.has(" ") || this.justPressed.has("f")) this.useTool();
    this.updateCamera(); this.updateHUD(); this.updateContextHint();
  };

  proto.updateNpcSchedules = function updateNpcSchedules(dt) {
    for (const npc of this.state.npcs) {
      const target = scheduleForNpc(npc.id, this.state.minutes, this.state.weather) || npc.home;
      npc.activity = target.activity || "Going about the day";
      const dx = target.x - npc.x; const dy = target.y - npc.y; const d = Math.hypot(dx, dy);
      npc.moving = d > .12;
      if (!npc.moving) continue;
      npc.facing = facingFromDelta(dx, dy, npc.facing);
      npc.walkTime = (npc.walkTime || 0) + dt * 5.5;
      const nx = npc.x + dx / d * 1.15 * dt; const ny = npc.y + dy / d * 1.15 * dt;
      if (!this.npcWorldBlocked(nx, npc.y)) npc.x = nx;
      if (!this.npcWorldBlocked(npc.x, ny)) npc.y = ny;
    }
  };

  proto.npcWorldBlocked = function npcWorldBlocked(x, y) {
    const tx = Math.floor(x); const ty = Math.floor(y);
    return tx < 1 || ty < 1 || tx >= WORLD_W - 1 || ty >= WORLD_H - 1 || isWaterTile(tx, ty)
      || Boolean(buildingAtTile(x, y)) || Boolean(structureAtTile(tx, ty)) || Boolean(solidDecorationAtTile(tx, ty));
  };

  proto.updateCitizens = function updateCitizens(dt) {
    const rain = ["Rain", "Snow"].includes(this.state.weather);
    for (const citizen of this.state.living.citizens) {
      const route = CITIZEN_ROUTES[citizen.route];
      if (!route) continue;
      if (rain) { citizen.sheltering = true; continue; }
      citizen.sheltering = false;
      const target = route.points[citizen.point]; const dx = target[0] - citizen.x; const dy = target[1] - citizen.y; const d = Math.hypot(dx, dy);
      if (d < .15) { citizen.point = (citizen.point + 1) % route.points.length; continue; }
      citizen.facing = facingFromDelta(dx, dy, citizen.facing); citizen.walkTime += dt * 5;
      citizen.x += dx / d * .8 * dt; citizen.y += dy / d * .8 * dt;
    }
  };

  proto.collides = function collidesLiving(x, y, radius = .3) {
    if (this.state.mode !== "interior") return original.collides.call(this, x, y, radius);
    const map = INTERIOR_MAPS[this.state.living.interiorId];
    if (!map || x - radius < 1 || y - radius < 1 || x + radius >= map.width - 1 || y + radius >= map.height - 1) return true;
    const corners = [[x-radius,y-radius],[x+radius,y-radius],[x-radius,y+radius],[x+radius,y+radius]];
    return corners.some(([cx, cy]) => map.objects.some((object) => object.solid && objectContains(object, cx, cy)));
  };

  proto.enterInterior = function enterInterior(id, building) {
    const map = INTERIOR_MAPS[id]; if (!map) return;
    this.state.living.worldReturn = { x: building.door.x + .5, y: building.door.y + 1.5 };
    this.state.living.interiorId = id; this.state.mode = "interior";
    this.state.player.x = map.exit.x; this.state.player.y = map.exit.y - 1.2;
    this.camera.x = 0; this.camera.y = 0; this.showZoneBanner(map.name);
  };

  proto.leaveInterior = function leaveInterior() {
    const returnPoint = this.state.living.worldReturn || { x: 11.5, y: 14.5 };
    this.state.mode = "world"; this.state.player.x = returnPoint.x; this.state.player.y = returnPoint.y;
    this.state.living.interiorId = null; this.activeChunkSignature = "";
    this.refreshActiveWorldChunks?.(true); this.camera.x = 0; this.camera.y = 0; this.toast("Returned outside.");
  };

  proto.openBuildingService = function openBuildingLiving(building) {
    if (building.id === "farmhouse") return this.enterInterior("farmhouse", building);
    if (building.id === "guild") return this.enterInterior("guild", building);
    if (!shopIsOpen(building.service, this.state.minutes)) return this.toast(`${building.name} is closed. Check the sign beside the entrance.`);
    original.openBuildingService.call(this, building);
  };

  proto.interact = function interactLiving() {
    if (this.state.mode === "interior") return this.interactInterior();
    const player = this.state.player;
    const npc = this.state.npcs.find((entry) => distance(player, entry) < 1.5);
    if (npc) return this.talkToLivingNpc(npc);
    original.interact.call(this);
  };

  proto.interactInterior = function interactInterior() {
    const map = INTERIOR_MAPS[this.state.living.interiorId]; if (!map) return;
    const player = this.state.player;
    if (distance(player, map.exit) < 1.5) return this.leaveInterior();
    const interaction = map.interactions.find((entry) => distance(player, entry) < 1.6);
    if (!interaction) return this.toast("Nothing nearby to interact with.");
    this.startActionAnimation("interact");
    if (interaction.id === "sleep") return this.offerSleep();
    if (interaction.id === "storage") return this.showInventory();
    if (interaction.id === "journal") return this.showJournal();
    if (interaction.id === "guildDesk" || interaction.id === "guildBoard") return this.openGuild();
    if (interaction.id === "training") return this.openModal("Guild Training Notes", "<p>Face your target before swinging. Watch red telegraphs, dodge projectiles, and equip gear suited to regional status effects.</p>", [{ label: "Close", action: () => this.closeModal() }]);
  };

  proto.talkToLivingNpc = function talkToLivingNpc(npc) {
    const firstToday = npc.talkedDay !== this.state.day;
    if (firstToday) { npc.talkedDay = this.state.day; npc.friendship = clamp(npc.friendship + 1, 0, 10); this.state.questStats.talk += 1; this.checkQuests(); }
    const memory = this.state.living.dialogueMemory[npc.id] ||= {}; memory.lastTalkDay = this.state.day;
    const choices = [{ label: "Goodbye", action: () => this.closeDialogue() }];
    if ((this.state.inventory[npc.favorite] || 0) > 0) choices.unshift({ label: `Gift ${ITEMS[npc.favorite].name}`, action: () => {
      this.state.inventory[npc.favorite] -= 1; npc.friendship = clamp(npc.friendship + 2, 0, 10); memory.lastGiftDay = this.state.day;
      this.unlockFriendshipEvent(npc);
      this.showDialogue(npc, `You remembered what I like. Friendship with ${npc.name}: ${npc.friendship}/10.`, [{ label: "You're welcome", action: () => this.closeDialogue() }]);
    }});
    this.unlockFriendshipEvent(npc);
    this.showDialogue(npc, `${contextualLine(this, npc)}${firstToday ? ` Friendship: ${npc.friendship}/10.` : ""}`, choices);
  };

  proto.unlockFriendshipEvent = function unlockFriendshipEvent(npc) {
    const milestone = [3, 6, 9].find((value) => npc.friendship >= value && !this.state.living.friendshipEvents.includes(`${npc.id}:${value}`));
    if (!milestone) return;
    this.state.living.friendshipEvents.push(`${npc.id}:${milestone}`);
    const rewards = { 3: ["snack", 1], 6: ["potion", 1], 9: [npc.favorite, 2] };
    const [item, amount] = rewards[milestone]; if (ITEMS[item]) this.addItem(item, amount, false);
    this.state.journal.unshift(`${npc.name}'s friendship event (${milestone}/10): they shared a personal story and a small gift.`);
    this.toast(`Friendship event unlocked with ${npc.name}.`);
  };

  proto.drawPlayer = function drawPlayerLiving(ctx) { this.drawAnimatedCharacter(ctx, this.state.player, "#2e6f57", "", true); };

  proto.drawNPCs = function drawNpcsLiving(ctx, bounds) {
    for (const npc of this.state.npcs) {
      if (npc.x < bounds.startX - 1 || npc.x > bounds.endX + 1 || npc.y < bounds.startY - 1 || npc.y > bounds.endY + 1) continue;
      this.drawAnimatedCharacter(ctx, npc, npc.color, npc.name, false);
    }
    for (const citizen of this.state.living.citizens) {
      if (citizen.sheltering || citizen.x < bounds.startX - 1 || citizen.x > bounds.endX + 1 || citizen.y < bounds.startY - 1 || citizen.y > bounds.endY + 1) continue;
      this.drawAnimatedCharacter(ctx, citizen, citizen.color, "", false, true);
    }
  };

  proto.drawAnimatedCharacter = function drawAnimatedCharacter(ctx, entity, color, name, player = false, citizen = false) {
    const moving = Boolean(entity.moving); const walk = moving ? Math.sin((entity.walkTime || this.state.living.walkTime) * 1.8) : 0;
    const bob = moving ? Math.abs(Math.sin((entity.walkTime || 0) * 1.8)) * 2 : Math.sin(performance.now() / 700 + entity.x) * .6;
    const px = entity.x * TILE; const py = entity.y * TILE - bob; const facing = entity.facing || "down";
    const blink = player ? this.state.living.blink > 0 : Math.floor((performance.now() / 120 + entity.x * 7) % 47) === 0;
    ctx.save(); ctx.fillStyle = "rgba(16,36,29,.22)"; ctx.beginPath(); ctx.ellipse(px, entity.y * TILE + 12, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#3c2e29"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px - 4, py + 10); ctx.lineTo(px - 5 - walk * 3, py + 17); ctx.moveTo(px + 4, py + 10); ctx.lineTo(px + 5 + walk * 3, py + 17); ctx.stroke();
    ctx.fillStyle = color; ctx.fillRect(px - 9, py - 7, 18, 21); ctx.strokeStyle = color; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(px - 8, py - 2); ctx.lineTo(px - 12 + walk * 4, py + 7); ctx.moveTo(px + 8, py - 2); ctx.lineTo(px + 12 - walk * 4, py + 7); ctx.stroke();
    ctx.fillStyle = citizen ? "#d7b28b" : "#e9c7a0"; ctx.beginPath(); ctx.arc(px, py - 13, citizen ? 8 : 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#10241d"; if (!blink && facing !== "up") { ctx.fillRect(px - 5, py - 15, 3, 3); ctx.fillRect(px + 2, py - 15, 3, 3); } else if (blink) { ctx.fillRect(px - 5, py - 14, 3, 1); ctx.fillRect(px + 2, py - 14, 3, 1); }
    if (player && this.state.living.actionTimer > 0) this.drawToolAction(ctx, px, py, facing);
    if (this.state.weather === "Rain" && !player) { ctx.strokeStyle = "#3e465a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py - 21); ctx.lineTo(px, py + 2); ctx.stroke(); ctx.fillStyle = "#6b83a6"; ctx.beginPath(); ctx.arc(px, py - 21, 16, Math.PI, 0); ctx.fill(); }
    if (name) { ctx.font = "bold 10px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillStyle = "#fff1c8"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 3; ctx.strokeText(name, px, py - 30); ctx.fillText(name, px, py - 30); }
    ctx.restore();
  };

  proto.drawToolAction = function drawToolAction(ctx, px, py, facing) {
    const action = this.state.living.action; const duration = this.state.living.actionDuration || .3;
    const progress = 1 - this.state.living.actionTimer / duration; const vectors = { up:[0,-1],down:[0,1],left:[-1,0],right:[1,0] };
    const [dx,dy] = vectors[facing] || vectors.down; const sideX = -dy; const sideY = dx; const swing = Math.sin(progress * Math.PI);
    ctx.save(); ctx.translate(px + dx * 12 + sideX * swing * 8, py + dy * 11 + sideY * swing * 8); ctx.rotate(Math.atan2(dy, dx) + swing * .8 - .4);
    if (action === "water") { ctx.fillStyle = "#6f8b98"; ctx.fillRect(-6,-5,13,10); ctx.fillStyle = "#8ec6d8"; ctx.fillRect(6,-2,10,4); ctx.fillStyle = "rgba(120,200,235,.75)"; for (let i=0;i<3;i++) ctx.fillRect(15+i*4, i*2, 3, 3); }
    else if (action === "seed") { ctx.fillStyle = "#7a552f"; ctx.beginPath(); ctx.arc(4,0,5,0,Math.PI*2); ctx.fill(); }
    else if (action === "snack") { ctx.fillStyle = "#efb94a"; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill(); }
    else if (action === "rod") { ctx.strokeStyle = "#755235"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(22,0); ctx.stroke(); ctx.strokeStyle = "#cde8ef"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(22,0); ctx.lineTo(25,18); ctx.stroke(); }
    else { ctx.strokeStyle = "#6b4c32"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(10,0); ctx.stroke(); ctx.fillStyle = action === "sword" ? "#d9e3e6" : "#7b858a"; ctx.fillRect(8,-6,10,12); }
    ctx.restore();
  };

  proto.drawBuildings = function drawBuildingsLiving(ctx, bounds) {
    original.drawBuildings.call(this, ctx, bounds);
    for (const building of BUILDINGS) {
      if (!building.service || building.x + building.w < bounds.startX || building.x > bounds.endX || building.y + building.h < bounds.startY || building.y > bounds.endY) continue;
      const open = shopIsOpen(building.service, this.state.minutes); const x = (building.door.x + .5) * TILE; const y = (building.door.y + .5) * TILE;
      ctx.save(); ctx.fillStyle = open ? "#5aa65c" : "#8b4e3f"; ctx.strokeStyle = "#10241d"; ctx.lineWidth = 2; ctx.fillRect(x + 13, y - 34, 34, 15); ctx.strokeRect(x + 13, y - 34, 34, 15);
      ctx.fillStyle = "#fff1c8"; ctx.font = "bold 8px Trebuchet MS"; ctx.textAlign = "center"; ctx.fillText(open ? "OPEN" : "CLOSED", x + 30, y - 23); ctx.restore();
    }
  };

  proto.drawWorld = function drawWorldLiving(ctx) {
    original.drawWorld.call(this, ctx); const night = clamp01((this.state.minutes - 1080) / 240);
    if (night <= 0) return;
    const bounds = this.visibleBounds(WORLD_W, WORLD_H);
    for (let y=bounds.startY;y<bounds.endY;y+=1) for (let x=bounds.startX;x<bounds.endX;x+=1) if (regionAt(x,y).safe && (x*13+y*19)%41===0) {
      ctx.save(); ctx.globalAlpha = night; ctx.shadowColor="#ffd77a"; ctx.shadowBlur=18; ctx.fillStyle="#f4c867"; ctx.beginPath(); ctx.arc((x+.5)*TILE,(y+.5)*TILE-8,4,0,Math.PI*2); ctx.fill(); ctx.restore();
    }
  };

  proto.render = function renderLiving() {
    if (this.running && this.state?.mode === "interior") return this.renderInterior();
    original.render.call(this);
  };

  proto.renderInterior = function renderInterior() {
    const ctx = this.ctx; const width = this.screen.width; const map = INTERIOR_MAPS[this.state.living.interiorId];
    ctx.save(); ctx.setTransform(this.screen.dpr,0,0,this.screen.dpr,0,0); ctx.clearRect(0,0,width,this.screen.height); ctx.translate(-Math.floor(this.camera.x),-Math.floor(this.camera.y));
    ctx.fillStyle = map.wall; ctx.fillRect(0,0,map.width*TILE,map.height*TILE); ctx.fillStyle = map.floor; ctx.fillRect(TILE,TILE,(map.width-2)*TILE,(map.height-2)*TILE);
    ctx.strokeStyle = map.trim; ctx.lineWidth = 4; for (let y=1;y<map.height-1;y++) for (let x=1;x<map.width-1;x++) ctx.strokeRect(x*TILE,y*TILE,TILE,TILE);
    for (const object of map.objects) this.drawInteriorObject(ctx, object);
    for (const interaction of map.interactions) { ctx.fillStyle = "rgba(255,241,200,.15)"; ctx.beginPath(); ctx.arc(interaction.x*TILE,interaction.y*TILE,13,0,Math.PI*2); ctx.fill(); }
    if (map.residents) for (const resident of map.residents) { const npc = this.state.npcs.find((entry)=>entry.id===resident.id); if (npc) this.drawAnimatedCharacter(ctx,{...npc,x:resident.x,y:resident.y,moving:false},npc.color,npc.name,false); }
    this.drawAnimatedCharacter(ctx,this.state.player,"#2e6f57","",true); ctx.fillStyle="#f2d59d"; ctx.fillRect((map.exit.x-.65)*TILE,(map.exit.y-.25)*TILE,1.3*TILE,.5*TILE); ctx.restore();
    if (this.zoneBanner.timer > 0) this.drawZoneBanner(ctx,width);
  };

  proto.drawInteriorObject = function drawInteriorObject(ctx, object) {
    const x=object.x*TILE,y=object.y*TILE,w=object.w*TILE,h=object.h*TILE;
    if (object.type === "rug") { ctx.fillStyle="#7d4f5d"; ctx.fillRect(x,y,w,h); ctx.strokeStyle="#e1b56f"; ctx.strokeRect(x+4,y+4,w-8,h-8); return; }
    if (object.type === "bed") { ctx.fillStyle="#79543e"; ctx.fillRect(x,y,w,h); ctx.fillStyle="#d9c7a0"; ctx.fillRect(x+5,y+5,w-10,h-10); ctx.fillStyle="#66859b"; ctx.fillRect(x+5,y+5,w*.38,h-10); return; }
    if (object.type === "hearth") { ctx.fillStyle="#5b4b43"; ctx.fillRect(x,y,w,h); ctx.fillStyle="#ef7b35"; ctx.beginPath(); ctx.arc(x+w/2,y+h*.62,10+Math.sin(performance.now()/120)*2,0,Math.PI*2); ctx.fill(); return; }
    if (object.type === "banner") { ctx.fillStyle="#8b3f43"; ctx.fillRect(x,y,w,h); ctx.fillStyle="#efb94a"; ctx.fillRect(x+w*.45,y,5,h); return; }
    ctx.fillStyle = object.type === "counter" ? "#6b4935" : object.type === "board" ? "#554638" : object.type === "chest" ? "#8b5c2f" : "#79543e"; ctx.fillRect(x,y,w,h); ctx.strokeStyle="#3e2d26"; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
  };

  proto.nextDay = function nextDayLiving(passedOut) {
    if (this.state.mode === "interior") this.leaveInterior();
    original.nextDay.call(this, passedOut); this.state.living.action = null; this.state.living.actionTimer = 0;
  };
}
