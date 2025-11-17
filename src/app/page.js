'use client';

import { useEffect } from 'react';
import Map from '@/components/Map';
import ControlPanel from '@/components/ControlPanel';
import ZoneInfo from '@/components/ZoneInfo';
import ZoneEditModal from '@/components/ZoneEditModal';
import SaveConfirmModal from '@/components/SaveConfirmModal';
import ManageMapsModal from '@/components/ManageMapsModal';
import { useSimulation } from '@/hooks/useSimulation';
import './zombie-simulator.css';

export default function Home() {
  const {
    state,
    selectedZone,
    mode,
    editAmount,
    savedMaps,
    hasMounted,
    originX,
    originY,
    paintMode,
    showSaveConfirm,
    showManageMaps,
    advanceDay,
    reset,
    generateNewMap,
    resetDay,
    resetToStartOfDay,
    changeSize,
    updateConfig,
    killZombies,
    addZombies,
    updateZone,
    selectZone,
    setMode,
    setEditAmount,
    setPaintMode,
    setShowSaveConfirm,
    setShowManageMaps,
    saveMap,
    loadMap,
    deleteMap,
    handleZoneEdit,
    handleZoneEnter,
    handleMouseUp,
    handleOriginChange
  } = useSimulation(25);

  // Add global mouseup listener to stop dragging
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const totalZombies = state.getTotalZombies();
  const minThreshold = state.getMinimumZombieThreshold();

  return (
    <div className="simulator-container">
      <h1>MyHordes Zombie Spread Simulator</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
        Simulates the MyHordes zombie spread algorithm. Click zones to inspect, advance days to see spread.
      </p>
      
      <div className="layout">
        <ControlPanel
          day={state.day}
          totalZombies={totalZombies}
          minThreshold={minThreshold}
          size={state.size}
          config={state.config}
          mode={mode}
          editAmount={editAmount}
          savedMaps={savedMaps}
          hasMounted={hasMounted}
          originX={originX}
          originY={originY}
          paintMode={paintMode}
          onAdvanceDay={advanceDay}
          onReset={reset}
          onResetDay={resetDay}
          onResetToStartOfDay={resetToStartOfDay}
          onSizeChange={changeSize}
          onConfigChange={updateConfig}
          onModeChange={setMode}
          onEditAmountChange={setEditAmount}
          onSaveMap={saveMap}
          onLoadMap={loadMap}
          onManageMaps={() => setShowManageMaps(true)}
          onGenerateMap={generateNewMap}
          onOriginChange={handleOriginChange}
          onPaintModeChange={setPaintMode}
        />

        <div className="map-container">
                <Map
        zones={state.zones}
        size={state.size}
        selectedZone={selectedZone}
        onZoneClick={handleZoneEdit}
        onZoneRightClick={(zone) => handleZoneEdit(zone, true)}
        onZoneEnter={handleZoneEnter}
        paintMode={paintMode}
        originX={originX}
        originY={originY}
      />
          
          {/* Zone info tooltip - only in simulate mode when not in paint mode */}
          {mode === 'simulate' && !paintMode && selectedZone && (
            <ZoneInfo
              zone={selectedZone}
              onKillZombies={(zone, amount) => { killZombies(zone, amount); selectZone(null); }}
              onAddZombies={(zone, amount) => { addZombies(zone, amount); selectZone(null); }}
              onClose={() => selectZone(null)}
            />
          )}
        </div>

        {/* Zone edit modal - only in create mode when not in paint mode */}
        {mode === 'create' && !paintMode && selectedZone && (
          <ZoneEditModal
            zone={selectedZone}
            onClose={() => selectZone(null)}
            onUpdate={updateZone}
          />
        )}
        
        {/* Save confirmation modal */}
        {showSaveConfirm && (
          <SaveConfirmModal onClose={() => setShowSaveConfirm(false)} />
        )}
        
        {/* Manage maps modal */}
        {showManageMaps && (
          <ManageMapsModal 
            savedMaps={savedMaps}
            onClose={() => setShowManageMaps(false)}
            onLoad={loadMap}
            onDelete={deleteMap}
          />
        )}
      </div>
    </div>
  );
}