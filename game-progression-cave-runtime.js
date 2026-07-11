export function installProgressionCaveRuntime(GameClass) {
  const proto = GameClass.prototype;
  const originalLoadCaveFloor = proto.loadCaveFloor;

  proto.loadCaveFloor = function loadCaveFloorWithPermanentMilestoneClear(floor) {
    originalLoadCaveFloor.call(this, floor);
    if (!this.currentCave || !this.state?.progression?.bossRewards?.includes(floor)) return;
    this.currentCave.monsters = this.currentCave.monsters.filter((monster) => {
      if (Number(monster.milestoneBoss) === Number(floor)) return false;
      if (Number(floor) === 50 && monster.type === "depthWarden") return false;
      return true;
    });
  };
}
