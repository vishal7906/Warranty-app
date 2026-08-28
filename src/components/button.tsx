import { ActivityIndicator, Pressable, Text, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const colors = useTheme();
  const isDisabled = disabled || loading;

  const background =
    variant === 'primary'
      ? colors.tint
      : variant === 'destructive'
        ? colors.danger
        : colors.backgroundElement;
  const foreground = variant === 'secondary' ? colors.text : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
        paddingHorizontal: Spacing.four,
        borderRadius: Radius.control,
        borderCurve: 'continuous',
        backgroundColor: background,
        opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        ...style,
      })}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={{ color: foreground, fontSize: 17, fontWeight: '600' }}>{title}</Text>
      )}
    </Pressable>
  );
}
