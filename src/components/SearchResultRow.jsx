import { useAudioPlayer } from '../hooks/useAudioPlayer';
import './SearchResultRow.css';

// A compact, single-line version of MemeCard for search results — just
// enough to identify the card and play it immediately, no edit/delete
// clutter. Reuses useAudioPlayer directly, so playing one of these
// correctly stops any other card playing anywhere in the app (same
// cross-card singleton as the main grid).
export function SearchResultRow({ card, categoryTitle, onOpenCategory }) {
  const { status, play, progressElRef } = useAudioPlayer(card.audio);
  const isPlaying = status === 'playing';
  const isError = status === 'error';

  return (
    <div className="search-result">
      <div className="search-result-row">
        <button type="button" className="search-result-main" onClick={() => onOpenCategory(card)}>
          <span className="search-result-image" style={{ background: card.color || '#efecfe' }}>
            {card.imageUrl ? (
              <img src={card.imageUrl} alt="" />
            ) : (
              <span aria-hidden="true">{card.image || '🗂️'}</span>
            )}
          </span>
          <span className="search-result-text">
            <span className="search-result-title">{card.title}</span>
            <span className="search-result-category">{categoryTitle}</span>
          </span>
        </button>

        <button
          type="button"
          className={`search-result-play pop-btn ${isPlaying ? 'is-playing' : ''} ${isError ? 'is-error' : ''}`}
          onClick={play}
          disabled={isPlaying || isError}
          aria-label={isPlaying ? 'Playing audio' : `Play ${card.title}`}
        >
          {isError ? '⚠️' : isPlaying ? '🔊' : '▶'}
        </button>
      </div>

      <div className="search-result-progress" aria-hidden="true">
        <div className="search-result-progress-fill" ref={progressElRef} />
      </div>
    </div>
  );
}
