# MyHordes Zombie Spread Simulator

A browser-based simulation tool that replicates the **MyHordes** zombie spread algorithm. This tool allows you to visualize and understand how zombies spread across the map during each night cycle in the game.

## Features

✅ **Accurate MyHordes Algorithm** - Implements the exact spread logic from the game  
✅ **Interactive Map** - Click zones to inspect details  
✅ **Two Modes**: Simulate spread OR manually create maps  
✅ **Day-by-Day Simulation** - Advance through days to see how zombies spread  
✅ **Manual Map Creation** - Left-click to add, right-click to remove zombies  
✅ **Save/Load Maps** - Persist maps to browser localStorage  
✅ **Real-time Stats** - Track total zombies, thresholds, and zone states  

## How It Works

### The Algorithm (MyHordes)

The simulator implements the `spreadCycleMH` algorithm from MyHordes:

#### Zones WITH Zombies
- **90% chance**: Add 1 zombie
- **10% chance**: 50/50 split between 0 or 2 zombies

#### Empty Zones
Complex calculation based on 8 neighbors (4 direct + 4 diagonal):
1. Count infected neighbors (zones with more zombies)
2. Calculate bias based on zombie density
3. Use target numbers and re-rolls for realistic patterns
4. Day 1: Only 4-directional spread (N/S/E/W)
5. Day 2+: Includes diagonal spread

### Special Systems

**Despair System**: When zombies are killed on a zone, it gains "despair" which resists re-infestation on the first spread cycle of the night.

Formula: `despair = floor(max(0, (initialZombies - currentZombies - 1) / 2))`

**Respawn System**: When total zombies drop below threshold:
1. Map resets to Day 1 state
2. Spreads until threshold is reached
3. Adds current zombies back on top

Threshold: `day × respawnThreshold × respawnFactor`

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Mode Selection

**🧪 Simulate Mode** - Run the zombie spread algorithm
- Click zones to see details
- Advance days to watch zombies spread
- Observe despair and respawn systems

**✏️ Create Mode** - Manually design maps
- Set edit amount (default: 5 zombies)
- **Left-click** zone: Add zombies
- **Right-click** zone: Remove zombies (min 0)
- Save your creation for later
- Load previously saved maps

### Basic Controls

1. **Advance Day** - Simulates one night cycle, zombies spread
2. **Reset Map** - Generates a new random map
3. **Click Zones** - Select a zone to see details

### Map Persistence

Maps are saved to **browser localStorage** (no database needed):
- Each saved map stores ~5-20KB of data
- Browser storage limit: typically 5-10MB
- Can save hundreds of maps
- Data persists across sessions
- Clear browser data = lose saved maps

**Export/Import**: Maps are stored as JSON in localStorage. You can:
1. Open browser DevTools → Application → Local Storage
2. Find key: `myhordes-saved-maps`
3. Copy JSON to backup
4. Paste JSON to restore on another browser
- **Kill 5 Zombies** - Remove 5 zombies (tests despair)
- **Clear All** - Remove all zombies from zone
- **Add 5 Zombies** - Add 5 zombies to zone

### Configuration

- **Map Size**: Choose 25×25, 26×26, or 27×27
- **Respawn Threshold**: Multiplier for minimum zombie count (default: 0.5)
- **Respawn Factor**: Additional multiplier (default: 1.0)
- **Ruin Count**: Number of ruins on the map (default: 10)
- **Free Spawn Count**: Random spawn zones (default: 5)
- **Free Spawn Min Distance**: Minimum km for random spawns (default: 3)
- **Town Type**: EASY, NORMAL, or HARD difficulty

## Map Legend

### Zone Colors (Danger Levels)
- 🟩 **Green** (danger0): No zombies
- 🟨 **Yellow** (danger1): 1-5 zombies
- 🟧 **Orange** (danger2): 6-15 zombies
- 🟥 **Red** (danger3): 16-30 zombies
- ⬛ **Dark** (danger4): 31+ zombies

### Zone Features
- 🏠 **House Icon**: Town zone (0,0)
- 🏛️ **Building Icon**: Zone contains a ruin
- 🧟 **Red Number**: Current zombie count
- 🎯 **Border Highlight**: Selected zone

## Testing the Algorithm

### Verify Day 1 → Day 2 Spread
1. Note zombie positions on Day 1
2. Advance to Day 2
3. Observe: Day 2 includes diagonal spread (8 directions vs 4)

### Test Despair System
1. Select a zone with zombies
2. Click "Clear All"
3. Note the despair value
4. Advance to next day
5. Observe: Zone is less likely to be re-infected immediately

### Test Respawn System
1. Kill many zombies to drop below threshold
2. Advance day
3. Observe: Map resets and re-spreads to maintain minimum zombie count

## Project Structure

```
src/
├── app/
│   ├── page.js                    # Main application page
│   ├── globals.css                # Global styles
│   └── zombie-simulator.css       # Map and UI styles
├── components/
│   ├── Map.jsx                    # Map grid component
│   ├── ZoneCell.jsx              # Individual zone cell
│   ├── ControlPanel.jsx          # Day controls and config
│   └── ZoneInfo.jsx              # Selected zone details
├── lib/
│   ├── types.js                  # Zone, SimulationState classes
│   ├── mapGenerator.js           # Map creation logic
│   ├── zombieSpread.js           # Spread algorithm
│   └── utils.js                  # Helper functions
└── hooks/
    └── useSimulation.js          # Simulation state management
```

## Code References

The implementation is based on the MyHordes PHP codebase:

- **MapMaker.php:373-448** - `spreadCycleMH` (core spread logic)
- **MapMaker.php:405-409** - 90/10 zombie spawn logic
- **MapMaker.php:483-509** - Respawn mechanism
- **MapMaker.php:238-310** - Initial zombie placement

## Configuration Defaults

These values are hardcoded to match the actual MyHordes game:

```javascript
respawnThreshold: 50    // OptModifierRespawnThreshold
respawnFactor: 0.5      // OptModifierRespawnFactor  
freeSpawnDist: 0        // MapParamsFreeSpawnDist
freeSpawnCount: 3       // MapParamsFreeSpawnCount
ruinCount: 10           // For visualization (game uses 0 by default)
minRuinDistance: 1
maxRuinDistance: 10
governor: 'MyHordes'
townType: 'NORMAL'
```

**Respawn Threshold**: `50 × day × 0.5 = 25 × day`
- Day 1: 25 zombies minimum
- Day 2: 50 zombies minimum  
- Day 3: 75 zombies minimum
- Day 4: 100 zombies minimum

## Future Enhancements

- [ ] Add animation for zombie spread
- [ ] Export/import map states
- [ ] Comparison view (before/after)
- [ ] Heat map visualization
- [ ] Multi-day simulation (run N days at once)
- [ ] Historical playback
- [ ] Algorithm comparison (MyHordes vs Hordes)

## Credits

Algorithm reverse-engineered from [MyHordes](https://myhordes.eu) game code.

See [PLANNING.md](PLANNING.md) for detailed algorithm documentation and implementation notes.
