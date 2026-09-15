import { useState } from 'react';
import './CardForm.css';

// Editing a category's own title/emoji/description — same admin-vs-personal
// scope model as editing a card (see App.jsx).
export function CategoryForm({ category, scopeNote, onCancel, onSave }) {
  const [title, setTitle] = useState(category.title);
  const [description, setDescription] = useState(category.description || '');
  const [emoji, setEmoji] = useState(category.emoji || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Give the category a name.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      await onSave({
        title: trimmed,
        description: description.trim(),
        emoji: emoji.trim() || category.emoji,
      });
    } catch (err) {
      setError(err?.message || 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-form-overlay" role="dialog" aria-modal="true">
      <form className="card-form" onSubmit={handleSubmit}>
        <button
          type="button"
          className="card-form-close pop-btn"
          onClick={onCancel}
          aria-label="Cancel"
          disabled={busy}
        >
          ✕
        </button>

        <h2 className="card-form-heading">Edit Category</h2>

        <label className="card-form-field">
          <span>Icon (emoji)</span>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            autoFocus
          />
        </label>

        <label className="card-form-field">
          <span>Name</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="card-form-field">
          <span>Description (optional)</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {scopeNote && <p className="card-form-scope-note">{scopeNote}</p>}
        {error && <p className="card-form-error">{error}</p>}

        <div className="card-form-actions">
          <button type="button" className="card-form-cancel pop-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="card-form-save pop-btn" disabled={busy}>
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
