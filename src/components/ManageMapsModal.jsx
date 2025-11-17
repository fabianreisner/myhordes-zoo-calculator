'use client';

/**
 * Modal for managing (loading/deleting) saved maps
 */
export default function ManageMapsModal({ savedMaps, onClose, onLoad, onDelete }) {
  if (savedMaps.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>Manage Saved Maps</h3>
          
          <p style={{ color: '#8a7d6f', textAlign: 'center', padding: '20px 0' }}>
            No saved maps yet.
          </p>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content manage-maps-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Manage Saved Maps</h3>
        
        <div className="saved-maps-list">
          {savedMaps.map((save, idx) => (
            <div key={idx} className="saved-map-item">
              <div className="saved-map-info">
                <div className="saved-map-name">{save.name}</div>
                <div className="saved-map-details">
                  Size: {save.size}×{save.size} | Day: {save.day}
                </div>
              </div>
              <div className="saved-map-actions">
                <button 
                  onClick={() => { onLoad(idx); onClose(); }}
                  className="btn-small secondary"
                >
                  Load
                </button>
                <button 
                  onClick={() => onDelete(idx)}
                  className="btn-small danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}
