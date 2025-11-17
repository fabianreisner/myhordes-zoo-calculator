/**
 * Utility functions for the zombie simulator
 */

/**
 * Generates a random integer between min and max (inclusive)
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns true with the given probability (0-1)
 */
export function chance(probability) {
  return Math.random() < probability;
}

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Picks a random element from an array
 */
export function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Draws N random elements from an array without replacement
 * If filter is provided, only draws from filtered elements
 */
export function drawRandom(array, count, filter = null) {
  let pool = filter ? array.filter(filter) : [...array];
  pool = shuffleArray(pool);
  return pool.slice(0, Math.min(count, pool.length));
}

/**
 * Creates a 2D snapshot of zombie counts
 * Returns a Map with "x,y" keys
 */
export function createZombieSnapshot(zones) {
  const snapshot = new Map();
  zones.forEach((zone, key) => {
    snapshot.set(key, zone.zombies);
  });
  return snapshot;
}

/**
 * Creates a 2D snapshot of despair values
 */
export function createDespairSnapshot(zones) {
  const snapshot = new Map();
  zones.forEach((zone, key) => {
    snapshot.set(key, zone.despair);
  });
  return snapshot;
}

/**
 * Gets neighboring zones for a given zone
 * @param {Zone} zone - The center zone
 * @param {Map} zones - Map of all zones
 * @param {boolean} includeDiagonal - Whether to include diagonal neighbors
 * @returns {Array} Array of {neighbor: Zone|null, isDirect: boolean}
 */
export function getNeighbors(zone, zones, includeDiagonal = true) {
  const offsets = includeDiagonal 
    ? [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ]
    : [
        [-1, 0],
        [0, -1], [0, 1],
        [1, 0]
      ];

  return offsets.map(([dx, dy]) => {
    const key = `${zone.x + dx},${zone.y + dy}`;
    return {
      neighbor: zones.get(key) || null,
      isDirect: dx === 0 || dy === 0
    };
  });
}

/**
 * Gets the total zombie count from a zones Map
 */
export function getTotalZombies(zones) {
  let total = 0;
  zones.forEach(zone => {
    total += zone.zombies;
  });
  return total;
}

/**
 * Calculates the Euclidean distance between two zones
 */
export function getZoneDistance(zone1, zone2) {
  const dx = zone1.x - zone2.x;
  const dy = zone1.y - zone2.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

/**
 * Formats a number with thousand separators
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Gets a color for zombie count visualization
 */
export function getZombieColor(count) {
  if (count === 0) return '#475613';
  if (count <= 5) return '#8F990B';
  if (count <= 15) return '#8F7324';
  if (count <= 30) return '#8F340B';
  return '#52626d';
}

/**
 * Deep clones an object (simple version)
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
