/**
 * Zone class - represents a single map cell
 * Matches the PHP Zone entity structure
 */
export class Zone {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.zombies = 0;
    this.initialZombies = 0;  // Zombies at start of current day
    this.startZombies = 0;     // Zombies at Day 1 (for respawn)
    this.hasBuilding = false;
    this.isRuin = false;
    this.isExplorableRuin = false;
    this.isTown = (x === 0 && y === 0);
    this.scoutEstimationOffset = 0;
    this.playerDeaths = 0;
    this.discoveryStatus = 'current'; // 'current', 'past', 'never'
    this.zombieStatus = 'exact'; // 'exact', 'estimate', 'unknown'
  }

  /**
   * Calculates despair value for this zone
   * Despair = floor(max(0, (initialZombies - currentZombies - 1) / 2))
   * This is used to resist re-infestation of cleared zones
   */
  get despair() {
    return Math.floor(Math.max(0, (this.initialZombies - this.zombies - 1) / 2));
  }

  /**
   * Euclidean distance from town (0,0)
   */
  get distance() {
    return Math.round(Math.sqrt(this.x * this.x + this.y * this.y));
  }

  /**
   * Number of zombies killed on this zone today
   */
  get killed() {
    return Math.max(0, this.initialZombies - this.zombies);
  }

  /**
   * Gets the danger level (0-4) based on zombie count
   * Used for CSS class assignment
   * 0: No zombies (dark green)
   * 1: 1-2 zombies (light green)
   * 2: 3-5 zombies (brown)
   * 3: 6-9 zombies (deep red)
   * 4: 10+ zombies (blue)
   */
  getDangerLevel() {
    if (this.zombies === 0) return 0;
    if (this.zombies <= 2) return 1;
    if (this.zombies <= 5) return 2;
    if (this.zombies <= 9) return 3;
    return 4;
  }

  /**
   * Creates a copy of this zone
   */
  clone() {
    const clone = new Zone(this.x, this.y);
    Object.assign(clone, this);
    return clone;
  }

  /**
   * Returns a unique key for this zone
   */
  get key() {
    return `${this.x},${this.y}`;
  }
}

/**
 * Configuration for the simulation
 */
export class SimulationConfig {
  constructor() {
    // Respawn parameters (from TownSetting.php defaults)
    this.respawnThreshold = 50;    // OptModifierRespawnThreshold
    this.respawnFactor = 0.5;      // OptModifierRespawnFactor
    
    // Initial spawn parameters (from TownSetting.php defaults)
    this.freeSpawnDist = 0;        // MapParamsFreeSpawnDist - Minimum distance for random spawns
    this.freeSpawnCount = 3;       // MapParamsFreeSpawnCount - Number of random spawn zones
    this.ruinCount = 10;           // Number of ruins to place (game uses 0 by default, but we want to see spread)
    this.minRuinDistance = 1;      // Min km for ruins
    this.maxRuinDistance = 10;     // Max km for ruins
    
    // Spawn governor type
    this.governor = 'MyHordes';    // 'MyHordes' or 'Hordes'
    
    // Town type (affects initial spawns)
    this.townType = 'NORMAL';      // 'EASY', 'NORMAL', 'HARD'
  }
}

/**
 * Main simulation state container
 */
export class SimulationState {
  constructor(size = 25) {
    this.size = size;
    this.day = 1;
    this.zones = new Map(); // key: "x,y", value: Zone
    this.history = [];      // Array of historical states
    this.config = new SimulationConfig();
    this.selectedZone = null;
    this.originX = 0;       // Offset for town X position
    this.originY = 0;       // Offset for town Y position
  }

  /**
   * Gets a zone by coordinates
   */
  getZone(x, y) {
    return this.zones.get(`${x},${y}`);
  }

  /**
   * Sets a zone
   */
  setZone(zone) {
    this.zones.set(zone.key, zone);
  }

  /**
   * Gets all zones as an array
   */
  getAllZones() {
    return Array.from(this.zones.values());
  }

  /**
   * Gets total zombie count across all zones
   */
  getTotalZombies() {
    return this.getAllZones().reduce((sum, zone) => sum + zone.zombies, 0);
  }

  /**
   * Checks if current zombie count is above minimum threshold
   */
  isAboveMinimumZombies() {
    const total = this.getTotalZombies();
    const threshold = this.day * this.config.respawnThreshold * this.config.respawnFactor;
    return total >= threshold;
  }

  /**
   * Gets minimum zombie threshold for current day
   */
  getMinimumZombieThreshold() {
    return this.day * this.config.respawnThreshold * this.config.respawnFactor;
  }

  /**
   * Creates a snapshot of current state for history
   */
  createSnapshot() {
    return {
      day: this.day,
      totalZombies: this.getTotalZombies(),
      zones: new Map(
        Array.from(this.zones.entries()).map(([key, zone]) => [key, zone.clone()])
      )
    };
  }

  /**
   * Saves current state to history
   */
  saveToHistory() {
    this.history.push(this.createSnapshot());
  }

  /**
   * Restores state from a historical snapshot
   */
  restoreFromSnapshot(snapshot) {
    this.day = snapshot.day;
    this.zones = new Map(
      Array.from(snapshot.zones.entries()).map(([key, zone]) => [key, zone.clone()])
    );
  }
}
