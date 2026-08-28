import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export function FormField({ label, error, hint, style, ...inputProps }: FormFieldProps) {
  const colors = useTheme();

  return (
    <View style={{ gap: Spacing.two }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        placeholderTextColor={colors.neutral}
        {...inputProps}
        style={[
          {
            minHeight: 46,
            paddingHorizontal: Spacing.three,
            paddingVertical: Spacing.two + 2,
            fontSize: 17,
            color: colors.text,
            backgroundColor: colors.backgroundElement,
            borderRadius: Radius.control,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: error ? colors.danger : 'transparent',
          },
          style,
        ]}
      />
      {error ? (
        <Text selectable style={{ color: colors.danger, fontSize: 13 }}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{hint}</Text>
      ) : null}
    </View>
  );
}
