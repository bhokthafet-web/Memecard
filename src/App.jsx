import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES } from './data/content';
import { loadCustomCards, saveCustomCard, updateCustomCard, deleteCustomCard } from './utils/storage';
import {
  fetchGlobalOverrides,
  fetchUserCustomCards,
  insertUserCustomCard,
  updateUserCustomCard,
  deleteUserCustomCard,
  saveGlobalOverride,
  fetchGlobalCategoryOverrides,
  saveGlobalCategoryOverride,
  fetchGlobalCategories,
  insertGlobalCategory,
  deleteGlobalCategory,
  fetchGlobalCards,
  insertGlobalCard,
  deleteGlobalCard,
} from './utils/cloudStorage';
import { useAuth } from './hooks/useAuth';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { CategoryTabs } from './components/CategoryTabs';
import { CategoryForm } from './components/CategoryForm';
import { CardGrid } from './components/CardGrid';
import { CardForm } from './components/CardForm';
import { OfflineBanner } from './components/OfflineBanner';
import { AuthPanel } from './components/AuthPanel';
import { ConfirmDialog } from './components/ConfirmDialog';
import { SettingsMenu } from './components/SettingsMenu';
import './App.css';

// Shared/official content (built-in + anything admins create) can only ever
// be edited by an admin, and that edit applies to every visitor. Everyone
// else's only way to make a shared card "theirs" is to copy it to their own
// wall (handleCopyToWall) — from there it's a normal personal card, fully
// editable by its owner, same as one added from scratch.
export default function App() {
  const isOnline = useOnlineStatus();
  const auth = useAuth();

  // A guest's (not signed in) personal wall — this browser/device only.
  const [localCustomCards, setLocalCustomCards] = useState(() => loadCustomCards());

  // Public shared data — built-in content plus admin-created categories/cards
  // and admin edits to any of it. Everyone reads this, signed in or not.
  const [globalCardOverrides, setGlobalCardOverrides] = useState({});
  const [globalCategoryOverrides, setGlobalCategoryOverrides] = useState({});
  const [globalCategories, setGlobalCategories] = useState([]);
  const [globalCards, setGlobalCards] = useState({});

  // A signed-in user's personal wall, synced to their account.
  const [cloudCustomCards, setCloudCustomCards] = useState({});

  const [activeCategoryId, setActiveCategoryId] = useState(CATEGORIES[0]?.id || null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [cardPendingDelete, setCardPendingDelete] = useState(null);
  const [categoryPendingDelete, setCategoryPendingDelete] = useState(null);
  const [globalLoadError, setGlobalLoadError] = useState(false);
  const [globalLoadAttempt, setGlobalLoadAttempt] = useState(0);

  // Fetching shared content can fail silently on a flaky connection — that
  // would look exactly like "an admin's card is missing" with no way to
  // tell the difference, so any failure here surfaces a visible retry
  // banner instead of just leaving state empty.
  useEffect(() => {
    if (!auth.enabled) return;
    let cancelled = false;

    setGlobalLoadError(false);
    Promise.all([
      fetchGlobalOverrides().then(setGlobalCardOverrides),
      fetchGlobalCategoryOverrides().then(setGlobalCategoryOverrides),
      fetchGlobalCategories().then(setGlobalCategories),
      fetchGlobalCards().then(setGlobalCards),
    ]).catch(() => {
      if (!cancelled) setGlobalLoadError(true);
    });

    return () => {
      cancelled = true;
    };
  }, [auth.enabled, globalLoadAttempt]);

  useEffect(() => {
    if (!auth.enabled || !auth.user) {
      setCloudCustomCards({});
      return;
    }
    fetchUserCustomCards(auth.user.id).then(setCloudCustomCards).catch(() => {});
  }, [auth.enabled, auth.user?.id]);

  const wallCards = auth.user ? cloudCustomCards : localCustomCards;

  const categories = useMemo(() => {
    const allCategories = [...CATEGORIES, ...globalCategories];

    return allCategories
      .map((category) => {
        const merged = globalCategoryOverrides[category.id]
          ? { ...category, ...globalCategoryOverrides[category.id] }
          : category;

        const sharedCards = [...category.cards, ...(globalCards[category.id] || [])]
          .map((card) => (globalCardOverrides[card.id] ? { ...card, ...globalCardOverrides[card.id] } : card))
          .filter((card) => !card.deleted);

        return {
          ...merged,
          cards: [...sharedCards, ...(wallCards[category.id] || [])],
        };
      })
      .filter((category) => !category.deleted);
  }, [globalCategories, globalCategoryOverrides, globalCards, globalCardOverrides, wallCards]);

  const activeCategory = categories.find((c) => c.id === activeCategoryId) || categories[0] || null;

  // Adds a card to the current user's (or guest's) own wall — used both for
  // "+ Add Card" (a brand-new card) and "add to my wall" (a copy of a shared
  // card the visitor doesn't own).
  const addToMyWall = async (card) => {
    if (auth.user) {
      const saved = await insertUserCustomCard(auth.user.id, activeCategoryId, card);
      setCloudCustomCards((prev) => ({
        ...prev,
        [activeCategoryId]: [...(prev[activeCategoryId] || []), saved],
      }));
    } else {
      setLocalCustomCards(saveCustomCard(activeCategoryId, card));
    }
  };

  const handleSaveNewCard = async (card) => {
    if (auth.user && auth.isAdmin) {
      const saved = await insertGlobalCard(auth.user.id, activeCategoryId, card);
      setGlobalCards((prev) => ({
        ...prev,
        [activeCategoryId]: [...(prev[activeCategoryId] || []), saved],
      }));
    } else {
      await addToMyWall(card);
    }
    setIsAdding(false);
  };

  const handleCopyToWall = (card) =>
    addToMyWall({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: card.title,
      description: card.description,
      image: card.image,
      imageUrl: card.imageUrl,
      color: card.color || '#efecfe',
      audio: card.audio,
      custom: true,
    });

  const handleSaveCardEdit = async (patch) => {
    const card = editingCard;

    if (card.custom) {
      // Editing a card the current visitor owns (something on their wall).
      if (auth.user) {
        await updateUserCustomCard(auth.user.id, card.id, patch);
        setCloudCustomCards((prev) => ({
          ...prev,
          [activeCategoryId]: (prev[activeCategoryId] || []).map((c) =>
            c.id === card.id ? { ...c, ...patch } : c,
          ),
        }));
      } else {
        setLocalCustomCards(updateCustomCard(activeCategoryId, card.id, patch));
      }
    } else if (auth.user && auth.isAdmin) {
      // Editing shared/official content — admin-only, applies to everyone.
      await saveGlobalOverride(card.id, patch, auth.user.id);
      setGlobalCardOverrides((prev) => ({ ...prev, [card.id]: { ...(prev[card.id] || {}), ...patch } }));
    }

    setEditingCard(null);
  };

  const performDeleteCard = async (card) => {
    if (card.custom) {
      // Their own wall card.
      if (auth.user) {
        await deleteUserCustomCard(auth.user.id, card.id);
        setCloudCustomCards((prev) => ({
          ...prev,
          [activeCategoryId]: (prev[activeCategoryId] || []).filter((c) => c.id !== card.id),
        }));
      } else {
        setLocalCustomCards(deleteCustomCard(activeCategoryId, card.id));
      }
      return;
    }

    if (!auth.user || !auth.isAdmin) return; // shared content is admin-only to remove

    if (card.isGlobal) {
      // Admin-created shared content — a real row, so a real delete.
      await deleteGlobalCard(card.id);
      setGlobalCards((prev) => ({
        ...prev,
        [activeCategoryId]: (prev[activeCategoryId] || []).filter((c) => c.id !== card.id),
      }));
    } else {
      // A real built-in card only exists in source (src/data/content.js) —
      // there's no row to delete, so "delete" is a global override that
      // hides it for everyone instead.
      await saveGlobalOverride(card.id, { deleted: true }, auth.user.id);
      setGlobalCardOverrides((prev) => ({
        ...prev,
        [card.id]: { ...(prev[card.id] || {}), deleted: true },
      }));
    }
  };

  const performDeleteCategory = async (category) => {
    if (!auth.user || !auth.isAdmin) return; // categories are admin-only to remove

    if (category.isGlobal) {
      // Admin-created category — a real row (and its cards), so a real delete.
      await deleteGlobalCategory(category.id);
      setGlobalCategories((prev) => prev.filter((c) => c.id !== category.id));
      setGlobalCards((prev) => {
        const next = { ...prev };
        delete next[category.id];
        return next;
      });
    } else {
      // A real built-in category only exists in source — hide it for
      // everyone via an override instead of trying to delete it.
      await saveGlobalCategoryOverride(category.id, { deleted: true }, auth.user.id);
      setGlobalCategoryOverrides((prev) => ({
        ...prev,
        [category.id]: { ...(prev[category.id] || {}), deleted: true },
      }));
    }

    // Don't leave activeCategoryId pointing at a category that just
    // disappeared — every handler that keys off it (add card, etc.) would
    // silently write into a category nothing can see anymore.
    if (activeCategoryId === category.id) {
      const fallback = categories.find((c) => c.id !== category.id);
      setActiveCategoryId(fallback ? fallback.id : null);
    }
  };

  const handleSaveCategoryEdit = async (patch) => {
    if (!auth.user || !auth.isAdmin) return; // categories are admin-only to edit
    await saveGlobalCategoryOverride(activeCategoryId, patch, auth.user.id);
    setGlobalCategoryOverrides((prev) => ({
      ...prev,
      [activeCategoryId]: { ...(prev[activeCategoryId] || {}), ...patch },
    }));
    setIsEditingCategory(false);
  };

  const handleSaveNewCategory = async (fields) => {
    const saved = await insertGlobalCategory(auth.user.id, fields);
    setGlobalCategories((prev) => [...prev, saved]);
    setActiveCategoryId(saved.id);
    setIsAddingCategory(false);
  };

  const wallScopeNote = auth.user
    ? 'Added to your wall — visible on any device you sign into.'
    : 'Added to your wall on this device only. Sign in to sync it to your account.';

  const addCardScopeNote =
    auth.user && auth.isAdmin
      ? 'You are an admin: this card is added for every visitor, not just you.'
      : wallScopeNote;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Memecard</h1>
        <div className="app-header-actions">
          <SettingsMenu auth={auth} />
          <AuthPanel auth={auth} />
        </div>
      </header>

      {!isOnline && <OfflineBanner />}

      {globalLoadError && (
        <div className="global-load-error">
          <span>Couldn't load shared content. You may be missing admin-added cards.</span>
          <button
            type="button"
            className="global-load-retry pop-btn"
            onClick={() => setGlobalLoadAttempt((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      )}

      <CategoryTabs
        categories={categories}
        activeId={activeCategory?.id}
        onSelect={setActiveCategoryId}
        canAdd={auth.isAdmin}
        onAddCategory={() => setIsAddingCategory(true)}
      />

      {activeCategory && (
        <>
          <div className="category-header">
            <div className="category-header-text">
              <h2>{activeCategory.title}</h2>
              {auth.isAdmin && (
                <>
                  <button
                    type="button"
                    className="category-edit-btn pop-btn"
                    onClick={() => setIsEditingCategory(true)}
                    aria-label={`Edit ${activeCategory.title}`}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="category-edit-btn category-delete-btn pop-btn"
                    onClick={() => setCategoryPendingDelete(activeCategory)}
                    aria-label={`Delete ${activeCategory.title}`}
                    disabled={categories.length <= 1}
                    title={categories.length <= 1 ? "Can't delete the only remaining category" : 'Delete category'}
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
            {activeCategory.description && (
              <p className="category-header-desc">{activeCategory.description}</p>
            )}
          </div>

          <CardGrid
            category={activeCategory}
            isAdmin={auth.isAdmin}
            onAddCard={() => setIsAdding(true)}
            onEditCard={setEditingCard}
            onCopyToWall={handleCopyToWall}
            onDeleteCard={setCardPendingDelete}
          />
        </>
      )}

      {isAdding && activeCategory && (
        <CardForm
          categoryTitle={activeCategory.title}
          scopeNote={addCardScopeNote}
          onCancel={() => setIsAdding(false)}
          onSave={handleSaveNewCard}
        />
      )}

      {editingCard && activeCategory && (
        <CardForm
          categoryTitle={activeCategory.title}
          card={editingCard}
          scopeNote={
            editingCard.custom
              ? wallScopeNote
              : 'You are an admin: this change updates it for every visitor.'
          }
          onCancel={() => setEditingCard(null)}
          onSave={handleSaveCardEdit}
        />
      )}

      {isEditingCategory && activeCategory && auth.isAdmin && (
        <CategoryForm
          category={activeCategory}
          scopeNote="You are an admin: this change updates it for every visitor."
          onCancel={() => setIsEditingCategory(false)}
          onSave={handleSaveCategoryEdit}
        />
      )}

      {isAddingCategory && auth.isAdmin && (
        <CategoryForm
          scopeNote="This creates a new shared category everyone will see."
          onCancel={() => setIsAddingCategory(false)}
          onSave={handleSaveNewCategory}
        />
      )}

      {cardPendingDelete && (
        <ConfirmDialog
          title={`Delete "${cardPendingDelete.title}"?`}
          body={
            cardPendingDelete.custom
              ? "This removes it from your wall. This can't be undone."
              : "You are an admin: this removes it for every visitor. This can't be undone."
          }
          onCancel={() => setCardPendingDelete(null)}
          onConfirm={async () => {
            await performDeleteCard(cardPendingDelete);
            setCardPendingDelete(null);
          }}
        />
      )}

      {categoryPendingDelete && (
        <ConfirmDialog
          title={`Delete "${categoryPendingDelete.title}"?`}
          body={
            categoryPendingDelete.isGlobal
              ? "This removes the category and every card in it, for every visitor. This can't be undone."
              : "You are an admin: this removes the category (and every card in it) for every visitor. This can't be undone."
          }
          onCancel={() => setCategoryPendingDelete(null)}
          onConfirm={async () => {
            await performDeleteCategory(categoryPendingDelete);
            setCategoryPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
