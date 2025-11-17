'use client';

/**
 * Modal for editing zone details in create mode
 */
export default function ZoneEditModal({ zone, onClose, onUpdate }) {
  if (!zone) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = {
      zombies: Math.max(0, parseInt(formData.get('zombies')) || 0),
      hasBuilding: formData.get('hasBuilding') === 'on',
      isRuin: formData.get('isRuin') === 'on'
    };
    onUpdate(zone, updates);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Zone ({zone.x}, {zone.y})</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Zombies:
              <input
                type="number"
                name="zombies"
                defaultValue={zone.zombies}
                min="0"
                max="999"
                autoFocus
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="hasBuilding"
                defaultChecked={zone.hasBuilding}
              />
              Has Building
            </label>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
