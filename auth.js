// js/auth.js
// ─────────────────────────────────────────────────────────────
//  Authentication helpers for Aurabot
//  Uses Supabase Auth (email + password)
// ─────────────────────────────────────────────────────────────

import { supabase } from './supabase.js';

// ── Current session state ────────────────────────────────────
export let currentUser    = null;   // auth.users row
export let currentProfile = null;   // public.profiles row

// ── Sign up ──────────────────────────────────────────────────
export async function signUp({ email, password, username, displayName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username:     username.trim().toLowerCase(),
        display_name: displayName.trim(),
      },
    },
  });
  if (error) throw error;
  return data;
}

// ── Sign in ──────────────────────────────────────────────────
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await refreshProfile(data.user);
  return data;
}

// ── Sign out ─────────────────────────────────────────────────
export async function signOut() {
  await supabase.auth.signOut();
  currentUser    = null;
  currentProfile = null;
}

// ── Load/refresh profile ─────────────────────────────────────
export async function refreshProfile(user) {
  currentUser = user;
  if (!user) { currentProfile = null; return; }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) console.error('[Auth] profile load error', error);
  else currentProfile = data;
}

// ── Update display name / avatar ─────────────────────────────
export async function updateProfile(updates) {
  if (!currentUser) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', currentUser.id)
    .select()
    .single();
  if (error) throw error;
  currentProfile = data;
  return data;
}

// ── Listen to auth state changes (call once on app load) ─────
export function initAuth(onStateChange) {
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session?.user) await refreshProfile(session.user);
    onStateChange(session?.user ?? null, currentProfile);
  });

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) await refreshProfile(session.user);
    else { currentUser = null; currentProfile = null; }
    onStateChange(session?.user ?? null, currentProfile);
  });
}
