import { useEffect, useRef, useState, useCallback } from 'react';

// Cards render directly in the collection grid now (no popup needed just to
// press Play), so several cards' players exist in the DOM at once. This
// module-level pointer makes sure starting one card's audio stops whatever
// else is currently playing, so only one card is ever audible at a time.
let activePlayer = null;

// Statuses:
//   idle    – normal Play state, ready to play
//   playing – audio is playing
//   error   – audio is missing or failed to load/decode
export function useAudioPlayer(src) {
  const audioRef = useRef(null);
  const [status, setStatus] = useState('idle');

  // The progress bar fill is mutated directly via this ref (see
  // PlayButton.jsx) rather than through React state. `timeupdate` can fire
  // several times a second while playing — running that through setState
  // re-renders the whole card (and everything inside it) on every tick,
  // which on iOS Safari means repeatedly repainting a backdrop-filter
  // element mid-playback, a known trigger for the same layer-compositing
  // glitches scrolling had. Writing straight to the DOM avoids the
  // re-render entirely.
  const progressElRef = useRef(null);

  const setProgressDisplay = (value) => {
    const el = progressElRef.current;
    if (el) el.style.transform = `scaleX(${value})`;
  };

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (activePlayer === stopRef.current) activePlayer = null;
    setStatus((prev) => (prev === 'error' ? 'error' : 'idle'));
    setProgressDisplay(0);
  }, []);

  const stopRef = useRef(stop);
  stopRef.current = stop;

  // Create a fresh <audio> element whenever the card's src changes, and always
  // tear it down (pause + reset) when the card is left — never let audio from a
  // closed/previous card keep playing in the background.
  useEffect(() => {
    setStatus('idle');
    setProgressDisplay(0);

    if (!src) {
      setStatus('error');
      return undefined;
    }

    const audio = new Audio();
    audioRef.current = audio;

    const handleEnded = () => {
      if (activePlayer === stopRef.current) activePlayer = null;
      setStatus('idle');
      setProgressDisplay(0);
    };
    const handleError = () => setStatus('error');
    const handleTimeUpdate = () => {
      if (audio.duration) setProgressDisplay(audio.currentTime / audio.duration);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.preload = 'none';
    audio.src = src;

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.src = '';
      audioRef.current = null;
      if (activePlayer === stopRef.current) activePlayer = null;
    };
  }, [src]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || status === 'playing') return;

    if (activePlayer && activePlayer !== stopRef.current) activePlayer();
    activePlayer = stopRef.current;

    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => setStatus('playing'))
        .catch(() => setStatus('error'));
    } else {
      setStatus('playing');
    }
  }, [status]);

  return { status, play, stop, progressElRef };
}
