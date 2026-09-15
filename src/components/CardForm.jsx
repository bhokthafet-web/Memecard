import { useRef, useState } from 'react';
import './CardForm.css';

const EMOJI_CHOICES = ['🗂️', '📚', '🍎', '🐶', '🚗', '🌟', '🎵', '☀️', '🏠', '❤️', '🎉', '☕'];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Handles both creating a brand-new personal card and editing any existing
// card (built-in or personal) — pass `card` to edit it in place.
export function CardForm({ categoryTitle, card, scopeNote, onCancel, onSave }) {
  const isEditing = Boolean(card);
  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || '');
  const [emoji, setEmoji] = useState(card?.imageUrl ? EMOJI_CHOICES[0] : card?.image || EMOJI_CHOICES[0]);
  const [photo, setPhoto] = useState(card?.imageUrl || null);
  const [audio, setAudio] = useState(card?.audio || null);
  const [audioIsNew, setAudioIsNew] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const photoInputRef = useRef(null);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPhoto(dataUrl);
    } catch {
      setError('Could not read that image. Try a different one.');
    }
  };

  const handleAudioChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('Please choose an audio file.');
      return;
    }
    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAudio(dataUrl);
      setAudioIsNew(true);
    } catch {
      setError('Could not read that audio file. Try a different one.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Give your card a word or title.');
      return;
    }

    const payload = isEditing
      ? {
          title: trimmed,
          description: description.trim(),
          image: photo ? card.image : emoji,
          imageUrl: photo,
          audio,
        }
      : {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: trimmed,
          description: description.trim(),
          image: emoji,
          imageUrl: photo,
          color: '#efecfe',
          audio,
          custom: true,
        };

    try {
      setBusy(true);
      setError('');
      await onSave(payload);
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
        >
          ✕
        </button>

        <h2 className="card-form-heading">{isEditing ? 'Edit Memecard' : 'New Memecard'}</h2>
        <p className="card-form-subheading">
          {isEditing ? `Editing in ${categoryTitle}` : `Adding to ${categoryTitle}`}
        </p>

        <label className="card-form-field">
          <span>Title / word</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Bonjour"
            autoFocus
          />
        </label>

        <label className="card-form-field">
          <span>Description (optional)</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Hello / Good day"
          />
        </label>

        <div className="card-form-field">
          <span>Image</span>
          <div className="photo-picker">
            <div className="photo-preview" style={{ background: '#efecfe' }}>
              {photo ? <img src={photo} alt="" /> : <span aria-hidden="true">{emoji}</span>}
            </div>
            <div className="photo-picker-actions">
              <button
                type="button"
                className="photo-upload-btn pop-btn"
                onClick={() => photoInputRef.current?.click()}
              >
                📷 Upload photo
              </button>
              {photo && (
                <button type="button" className="photo-remove-btn" onClick={() => setPhoto(null)}>
                  Remove photo
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                hidden
              />
            </div>
          </div>

          {!photo && (
            <>
              <span className="card-form-or">or pick an emoji</span>
              <div className="emoji-picker">
                {EMOJI_CHOICES.map((choice) => (
                  <button
                    type="button"
                    key={choice}
                    className={`emoji-choice pop-btn ${emoji === choice ? 'is-selected' : ''}`}
                    onClick={() => setEmoji(choice)}
                    aria-pressed={emoji === choice}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <label className="card-form-field">
          <span>Audio (optional)</span>
          <input type="file" accept="audio/*" onChange={handleAudioChange} />
          {audio && (
            <span className="card-form-filename">
              {audioIsNew ? 'New audio selected' : 'Current audio kept'}
            </span>
          )}
          {audio && (
            <button
              type="button"
              className="audio-remove-btn"
              onClick={() => {
                setAudio(null);
                setAudioIsNew(false);
              }}
            >
              Remove audio
            </button>
          )}
        </label>

        {scopeNote && <p className="card-form-scope-note">{scopeNote}</p>}
        {error && <p className="card-form-error">{error}</p>}

        <div className="card-form-actions">
          <button type="button" className="card-form-cancel pop-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="card-form-save pop-btn" disabled={busy}>
            {busy ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Card'}
          </button>
        </div>
      </form>
    </div>
  );
}
