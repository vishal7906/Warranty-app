import { Pressable, ScrollView, Text } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCategoryOptions } from '@/store/categories';

export function CategoryFilterRow({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (category: string | null) => void;
}) {
  const options = useCategoryOptions();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: Spacing.two, paddingBottom: Spacing.three }}>
      <CategoryChip label="All" selected={value === null} onPress={() => onChange(null)} />
      {options.map((option) => (
        <CategoryChip
          key={option.key}
          label={`${option.emoji} ${option.label}`}
          selected={value?.toLowerCase() === option.label.toLowerCase()}
          onPress={() => onChange(option.label)}
        />
      ))}
    </ScrollView>
  );
}

function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderRadius: Radius.pill,
        borderCurve: 'continuous',
        backgroundColor: selected ? colors.tint : colors.backgroundElement,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text style={{ color: selected ? '#FFFFFF' : colors.text, fontSize: 14, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}
