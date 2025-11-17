/**
 * Custom hook for managing simulation state
 */
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { SimulationState } from '../lib/types';
import { generateMap, generateEmptyMap } from '../lib/mapGenerator';
import { simulateDay, killZombies as killZombiesUtil, addZombies as addZombiesUtil } from '../lib/zombieSpread';

export function useSimulation(initialSize = 25) {
  const [state, setState] = useState(() => {
    const simState = new SimulationState(initialSize);
    // Don't generate map on server - will be generated on client mount
    if (typeof window !== 'undefined') {
      simState.zones = generateEmptyMap(initialSize, 0, 0);
    }
    return simState;
  });
  
  // Generate empty map on client mount if not already generated
  useEffect(() => {
    if (state.zones.size === 0) {
      setState(prevState => {
        const newState = new SimulationState(prevState.size);
        newState.config = prevState.config;
        newState.zones = generateEmptyMap(newState.size, 0, 0);
        return newState;
      });
    }
  }, [state.zones.size]);

  // Use ref to track current zones for batching
  const zonesRef = useRef(state.zones);
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef(null);
  const editAmountRef = useRef(5);
  
  const [selectedZone, setSelectedZone] = useState(null);
  const [mode, setMode] = useState('create'); // 'simulate' or 'create'
  const [editAmount, setEditAmount] = useState(5);
  const [originX, setOriginX] = useState(0);
  const [originY, setOriginY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // 'add' or 'remove'
  const [paintMode, setPaintMode] = useState(true); // true = drag to paint, false = click to edit details
  const pendingUpdatesRef = useRef(new Map()); // Use ref for batching
  const rafIdRef = useRef(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [savedMaps, setSavedMaps] = useState([]);
  const [hasMounted, setHasMounted] = useState(false);
  const [dayStartSnapshot, setDayStartSnapshot] = useState(null);
  const [showManageMaps, setShowManageMaps] = useState(false);
  
  // Load saved maps only on client after mount to avoid hydration mismatch
  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('myhordes-saved-maps');
      if (saved) {
        setSavedMaps(JSON.parse(saved));
      }
    }
  }, []);
  
  // Update refs whenever state changes
  useEffect(() => {
    zonesRef.current = state.zones;
  }, [state.zones]);
  
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);
  
  useEffect(() => {
    editAmountRef.current = editAmount;
  }, [editAmount]);

  /**
   * Advances to the next day
   */
  const advanceDay = useCallback(() => {
    let snapshotToSave = null;
    
    setState(prevState => {
      // Save current state to history
      prevState.saveToHistory();

      // Clone zones map
      const newZones = new Map(
        Array.from(prevState.zones.entries()).map(([key, zone]) => [key, zone.clone()])
      );

      // Simulate the day (despair + spread)
      simulateDay(newZones, prevState.day + 1, prevState.config);

      // Create new state
      const newState = new SimulationState(prevState.size);
      newState.zones = newZones;
      newState.day = prevState.day + 1;
      newState.history = prevState.history;
      newState.config = prevState.config;

      // Prepare snapshot to save AFTER state update
      snapshotToSave = {
        day: newState.day,
        zones: new Map(
          Array.from(newState.zones.entries()).map(([key, zone]) => [key, zone.clone()])
        )
      };

      return newState;
    });

    // Save snapshot after state update completes
    if (snapshotToSave) {
      setDayStartSnapshot(snapshotToSave);
    }

    // Update selected zone if it exists
    if (selectedZone) {
      setSelectedZone(prev => {
        const updated = state.zones.get(prev.key);
        return updated ? updated.clone() : null;
      });
    }
  }, [state, selectedZone]);

  /**
   * Clears the map (creates empty map)
   */
  const reset = useCallback(() => {
    setState(prevState => {
      const newState = new SimulationState(prevState.size);
      newState.config = prevState.config;
      newState.zones = generateEmptyMap(newState.size, originX, originY);
      newState.originX = originX;
      newState.originY = originY;
      return newState;
    });
    setSelectedZone(null);
  }, [originX, originY]);

  /**
   * Generates a new random map with zombies and buildings
   */
  const generateNewMap = useCallback(() => {
    setState(prevState => {
      const newState = new SimulationState(prevState.size);
      newState.config = prevState.config;
      newState.zones = generateMap(newState.size, newState.config, originX, originY);
      newState.originX = originX;
      newState.originY = originY;
      return newState;
    });
    setSelectedZone(null);
  }, [originX, originY]);

  /**
   * Resets to the start of the current day
   */
  const resetToStartOfDay = useCallback(() => {
    if (!dayStartSnapshot) return;
    
    setState(prevState => {
      const newState = new SimulationState(prevState.size);
      newState.day = dayStartSnapshot.day;
      newState.zones = new Map(
        Array.from(dayStartSnapshot.zones.entries()).map(([key, zone]) => [key, zone.clone()])
      );
      newState.config = prevState.config;
      newState.history = prevState.history;
      newState.originX = prevState.originX;
      newState.originY = prevState.originY;
      return newState;
    });
    setSelectedZone(null);
  }, [dayStartSnapshot]);

  /**
   * Resets current map to day 1 (keeps zombies, resets day counter)
   */
  const resetDay = useCallback(() => {
    setState(prevState => {
      const newState = Object.assign(
        Object.create(Object.getPrototypeOf(prevState)),
        prevState
      );
      newState.day = 1;
      newState.history = [];
      
      // Reset all zones to their start zombies
      const newZones = new Map();
      prevState.zones.forEach((zone, key) => {
        const resetZone = zone.clone();
        resetZone.zombies = zone.startZombies;
        resetZone.initialZombies = zone.startZombies;
        newZones.set(key, resetZone);
      });
      newState.zones = newZones;
      
      return newState;
    });
    setSelectedZone(null);
  }, []);

  /**
   * Changes the map size while preserving existing zones
   */
  const changeSize = useCallback((newSize) => {
    setState(prevState => {
      const newState = new SimulationState(newSize);
      newState.config = prevState.config;
      newState.day = prevState.day;
      newState.history = prevState.history;
      
      // Create empty map of new size
      const newZones = generateEmptyMap(newSize, originX, originY);
      
      // Copy over existing zones that fit in the new size
      prevState.zones.forEach((zone, key) => {
        if (newZones.has(key)) {
          newZones.set(key, zone.clone());
        }
      });
      
      newState.zones = newZones;
      newState.originX = originX;
      newState.originY = originY;
      return newState;
    });
    setSelectedZone(null);
    // Reset origin when changing size
    setOriginX(0);
    setOriginY(0);
  }, [originX, originY]);

  /**
   * Updates a configuration value
   */
  const updateConfig = useCallback((key, value) => {
    setState(prevState => {
      const newState = Object.assign(
        Object.create(Object.getPrototypeOf(prevState)),
        prevState
      );
      newState.config[key] = value;
      return newState;
    });
  }, []);

  /**
   * Kills zombies on a specific zone
   */
  const killZombies = useCallback((zone, amount) => {
    setState(prevState => {
      const newZones = new Map(prevState.zones);
      killZombiesUtil(newZones, zone.x, zone.y, amount);
      
      const newState = Object.assign(
        Object.create(Object.getPrototypeOf(prevState)),
        prevState
      );
      newState.zones = newZones;
      return newState;
    });

    // Update selected zone
    if (selectedZone && selectedZone.x === zone.x && selectedZone.y === zone.y) {
      const updated = state.zones.get(zone.key);
      setSelectedZone(updated ? updated.clone() : null);
    }
  }, [state, selectedZone]);

  /**
   * Adds zombies to a specific zone
   */
  const addZombies = useCallback((zone, amount) => {
    setState(prevState => {
      const newZones = new Map(prevState.zones);
      addZombiesUtil(newZones, zone.x, zone.y, amount);
      
      const newState = Object.assign(
        Object.create(Object.getPrototypeOf(prevState)),
        prevState
      );
      newState.zones = newZones;
      return newState;
    });

    // Update selected zone
    if (selectedZone && selectedZone.x === zone.x && selectedZone.y === zone.y) {
      const updated = state.zones.get(zone.key);
      setSelectedZone(updated ? updated.clone() : null);
    }
  }, [state, selectedZone]);

  /**
   * Selects a zone
   */
  const selectZone = useCallback((zone) => {
    setSelectedZone(zone ? zone.clone() : null);
  }, []);

  /**
   * Applies pending zone updates in a batch
   */
  const applyPendingUpdates = useCallback(() => {
    console.log('[RAF] applyPendingUpdates called, isDragging:', isDraggingRef.current);
    const currentPending = pendingUpdatesRef.current;
    
    if (currentPending.size === 0) {
      console.log('[RAF] No pending updates to apply');
      rafIdRef.current = null;
      
      // If still dragging, schedule next RAF
      if (isDraggingRef.current) {
        console.log('[RAF] Still dragging, scheduling next RAF');
        rafIdRef.current = requestAnimationFrame(applyPendingUpdates);
      }
      return;
    }
    
    console.log('[RAF] Applying', currentPending.size, 'pending updates:', Array.from(currentPending.entries()));
    
    setState(prevState => {
      const newZones = new Map(prevState.zones);
      
      // Apply all pending updates at once
      currentPending.forEach((zombieCount, zoneKey) => {
        const targetZone = newZones.get(zoneKey);
        if (targetZone) {
          const updatedZone = targetZone.clone();
          updatedZone.zombies = Math.max(0, zombieCount);
          newZones.set(zoneKey, updatedZone);
        }
      });
      
      const newState = Object.assign(
        Object.create(Object.getPrototypeOf(prevState)),
        prevState
      );
      newState.zones = newZones;
      return newState;
    });
    
    // Clear pending updates after applying
    pendingUpdatesRef.current = new Map();
    console.log('[RAF] Batch applied, clearing pending updates');
    
    // If still dragging, schedule next RAF immediately
    if (isDraggingRef.current) {
      console.log('[RAF] Still dragging, scheduling next RAF');
      rafIdRef.current = requestAnimationFrame(applyPendingUpdates);
    } else {
      rafIdRef.current = null;
      console.log('[RAF] Drag ended, stopping RAF loop');
    }
  }, []);

  /**
   * Queues a zone update and schedules RAF batch
   */
  const queueZoneUpdate = useCallback((zone, amount) => {
    if (!zone || zone.isTown) return;
    
    console.log('[QUEUE] Queueing update for zone', zone.key, 'amount:', amount);
    
    // Use ref to get latest zone data
    const currentZombies = zonesRef.current.get(zone.key)?.zombies || 0;
    const pendingZombies = pendingUpdatesRef.current.get(zone.key) ?? currentZombies;
    const newZombieCount = Math.max(0, pendingZombies + amount);
    
    console.log('[QUEUE] Zone', zone.key, '- current:', currentZombies, 'pending:', pendingZombies, 'new:', newZombieCount);
    pendingUpdatesRef.current.set(zone.key, newZombieCount);
    
    // Schedule RAF if not already scheduled
    if (rafIdRef.current === null) {
      console.log('[QUEUE] Scheduling RAF');
      rafIdRef.current = requestAnimationFrame(applyPendingUpdates);
    } else {
      console.log('[QUEUE] RAF already scheduled, will batch with existing');
    }
  }, [applyPendingUpdates]);

  /**
   * Handles zone click in create/simulate mode
   */
  const handleZoneEdit = useCallback((zone, isRightClick = false) => {
    console.log('[EDIT] handleZoneEdit', { zone: zone?.key, isRightClick, mode, paintMode, isDragging });
    
    if (!zone || zone.isTown) {
      if (mode === 'simulate' && !isDragging) selectZone(zone);
      return;
    }

    // In create mode without paint mode, just select the zone for editing
    if (mode === 'create' && !paintMode) {
      console.log('[EDIT] Create mode - selecting zone');
      selectZone(zone);
      return;
    }

    // In simulate mode without paint mode, select zone for info
    if (mode === 'simulate' && !paintMode) {
      console.log('[EDIT] Simulate mode - selecting zone');
      selectZone(zone);
      return;
    }

    // Paint mode enabled - allow drag painting
    if ((mode === 'create' || mode === 'simulate') && paintMode) {
      // Start dragging
      const newDragMode = isRightClick ? 'remove' : 'add';
      console.log('[EDIT] Starting drag, mode:', newDragMode);
      setIsDragging(true);
      isDraggingRef.current = true; // Update ref immediately for synchronous access
      setDragMode(newDragMode);
      dragModeRef.current = newDragMode; // Update ref immediately for synchronous access
      
      const amount = isRightClick ? -editAmountRef.current : editAmountRef.current;
      queueZoneUpdate(zone, amount);
    }
  }, [mode, selectZone, isDragging, paintMode, queueZoneUpdate]);

  /**
   * Handles mouse enter on zone during drag
   */
  const handleZoneEnter = useCallback((zone) => {
    // Use refs for synchronous access since state updates are async
    const currentlyDragging = isDraggingRef.current;
    const currentDragMode = dragModeRef.current;
    
    if (!paintMode || !currentlyDragging || !zone || zone.isTown || !currentDragMode) {
      if (zone && !zone.isTown) {
        console.log('[ENTER] Skipped zone', zone.key, { paintMode, isDragging: currentlyDragging, dragMode: currentDragMode });
      }
      return;
    }

    console.log('[ENTER] Mouse entered zone', zone.key, 'dragMode:', currentDragMode);
    const amount = currentDragMode === 'remove' ? -editAmountRef.current : editAmountRef.current;
    queueZoneUpdate(zone, amount);
  }, [paintMode, queueZoneUpdate]);

  /**
   * Handles mouse up to end dragging
   */
  const handleMouseUp = useCallback(() => {
    console.log('[MOUSEUP] Mouse up, isDragging:', isDragging, 'rafId:', rafIdRef.current);
    if (isDragging) {
      // Apply any remaining pending updates immediately
      console.log('[MOUSEUP] Ending drag, applying final updates if any');
      
      // Set isDragging and dragMode to false/null immediately
      isDraggingRef.current = false; // Update ref first for synchronous access
      dragModeRef.current = null; // Clear drag mode ref
      
      // Cancel the RAF loop
      if (rafIdRef.current !== null) {
        console.log('[MOUSEUP] Canceling RAF loop');
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      
      // Apply any remaining pending updates
      if (pendingUpdatesRef.current.size > 0) {
        console.log('[MOUSEUP] Applying', pendingUpdatesRef.current.size, 'remaining updates');
        const currentPending = pendingUpdatesRef.current;
        
        setState(prevState => {
          const newZones = new Map(prevState.zones);
          
          currentPending.forEach((zombieCount, zoneKey) => {
            const targetZone = newZones.get(zoneKey);
            if (targetZone) {
              const updatedZone = targetZone.clone();
              updatedZone.zombies = Math.max(0, zombieCount);
              newZones.set(zoneKey, updatedZone);
            }
          });
          
          const newState = Object.assign(
            Object.create(Object.getPrototypeOf(prevState)),
            prevState
          );
          newState.zones = newZones;
          return newState;
        });
        
        pendingUpdatesRef.current = new Map();
      }
    }
    setIsDragging(false);
    setDragMode(null);
    console.log('[MOUSEUP] Drag ended');
  }, [isDragging]);

  /**
   * Saves current map configuration to localStorage
   */
  const saveMap = useCallback(() => {
    const timestamp = new Date().toLocaleString();
    const mapData = {
      name: `Map - Day ${state.day} - ${timestamp}`,
      timestamp,
      size: state.size,
      day: state.day,
      originX: state.originX || originX,
      originY: state.originY || originY,
      zones: Array.from(state.zones.entries()).map(([key, zone]) => ({
        key,
        x: zone.x,
        y: zone.y,
        zombies: zone.zombies,
        initialZombies: zone.initialZombies,
        startZombies: zone.startZombies,
        hasBuilding: zone.hasBuilding,
        isRuin: zone.isRuin
      }))
    };

    const newSavedMaps = [...savedMaps, mapData];
    setSavedMaps(newSavedMaps);
    if (typeof window !== 'undefined') {
      localStorage.setItem('myhordes-saved-maps', JSON.stringify(newSavedMaps));
    }
    setShowSaveConfirm(true);
  }, [state, savedMaps, originX, originY]);

  /**
   * Loads a saved map from localStorage
   */
  const loadMap = useCallback((index) => {
    const mapData = savedMaps[index];
    if (!mapData) return;

    const newState = new SimulationState(mapData.size);
    newState.day = mapData.day;
    newState.originX = mapData.originX || 0;
    newState.originY = mapData.originY || 0;
    newState.zones = new Map();

    // Recreate all zones
    const offset = Math.floor(mapData.size / 2);
    for (let x = -offset; x <= offset; x++) {
      for (let y = -offset; y <= offset; y++) {
        const zone = new (require('../lib/types').Zone)(x, y);
        newState.zones.set(zone.key, zone);
      }
    }

    // Restore saved zone data
    mapData.zones.forEach(savedZone => {
      const zone = newState.zones.get(savedZone.key);
      if (zone) {
        zone.zombies = savedZone.zombies;
        zone.initialZombies = savedZone.initialZombies;
        zone.startZombies = savedZone.startZombies;
        zone.hasBuilding = savedZone.hasBuilding;
        zone.isRuin = savedZone.isRuin;
      }
    });

    setState(newState);
    setOriginX(newState.originX);
    setOriginY(newState.originY);
    setDayStartSnapshot(null);
    setSelectedZone(null);
  }, [savedMaps]);

  /**
   * Deletes a saved map from localStorage
   */
  const deleteMap = useCallback((index) => {
    const newSavedMaps = savedMaps.filter((_, idx) => idx !== index);
    setSavedMaps(newSavedMaps);
    if (typeof window !== 'undefined') {
      localStorage.setItem('myhordes-saved-maps', JSON.stringify(newSavedMaps));
    }
  }, [savedMaps]);

  /**
   * Updates a zone's properties
   */
  const updateZone = useCallback((zone, updates) => {
    setState(prevState => {
      const newZones = new Map(prevState.zones);
      const targetZone = newZones.get(zone.key);
      
      if (targetZone) {
        const updatedZone = targetZone.clone();
        Object.assign(updatedZone, updates);
        newZones.set(zone.key, updatedZone);
      }
      
      const newState = Object.assign(
        Object.create(Object.getPrototypeOf(prevState)),
        prevState
      );
      newState.zones = newZones;
      return newState;
    });
    
    // Update selected zone if it's the same
    if (selectedZone && selectedZone.key === zone.key) {
      const updated = state.zones.get(zone.key);
      setSelectedZone(updated ? updated.clone() : null);
    }
  }, [state, selectedZone]);

  /**
   * Handles origin offset changes
   */
  const handleOriginChange = useCallback((axis, value) => {
    if (axis === 'x') {
      setOriginX(value);
    } else {
      setOriginY(value);
    }
    
    // Regenerate map with new origin
    setState(prevState => {
      const newOriginX = axis === 'x' ? value : originX;
      const newOriginY = axis === 'y' ? value : originY;
      
      const newState = new SimulationState(prevState.size);
      newState.config = prevState.config;
      newState.day = prevState.day;
      newState.zones = generateMap(newState.size, newState.config, newOriginX, newOriginY);
      newState.originX = newOriginX;
      newState.originY = newOriginY;
      return newState;
    });
  }, [originX, originY]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    state,
    selectedZone,
    mode,
    editAmount,
    savedMaps,
    hasMounted,
    originX,
    originY,
    isDragging,
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
  };
}
