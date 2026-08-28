import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { AuthDivider, GoogleButton } from '@/components/google-button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

export default function SignUpScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function handleSubmit() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await signUp(email.trim(), password, name.trim());
      // With email confirmation enabled there is no session yet, so the auth
      // guard will not move us automatically.
      setNotice('Account created. Check your inbox to confirm, then sign in.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setNotice(null);
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
          gap: Spacing.four,
          padding: Spacing.four,
          maxWidth: MaxContentWidth,
          width: '100%',
          alignSelf: 'center',
        }}>
        <View style={{ gap: Spacing.three }}>
          <FormField label="Name" value={name} onChangeText={setName} placeholder="Your name" />
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
            autoComplete="new-password"
            hint="At least 6 characters."
          />
        </View>

        {error ? (
          <Text selectable style={{ color: colors.danger, fontSize: 15 }}>
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text selectable style={{ color: colors.success, fontSize: 15 }}>
            {notice}
          </Text>
        ) : null}

        <Button
          title="Create Account"
          onPress={handleSubmit}
          loading={busy}
          disabled={googleBusy}
        />
        <AuthDivider />
        <GoogleButton onPress={handleGoogle} loading={googleBusy} disabled={busy} />
        <Button title="Back to Sign In" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
