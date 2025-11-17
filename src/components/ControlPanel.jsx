'use client';

import { formatNumber } from '../lib/utils';

// SVG Icons
const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="16" height="16" fill="currentColor">
    <path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 237.3C544 220.3 537.3 204 525.3 192L448 114.7C436 102.7 419.7 96 402.7 96L160 96zM192 192C192 174.3 206.3 160 224 160L384 160C401.7 160 416 174.3 416 192L416 256C416 273.7 401.7 288 384 288L224 288C206.3 288 192 273.7 192 256L192 192zM320 352C355.3 352 384 380.7 384 416C384 451.3 355.3 480 320 480C284.7 480 256 451.3 256 416C256 380.7 284.7 352 320 352z"/>
  </svg>
);

const PenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="16" height="16" fill="currentColor">
    <path d="M416.9 85.2L372 130.1L509.9 268L554.8 223.1C568.4 209.6 576 191.2 576 172C576 152.8 568.4 134.4 554.8 120.9L519.1 85.2C505.6 71.6 487.2 64 468 64C448.8 64 430.4 71.6 416.9 85.2zM338.1 164L122.9 379.1C112.2 389.8 104.4 403.2 100.3 417.8L64.9 545.6C62.6 553.9 64.9 562.9 71.1 569C77.3 575.1 86.2 577.5 94.5 575.2L222.3 539.7C236.9 535.6 250.2 527.9 261 517.1L476 301.9L338.1 164z"/>
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="16" height="16" fill="currentColor">
    <path d="M96 96C113.7 96 128 110.3 128 128L128 464C128 472.8 135.2 480 144 480L544 480C561.7 480 576 494.3 576 512C576 529.7 561.7 544 544 544L144 544C99.8 544 64 508.2 64 464L64 128C64 110.3 78.3 96 96 96zM304 160C310.7 160 317.1 162.8 321.7 167.8L392.8 245.3L439 199C448.4 189.6 463.6 189.6 472.9 199L536.9 263C541.4 267.5 543.9 273.6 543.9 280L543.9 392C543.9 405.3 533.2 416 519.9 416L215.9 416C202.6 416 191.9 405.3 191.9 392L191.9 280C191.9 274 194.2 268.2 198.2 263.8L286.2 167.8C290.7 162.8 297.2 160 303.9 160z"/>
  </svg>
);

/**
 * Control panel for simulation controls
 */
export default function ControlPanel({
  day,
  totalZombies,
  minThreshold,
  size,
  config,
  mode,
  editAmount,
  onAdvanceDay,
  onReset,
  onResetDay,
  onResetToStartOfDay,
  onSizeChange,
  onConfigChange,
  onModeChange,
  onEditAmountChange,
  onSaveMap,
  onLoadMap,
  onManageMaps,
  onGenerateMap,
  savedMaps,
  hasMounted,
  originX,
  originY,
  onOriginChange,
  paintMode,
  onPaintModeChange
}) {
  return (
    <div className="control-panel">
      {/* Mode Switcher */}
      <div className="mode-switcher">
        <button
          className={mode === 'create' ? 'active' : ''}
          onClick={() => onModeChange('create')}
        >
          <PenIcon /> Create
        </button>
        <button
          className={mode === 'simulate' ? 'active' : ''}
          onClick={() => onModeChange('simulate')}
        >
          <ChartIcon /> Simulate
        </button>
      </div>

      <h2>Day {day}</h2>
      
      <div className="stats-grid">
        <div className="stat-item">
          <strong>Total Zombies:</strong><br />
          {formatNumber(totalZombies)}
        </div>
        <div className="stat-item">
          <strong>Min Threshold:</strong><br />
          {formatNumber(Math.round(minThreshold))}
        </div>
        <div className="stat-item">
          <strong>Map Size:</strong><br />
          {size}×{size}
        </div>
                <div className="stat-item">
          <strong>Status:</strong><br />
          <span style={{ color: totalZombies >= minThreshold ? '#4CAF50' : '#ff9800', fontWeight: 'bold' }}>
            {totalZombies >= minThreshold ? '✓ Above' : '⚠ Below'} Threshold
          </span>
        </div>
      </div>

      {mode === 'simulate' && (
        <div className="simulate-controls">
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#d4d4d4', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
              Paint Mode
            </label>
            <button 
              className={`toggle-button ${paintMode ? 'active' : ''}`}
              onClick={() => onPaintModeChange(!paintMode)}
            >
              <span className="toggle-slider"></span>
              <span className="toggle-label">{paintMode ? 'ON' : 'OFF'}</span>
            </button>
            <p style={{ fontSize: '11px', color: '#888', margin: '8px 0 0 0', fontStyle: 'italic' }}>
              {paintMode ? 'Drag to paint zombies' : 'Click for zone details'}
            </p>
          </div>
          
          {paintMode && (
            <>
              <label>
                Edit Amount (for click editing)
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editAmount}
                  onChange={(e) => onEditAmountChange(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '5px' }}
                />
              </label>
              <p style={{ fontSize: '12px', color: '#666', margin: '10px 0' }}>
                <strong>Left click drag:</strong> Add {editAmount} zombie{editAmount !== 1 ? 's' : ''}<br />
                <strong>Right click drag:</strong> Remove {editAmount} zombie{editAmount !== 1 ? 's' : ''}
              </p>
            </>
          )}
        </div>
      )}

      {mode === 'create' && (
        <div className="create-controls">
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#d4d4d4', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
              Paint Mode
            </label>
            <button 
              className={`toggle-button ${paintMode ? 'active' : ''}`}
              onClick={() => onPaintModeChange(!paintMode)}
            >
              <span className="toggle-slider"></span>
              <span className="toggle-label">{paintMode ? 'ON' : 'OFF'}</span>
            </button>
            <p style={{ fontSize: '11px', color: '#888', margin: '8px 0 0 0', fontStyle: 'italic' }}>
              {paintMode ? 'Drag to paint zombies' : 'Click to edit zone details'}
            </p>
          </div>
          
          {paintMode && (
            <>
              <label>
                Edit Amount
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editAmount}
                  onChange={(e) => onEditAmountChange(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '5px' }}
                />
              </label>
              <p style={{ fontSize: '12px', color: '#666', margin: '10px 0' }}>
                <strong>Left click drag:</strong> Add {editAmount} zombie{editAmount !== 1 ? 's' : ''}<br />
                <strong>Right click drag:</strong> Remove {editAmount} zombie{editAmount !== 1 ? 's' : ''}
              </p>
            </>
          )}
          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #4CAF50' }}>
            <strong style={{ display: 'block', marginBottom: '10px' }}>Town Origin Offset</strong>
            <label style={{ fontSize: '12px', marginBottom: '5px' }}>
              X Offset: {originX}
              <input
                type="range"
                min={-7}
                max={7}
                value={originX}
                onChange={(e) => onOriginChange('x', Number(e.target.value))}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </label>
            <label style={{ fontSize: '12px', marginTop: '10px' }}>
              Y Offset: {originY}
              <input
                type="range"
                min={-7}
                max={7}
                value={originY}
                onChange={(e) => onOriginChange('y', Number(e.target.value))}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </label>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
              Current town at ({originX}, {originY})<br/>
              Safe margin: 7 cells from each edge (independent)
            </p>
          </div>
        </div>
      )}

      <div className="controls">
        {mode === 'simulate' && (
          <>
            <button onClick={onAdvanceDay} className="primary">
              Advance to Day {day + 1}
            </button>
            {day > 1 && (
              <button onClick={onResetToStartOfDay} className="secondary">
                Reset to Start of Day
              </button>
            )}
            <button onClick={onResetDay} className="secondary">
              Reset to Day 1
            </button>
            <button onClick={onSaveMap} className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <SaveIcon /> Save Map
            </button>
            {hasMounted && savedMaps.length > 0 && (
              <button onClick={onManageMaps} className="secondary">
                Manage Saved Maps ({savedMaps.length})
              </button>
            )}
            <button onClick={onReset} className="danger">
              Clear Map
            </button>
          </>
        )}
        {mode === 'create' && (
          <>
            <button onClick={onGenerateMap} className="primary">
              Generate Map
            </button>
            <button onClick={onReset} className="danger">
              Clear Map
            </button>
            <button onClick={onSaveMap} className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <SaveIcon /> Save Map
            </button>
            {hasMounted && savedMaps.length > 0 && (
              <button onClick={onManageMaps} className="secondary">
                Manage Saved Maps ({savedMaps.length})
              </button>
            )}
          </>
        )}
      </div>

      <div className="config">
        <h3>Map Settings</h3>
        
        <label>
          Map Size
          <select value={size} onChange={(e) => onSizeChange(Number(e.target.value))}>
            <option value={25}>25×25</option>
            <option value={26}>26×26</option>
            <option value={27}>27×27</option>
          </select>
        </label>

        <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
          <strong>Game Settings (hardcoded):</strong><br />
          Respawn Threshold: {config.respawnThreshold}<br />
          Respawn Factor: {config.respawnFactor}<br />
          Free Spawn Count: {config.freeSpawnCount}<br />
          Free Spawn Min Dist: {config.freeSpawnDist}
        </div>
      </div>
    </div>
  );
}
