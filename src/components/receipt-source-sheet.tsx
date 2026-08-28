import { useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import {
  ReceiptPickError,
  pickDocument,
  pickFromCamera,
  pickFromLibrary,
  type PickedReceipt,
} from '@/features/receipts/pick';
import { useTheme } from '@/hooks/use-theme';

export type ReceiptSource = 'camera' | 'library' | 'files';

type Source = ReceiptSource;

const SOURCES: { key: Source; emoji: string; title: string; subtitle: string }[] = [
  { key: 'camera', emoji: '📷', title: 'Take Photo', subtitle: 'Snap the receipt now' },
  { key: 'library', emoji: '🖼️', title: 'Photo Library', subtitle: 'Pick an existing photo' },
  { key: 'files', emoji: '📁', title: 'Files', subtitle: 'Choose an image or PDF' },
];

const PICKERS: Record<Source, () => Promise<PickedReceipt | null>> = {
  camera: pickFromCamera,
  library: pickFromLibrary,
  files: pickDocument,
};

export function ReceiptSourceSheet({
  visible,
  onClose,
  onPicked,
  sources,
}: {
  visible: boolean;
  onClose: () => void;
  /** Called with the chosen file. Not called when the user cancels. */
  onPicked: (file: PickedReceipt) => void;
  /** Narrows the offered sources. Defaults to all three. */
  sources?: ReceiptSource[];
}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  // Set on iOS only, where the picker cannot be presented until this modal has
  // finished dismissing — launching it any earlier just does nothing.
  const [pending, setPending] = useState<Source | null>(null);

  async function run(source: Source) {
    try {
      const file = await PICKERS[source]();
      if (file) onPicked(file);
    } catch (cause) {
      Alert.alert(
        'Could not open that',
        cause instanceof ReceiptPickError || cause instanceof Error
          ? cause.message
          : 'Please try again.'
      );
    }
  }

  function choose(source: Source) {
    onClose();
    if (process.env.EXPO_OS === 'ios') {
      setPending(source);
      return;
    }
    void run(source);
  }

  function handleDismiss() {
    if (!pending) return;
    const source = pending;
    setPending(null);
    void run(source);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onDismiss={handleDismiss}
      onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        {/* Stops a tap on the sheet itself from falling through to the backdrop. */}
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
          }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              fontWeight: '700',
              letterSpacing: 0.5,
              paddingBottom: Spacing.one,
            }}>
            ADD RECEIPT
          </Text>

          {SOURCES.filter((source) => !sources || sources.includes(source.key)).map((source) => (
            <Pressable
              key={source.key}
              accessibilityRole="button"
              onPress={() => choose(source.key)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                padding: Spacing.three,
                backgroundColor: colors.backgroundElement,
                borderRadius: Radius.card,
                borderCurve: 'continuous',
                opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 26 }}>{source.emoji}</Text>
              <View style={{ flex: 1, gap: Spacing.half }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
                  {source.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                  {source.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}

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
