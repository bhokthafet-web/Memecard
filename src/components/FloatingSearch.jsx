import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SearchResultRow } from './SearchResultRow';
import './FloatingSearch.css';

const MAX_RESULTS = 30;
const SUGGESTION_COUNT = 12;

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

  // Every card, flattened once, in the same order they appear across tabs —
  // reused both for filtering and for the "before you type anything" list.
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

  // Opening search with nothing typed yet shouldn't be a dead end — offer a
  // quick-access list straight away instead of an empty hint.
  const suggestions = useMemo(() => allCards.slice(0, SUGGESTION_COUNT), [allCards]);

  const isSearching = query.trim() !== '';
  const listToShow = isSearching ? results : suggestions;

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

              <div className="search-results">
                {!isSearching && suggestions.length > 0 && (
                  <p className="search-section-label">Quick access</p>
                )}

                {isSearching && results.length === 0 && (
                  <p className="search-hint">No cards match "{query.trim()}".</p>
                )}

                {listToShow.map(({ card, categoryId, categoryTitle }) => (
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
