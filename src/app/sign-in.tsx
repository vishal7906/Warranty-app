import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { AuthDivider, GoogleButton } from '@/components/google-button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

export default function SignInScreen() {
  const colors = useTheme();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in with Google.');
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          gap: Spacing.four,
          padding: Spacing.four,
          maxWidth: MaxContentWidth,
          width: '100%',
          alignSelf: 'center',
        }}>
        <View style={{ gap: Spacing.two }}>
          <Text style={{ color: colors.text, fontSize: 32, fontWeight: '700' }}>Welcome back</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
            Never lose a receipt or forget a warranty again.
          </Text>
        </View>

        <View style={{ gap: Spacing.three }}>
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </View>

        {error ? (
          <Text selectable style={{ color: colors.danger, fontSize: 15 }}>
            {error}
          </Text>
        ) : null}

        <View style={{ gap: Spacing.three }}>
          <Button title="Sign In" onPress={handleSubmit} loading={busy} disabled={googleBusy} />
          <AuthDivider />
          <GoogleButton onPress={handleGoogle} loading={googleBusy} disabled={busy} />
          <Link href="/sign-up" style={{ textAlign: 'center' }}>
            <Text style={{ color: colors.tint, fontSize: 15 }}>
              Don&apos;t have an account? Create one
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
