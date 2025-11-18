/**
 * Zombie spread algorithm implementation
 * Based on MapMaker.php spreadCycleMH (lines 373-448)
 */

import { 
  randomInt, 
  chance, 
  getNeighbors, 
  createZombieSnapshot, 
  createDespairSnapshot,
  getTotalZombies 
} from './utils.js';

/**
 * Runs one spread cycle using the MyHordes algorithm
 * This is the core of the zombie spread mechanics
 * 
 * @param {Map} zones - Map of all zones
 * @param {Map} despairDb - Frozen snapshot of despair values (from start of day)
 * @param {boolean} observeDespair - If true, skip zones with despair > 0
 * @param {boolean} diagonalSpawn - If true, include diagonal neighbors (Day 2+)
 * @returns {number} Total number of zombies added this cycle
 */
export function runSpreadCycle(zones, despairDb, observeDespair = false, diagonalSpawn = true) {
  // Create snapshot of current state before any changes
  const zoneDb = createZombieSnapshot(zones);
  
  let cycleResult = 0;

  // Iterate over all zones
  zones.forEach((zone, key) => {
    // Skip town zone
    if (zone.isTown) return;
    
    // Skip zones with despair if observing despair
    // Use FROZEN despair value from start of day
    const zoneDespair = despairDb.get(key) || 0;
    if (observeDespair && zoneDespair > 0) return;

    const before = zoneDb.get(key) || 0;
    let newZombies = before;

    if (before > 0) {
      // === ZONES WITH ZOMBIES ===
      // MapMaker.php:405-409
      // 90% chance: add 1 zombie
      // 10% chance: 50/50 between 0 or 2 zombies
      if (chance(0.9)) {
        newZombies += 1;
      } else {
        newZombies += chance(0.5) ? 0 : 2;
      }
    } else {
      // === EMPTY ZONES ===
      // Complex calculation based on neighbors
      newZombies = calculateEmptyZoneSpawn(zone, zones, zoneDb, diagonalSpawn);
    }

    zone.zombies = newZombies;
    cycleResult += (newZombies - before);
  });

  return cycleResult;
}

/**
 * Calculates zombie spawn for empty zones
 * Based on MapMaker.php:410-444
 * 
 * This is the complex logic that creates realistic spread patterns
 */
function calculateEmptyZoneSpawn(zone, zones, zoneDb, diagonalSpawn) {
  const neighbors = getNeighbors(zone, zones, diagonalSpawn);
  
  // Count neighboring zone statistics
  let adjZonesTotal = 0;
  let adjZonesInfected = 0;
  let directAdjZonesInfected = 0;
  let neighboringZombies = 0;
  let maxNeighboringZombies = 0;

  const currentZombies = zoneDb.get(zone.key) || 0;

  neighbors.forEach(({ neighbor, isDirect }) => {
    if (!neighbor) return;
    
    const zombies = zoneDb.get(neighbor.key) || 0;
    adjZonesTotal++;
    neighboringZombies += zombies;
    maxNeighboringZombies = Math.max(maxNeighboringZombies, zombies);

    // A zone is "infected" if it has MORE zombies than current zone
    if (zombies > currentZombies) {
      adjZonesInfected++;
      if (isDirect) directAdjZonesInfected++;
    }
  });

  // No infected neighbors = no spawn
  if (adjZonesInfected === 0) return 0;

  // Calculate target number and limit
  // Target = number of infected neighbors, balanced by total neighbors
  const targetNumber = Math.round(
    adjZonesInfected * ((diagonalSpawn ? 8.0 : 4.0) / adjZonesTotal)
  );
  
  // Limit is 4 if we have direct neighbors, 3 otherwise
  const limit = directAdjZonesInfected > 0 ? 4 : 3;

  // === BIAS CALCULATION ===
  // Bias creates resistance to spawning based on neighbor density
  // Higher zombie counts = less resistance (negative bias)
  // Lower zombie counts = more resistance (positive bias)
  let bias = 0;
  
  if (maxNeighboringZombies >= 5 && adjZonesInfected >= 2) {
    bias = -1;
  } else if (maxNeighboringZombies >= 15) {
    bias = -1;
  } else if (maxNeighboringZombies >= 8) {
    bias = 0;
  } else if (neighboringZombies < 5) {
    bias = Math.min(4, limit);
  } else if (neighboringZombies < 10) {
    bias = 3;
  } else if (neighboringZombies < 15) {
    bias = 2;
  } else if (neighboringZombies < 20) {
    bias = 1;
  }

  // === RANDOM SPAWN CALCULATION ===
  // First roll: random value between -bias and limit
  let newZeds = randomInt(-bias, limit);
  
  // Re-roll if result is positive but not the target
  // This creates a bias towards spawning the target number
  if (newZeds > 0 && newZeds !== targetNumber) {
    newZeds = randomInt(-bias, limit);
  }

  // === DIAGONAL SPAWN LIMITATION ===
  // When diagonal spawn is enabled (Day 2+), limit to 1-2 zombies
  if (newZeds > 0 && diagonalSpawn) {
    newZeds = Math.max(1, Math.min(2, randomInt(-2, 3)));
  }

  // === FINAL CLAMP ===
  // Ensure result is between 0 and limit
  return Math.max(0, Math.min(limit, newZeds));
}

/**
 * Simulates one full day cycle
 * Based on MapMaker.php:451-525 (zombieSpawnGovernorMH)
 * 
 * This precisely matches the game's order of operations:
 * 1. Calculate and freeze despair values at START of day
 * 2. Run spread cycle (using frozen despair to skip zones)
 * 3. Apply despair reduction to POST-SPREAD zombie counts
 * 
 * @param {Map} zones - Map of all zones
 * @param {number} day - Current day number
 * @param {SimulationConfig} config - Configuration
 */
export function simulateDay(zones, day, config) {
  // Save current state as initial for this day
  // AND calculate despair values BEFORE any spreading
  // This matches MapMaker.php:463
  const despairDb = new Map();
  zones.forEach((zone, key) => {
    zone.initialZombies = zone.zombies;
    zone.scoutEstimationOffset = randomInt(-2, 2);
    
    // Freeze despair value at start of day
    // despair = floor(max(0, (initialZombies - zombies - 1) / 2))
    const despair = Math.floor(Math.max(0, (zone.initialZombies - zone.zombies - 1) / 2));
    despairDb.set(key, despair);
  });

  // Check if respawn is needed
  // Note: Respawn check uses the NEXT day (day + 1) because in the game,
  // the day is incremented before the zombie spawn happens (NightlyHandler.php:1820)
  const totalZombies = getTotalZombies(zones);
  const mode = 'auto'; // Could be 'force', 'auto', or 'none'
  
  if (mode === 'force' || 
      (mode === 'auto' && !isAboveMinimumZombies(totalZombies, day + 1, config))) {
    performRespawn(zones, day + 1, config, despairDb);
  }

  // Run ONE spread cycle per day (matching game behavior)
  // The cycle observes despair on first iteration only
  // MapMaker.php:512 shows: for ($c = 0; $c < $cycles; $c++) $fun_cycle($c == 0, $d >= 2)
  // And NightlyHandler.php:1432 calls dailyZombieSpawn($town) with default cycles=1
  // Pass the FROZEN despair values
  runSpreadCycle(zones, despairDb, true, day >= 2);

  // Apply despair reduction to POST-SPREAD zombie counts
  // This matches MapMaker.php:518-520
  zones.forEach((zone, key) => {
    const zoneDespair = despairDb.get(key) || 0;
    if (zoneDespair >= 1) {
      zone.zombies = Math.max(0, zone.zombies - zoneDespair);
    }
    // Reset for next day
    zone.playerDeaths = 0;
  });
}

/**
 * Checks if zombie count is above minimum threshold
 * Based on MapMaker.php:312-319
 */
function isAboveMinimumZombies(totalZombies, day, config) {
  const threshold = config.respawnThreshold * day * config.respawnFactor;
  return totalZombies >= threshold;
}

/**
 * Performs respawn when zombies drop too low
 * Based on MapMaker.php:484-509
 * 
 * This resets the map to Day 1, spreads until threshold, then adds current zombies back
 * Note: This assumes the map was generated with initial zombies (startZombies > 0 somewhere)
 */
function performRespawn(zones, day, config, despairDb) {
  // Step 1: Backup current zombie distribution
  const backup = new Map();
  zones.forEach((zone, key) => {
    backup.set(key, zone.zombies);
  });

  // Step 2: Reset to Day 1 state
  let totalZombies = 0;
  zones.forEach(zone => {
    zone.zombies = zone.startZombies || 0;
    totalZombies += zone.zombies;
  });

  // If map has no startZombies at all (empty map), skip respawn entirely
  // This matches game behavior - you can't respawn from nothing
  if (totalZombies === 0) {
    console.warn('Respawn skipped: Map has no initial zombies (startZombies = 0). Generate a map with zombies first.');
    // Restore backup and exit
    zones.forEach((zone, key) => {
      zone.zombies = backup.get(key) || 0;
    });
    return;
  }

  // Step 3: Spread until threshold is reached
  // During respawn, we don't observe despair (pass empty Map)
  // Safety limit prevents infinite loops
  let maxIterations = 1000;
  let iterations = 0;
  const noDespair = new Map();
  
  while (!isAboveMinimumZombies(totalZombies, day, config) && iterations < maxIterations) {
    const added = runSpreadCycle(zones, noDespair, false, true);
    totalZombies += added;
    iterations++;
    
    // Safety: If no zombies were added, something is wrong
    if (added === 0) {
      console.warn('Respawn stalled: No zombies spreading. Total:', totalZombies);
      break;
    }
  }

  if (iterations >= maxIterations) {
    console.warn('Respawn hit iteration limit. This should not happen with valid startZombies.');
  }

  // Step 4: Add backup zombies back
  zones.forEach((zone, key) => {
    const backed = backup.get(key) || 0;
    zone.zombies = zone.zombies + backed;
  });
}

/**
 * Manually kills zombies on a zone (for testing/interaction)
 */
export function killZombies(zones, x, y, amount) {
  const zone = zones.get(`${x},${y}`);
  if (!zone) return;
  
  zone.zombies = Math.max(0, zone.zombies - amount);
}

/**
 * Manually adds zombies to a zone (for testing)
 */
export function addZombies(zones, x, y, amount) {
  const zone = zones.get(`${x},${y}`);
  if (!zone) return;
  
  zone.zombies = zone.zombies + amount;
}
