import { ActivityIndicator, Pressable, Text } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function GoogleButton({
  onPress,
  loading = false,
  disabled = false,
}: {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const colors = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        minHeight: 50,
        paddingHorizontal: Spacing.four,
        borderRadius: Radius.control,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.separator,
        backgroundColor: colors.backgroundElement,
        opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
      })}>
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
          Continue with Google
        </Text>
      )}
    </Pressable>
  );
}

export function AuthDivider() {
  const colors = useTheme();

  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        paddingVertical: Spacing.one,
      }}>
      or
    </Text>
  );
}
