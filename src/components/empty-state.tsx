import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function EmptyState({
  symbol,
  title,
  message,
}: {
  /** SF Symbol name, rendered on iOS only. */
  symbol: string;
  title: string;
  message: string;
}) {
  const colors = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.six }}>
      {process.env.EXPO_OS === 'ios' ? (
        <Image source={`sf:${symbol}`} tintColor={colors.neutral} style={{ width: 44, height: 44 }} />
      ) : null}
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{title}</Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 15,
          textAlign: 'center',
          paddingHorizontal: Spacing.four,
        }}>
        {message}
      </Text>
    </View>
  );
}
