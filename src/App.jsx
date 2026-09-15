import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES } from './data/content';
import {
  loadCustomCards,
  saveCustomCard,
  updateCustomCard,
  loadCardOverrides,
  saveCardOverride,
  loadCategoryOverrides,
  saveCategoryOverride,
} from './utils/storage';
import {
  fetchGlobalOverrides,
  fetchUserCustomCards,
  fetchUserOverrides,
  insertUserCustomCard,
  updateUserCustomCard,
  saveGlobalOverride,
  saveUserOverride,
  fetchGlobalCategoryOverrides,
  fetchUserCategoryOverrides,
  saveGlobalCategoryOverride,
  saveUserCategoryOverride,
  fetchGlobalCategories,
  insertGlobalCategory,
  fetchGlobalCards,
  insertGlobalCard,
} from './utils/cloudStorage';
import { useAuth } from './hooks/useAuth';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { CategoryTabs } from './components/CategoryTabs';
import { CategoryForm } from './components/CategoryForm';
import { CardGrid } from './components/CardGrid';
import { CardForm } from './components/CardForm';
import { OfflineBanner } from './components/OfflineBanner';
import { AuthPanel } from './components/AuthPanel';
import './App.css';

export default function App() {
  const isOnline = useOnlineStatus();
  const auth = useAuth();

  // Local (per-browser, no account) fallback — always used when signed out.
  const [localCustomCards, setLocalCustomCards] = useState(() => loadCustomCards());
  const [localCardOverrides, setLocalCardOverrides] = useState(() => loadCardOverrides());
  const [localCategoryOverrides, setLocalCategoryOverrides] = useState(() =>
    loadCategoryOverrides(),
  );

  // Cloud data. The "global" ones are public (admin-written, everyone reads
  // them, signed in or not) — this includes brand-new admin-created
  // categories/cards, not just edits to the built-ins. The rest are per-user
  // and only populated when someone is signed in.
  const [globalCardOverrides, setGlobalCardOverrides] = useState({});
  const [globalCategoryOverrides, setGlobalCategoryOverrides] = useState({});
  const [globalCategories, setGlobalCategories] = useState([]);
  const [globalCards, setGlobalCards] = useState({});
  const [cloudCustomCards, setCloudCustomCards] = useState({});
  const [cloudCardOverrides, setCloudCardOverrides] = useState({});
  const [cloudCategoryOverrides, setCloudCategoryOverrides] = useState({});

  const [activeCategoryId, setActiveCategoryId] = useState(CATEGORIES[0]?.id || null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => {
    if (!auth.enabled) return;
    fetchGlobalOverrides().then(setGlobalCardOverrides).catch(() => {});
    fetchGlobalCategoryOverrides().then(setGlobalCategoryOverrides).catch(() => {});
    fetchGlobalCategories().then(setGlobalCategories).catch(() => {});
    fetchGlobalCards().then(setGlobalCards).catch(() => {});
  }, [auth.enabled]);

  useEffect(() => {
    if (!auth.enabled || !auth.user) {
      setCloudCustomCards({});
      setCloudCardOverrides({});
      setCloudCategoryOverrides({});
      return;
    }
    Promise.all([
      fetchUserCustomCards(auth.user.id),
      fetchUserOverrides(auth.user.id),
      fetchUserCategoryOverrides(auth.user.id),
    ])
      .then(([cards, cardOverrides, categoryOverrides]) => {
        setCloudCustomCards(cards);
        setCloudCardOverrides(cardOverrides);
        setCloudCategoryOverrides(categoryOverrides);
      })
      .catch(() => {});
  }, [auth.enabled, auth.user?.id]);

  const personalCardOverrides = auth.user ? cloudCardOverrides : localCardOverrides;
  const personalCategoryOverrides = auth.user ? cloudCategoryOverrides : localCategoryOverrides;
  const personalCustomCards = auth.user ? cloudCustomCards : localCustomCards;

  const categories = useMemo(() => {
    const allCategories = [...CATEGORIES, ...globalCategories];

    return allCategories.map((category) => {
      let merged = category;
      if (globalCategoryOverrides[category.id]) {
        merged = { ...merged, ...globalCategoryOverrides[category.id] };
      }
      if (personalCategoryOverrides[category.id]) {
        merged = { ...merged, ...personalCategoryOverrides[category.id] };
      }

      const sharedCards = [...category.cards, ...(globalCards[category.id] || [])];

      return {
        ...merged,
        cards: [
          ...sharedCards.map((card) => {
            let mergedCard = card;
            if (globalCardOverrides[card.id]) mergedCard = { ...mergedCard, ...globalCardOverrides[card.id] };
            if (personalCardOverrides[card.id]) mergedCard = { ...mergedCard, ...personalCardOverrides[card.id] };
            return mergedCard;
          }),
          ...(personalCustomCards[category.id] || []),
        ],
      };
    });
  }, [
    globalCategories,
    globalCategoryOverrides,
    personalCategoryOverrides,
    globalCards,
    globalCardOverrides,
    personalCardOverrides,
    personalCustomCards,
  ]);

  const activeCategory = categories.find((c) => c.id === activeCategoryId) || categories[0] || null;

  const handleSaveNewCard = async (card) => {
    if (auth.user && auth.isAdmin) {
      const saved = await insertGlobalCard(auth.user.id, activeCategoryId, card);
      setGlobalCards((prev) => ({
        ...prev,
        [activeCategoryId]: [...(prev[activeCategoryId] || []), saved],
      }));
    } else if (auth.user) {
      const saved = await insertUserCustomCard(auth.user.id, activeCategoryId, card);
      setCloudCustomCards((prev) => ({
        ...prev,
        [activeCategoryId]: [...(prev[activeCategoryId] || []), saved],
      }));
    } else {
      setLocalCustomCards(saveCustomCard(activeCategoryId, card));
    }
    setIsAdding(false);
  };

  const handleSaveCardEdit = async (patch) => {
    const card = editingCard;

    if (card.custom) {
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
      await saveGlobalOverride(card.id, patch, auth.user.id);
      setGlobalCardOverrides((prev) => ({ ...prev, [card.id]: { ...(prev[card.id] || {}), ...patch } }));
    } else if (auth.user) {
      await saveUserOverride(auth.user.id, card.id, patch);
      setCloudCardOverrides((prev) => ({ ...prev, [card.id]: { ...(prev[card.id] || {}), ...patch } }));
    } else {
      setLocalCardOverrides(saveCardOverride(card.id, patch));
    }

    setEditingCard(null);
  };

  const handleSaveCategoryEdit = async (patch) => {
    if (auth.user && auth.isAdmin) {
      await saveGlobalCategoryOverride(activeCategoryId, patch, auth.user.id);
      setGlobalCategoryOverrides((prev) => ({
        ...prev,
        [activeCategoryId]: { ...(prev[activeCategoryId] || {}), ...patch },
      }));
    } else if (auth.user) {
      await saveUserCategoryOverride(auth.user.id, activeCategoryId, patch);
      setCloudCategoryOverrides((prev) => ({
        ...prev,
        [activeCategoryId]: { ...(prev[activeCategoryId] || {}), ...patch },
      }));
    } else {
      setLocalCategoryOverrides(saveCategoryOverride(activeCategoryId, patch));
    }
    setIsEditingCategory(false);
  };

  const handleSaveNewCategory = async (fields) => {
    const saved = await insertGlobalCategory(auth.user.id, fields);
    setGlobalCategories((prev) => [...prev, saved]);
    setActiveCategoryId(saved.id);
    setIsAddingCategory(false);
  };

  const scopeNoteFor = (isPersonalItem) =>
    isPersonalItem
      ? auth.user
        ? 'Saved to your account — visible on any device you sign into.'
        : 'Saved on this device only. Sign in to sync it to your account.'
      : auth.user && auth.isAdmin
        ? 'You are an admin: this change updates it for every visitor.'
        : auth.user
          ? 'This only edits your personal copy — other people still see the original.'
          : 'Saved on this device only. Sign in to sync it to your account.';

  const addCardScopeNote =
    auth.user && auth.isAdmin
      ? 'You are an admin: this card is added for every visitor, not just you.'
      : scopeNoteFor(true);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Memecard</h1>
        <AuthPanel auth={auth} />
      </header>

      {!isOnline && <OfflineBanner />}

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
              <span aria-hidden="true">{activeCategory.emoji}</span>
              <h2>{activeCategory.title}</h2>
              <button
                type="button"
                className="category-edit-btn pop-btn"
                onClick={() => setIsEditingCategory(true)}
                aria-label={`Edit ${activeCategory.title}`}
              >
                ✏️
              </button>
            </div>
            {activeCategory.description && (
              <p className="category-header-desc">{activeCategory.description}</p>
            )}
          </div>

          <CardGrid
            category={activeCategory}
            onAddCard={() => setIsAdding(true)}
            onEditCard={setEditingCard}
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
          scopeNote={scopeNoteFor(Boolean(editingCard.custom))}
          onCancel={() => setEditingCard(null)}
          onSave={handleSaveCardEdit}
        />
      )}

      {isEditingCategory && activeCategory && (
        <CategoryForm
          category={activeCategory}
          scopeNote={scopeNoteFor(false)}
          onCancel={() => setIsEditingCategory(false)}
          onSave={handleSaveCategoryEdit}
        />
      )}

      {isAddingCategory && (
        <CategoryForm
          scopeNote="This creates a new shared category everyone will see."
          onCancel={() => setIsAddingCategory(false)}
          onSave={handleSaveNewCategory}
        />
      )}
    </div>
  );
}
