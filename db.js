// js/db.js
// ─────────────────────────────────────────────────────────────
//  All database + storage operations for Aurabot
// ─────────────────────────────────────────────────────────────

import { supabase }    from './supabase.js';
import { currentUser } from './auth.js';

// ═══════════════════════════════════════════════════════════════
//  IMAGE STORAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Upload a data-URL image to Supabase Storage.
 * Returns the public URL string.
 * @param {string} dataUrl   — base64 data URL
 * @param {'sketch'|'ai_art'} type
 * @param {string} characterId  — used as part of the file path
 */
export async function uploadImage(dataUrl, type, characterId) {
  if (!currentUser) throw new Error('Must be signed in to upload images');

  // Convert data URL → Blob
  const res    = await fetch(dataUrl);
  const blob   = await res.blob();
  const ext    = blob.type === 'image/png' ? 'png' : 'jpg';
  const path   = `${currentUser.id}/${characterId}/${type}.${ext}`;

  const { error } = await supabase.storage
    .from('character-images')
    .upload(path, blob, { upsert: true, contentType: blob.type });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('character-images')
    .getPublicUrl(path);

  return publicUrl;
}


// ═══════════════════════════════════════════════════════════════
//  CHARACTERS — personal profile
// ═══════════════════════════════════════════════════════════════

/**
 * Save (insert or update) a character to the database.
 * Uploads both sketch + AI art images if provided as data URLs.
 *
 * @param {object} fields   — form field values
 * @param {object} images   — { sketchDataUrl, aiArtDataUrl } (optional)
 * @param {object} opts     — { artStyle, sketchDescription, isPublic, existingId }
 * @returns {object} saved character row
 */
export async function saveCharacter(fields, images = {}, opts = {}) {
  if (!currentUser) throw new Error('Must be signed in to save characters');

  const characterId = opts.existingId ?? crypto.randomUUID();

  // Upload images in parallel (skip if not provided or already a URL)
  const [sketchUrl, aiArtUrl] = await Promise.all([
    images.sketchDataUrl && images.sketchDataUrl.startsWith('data:')
      ? uploadImage(images.sketchDataUrl, 'sketch', characterId)
      : Promise.resolve(images.sketchDataUrl ?? null),

    images.aiArtDataUrl && images.aiArtDataUrl.startsWith('data:')
      ? uploadImage(images.aiArtDataUrl, 'ai_art', characterId)
      : Promise.resolve(images.aiArtDataUrl ?? null),
  ]);

  const row = {
    id:                 characterId,
    user_id:            currentUser.id,
    name:               fields.name        || null,
    appearance:         fields.appearance  || null,
    height:             fields.height      || null,
    build:              fields.build       || null,
    personality:        fields.character   || null,
    strengths:          fields.strengths   || null,
    fears:              fields.fears       || null,
    interests:          fields.interests   || null,
    features:           fields.features    || null,
    art_style:          opts.artStyle      || null,
    sketch_description: opts.sketchDescription || null,
    sketch_url:         sketchUrl,
    ai_art_url:         aiArtUrl,
    is_public:          opts.isPublic ?? false,
  };

  const { data, error } = await supabase
    .from('characters')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Load all characters belonging to the current user.
 * @returns {Array}
 */
export async function loadMyCharacters() {
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Delete a character (and its storage images).
 * @param {string} characterId
 */
export async function deleteCharacter(characterId) {
  if (!currentUser) throw new Error('Not signed in');

  // Delete storage files
  const prefix = `${currentUser.id}/${characterId}/`;
  const { data: files } = await supabase.storage
    .from('character-images')
    .list(`${currentUser.id}/${characterId}`);

  if (files?.length) {
    const paths = files.map(f => `${prefix}${f.name}`);
    await supabase.storage.from('character-images').remove(paths);
  }

  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', characterId)
    .eq('user_id', currentUser.id);   // safety check

  if (error) throw error;
}

/**
 * Toggle a character's public visibility.
 * @param {string} characterId
 * @param {boolean} isPublic
 */
export async function setCharacterPublic(characterId, isPublic) {
  if (!currentUser) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('characters')
    .update({ is_public: isPublic })
    .eq('id', characterId)
    .eq('user_id', currentUser.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ═══════════════════════════════════════════════════════════════
//  COMMUNITY FEED
// ═══════════════════════════════════════════════════════════════

/**
 * Load community feed (public characters, sorted by stars).
 * @param {object} opts  — { limit, offset, sortBy }
 */
export async function loadCommunityFeed({ limit = 20, offset = 0, sortBy = 'stars' } = {}) {
  let query = supabase
    .from('community_feed')
    .select('*')
    .range(offset, offset + limit - 1);

  if (sortBy === 'stars')  query = query.order('star_count',  { ascending: false });
  if (sortBy === 'newest') query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}


// ═══════════════════════════════════════════════════════════════
//  STARS
// ═══════════════════════════════════════════════════════════════

/**
 * Star a character.  Silently ignores duplicate (already starred).
 */
export async function starCharacter(characterId) {
  if (!currentUser) throw new Error('Must be signed in to star');

  const { error } = await supabase
    .from('stars')
    .insert({ user_id: currentUser.id, character_id: characterId });

  // 23505 = unique_violation (already starred) — treat as success
  if (error && error.code !== '23505') throw error;
}

/**
 * Un-star a character.
 */
export async function unstarCharacter(characterId) {
  if (!currentUser) throw new Error('Must be signed in to unstar');

  const { error } = await supabase
    .from('stars')
    .delete()
    .eq('user_id', currentUser.id)
    .eq('character_id', characterId);

  if (error) throw error;
}

/**
 * Get all character IDs starred by the current user.
 * Returns a Set<string> for O(1) lookup.
 */
export async function getMyStarredIds() {
  if (!currentUser) return new Set();

  const { data, error } = await supabase
    .from('stars')
    .select('character_id')
    .eq('user_id', currentUser.id);

  if (error) throw error;
  return new Set((data ?? []).map(r => r.character_id));
}

/**
 * Toggle star — returns { starred: boolean, newCount: number }.
 */
export async function toggleStar(characterId, currentlyStarred) {
  if (currentlyStarred) {
    await unstarCharacter(characterId);
  } else {
    await starCharacter(characterId);
  }

  // Fetch updated count
  const { data } = await supabase
    .from('characters')
    .select('star_count')
    .eq('id', characterId)
    .single();

  return { starred: !currentlyStarred, newCount: data?.star_count ?? 0 };
}
