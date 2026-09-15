import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { PlayButton } from './PlayButton';
import './MemeCard.css';

// A single, independent Memecard rendered directly in its category's
// collection — no popup needed to reach Play. Every card owns its own
// player; useAudioPlayer makes sure starting one stops any other that's
// mid-playback, and tears itself down if the card is ever removed from view.
//
// `canEdit` is only true for a card this viewer actually owns (their own
// wall card) or, for shared/official content, when they're an admin.
// `canAddToWall` is the alternative for everyone else viewing shared
// content: they can't edit the original, but can copy it to their own wall.
export function MemeCard({ card, canEdit, canAddToWall, onEdit, onAddToWall }) {
  const { status, progress, play } = useAudioPlayer(card.audio);

  return (
    <div className="meme-card">
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
