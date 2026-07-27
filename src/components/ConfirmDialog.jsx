export default function ConfirmDialog({ name, onCancel, onConfirm }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="sheet confirm" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-q">Remove <b>{name}</b> from your archive?</p>
        <p className="confirm-sub">Their tracked talents and artifacts will be cleared.</p>
        <div className="confirm-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-ghost danger solid" onClick={onConfirm}>Remove</button>
        </div>
      </div>
    </div>
  );
}
