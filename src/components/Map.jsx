/**
 * Main map component that renders the grid
 */
import { memo, useMemo } from 'react';
import ZoneCell from './ZoneCell';

function Map({ zones, size, selectedZone, onZoneClick, onZoneRightClick, onZoneEnter, paintMode, originX = 0, originY = 0 }) {
  const offset = Math.floor(size / 2);
  
  // Memoize rulers to avoid recalculation
  const rulers = useMemo(() => {
    const result = [];
    for (let i = 0; i < size; i++) {
      result.push(i - offset - originX);
    }
    return result;
  }, [size, offset, originX]);

  // Memoize rows to avoid recalculation
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < size; i++) {
      const y = offset - i - originY; // Positive Y at top
      result.push(y);
    }
    return result;
  }, [size, offset, originY]);

  return (
    <div id="map-wrapper">
      <div id="map">
        {/* Top ruler bar */}
        <ul className="maprow maprulebar-top">
          <li className="mapcorner first"></li>
          {rulers.map(x => (
            <li key={`top-${x}`} className="mapruler">{x}</li>
          ))}
          <li className="mapcorner last"></li>
        </ul>

        {/* Map rows */}
        {rows.map(y => (
          <ul key={`row-${y}`} className="maprow">
            {/* Left ruler */}
            <li className="mapruler">{y}</li>
            
            {/* Zone cells */}
            {rulers.map(x => {
              const zone = zones.get(`${x},${y}`);
              const isSelected = selectedZone && 
                                selectedZone.x === x && 
                                selectedZone.y === y;
              
              return (
                <ZoneCell
                  key={`${x},${y}`}
                  zone={zone}
                  isSelected={isSelected}
                  onMouseDown={() => onZoneClick(zone)}
                  onRightClick={onZoneRightClick}
                  onMouseEnter={paintMode ? () => onZoneEnter && onZoneEnter(zone) : undefined}
                />
              );
            })}
            
            {/* Right ruler */}
            <li className="mapruler">{y}</li>
          </ul>
        ))}

        {/* Bottom ruler bar */}
        <ul className="maprow maprulebar-bottom">
          <li className="mapcorner first"></li>
          {rulers.map(x => (
            <li key={`bottom-${x}`} className="mapruler">{x}</li>
          ))}
          <li className="mapcorner last"></li>
        </ul>
      </div>
    </div>
  );
}

// Memoize Map component - re-render when zones, selection, or paintMode changes
export default memo(Map, (prevProps, nextProps) => {
  return (
    prevProps.zones === nextProps.zones &&
    prevProps.selectedZone === nextProps.selectedZone &&
    prevProps.paintMode === nextProps.paintMode &&
    prevProps.originX === nextProps.originX &&
    prevProps.originY === nextProps.originY
  );
});
