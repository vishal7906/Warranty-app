import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/features/purchases/format';
import { isPdf } from '@/features/receipts/pick';
import { useDeleteReceipt, useReceipt, useSignedUrl } from '@/features/receipts/queries';
import { useTheme } from '@/hooks/use-theme';

export default function ReceiptViewerScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: receipt, isLoading, error } = useReceipt(id);
  const { data: url, isLoading: isSigning, error: signError } = useSignedUrl(receipt?.file_path);
  // The purchase id only exists once the row has loaded; the hook needs a
  // stable key either way, so fall back to an empty string until then.
  const remove = useDeleteReceipt(receipt?.purchase_id ?? '');

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !receipt) {
    return (
      <ScrollView style={{ backgroundColor: colors.background }}>
        <EmptyState
          symbol="questionmark.folder"
          title="Receipt not found"
          message={error instanceof Error ? error.message : 'It may have been deleted.'}
        />
      </ScrollView>
    );
  }

  const pdf = isPdf(receipt.file_type);

  function confirmDelete() {
    Alert.alert('Delete receipt?', 'The file is removed from storage too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(receipt!, {
            onSuccess: () => router.back(),
            onError: (cause) =>
              Alert.alert('Could not delete', cause instanceof Error ? cause.message : ''),
          }),
      },
    ]);
  }

  async function openExternally() {
    if (!url) return;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('Could not open', 'No app is available to display this file.');
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: pdf ? 'PDF Receipt' : 'Receipt' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: Spacing.three,
          gap: Spacing.three,
          paddingBottom: Spacing.six,
          maxWidth: MaxContentWidth,
          width: '100%',
          alignSelf: 'center',
        }}
        // Pinch-to-zoom on the receipt image (iOS).
        minimumZoomScale={1}
        maximumZoomScale={pdf ? 1 : 4}>
        {isSigning ? (
          <ActivityIndicator style={{ marginTop: Spacing.six }} />
        ) : signError ? (
          <EmptyState
            symbol="exclamationmark.triangle"
            title="Could not load the file"
            message={signError instanceof Error ? signError.message : 'Please try again.'}
          />
        ) : pdf ? (
          <View
            style={{
              alignItems: 'center',
              gap: Spacing.two,
              paddingVertical: Spacing.six,
              backgroundColor: colors.backgroundElement,
              borderRadius: Radius.card,
              borderCurve: 'continuous',
            }}>
            <Text style={{ fontSize: 44 }}>📄</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: 'center' }}>
              PDFs open in the browser.
            </Text>
          </View>
        ) : url ? (
          <Image
            source={{ uri: url }}
            style={{
              width: '100%',
              aspectRatio: 3 / 4,
              backgroundColor: colors.backgroundElement,
              borderRadius: Radius.card,
            }}
            contentFit="contain"
            transition={200}
          />
        ) : null}

        <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
          Added {formatDate(receipt.created_at.slice(0, 10))}
        </Text>

        <Button title="Open in Browser" variant="secondary" onPress={openExternally} />
        <Button
          title="Delete Receipt"
          variant="destructive"
          onPress={confirmDelete}
          loading={remove.isPending}
        />
      </ScrollView>
    </>
  );
}
