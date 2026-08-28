import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from '@/lib/database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/env';

// `createClient` validates its arguments eagerly and throws on an empty URL.
// The app still has to boot far enough to render <SetupRequired />, so fall
// back to placeholders here. Nothing ever reaches them: the root navigator
// short-circuits on `isSupabaseConfigured` before any screen can query.
const PLACEHOLDER_URL = 'http://localhost:54321';
const PLACEHOLDER_KEY = 'supabase-not-configured';

// Web static rendering runs this module in Node, where AsyncStorage's web
// implementation reaches for `window`. Hand supabase a throwaway store there;
// the browser rehydrates the real session on mount.
const memoryStore = new Map<string, string>();
const memoryStorage = {
  getItem: async (key: string) => memoryStore.get(key) ?? null,
  setItem: async (key: string, value: string) => void memoryStore.set(key, value),
  removeItem: async (key: string) => void memoryStore.delete(key),
};

const isServerRender = process.env.EXPO_OS === 'web' && typeof window === 'undefined';
const storage = isServerRender ? memoryStorage : AsyncStorage;

export const supabase = createClient<Database>(
  SUPABASE_URL || PLACEHOLDER_URL,
  SUPABASE_ANON_KEY || PLACEHOLDER_KEY,
  {
    auth: {
      storage,
      autoRefreshToken: isSupabaseConfigured && !isServerRender,
      persistSession: isSupabaseConfigured && !isServerRender,
      // React Native has no URL-based session handoff; this must stay off or
      // supabase-js will try to parse `window.location`.
      detectSessionInUrl: false,
    },
  }
);

// Refresh the session only while the app is in the foreground, otherwise the
// timer keeps firing (and failing) in the background.
if (isSupabaseConfigured && process.env.EXPO_OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
