import './PlayButton.css';

// Presentational only — the parent owns the useAudioPlayer() instance so it can
// stop/reset playback itself when the card closes (leaving the card).
// `progressElRef` is attached directly to the fill div — useAudioPlayer
// mutates its transform on every audio tick without going through React
// state, so a card playing doesn't re-render (and repaint its
// backdrop-filter) several times a second.
export function PlayButton({ status, onPlay, progressElRef }) {
  const isPlaying = status === 'playing';
  const isError = status === 'error';

  return (
    <div className="play-button-wrap">
      <button
        type="button"
        className={`play-button pop-btn ${isPlaying ? 'is-playing' : ''} ${isError ? 'is-error' : ''}`}
        onClick={onPlay}
        disabled={isPlaying || isError}
        aria-label={isPlaying ? 'Playing audio' : 'Play audio'}
      >
        <span className="play-button-icon" aria-hidden="true">
          {isError ? '⚠️' : isPlaying ? '🔊' : '▶'}
        </span>
        <span className="play-button-label">
          {isError ? 'Audio unavailable' : isPlaying ? 'Playing…' : 'Play Audio'}
        </span>
      </button>

      {!isError && (
        <div className="play-progress-track" aria-hidden="true">
          <div className="play-progress-fill" ref={progressElRef} />
        </div>
      )}

      {isError && (
        <p className="play-button-hint">
          This card's audio couldn't be loaded. Try again later, or edit the card to
          re-add the audio.
        </p>
      )}
    </div>
  );
}
