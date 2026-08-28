import { ScrollView, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STEPS = [
  'Create a project at supabase.com and open Project Settings → API.',
  'Copy .env.example to .env in the project root.',
  'Paste the Project URL and the anon public key into that file.',
  'Run the SQL in supabase/schema.sql from the Supabase SQL editor.',
  'Restart the dev server with `npx expo start --clear`.',
];

export function SetupRequired() {
  const colors = useTheme();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four }}>
      <View style={{ gap: Spacing.two, paddingTop: Spacing.six }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>
          Supabase not configured
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
          The app needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before it can
          sign you in.
        </Text>
      </View>

      <View
        style={{
          gap: Spacing.three,
          padding: Spacing.three,
          backgroundColor: colors.backgroundElement,
          borderRadius: Radius.card,
          borderCurve: 'continuous',
        }}>
        {STEPS.map((step, index) => (
          <View key={step} style={{ flexDirection: 'row', gap: Spacing.three }}>
            <Text
              style={{
                color: colors.tint,
                fontSize: 15,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
              }}>
              {index + 1}
            </Text>
            <Text selectable style={{ color: colors.text, fontSize: 15, flex: 1 }}>
              {step}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
