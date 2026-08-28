import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { isPdf } from '@/features/receipts/pick';
import { useSignedUrl } from '@/features/receipts/queries';
import { useTheme } from '@/hooks/use-theme';
import type { ReceiptRow } from '@/lib/database.types';

const TILE_SIZE = 96;

/**
 * A single stored receipt. The bucket is private, so the image source is a
 * signed URL fetched per file rather than a stable public path.
 */
export function ReceiptThumbnail({
  receipt,
  onPress,
  onLongPress,
}: {
  receipt: ReceiptRow;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const colors = useTheme();
  const pdf = isPdf(receipt.file_type);
  // PDFs have no thumbnail to render, so don't spend a request signing one.
  const { data: url, isLoading, error } = useSignedUrl(pdf ? null : receipt.file_path);

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={pdf ? 'PDF receipt' : 'Receipt photo'}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        width: TILE_SIZE,
        height: TILE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: colors.backgroundSelected,
        borderRadius: Radius.control,
        borderCurve: 'continuous',
        opacity: pressed ? 0.7 : 1,
      })}>
      {pdf ? (
        <View style={{ alignItems: 'center', gap: Spacing.one }}>
          <Text style={{ fontSize: 26 }}>📄</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>PDF</Text>
        </View>
      ) : url ? (
        <Image
          source={{ uri: url }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={150}
        />
      ) : isLoading ? (
        <ActivityIndicator />
      ) : (
        <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
          {error ? 'Unavailable' : '—'}
        </Text>
      )}
    </Pressable>
  );
}

/** The receipts strip on the purchase detail screen. */
export function ReceiptGallery({
  receipts,
  isLoading,
  onDelete,
  onAdd,
  isUploading,
}: {
  receipts: ReceiptRow[];
  isLoading: boolean;
  onDelete: (receipt: ReceiptRow) => void;
  onAdd: () => void;
  isUploading: boolean;
}) {
  const colors = useTheme();
  const router = useRouter();

  return (
    <View style={{ gap: Spacing.two }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 0.5,
          }}>
          RECEIPTS
        </Text>
        <Pressable accessibilityRole="button" onPress={onAdd} disabled={isUploading}>
          <Text
            style={{
              color: colors.tint,
              fontSize: 15,
              fontWeight: '600',
              opacity: isUploading ? 0.5 : 1,
            }}>
            Add
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ alignSelf: 'flex-start' }} />
      ) : receipts.length === 0 && !isUploading ? (
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
          No receipts attached. Add a photo or PDF so the proof of purchase stays with the
          warranty.
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {receipts.map((receipt) => (
            <ReceiptThumbnail
              key={receipt.id}
              receipt={receipt}
              onPress={() =>
                router.push({ pathname: '/receipt/[id]', params: { id: receipt.id } })
              }
              onLongPress={() => onDelete(receipt)}
            />
          ))}
          {isUploading ? (
            <View
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.backgroundSelected,
                borderRadius: Radius.control,
                borderCurve: 'continuous',
              }}>
              <ActivityIndicator />
            </View>
          ) : null}
        </View>
      )}

      {receipts.length > 0 ? (
        <Text style={{ color: colors.neutral, fontSize: 13 }}>
          Tap to view. Press and hold to delete.
        </Text>
      ) : null}
    </View>
  );
}
