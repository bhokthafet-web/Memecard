import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SearchResultRow } from './SearchResultRow';
import './FloatingSearch.css';

const MAX_RESULTS = 30;
const SUGGESTION_WORD_COUNT = 15;

// A floating button that expands into an instant search across every card
// in every category (not just the active one) — searching and playing
// straight from the results, no need to hunt through tabs first. Filtering
// is plain client-side string matching over data already held in memory
// (App.jsx's `categories`), so results update on every keystroke with no
// debounce needed — there's no network round trip to wait on.
export function FloatingSearch({ categories, onOpenCategory }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Every card, flattened once, in the same order they appear across tabs.
  const allCards = useMemo(() => {
    const list = [];
    for (const category of categories) {
      for (const card of category.cards) {
        list.push({ card, categoryId: category.id, categoryTitle: category.title });
      }
    }
    return list;
  }, [categories]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches = [];
    for (const entry of allCards) {
      if (
        entry.card.title.toLowerCase().includes(q) ||
        (entry.card.description || '').toLowerCase().includes(q)
      ) {
        matches.push(entry);
        if (matches.length >= MAX_RESULTS) break;
      }
    }
    return matches;
  }, [query, allCards]);

  // Before anything is typed, offer a row of small tappable word chips (the
  // first word of a card's title) instead of an empty box — tapping one
  // fills the search field with that word, which then runs the normal
  // filtered search below. Deduped case-insensitively so the same common
  // first word (e.g. multiple titles starting "Aa") only shows once.
  const suggestionWords = useMemo(() => {
    const seen = new Set();
    const words = [];
    for (const { card } of allCards) {
      const firstWord = card.title.trim().split(/\s+/)[0];
      if (!firstWord) continue;
      const key = firstWord.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      words.push(firstWord);
      if (words.length >= SUGGESTION_WORD_COUNT) break;
    }
    return words;
  }, [allCards]);

  const isSearching = query.trim() !== '';

  const open = () => {
    setIsOpen(true);
    setQuery('');
    // Wait for the overlay to mount before focusing.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const close = () => setIsOpen(false);

  const handleOpenCategory = (categoryId) => {
    onOpenCategory(categoryId);
    close();
  };

  const handlePickWord = (word) => {
    setQuery(word);
    inputRef.current?.focus();
  };

  return (
    <>
      <button
        type="button"
        className="floating-search-btn pop-btn"
        onClick={open}
        aria-label="Search cards"
        title="Search cards"
      >
        🔍
      </button>

      {isOpen &&
        createPortal(
          <div
            className="search-overlay"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div className="search-panel">
              <div className="search-input-row">
                <span className="search-input-icon" aria-hidden="true">🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  className="search-input"
                  placeholder="Search cards…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') close();
                  }}
                />
                <button type="button" className="search-close-btn pop-btn" onClick={close} aria-label="Close search">
                  ✕
                </button>
              </div>

              {!isSearching && suggestionWords.length > 0 && (
                <div className="search-suggestions">
                  {suggestionWords.map((word) => (
                    <button
                      key={word}
                      type="button"
                      className="search-suggestion-chip"
                      onClick={() => handlePickWord(word)}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              )}

              <div className="search-results">
                {isSearching && results.length === 0 && (
                  <p className="search-hint">No cards match "{query.trim()}".</p>
                )}

                {isSearching &&
                  results.map(({ card, categoryId, categoryTitle }) => (
                    <SearchResultRow
                      key={card.id}
                      card={card}
                      categoryTitle={categoryTitle}
                      onOpenCategory={() => handleOpenCategory(categoryId)}
                    />
                  ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
