# Bug Fixes - Zombie Count Issues

## Problems Found

### 1. **CRITICAL: Too Many Spread Cycles Per Day**
**Bug**: We were running 2 spread cycles per day instead of 1
- First cycle with `observeDespair = true`
- Second cycle with `observeDespair = false`

**Reality**: The game runs exactly **1 cycle per day**
- Source: `NightlyHandler.php:1432` calls `dailyZombieSpawn($town)` with default `cycles=1`
- Source: `MapMaker.php:512` shows `for ($c = 0; $c < $cycles; $c++) $fun_cycle($c == 0, $d >= 2)`
- The `$c == 0` means despair is ONLY observed on the first (and only) cycle

**Fix**: Removed the additional cycle, now running only 1 cycle per day

### 2. **Wrong Configuration Values**

| Setting | Our Value | Actual Game Value | Source |
|---------|-----------|-------------------|--------|
| `respawnThreshold` | 0.5 | **50** | TownSetting.php:611 |
| `respawnFactor` | 1.0 | **0.5** | TownSetting.php:610 |
| `freeSpawnCount` | 5 | **3** | TownSetting.php:512 |
| `freeSpawnDist` | 3 | **0** | TownSetting.php:513 |

**Impact**: 
- Respawn was triggering way too early (0.5 * day vs 50 * 0.5 * day = 25 * day)
- More random spawn zones were being created (5 vs 3)
- Random spawns were restricted to 3km+ when they should spawn anywhere

**Fix**: Updated all default values to match game

### 3. **initialZombies Overwritten**

**Bug**: After initial spread cycles, we were updating `initialZombies` to the post-spread value

**Reality**: `initialZombies` should represent zombies at the START of the current day
- Used to calculate `despair` and `killed` 
- Should only be updated when a new day begins

**Fix**: Only update `startZombies` (Day 1 reference for respawn), leave `initialZombies` alone

## Respawn Threshold Calculation

**Correct Formula**: 
```javascript
threshold = respawnThreshold × day × respawnFactor
threshold = 50 × day × 0.5
threshold = 25 × day
```

**Examples**:
- Day 1: 25 zombies minimum
- Day 2: 50 zombies minimum  
- Day 3: 75 zombies minimum
- Day 4: 100 zombies minimum

This makes much more sense! Respawn shouldn't trigger unless you clear A LOT of zombies.

## Impact

**Before fixes**:
- ~2x too many zombies (double spread cycles)
- Respawn triggered constantly (wrong threshold)
- Weird initial spawns (wrong parameters)

**After fixes**:
- Spread rate matches game
- Respawn only triggers when heavily cleared
- Initial distribution matches game

## Verification Steps

1. **Day 1 → Day 2**: Check that zombie increase is moderate, not explosive
2. **Despair**: Clear a zone, verify it resists re-infection for 1 cycle
3. **Respawn**: Should NOT trigger on Day 1-3 unless you manually clear most zombies
4. **Initial spawns**: Should see ~3 random spawn zones with 0-2 zombies each

## Code References

- `MapMaker.php:228-235` - `dailyZombieSpawn` function with default cycles=1
- `MapMaker.php:512` - Loop showing `$fun_cycle($c == 0, ...)` - despair only on first cycle
- `NightlyHandler.php:1432` - Calls `dailyZombieSpawn($town)` with defaults
- `TownSetting.php:512-513, 610-611` - Default configuration values
