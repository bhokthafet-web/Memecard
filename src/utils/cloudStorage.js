import { supabase } from '../lib/supabaseClient';

function rowToCard(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    image: row.image || '🗂️',
    imageUrl: row.image_url || null,
    color: '#efecfe',
    audio: row.audio_url || null,
    custom: true,
  };
}

// Same row shape as a personal card, but deliberately without `custom: true`
// — a global card is meant to be treated exactly like a built-in one for
// editing (goes through global/user card overrides, not a direct row update).
function rowToGlobalCard(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    image: row.image || '🗂️',
    imageUrl: row.image_url || null,
    color: '#efecfe',
    audio: row.audio_url || null,
  };
}

// Shared shape for every override table: { <id column>, patch }, optionally
// scoped to a user. Cards and categories both use this pattern, just against
// different tables — see supabase/schema.sql.
async function fetchPatchMap(table, idColumn, scopeUserId) {
  let query = supabase.from(table).select(`${idColumn}, patch`);
  if (scopeUserId) query = query.eq('user_id', scopeUserId);
  const { data, error } = await query;
  if (error) throw error;
  return Object.fromEntries((data || []).map((row) => [row[idColumn], row.patch]));
}

async function upsertGlobalOverride(table, idColumn, id, patch, userId) {
  const { error } = await supabase
    .from(table)
    .upsert({ [idColumn]: id, patch, updated_by: userId, updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function upsertUserOverride(table, idColumn, userId, id, patch) {
  const { error } = await supabase
    .from(table)
    .upsert({ user_id: userId, [idColumn]: id, patch, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// Built-in card edits that apply to every visitor (admin-only to write,
// public to read).
export const fetchGlobalOverrides = () => fetchPatchMap('global_card_overrides', 'card_id');
export const saveGlobalOverride = (cardId, patch, userId) =>
  upsertGlobalOverride('global_card_overrides', 'card_id', cardId, patch, userId);

// A signed-in user's personal tweaks to a built-in card — visible only to
// them, layered on top of any global override an admin has made.
export const fetchUserOverrides = (userId) => fetchPatchMap('user_card_overrides', 'card_id', userId);
export const saveUserOverride = (userId, cardId, patch) =>
  upsertUserOverride('user_card_overrides', 'card_id', userId, cardId, patch);

// Same admin-vs-personal pattern, for editing a category's own
// title/emoji/description instead of one card.
export const fetchGlobalCategoryOverrides = () =>
  fetchPatchMap('global_category_overrides', 'category_id');
export const saveGlobalCategoryOverride = (categoryId, patch, userId) =>
  upsertGlobalOverride('global_category_overrides', 'category_id', categoryId, patch, userId);

export const fetchUserCategoryOverrides = (userId) =>
  fetchPatchMap('user_category_overrides', 'category_id', userId);
export const saveUserCategoryOverride = (userId, categoryId, patch) =>
  upsertUserOverride('user_category_overrides', 'category_id', userId, categoryId, patch);

// A signed-in user's own personal cards, grouped by category id (same shape
// the rest of the app already expects from localStorage).
export async function fetchUserCustomCards(userId) {
  const { data, error } = await supabase
    .from('user_custom_cards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const grouped = {};
  for (const row of data || []) {
    (grouped[row.category_id] ||= []).push(rowToCard(row));
  }
  return grouped;
}

export async function insertUserCustomCard(userId, categoryId, card) {
  const { data, error } = await supabase
    .from('user_custom_cards')
    .insert({
      user_id: userId,
      category_id: categoryId,
      title: card.title,
      description: card.description,
      image: card.image,
      image_url: card.imageUrl,
      audio_url: card.audio,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToCard(data);
}

export async function updateUserCustomCard(userId, cardId, patch) {
  const { error } = await supabase
    .from('user_custom_cards')
    .update({
      title: patch.title,
      description: patch.description,
      image: patch.image,
      image_url: patch.imageUrl,
      audio_url: patch.audio,
    })
    .eq('id', cardId)
    .eq('user_id', userId);
  if (error) throw error;
}

// Admin-created "official" content — new categories/cards that show up for
// every visitor, as opposed to one user's private additions above.
export async function fetchGlobalCategories() {
  const { data, error } = await supabase
    .from('global_categories')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    emoji: row.emoji || '🗂️',
    description: row.description || '',
    cards: [],
  }));
}

export async function insertGlobalCategory(userId, { title, emoji, description }) {
  const { data, error } = await supabase
    .from('global_categories')
    .insert({ title, emoji, description, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, title: data.title, emoji: data.emoji, description: data.description || '', cards: [] };
}

export async function fetchGlobalCards() {
  const { data, error } = await supabase
    .from('global_cards')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;

  const grouped = {};
  for (const row of data || []) {
    (grouped[row.category_id] ||= []).push(rowToGlobalCard(row));
  }
  return grouped;
}

export async function insertGlobalCard(userId, categoryId, card) {
  const { data, error } = await supabase
    .from('global_cards')
    .insert({
      category_id: categoryId,
      title: card.title,
      description: card.description,
      image: card.image,
      image_url: card.imageUrl,
      audio_url: card.audio,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToGlobalCard(data);
}
