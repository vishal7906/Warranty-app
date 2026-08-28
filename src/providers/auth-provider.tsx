import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';

// Closes the auth popup left over from a redirect on web.
WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  session: Session | null;
  /** False until the persisted session has been read from storage. */
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Where Supabase should send the user after an OAuth handshake or a
 * confirmation link. Resolves to the app's scheme in a build
 * (`warrantyapp://`) and to the dev-server URL in Expo Go, so both have to be
 * on the redirect allow-list in Supabase → Authentication → URL Configuration.
 */
export const authRedirectUrl = Linking.createURL('/');

/** Collects both the query string and the fragment, whichever carries the auth payload. */
function parseAuthParams(url: string): URLSearchParams {
  const combined = new URLSearchParams();
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');

  if (queryIndex !== -1) {
    const end = hashIndex > queryIndex ? hashIndex : url.length;
    for (const [key, value] of new URLSearchParams(url.slice(queryIndex + 1, end))) {
      combined.set(key, value);
    }
  }
  if (hashIndex !== -1) {
    for (const [key, value] of new URLSearchParams(url.slice(hashIndex + 1))) {
      combined.set(key, value);
    }
  }
  return combined;
}

/**
 * Turns a returned auth URL into a session. `detectSessionInUrl` is off for
 * React Native, so this is done by hand. Handles both the implicit flow
 * (tokens in the fragment) and PKCE (`?code=`), so switching `flowType` later
 * needs no changes here.
 *
 * @returns whether the URL actually carried a session.
 */
async function completeSessionFromUrl(url: string): Promise<boolean> {
  const params = parseAuthParams(url);

  const errorDescription = params.get('error_description') ?? params.get('error');
  if (errorDescription) throw new Error(errorDescription.replace(/\+/g, ' '));

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return true;
  }

  return false;
}

/** Picks up sessions from links opened while the app is backgrounded or cold. */
function useSessionFromDeepLink() {
  const url = Linking.useURL();

  useEffect(() => {
    if (!url) return;
    void completeSessionFromUrl(url).catch(() => {
      // A link without an auth payload is normal; sign-in surfaces real errors.
    });
  }, [url]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Nothing to restore when Supabase is unconfigured, so start settled.
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useSessionFromDeepLink();

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setIsLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUp: async (email, password, name) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: authRedirectUrl },
        });
        if (error) throw error;
      },
      signInWithGoogle: async () => {
        // On web, let supabase-js perform a normal full-page redirect.
        if (process.env.EXPO_OS === 'web') {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: authRedirectUrl },
          });
          if (error) throw error;
          return;
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: authRedirectUrl, skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (!data.url) {
          throw new Error('Google sign-in is not enabled for this Supabase project.');
        }

        const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUrl);
        // 'cancel' and 'dismiss' mean the user backed out; not an error.
        if (result.type !== 'success') return;

        const signedIn = await completeSessionFromUrl(result.url);
        if (!signedIn) throw new Error('Google did not return a session. Please try again.');
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, isLoading]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
