import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CategorySheet } from '@/components/category-sheet';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCategoryOptions } from '@/store/categories';

export function CategoryField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (category: string | null) => void;
}) {
  const colors = useTheme();
  const options = useCategoryOptions();
  const [visible, setVisible] = useState(false);

  const selected = options.find((option) => option.label.toLowerCase() === value?.toLowerCase());

  return (
    <View style={{ gap: Spacing.two }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
        CATEGORY
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setVisible(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.two,
          minHeight: 46,
          paddingHorizontal: Spacing.three,
          backgroundColor: colors.backgroundElement,
          borderRadius: Radius.control,
          borderCurve: 'continuous',
          opacity: pressed ? 0.7 : 1,
        })}>
        {selected ? <Text style={{ fontSize: 18 }}>{selected.emoji}</Text> : null}
        <Text style={{ flex: 1, fontSize: 17, color: value ? colors.text : colors.neutral }}>
          {value ?? 'Select a category'}
        </Text>
        <Text style={{ color: colors.neutral, fontSize: 15 }}>›</Text>
      </Pressable>

      <CategorySheet
        visible={visible}
        onClose={() => setVisible(false)}
        value={value}
        onSelect={onChange}
      />
    </View>
  );
}
