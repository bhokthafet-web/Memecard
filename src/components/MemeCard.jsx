import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { PlayButton } from './PlayButton';
import './MemeCard.css';

// A single, independent Memecard rendered directly in its category's
// collection — no popup needed to reach Play. Every card owns its own
// player; useAudioPlayer makes sure starting one stops any other that's
// mid-playback, and tears itself down if the card is ever removed from view.
export function MemeCard({ card, onEdit }) {
  const { status, progress, play } = useAudioPlayer(card.audio);

  return (
    <div className="meme-card">
      <button
        type="button"
        className="meme-card-edit pop-btn"
        onClick={() => onEdit(card)}
        aria-label={`Edit ${card.title}`}
      >
        ✏️
      </button>

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
