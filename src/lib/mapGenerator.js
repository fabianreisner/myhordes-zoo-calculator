/**
 * Map generation logic for the zombie simulator
 * Based on MapMaker.php from MyHordes
 */

import { Zone } from './types.js';
import { randomInt, shuffleArray, drawRandom, getTotalZombies } from './utils.js';
import { runSpreadCycle } from './zombieSpread.js';

/**
 * Generates an empty map with just the town
 * @param {number} size - Map size (25, 26, or 27)
 * @param {number} originX - X offset for town (0 = centered)
 * @param {number} originY - Y offset for town (0 = centered)
 * @returns {Map} Map of zones with key "x,y"
 */
export function generateEmptyMap(size, originX = 0, originY = 0) {
  const zones = new Map();
  const offset = Math.floor(size / 2);

  // Create all zones (empty, no zombies, no buildings)
  for (let x = -offset; x <= offset; x++) {
    for (let y = -offset; y <= offset; y++) {
      const zone = new Zone(x - originX, y - originY);
      zones.set(zone.key, zone);
    }
  }

  return zones;
}

/**
 * Generates a new map with the given size and configuration
 * @param {number} size - Map size (25, 26, or 27)
 * @param {SimulationConfig} config - Configuration object
 * @param {number} originX - X offset for town (0 = centered)
 * @param {number} originY - Y offset for town (0 = centered)
 * @returns {Map} Map of zones with key "x,y"
 */
export function generateMap(size, config, originX = 0, originY = 0) {
  const zones = new Map();
  const offset = Math.floor(size / 2);

  // Create all zones
  // Coordinates are relative to origin (originX, originY)
  for (let x = -offset; x <= offset; x++) {
    for (let y = -offset; y <= offset; y++) {
      const zone = new Zone(x - originX, y - originY);
      zones.set(zone.key, zone);
    }
  }

  // Place ruins
  placeRuins(zones, config);

  // Place initial zombies
  placeInitialZombies(zones, config);

  return zones;
}

/**
 * Places ruins on the map
 * Based on MapMaker.php:61-143
 */
function placeRuins(zones, config) {
  const allZones = Array.from(zones.values());
  
  // Filter zones that are valid for ruin placement
  // Must be within min/max distance range and not the town
  const validZones = allZones.filter(zone => {
    const km = zone.distance;
    return km !== 0 && 
           km >= config.minRuinDistance && 
           km <= config.maxRuinDistance;
  });

  // Shuffle and pick N zones for ruins
  const ruinZones = shuffleArray(validZones).slice(0, config.ruinCount);

  ruinZones.forEach(zone => {
    zone.isRuin = true;
    zone.hasBuilding = true;
  });

  // Note: The PHP code has more complex co-location logic to prevent
  // ruins from being too close to each other. For simplicity, we're
  // using random placement. This can be enhanced later if needed.
}

/**
 * Places initial zombies on the map
 * Based on MapMaker.php:238-310 (initialZombieSpawn)
 */
function placeInitialZombies(zones, config) {
  const allZones = Array.from(zones.values());

  // Step 1: Ruins get zombies based on distance
  const ruinZones = allZones.filter(z => z.isRuin);
  
  ruinZones.forEach(zone => {
    const base = zone.distance;
    const variance = 0.2;
    const min = Math.floor(base * (1 - variance));
    const max = Math.ceil(base * (1 + variance));
    zone.zombies = Math.max(1, randomInt(min, max));
  });

  // Step 2: Random spawn zones get 0-2 zombies
  const emptyZones = allZones.filter(z => 
    !z.isTown && 
    !z.isRuin && 
    z.distance >= config.freeSpawnDist
  );

  const spawnZones = drawRandom(emptyZones, config.freeSpawnCount);
  
  spawnZones.forEach(zone => {
    // On EASY difficulty, zones closer than 3km don't get zombies
    if (config.townType !== 'EASY' || zone.distance >= 3) {
      zone.zombies = randomInt(0, 2);
    }
  });

  // Step 3: Set initial values for all zones
  zones.forEach(zone => {
    zone.initialZombies = zone.zombies;
    zone.startZombies = zone.zombies;
    zone.scoutEstimationOffset = randomInt(-2, 2);
    zone.playerDeaths = 0;
  });

  // Step 4: Run initial spread cycles (2 for MyHordes)
  const initialCycles = config.governor === 'Hordes' ? 3 : 2;
  for (let i = 0; i < initialCycles; i++) {
    runSpreadCycle(zones, false, true);
  }

  // Step 5: Ensure minimum zombie count
  // Keep spreading until we reach minimum threshold
  let attempts = 0;
  let totalZombies = getTotalZombies(zones);
  const minZombies = 1 * config.respawnThreshold * config.respawnFactor;

  while (totalZombies < minZombies && attempts < 3) {
    runSpreadCycle(zones, false, true);
    totalZombies = getTotalZombies(zones);
    attempts++;
  }

  // Step 6: Update startZombies to reflect post-spread values
  // initialZombies stays as the original pre-spread value for Day 1
  zones.forEach(zone => {
    zone.startZombies = zone.zombies;
    // initialZombies is already set correctly in Step 3, don't change it
  });
}

/**
 * Resets the map to a new random configuration
 */
export function resetMap(state) {
  const newZones = generateMap(state.size, state.config);
  state.zones = newZones;
  state.day = 1;
  state.history = [];
  state.selectedZone = null;
}
