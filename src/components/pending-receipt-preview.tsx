import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { isPdf, type PickedReceipt } from '@/features/receipts/pick';
import { useTheme } from '@/hooks/use-theme';

function formatBytes(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The receipt chosen on a previous step, shown at the top of the purchase
 * form. It is still a local file here — nothing is uploaded until the purchase
 * row exists to attach it to.
 */
export function PendingReceiptPreview({
  receipt,
  onRemove,
}: {
  receipt: PickedReceipt;
  onRemove: () => void;
}) {
  const colors = useTheme();
  const pdf = isPdf(receipt.mimeType);
  const size = formatBytes(receipt.size);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.two,
        paddingRight: Spacing.three,
        backgroundColor: colors.backgroundElement,
        borderRadius: Radius.card,
        borderCurve: 'continuous',
      }}>
      <View
        style={{
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: colors.backgroundSelected,
          borderRadius: Radius.control,
          borderCurve: 'continuous',
        }}>
        {pdf ? (
          <Text style={{ fontSize: 24 }}>📄</Text>
        ) : (
          <Image
            source={{ uri: receipt.uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        )}
      </View>

      <View style={{ flex: 1, gap: Spacing.half }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
          Receipt attached
        </Text>
        <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 13 }}>
          {size ? `${receipt.name} · ${size}` : receipt.name}
        </Text>
      </View>

      <Pressable accessibilityRole="button" onPress={onRemove} hitSlop={8}>
        <Text style={{ color: colors.danger, fontSize: 15, fontWeight: '600' }}>Remove</Text>
      </Pressable>
    </View>
  );
}
