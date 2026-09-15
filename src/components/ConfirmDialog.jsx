import { useState } from 'react';
import './ConfirmDialog.css';

// A small in-app confirm, styled to match the rest of the app instead of a
// jarring native window.confirm() popup.
export function ConfirmDialog({ title, body, confirmLabel = 'Delete', onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    try {
      setBusy(true);
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="confirm-overlay" role="alertdialog" aria-modal="true">
      <div className="confirm-dialog">
        <h2 className="confirm-title">{title}</h2>
        <p className="confirm-body">{body}</p>
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel pop-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="confirm-delete pop-btn" onClick={handleConfirm} disabled={busy}>
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
