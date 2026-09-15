const STORAGE_KEY = 'memecard.customCards.v1';

// A guest's (not signed in) personal cards — their "wall" for this browser
// only. Keyed by categoryId so each category can show its own additions.
// Signed-out visitors can never edit the shared/official cards in place —
// only copy one to their wall (see App.jsx's handleCopyToWall) or add a new
// one from scratch, both of which land here.
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
