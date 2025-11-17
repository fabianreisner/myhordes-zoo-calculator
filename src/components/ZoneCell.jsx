'use client';

import { memo } from 'react';

const HouseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="24" height="24" fill="currentColor" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
    <path d="M341.8 72.6C329.5 61.2 310.5 61.2 298.3 72.6L74.3 280.6C64.7 289.6 61.5 303.5 66.3 315.7C71.1 327.9 82.8 336 96 336L112 336L112 512C112 547.3 140.7 576 176 576L464 576C499.3 576 528 547.3 528 512L528 336L544 336C557.2 336 569 327.9 573.8 315.7C578.6 303.5 575.4 289.5 565.8 280.6L341.8 72.6zM304 384L336 384C362.5 384 384 405.5 384 432L384 528L256 528L256 432C256 405.5 277.5 384 304 384z"/>
  </svg>
);

/**
 * Individual zone cell component - Memoized for performance
 */
function ZoneCell({ zone, isSelected, onMouseDown, onRightClick, onMouseEnter }) {
  if (!zone) return null;

  const dangerClass = `danger${zone.getDangerLevel()}`;

  const classNames = [
    'mapzone',
    dangerClass,
    zone.isTown ? 'city' : '',
    isSelected ? 'selectedZone' : ''
  ].filter(Boolean).join(' ');

  const handleContextMenu = (e) => {
    e.preventDefault();
    // Don't call onRightClick here - it's handled by onMouseDown
  };

  const handleMouseDown = (e) => {
    if (e.button === 2) {
      // Right click
      e.preventDefault();
      if (onRightClick) {
        onRightClick(zone);
      }
    } else if (e.button === 0) {
      // Left click
      if (onMouseDown) {
        onMouseDown(e);
      }
    }
  };

  return (
    <li 
      className={classNames} 
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      {...(onMouseEnter && { onMouseEnter })}
      data-zone-key={zone.key}
    >
      {zone.isTown ? (
        <div className="town-house"><HouseIcon /></div>
      ) : zone.hasBuilding ? (
        <div className={`building ${zone.isRuin ? 'building-ruin' : ''}`} />
      ) : null}
      {zone.zombies > 0 && (
        <div className="zombies zombie-exact">{zone.zombies}</div>
      )}
    </li>
  );
}

// Memoize with custom comparison - only re-render if zone data or selection changes
export default memo(ZoneCell, (prevProps, nextProps) => {
  if (!prevProps.zone || !nextProps.zone) return false;
  
  return (
    prevProps.zone.zombies === nextProps.zone.zombies &&
    prevProps.zone.hasBuilding === nextProps.zone.hasBuilding &&
    prevProps.zone.isRuin === nextProps.zone.isRuin &&
    prevProps.zone.isTown === nextProps.zone.isTown &&
    prevProps.isSelected === nextProps.isSelected
  );
});
