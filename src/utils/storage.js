const STORAGE_KEY = 'memecard.customCards.v1';

// Custom cards are keyed by categoryId so each category can show its own additions.
export function loadCustomCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomCard(categoryId, card) {
  const all = loadCustomCards();
  const forCategory = all[categoryId] || [];
  const next = { ...all, [categoryId]: [...forCategory, card] };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable (private browsing) — fail silently, card still
    // shows for this session via in-memory state in the caller.
  }
  return next;
}

export function updateCustomCard(categoryId, cardId, patch) {
  const all = loadCustomCards();
  const forCategory = (all[categoryId] || []).map((c) =>
    c.id === cardId ? { ...c, ...patch } : c,
  );
  const next = { ...all, [categoryId]: forCategory };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function deleteCustomCard(categoryId, cardId) {
  const all = loadCustomCards();
  const forCategory = (all[categoryId] || []).filter((c) => c.id !== cardId);
  const next = { ...all, [categoryId]: forCategory };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

// Built-in cards/categories live in static data (src/data/content.js), so
// edits to them can't mutate that module — instead we keep a patch per id and
// merge it in at render time (see App.jsx). Both cards and categories use the
// same shape (id -> patch object), just under different localStorage keys.
function createOverrideStore(storageKey) {
  return {
    load() {
      try {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    },
    save(id, patch) {
      const all = this.load();
      const next = { ...all, [id]: { ...(all[id] || {}), ...patch } };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    },
  };
}

const cardOverrideStore = createOverrideStore('memecard.cardOverrides.v1');
export const loadCardOverrides = () => cardOverrideStore.load();
export const saveCardOverride = (cardId, patch) => cardOverrideStore.save(cardId, patch);

const categoryOverrideStore = createOverrideStore('memecard.categoryOverrides.v1');
export const loadCategoryOverrides = () => categoryOverrideStore.load();
export const saveCategoryOverride = (categoryId, patch) =>
  categoryOverrideStore.save(categoryId, patch);
