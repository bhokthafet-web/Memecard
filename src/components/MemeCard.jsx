import { useRef } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { PlayButton } from './PlayButton';
import './MemeCard.css';

const MAX_TILT_DEG = 8;

// A single, independent Memecard rendered directly in its category's
// collection — no popup needed to reach Play. Every card owns its own
// player; useAudioPlayer makes sure starting one stops any other that's
// mid-playback, and tears itself down if the card is ever removed from view.
//
// `canEdit` is only true for a card this viewer actually owns (their own
// wall card) or, for shared/official content, when they're an admin.
// `canAddToWall` is the alternative for everyone else viewing shared
// content: they can't edit the original, but can copy it to their own wall.
// `canDelete` covers their own wall cards and, for admins, cards they
// created globally — never a real built-in card, which only exists in
// source and has no delete path.
export function MemeCard({ card, canEdit, canAddToWall, canDelete, onEdit, onAddToWall, onDelete }) {
  const { status, progress, play } = useAudioPlayer(card.audio);
  const cardRef = useRef(null);

  // Mouse-tracked 3D tilt: rotate the card toward the cursor and move the
  // glare highlight with it. Mutates the DOM directly (not React state) so
  // it stays smooth at 60fps without re-rendering on every pixel of movement.
  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${(-y * MAX_TILT_DEG).toFixed(2)}deg) rotateY(${(x * MAX_TILT_DEG).toFixed(2)}deg) translateY(-3px)`;
    el.style.setProperty('--glare-x', `${(x + 0.5) * 100}%`);
    el.style.setProperty('--glare-y', `${(y + 0.5) * 100}%`);
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (el) el.style.transform = '';
  };

  return (
    <div
      className="meme-card"
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="meme-card-glare" aria-hidden="true" />

      <div className="meme-card-actions">
        {canAddToWall && (
          <button
            type="button"
            className="meme-card-action pop-btn"
            onClick={() => onAddToWall(card)}
            aria-label={`Add ${card.title} to my wall`}
            title="Add to my wall"
          >
            📥
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            className="meme-card-action pop-btn"
            onClick={() => onEdit(card)}
            aria-label={`Edit ${card.title}`}
            title="Edit"
          >
            ✏️
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="meme-card-action meme-card-action-danger pop-btn"
            onClick={() => onDelete(card)}
            aria-label={`Delete ${card.title}`}
            title="Delete"
          >
            🗑️
          </button>
        )}
      </div>

      <div className="meme-card-image" style={{ background: card.color || '#efecfe' }}>
        {card.imageUrl ? (
          <img src={card.imageUrl} alt="" />
        ) : (
          <span aria-hidden="true">{card.image || '🗂️'}</span>
        )}
      </div>

      <h3 className="meme-card-title">{card.title}</h3>
      {card.description && <p className="meme-card-desc">{card.description}</p>}

      <PlayButton status={status} progress={progress} onPlay={play} />
    </div>
  );
}
