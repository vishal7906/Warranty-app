import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCategoriesStore, useCategoryOptions } from '@/store/categories';

export function CategorySheet({
  visible,
  onClose,
  value,
  onSelect,
  allowClear = true,
}: {
  visible: boolean;
  onClose: () => void;
  value: string | null;
  onSelect: (category: string | null) => void;
  /** Shows a "No category" row that clears the selection. Off for filter use. */
  allowClear?: boolean;
}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const options = useCategoryOptions();
  const addCategory = useCategoriesStore((state) => state.addCategory);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  function choose(category: string | null) {
    onSelect(category);
    onClose();
  }

  function submitCustom() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setDraft('');
    setAdding(false);
    choose(trimmed);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            gap: Spacing.two,
            padding: Spacing.three,
            paddingBottom: insets.bottom + Spacing.three,
            backgroundColor: colors.background,
            borderTopLeftRadius: Radius.card + 6,
            borderTopRightRadius: Radius.card + 6,
            borderCurve: 'continuous',
            maxHeight: '80%',
          }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              fontWeight: '700',
              letterSpacing: 0.5,
              paddingBottom: Spacing.one,
            }}>
            CATEGORY
          </Text>

          <ScrollView contentContainerStyle={{ gap: Spacing.two }}>
            {allowClear ? (
              <CategoryRow
                emoji="🚫"
                label="No category"
                selected={value === null}
                onPress={() => choose(null)}
              />
            ) : null}
            {options.map((option) => (
              <CategoryRow
                key={option.key}
                emoji={option.emoji}
                label={option.label}
                selected={value?.toLowerCase() === option.label.toLowerCase()}
                onPress={() => choose(option.label)}
              />
            ))}
          </ScrollView>

          {adding ? (
            <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
              <TextInput
                autoFocus
                value={draft}
                onChangeText={setDraft}
                placeholder="New category name"
                placeholderTextColor={colors.neutral}
                onSubmitEditing={submitCustom}
                returnKeyType="done"
                style={{
                  flex: 1,
                  minHeight: 46,
                  paddingHorizontal: Spacing.three,
                  fontSize: 17,
                  color: colors.text,
                  backgroundColor: colors.backgroundElement,
                  borderRadius: Radius.control,
                  borderCurve: 'continuous',
                }}
              />
              <Pressable
                accessibilityRole="button"
                onPress={submitCustom}
                style={({ pressed }) => ({
                  paddingHorizontal: Spacing.three,
                  minHeight: 46,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.tint,
                  borderRadius: Radius.control,
                  borderCurve: 'continuous',
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Add</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setAdding(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.two,
                padding: Spacing.three,
                borderRadius: Radius.control,
                borderCurve: 'continuous',
                opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 18 }}>➕</Text>
              <Text style={{ color: colors.tint, fontSize: 16, fontWeight: '600' }}>
                Add custom category
              </Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => ({
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 50,
              marginTop: Spacing.one,
              backgroundColor: colors.backgroundElement,
              borderRadius: Radius.control,
              borderCurve: 'continuous',
              opacity: pressed ? 0.7 : 1,
            })}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CategoryRow({
  emoji,
  label,
  selected,
  onPress,
}: {
  emoji: string;
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
        backgroundColor: selected ? colors.backgroundSelected : colors.backgroundElement,
        borderRadius: Radius.card,
        borderCurve: 'continuous',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' }}>{label}</Text>
      {selected ? <Text style={{ color: colors.tint, fontSize: 18 }}>✓</Text> : null}
    </Pressable>
  );
}
