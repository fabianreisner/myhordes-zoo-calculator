# Zombie Spread Simulator - Project Plan

## Project Overview
A browser-based simulation tool for the zombie spread mechanics in MyHordes. This will allow users to visualize how zombies spread across the map over multiple day cycles.

## Algorithm Analysis

### Key Components from Symfony Code

#### 1. **Spawn Governor Types** (HordeSpawnGovernor enum)
The code supports multiple spread algorithms:
- **MyHordes** (value: -1) - **THIS IS WHAT WE IMPLEMENT** (MapMaker.php:373-448, `spreadCycleMH`)
- **Hordes** (value: -2) - Alternative algorithm (MapMaker.php:323-370, `spreadCycleH`)
- HordesOnline, HordesModDone, HordesCrowdControl - Other variants

**Key Code Locations:**
- Line 232: Router chooses between MyHordes/Hordes governor
- Line 476-479: `$fun_cycle` calls `spreadCycleMH` for MyHordes
- Line 405-409: **THE 90/10 ZOMBIE SPAWN LOGIC**

For this project, we'll implement the **MyHordes** algorithm (`spreadCycleMH`).

#### 2. **Initial Zombie Spawn** (MapMaker.php:238-310)
How zombies are initially placed on the map:

1. **Ruin zones** get zombies based on distance from town:
   - Zombies = distance ± 20% random variance
   - Example: A ruin at 5km gets 4-6 zombies

2. **Random spawn zones** (selected from empty zones):
   - Must be at minimum distance from town (MapParamsFreeSpawnDist)
   - Get 0-2 random zombies
   - Number of spawn zones: MapParamsFreeSpawnCount

3. **Initial spread cycles**: 
   - 2 cycles for MyHordes governor
   - 3 cycles for Hordes governor
   - Additional cycles until minimum zombie threshold is reached

#### 3. **Daily Zombie Spawn Algorithm** (MapMaker.php:373-448 - `spreadCycleMH`)

This is the **core algorithm** that runs each night cycle:

**For zones WITH zombies:** (MapMaker.php:405-409)
```php
if ($current_zone_zombies > 0) {
    $new_zeds = $this->random->chance(0.9)  // 90% chance
        ? 1                                   // Add 1 zombie
        : ( $this->random->chance(0.5) ? 0 : 2 );  // 10%: 50/50 between 0 or 2
    $current_zone_zombies += $new_zeds;
}
```
In plain terms:
- 90% chance: Add 1 zombie
- 10% chance: 50/50 split between 0 or 2 zombies

**For EMPTY zones:**
The algorithm checks adjacent zones (4 direct + 4 diagonal = 8 neighbors):

**Step 1: Count infected neighbors**
- `adj_zones_infected`: Zones with MORE zombies than current zone
- `direct_adj_zones_infected`: Only counting N/S/E/W (not diagonals)
- `max_neighboring_zombies`: Highest zombie count in neighbors
- `neighboring_zombies`: Total zombies in all neighbors

**Step 2: Calculate target number**
```javascript
target_number = round(adj_zones_infected * (8.0 / adj_zones_total))
limit = (direct_adj_zones_infected > 0) ? 4 : 3
```

**Step 3: Determine bias** (resistance to spawning)
```javascript
if (max >= 5 && adj_zones_infected >= 2)  bias = -1
else if (max >= 15)                        bias = -1
else if (max >= 8)                         bias = 0
else if (total < 5)                        bias = min(4, limit)
else if (total < 10)                       bias = 3
else if (total < 15)                       bias = 2
else if (total < 20)                       bias = 1
else                                       bias = 0
```

**Step 4: Random spawn calculation**
```javascript
new_zeds = random(-bias, limit)  // First roll
if (new_zeds > 0 && new_zeds !== target_number)
    new_zeds = random(-bias, limit)  // Re-roll for bias towards target

// For diagonal spawn (day 2+), limit to 1-2
if (new_zeds > 0 && diagonal_spawn)
    new_zeds = max(1, min(2, random(-2, 3)))

// Final clamp
zombies_added = max(0, min(limit, new_zeds))
```

**Special Rules:**
- Town zone (0,0) never gets zombies
- "Despair" zones (zones where zombies were killed) are skipped on first cycle
- Diagonal spreading is disabled on Day 1, enabled from Day 2+

#### 4. **Respawn Mechanism** (MapMaker.php:483-509)
Respawn is **checked every day** but only triggers when below threshold:

```php
if ($mode === self::RespawnModeAuto && 
    !$this->aboveMinNumberOfZombies($total_zombies, $conf, $d))
```

**Minimum threshold formula (Line 318):**
```php
zombies >= RespawnThreshold * day * RespawnFactor * factor
// With actual values:
zombies >= 50 * day * 0.5 * 1.0
zombies >= 25 * day
```

**Examples:**
- Day 1: Minimum 25 zombies
- Day 2: Minimum 50 zombies
- Day 3: Minimum 75 zombies
- Day 4: Minimum 100 zombies

**When triggered:**
1. Backup current zombie distribution (Line 493)
2. Reset map to Day 1 state - `startZombies` (Line 496-498)
3. Run spread cycles until threshold is reached (Line 501-502)
4. Add backed-up zombies back on top (Line 505-507)

**Why it matters around Day 4+**: Threshold scales with day number, so early days rarely trigger respawn (threshold too low), but by Day 4+ the threshold is high enough that heavy zombie clearing will trigger respawn.

#### 5. **Despair System**
When zombies are killed on a zone:
```javascript
despair = floor(max(0, (initialZombies - currentZombies - 1) / 2))
```
- Despair zones are skipped in the first spread cycle of the night
- This prevents immediate re-infestation of cleared zones

---

## React Implementation Plan

### Phase 1: Project Setup & UI Foundation

#### 1.1 Dependencies
```json
{
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@types/react": "latest"
  }
}
```

#### 1.2 File Structure
```
src/
├── app/
│   ├── page.js (main page)
│   ├── globals.css
│   └── zombie-simulator.css (adapted from fata-morgana-styles.css)
├── components/
│   ├── Map.jsx
│   ├── ZoneCell.jsx
│   ├── ControlPanel.jsx
│   ├── SimulationStats.jsx
│   └── DayCounter.jsx
├── lib/
│   ├── types.js
│   ├── mapGenerator.js
│   ├── zombieSpread.js
│   ├── constants.js
│   └── utils.js
└── hooks/
    └── useSimulation.js
```

### Phase 2: Data Models

#### 2.1 Zone Type
```javascript
// lib/types.js
class Zone {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.zombies = 0;
    this.initialZombies = 0;
    this.startZombies = 0; // Day 1 zombies (for respawn)
    this.hasBuilding = false;
    this.isRuin = false;
    this.isTown = (x === 0 && y === 0);
    this.scoutEstimationOffset = 0;
    this.playerDeaths = 0;
  }

  get despair() {
    return Math.floor(Math.max(0, (this.initialZombies - this.zombies - 1) / 2));
  }

  get distance() {
    return Math.round(Math.sqrt(this.x * this.x + this.y * this.y));
  }

  get killed() {
    return Math.max(0, this.initialZombies - this.zombies);
  }
}
```

#### 2.2 Simulation State
```javascript
class SimulationState {
  constructor(size) {
    this.size = size;
    this.day = 1;
    this.zones = new Map(); // key: "x,y", value: Zone
    this.history = []; // Track changes per day
    this.config = {
      respawnThreshold: 0.5,
      respawnFactor: 1.0,
      freeSpawnDist: 3,
      freeSpawnCount: 5,
      governor: 'MyHordes'
    };
  }
}
```

### Phase 3: Core Logic Implementation

#### 3.1 Map Generation (lib/mapGenerator.js)
```javascript
export function generateMap(size, config) {
  const zones = new Map();
  const offset = Math.floor(size / 2);

  // Create all zones
  for (let x = -offset; x <= offset; x++) {
    for (let y = -offset; y <= offset; y++) {
      const zone = new Zone(x, y);
      zones.set(`${x},${y}`, zone);
    }
  }

  // Place ruins (simplified - random placement)
  const ruinCount = config.ruinCount || 10;
  const availableZones = Array.from(zones.values())
    .filter(z => !z.isTown && z.distance >= 1 && z.distance <= 10);
  
  const ruins = shuffleArray(availableZones).slice(0, ruinCount);
  ruins.forEach(zone => {
    zone.isRuin = true;
    zone.hasBuilding = true;
  });

  // Initial zombie placement
  placeInitialZombies(zones, config);

  return zones;
}

function placeInitialZombies(zones, config) {
  // 1. Ruins get zombies based on distance
  Array.from(zones.values())
    .filter(z => z.isRuin)
    .forEach(zone => {
      const base = zone.distance;
      const variance = 0.2;
      zone.zombies = Math.max(1, randomInt(
        Math.floor(base * (1 - variance)),
        Math.ceil(base * (1 + variance))
      ));
    });

  // 2. Random spawn zones
  const availableZones = Array.from(zones.values())
    .filter(z => !z.isTown && !z.isRuin && z.distance >= config.freeSpawnDist);
  
  const spawnZones = shuffleArray(availableZones)
    .slice(0, config.freeSpawnCount);
  
  spawnZones.forEach(zone => {
    zone.zombies = randomInt(0, 2);
  });

  // 3. Set initial values for all zones
  zones.forEach(zone => {
    zone.initialZombies = zone.zombies;
    zone.startZombies = zone.zombies;
    zone.scoutEstimationOffset = randomInt(-2, 2);
  });

  // 4. Run initial spread cycles (2 cycles for MyHordes)
  for (let i = 0; i < 2; i++) {
    runSpreadCycle(zones, false, true);
  }

  // 5. Ensure minimum zombies
  let totalZombies = getTotalZombies(zones);
  const minZombies = 1 * config.respawnThreshold * config.respawnFactor;
  let attempts = 0;
  
  while (totalZombies < minZombies && attempts < 3) {
    runSpreadCycle(zones, false, true);
    totalZombies = getTotalZombies(zones);
    attempts++;
  }

  // Update start zombies after initial spread
  zones.forEach(zone => {
    zone.startZombies = zone.zombies;
  });
}
```

#### 3.2 Zombie Spread Algorithm (lib/zombieSpread.js)
```javascript
export function runSpreadCycle(zones, observeDespair, diagonalSpawn) {
  const zoneDb = createZombieSnapshot(zones);
  const despairDb = createDespairSnapshot(zones);
  let cycleResult = 0;

  zones.forEach((zone, key) => {
    if (zone.isTown) return;
    if (observeDespair && zone.despair > 0) return;

    const before = zoneDb.get(key);
    let newZombies = before;

    if (before > 0) {
      // Zones with zombies: 90% = +1, 10% = 50/50 between 0 or 2
      const roll = Math.random();
      if (roll < 0.9) {
        newZombies += 1;
      } else {
        newZombies += Math.random() < 0.5 ? 0 : 2;
      }
    } else {
      // Empty zones: complex calculation
      newZombies = calculateEmptyZoneSpawn(
        zone, zones, zoneDb, diagonalSpawn
      );
    }

    zone.zombies = newZombies;
    cycleResult += (newZombies - before);
  });

  return cycleResult;
}

function calculateEmptyZoneSpawn(zone, zones, zoneDb, diagonalSpawn) {
  const neighbors = getNeighbors(zone, zones, diagonalSpawn);
  
  let adjZonesTotal = 0;
  let adjZonesInfected = 0;
  let directAdjZonesInfected = 0;
  let neighboringZombies = 0;
  let maxNeighboringZombies = 0;

  neighbors.forEach(({ neighbor, isDirect }) => {
    if (!neighbor) return;
    
    const zombies = zoneDb.get(`${neighbor.x},${neighbor.y}`) || 0;
    adjZonesTotal++;
    neighboringZombies += zombies;
    maxNeighboringZombies = Math.max(maxNeighboringZombies, zombies);

    const currentZombies = zoneDb.get(`${zone.x},${zone.y}`) || 0;
    if (zombies > currentZombies) {
      adjZonesInfected++;
      if (isDirect) directAdjZonesInfected++;
    }
  });

  if (adjZonesInfected === 0) return 0;

  // Calculate target and limit
  const targetNumber = Math.round(
    adjZonesInfected * ((diagonalSpawn ? 8.0 : 4.0) / adjZonesTotal)
  );
  const limit = directAdjZonesInfected > 0 ? 4 : 3;

  // Determine bias
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

  // Random spawn calculation
  let newZeds = randomInt(-bias, limit);
  
  // Re-roll if not target (bias towards target)
  if (newZeds > 0 && newZeds !== targetNumber) {
    newZeds = randomInt(-bias, limit);
  }

  // Diagonal spawn limitation
  if (newZeds > 0 && diagonalSpawn) {
    newZeds = Math.max(1, Math.min(2, randomInt(-2, 3)));
  }

  // Final clamp
  return Math.max(0, Math.min(limit, newZeds));
}

function getNeighbors(zone, zones, includeDiagonal) {
  const neighbors = [];
  const offsets = includeDiagonal 
    ? [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
    : [[-1,0],[1,0],[0,-1],[0,1]];

  offsets.forEach(([dx, dy]) => {
    const key = `${zone.x + dx},${zone.y + dy}`;
    neighbors.push({
      neighbor: zones.get(key),
      isDirect: dx === 0 || dy === 0
    });
  });

  return neighbors;
}
```

#### 3.3 Daily Simulation (lib/zombieSpread.js continued)
```javascript
export function simulateDay(zones, day, config) {
  // Save initial state
  zones.forEach(zone => {
    zone.initialZombies = zone.zombies;
    zone.scoutEstimationOffset = randomInt(-2, 2);
  });

  // Check if respawn is needed
  const totalZombies = getTotalZombies(zones);
  const minZombies = day * config.respawnThreshold * config.respawnFactor;

  if (totalZombies < minZombies) {
    performRespawn(zones, day, config);
  }

  // Run spread cycles
  // First cycle observes despair
  runSpreadCycle(zones, true, day >= 2);
  
  // Subsequent cycles
  const cycles = 1; // Can be configurable
  for (let i = 0; i < cycles; i++) {
    runSpreadCycle(zones, false, day >= 2);
  }

  // Apply despair reduction
  zones.forEach(zone => {
    if (zone.despair >= 1) {
      zone.zombies = Math.max(0, zone.zombies - zone.despair);
    }
    zone.playerDeaths = 0; // Reset for next day
  });
}

function performRespawn(zones, day, config) {
  // Backup current zombies
  const backup = new Map();
  zones.forEach((zone, key) => {
    backup.set(key, zone.zombies);
  });

  // Reset to Day 1
  zones.forEach(zone => {
    zone.zombies = zone.startZombies || 0;
  });

  // Spread until threshold
  let totalZombies = getTotalZombies(zones);
  const minZombies = day * config.respawnThreshold * config.respawnFactor;
  
  while (totalZombies < minZombies) {
    totalZombies += runSpreadCycle(zones, false, true);
  }

  // Add backup zombies back
  zones.forEach((zone, key) => {
    zone.zombies += backup.get(key) || 0;
  });
}
```

### Phase 4: UI Components

#### 4.1 Map Component
```jsx
// components/Map.jsx
export default function Map({ zones, size, onZoneClick }) {
  const offset = Math.floor(size / 2);
  
  return (
    <div id="map-wrapper">
      <div id="map">
        {/* Top ruler */}
        <ul className="maprow maprulebar-top">
          {/* Ruler cells */}
        </ul>

        {/* Map rows */}
        {Array.from({ length: size }, (_, rowIdx) => {
          const y = offset - rowIdx;
          return (
            <ul key={y} className="maprow">
              {/* Left ruler */}
              <li className="mapruler">{y}</li>
              
              {/* Zone cells */}
              {Array.from({ length: size }, (_, colIdx) => {
                const x = colIdx - offset;
                const zone = zones.get(`${x},${y}`);
                return (
                  <ZoneCell 
                    key={`${x},${y}`}
                    zone={zone}
                    onClick={() => onZoneClick(zone)}
                  />
                );
              })}
              
              {/* Right ruler */}
              <li className="mapruler">{y}</li>
            </ul>
          );
        })}

        {/* Bottom ruler */}
      </div>
    </div>
  );
}
```

#### 4.2 Zone Cell Component
```jsx
// components/ZoneCell.jsx
export default function ZoneCell({ zone, onClick }) {
  const getDangerClass = () => {
    if (zone.zombies === 0) return 'danger0';
    if (zone.zombies <= 5) return 'danger1';
    if (zone.zombies <= 15) return 'danger2';
    if (zone.zombies <= 30) return 'danger3';
    return 'danger4';
  };

  return (
    <li
      className={`mapzone ${getDangerClass()} ${zone.isTown ? 'city' : ''}`}
      onClick={onClick}
    >
      {zone.hasBuilding && (
        <div className="building">
          {/* Building icon */}
        </div>
      )}
      {zone.zombies > 0 && (
        <div className="zombies">{zone.zombies}</div>
      )}
    </li>
  );
}
```

#### 4.3 Control Panel
```jsx
// components/ControlPanel.jsx
export default function ControlPanel({
  onAdvanceDay,
  onReset,
  onKillZombies,
  day,
  totalZombies
}) {
  return (
    <div className="control-panel">
      <h2>Day {day}</h2>
      <p>Total Zombies: {totalZombies}</p>
      
      <div className="controls">
        <button onClick={onAdvanceDay}>Advance Day</button>
        <button onClick={onReset}>Reset Map</button>
        <button onClick={onKillZombies}>Kill Zombies (Tool)</button>
      </div>

      <div className="config">
        <label>
          Map Size:
          <select>
            <option>25x25</option>
            <option>26x26</option>
            <option>27x27</option>
          </select>
        </label>
      </div>
    </div>
  );
}
```

### Phase 5: Main Page Integration

#### 5.1 Custom Hook for Simulation
```jsx
// hooks/useSimulation.js
export function useSimulation(initialSize = 25) {
  const [state, setState] = useState(() => ({
    zones: generateMap(initialSize, defaultConfig),
    day: 1,
    size: initialSize,
    config: defaultConfig,
    history: []
  }));

  const advanceDay = useCallback(() => {
    const newZones = new Map(state.zones);
    simulateDay(newZones, state.day + 1, state.config);
    
    setState(prev => ({
      ...prev,
      zones: newZones,
      day: prev.day + 1,
      history: [...prev.history, { day: prev.day, zones: prev.zones }]
    }));
  }, [state]);

  const reset = useCallback(() => {
    setState({
      zones: generateMap(state.size, state.config),
      day: 1,
      size: state.size,
      config: state.config,
      history: []
    });
  }, [state.size, state.config]);

  const killZombies = useCallback((x, y, amount) => {
    const newZones = new Map(state.zones);
    const zone = newZones.get(`${x},${y}`);
    if (zone) {
      zone.zombies = Math.max(0, zone.zombies - amount);
    }
    setState(prev => ({ ...prev, zones: newZones }));
  }, [state.zones]);

  return { state, advanceDay, reset, killZombies };
}
```

#### 5.2 Main Page
```jsx
// app/page.js
'use client';

import { useState } from 'react';
import Map from '@/components/Map';
import ControlPanel from '@/components/ControlPanel';
import { useSimulation } from '@/hooks/useSimulation';

export default function ZombieSimulator() {
  const { state, advanceDay, reset, killZombies } = useSimulation(25);
  const [selectedZone, setSelectedZone] = useState(null);

  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
  };

  const totalZombies = Array.from(state.zones.values())
    .reduce((sum, zone) => sum + zone.zombies, 0);

  return (
    <div className="simulator-container">
      <h1>MyHordes Zombie Spread Simulator</h1>
      
      <div className="layout">
        <ControlPanel
          day={state.day}
          totalZombies={totalZombies}
          onAdvanceDay={advanceDay}
          onReset={reset}
          onKillZombies={() => {
            if (selectedZone) {
              killZombies(selectedZone.x, selectedZone.y, 5);
            }
          }}
        />

        <Map
          zones={state.zones}
          size={state.size}
          onZoneClick={handleZoneClick}
        />

        {selectedZone && (
          <div className="zone-info">
            <h3>Zone ({selectedZone.x}, {selectedZone.y})</h3>
            <p>Zombies: {selectedZone.zombies}</p>
            <p>Distance: {selectedZone.distance}km</p>
            <p>Despair: {selectedZone.despair}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Implementation Phases Summary

### ✅ **Phase 1**: Foundation (Week 1)
- Extract and adapt CSS from fata-morgana-styles.css
- Set up basic file structure
- Create type definitions

### ✅ **Phase 2**: Core Logic (Week 1-2)
- Implement Zone class and data structures
- Implement map generation algorithm
- Implement zombie spread algorithm (spreadCycleMH)
- Add respawn mechanism
- Add despair system

### ✅ **Phase 3**: UI Components (Week 2)
- Build Map component with proper grid rendering
- Build ZoneCell component with danger classes
- Build ControlPanel component
- Build zone info display

### ✅ **Phase 4**: Integration & Testing (Week 2-3)
- Create useSimulation hook
- Wire up all components
- Test algorithm accuracy against PHP implementation
- Add history tracking for debugging

### ✅ **Phase 5**: Polish & Features (Week 3)
- Add ability to manually kill zombies
- Add visualization of zombie changes (arrows, colors)
- Add export/import of map states
- Add algorithm parameter tweaking UI
- Performance optimization for large maps

---

## Testing Strategy

### Unit Tests
1. `mapGenerator.js` - verify initial placement
2. `zombieSpread.js` - verify spread calculations match PHP
3. Zone class - verify despair calculations

### Integration Tests
1. Full day simulation matches expected patterns
2. Respawn triggers at correct thresholds
3. Despair system prevents immediate re-infestation

### Manual Testing Scenarios
1. Observe Day 1 → Day 2 spread (diagonal disabled → enabled)
2. Clear a zone heavily and watch respawn
3. Verify town zone never gets zombies
4. Compare results with actual MyHordes data if available

---

## Open Questions / TODO

1. **Ruin placement**: The PHP code has more complex logic for ruin placement that we simplified. Do we need exact replication?

2. **Configuration values**: We need actual values for:
   - `MapParamsFreeSpawnDist` (default: 3?)
   - `MapParamsFreeSpawnCount` (default: 5?)
   - `RespawnThreshold` (default: 0.5?)
   - `RespawnFactor` (default: 1.0?)

3. **Explorable ruins**: Should we implement the maze/explorable ruin logic or skip it?

4. **Zombie kill tracking**: Do we need to track which zones had kills to properly calculate despair?

5. **Visualization**: What additional visual indicators would be helpful?
   - Arrows showing spread direction?
   - Heat map of zombie density?
   - Diff view showing changes from previous day?

---

## Success Criteria

1. ✅ Map renders correctly with proper grid and styling
2. ✅ Initial zombie placement matches algorithm
3. ✅ Daily spread follows MyHordes algorithm accurately
4. ✅ Respawn system works when zombies drop below threshold
5. ✅ Despair system properly affects spread
6. ✅ UI is responsive and intuitive
7. ✅ Can simulate multiple days in sequence
8. ✅ Performance is acceptable (< 100ms per day simulation)

