/**
 * Zone information tooltip/modal
 */
import { formatNumber } from '../lib/utils';

export default function ZoneInfo({ zone, onKillZombies, onAddZombies, onClose }) {
  if (!zone) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="zone-info-tooltip">
        <button className="close-btn" onClick={onClose}>×</button>
        
        <h3>Zone ({zone.x}, {zone.y})</h3>
        
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Zombies:</span>
            <span className="value">{formatNumber(zone.zombies)}</span>
          </div>
          <div className="info-item">
            <span className="label">Initial:</span>
            <span className="value">{formatNumber(zone.initialZombies)}</span>
          </div>
          <div className="info-item">
            <span className="label">Killed:</span>
            <span className="value">{formatNumber(zone.killed)}</span>
          </div>
          <div className="info-item">
            <span className="label">Despair:</span>
            <span className="value">{zone.despair}</span>
          </div>
          <div className="info-item">
            <span className="label">Distance:</span>
            <span className="value">{zone.distance} km</span>
          </div>
          <div className="info-item">
            <span className="label">Type:</span>
            <span className="value">{zone.isTown ? 'Town' : zone.isRuin ? 'Ruin' : 'Empty'}</span>
          </div>
          <div className="info-item">
            <span className="label">Danger:</span>
            <span className="value">Level {zone.getDangerLevel()}</span>
          </div>
        </div>

        {!zone.isTown && (
          <div className="tooltip-actions">
            <button 
              onClick={() => { onKillZombies(zone, 5); onClose(); }}
              className="btn-small danger"
              disabled={zone.zombies === 0}
            >
              Kill 5
            </button>
            <button 
              onClick={() => { onKillZombies(zone, zone.zombies); onClose(); }}
              className="btn-small danger"
              disabled={zone.zombies === 0}
            >
              Clear
            </button>
            <button 
              onClick={() => { onAddZombies(zone, 5); onClose(); }}
              className="btn-small secondary"
            >
              Add 5
            </button>
          </div>
        )}
      </div>
    </>
  );
}
