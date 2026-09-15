import { useState } from 'react';
import './CardForm.css';

const DEFAULT_EMOJI = '🗂️';

// Editing a category's own title/emoji/description — admin-only (see
// App.jsx). Pass no `category` to create a brand-new one instead (also
// admin-only — see App.jsx's "+ New" tab). The icon is entirely optional:
// leave it blank and a generic folder icon is used automatically.
export function CategoryForm({ category, scopeNote, onCancel, onSave }) {
  const isEditing = Boolean(category);
  const [title, setTitle] = useState(category?.title || '');
  const [description, setDescription] = useState(category?.description || '');
  const [emoji, setEmoji] = useState(isEditing ? category.emoji || '' : '');
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
        emoji: emoji.trim() || DEFAULT_EMOJI,
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

        <h2 className="card-form-heading">{isEditing ? 'Edit Category' : 'New Category'}</h2>

        <label className="card-form-field">
          <span>Name</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Japanese Basics"
            autoFocus
          />
        </label>

        <label className="card-form-field">
          <span>Icon (optional)</span>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder={DEFAULT_EMOJI}
            maxLength={4}
          />
        </label>

        <label className="card-form-field">
          <span>Description (optional)</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Everyday greetings and polite phrases"
          />
        </label>

        {scopeNote && <p className="card-form-scope-note">{scopeNote}</p>}
        {error && <p className="card-form-error">{error}</p>}

        <div className="card-form-actions">
          <button type="button" className="card-form-cancel pop-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="card-form-save pop-btn" disabled={busy}>
            {busy ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </form>
    </div>
  );
}
