import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, DetailRow } from '@/components/detail-row';
import { EmptyState } from '@/components/empty-state';
import { WarrantyBadge } from '@/components/warranty-badge';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatDate, formatMoney, formatWarrantyDuration } from '@/features/purchases/format';
import { useDeletePurchase, usePurchase } from '@/features/purchases/queries';
import { describeRemaining, getWarrantyInfo } from '@/features/purchases/warranty';
import { useTheme } from '@/hooks/use-theme';

export default function PurchaseDetailScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: purchase, isLoading, error } = usePurchase(id);
  const remove = useDeletePurchase();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !purchase) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.background }}>
        <EmptyState
          symbol="questionmark.folder"
          title="Purchase not found"
          message={error instanceof Error ? error.message : 'It may have been deleted.'}
        />
      </ScrollView>
    );
  }

  const info = getWarrantyInfo(purchase);

  function confirmDelete() {
    Alert.alert('Delete purchase?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove.mutate(id, { onSuccess: () => router.back() }),
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: purchase.product_name }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: Spacing.three,
          gap: Spacing.four,
          paddingBottom: Spacing.six,
          maxWidth: MaxContentWidth,
          width: '100%',
          alignSelf: 'center',
        }}>
        <View style={{ gap: Spacing.two }}>
          <Text selectable style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>
            {purchase.product_name}
          </Text>
          <Text
            selectable
            style={{ color: colors.text, fontSize: 22, fontVariant: ['tabular-nums'] }}>
            {formatMoney(purchase.price, purchase.currency)}
          </Text>
          <WarrantyBadge status={info.status} />
          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
            {describeRemaining(info)}
          </Text>
        </View>

        <Card>
          <DetailRow label="Brand" value={purchase.brand ?? '—'} />
          <DetailRow label="Category" value={purchase.category ?? '—'} />
          <DetailRow label="Purchased" value={formatDate(purchase.purchase_date)} />
          <DetailRow label="Seller" value={purchase.seller ?? '—'} />
        </Card>

        <Card>
          <DetailRow label="Warranty" value={formatWarrantyDuration(purchase.warranty_months)} />
          <DetailRow label="Starts" value={formatDate(purchase.warranty_start)} />
          <DetailRow label="Expires" value={formatDate(purchase.warranty_end)} />
        </Card>

        <Card>
          <DetailRow label="Invoice" value={purchase.invoice_number ?? '—'} />
          <DetailRow label="Serial" value={purchase.serial_number ?? '—'} />
        </Card>

        {purchase.notes ? (
          <Card>
            <View style={{ paddingVertical: Spacing.two }}>
              <Text selectable style={{ color: colors.text, fontSize: 16 }}>
                {purchase.notes}
              </Text>
            </View>
          </Card>
        ) : null}

        <Button
          title="Delete Purchase"
          variant="destructive"
          onPress={confirmDelete}
          loading={remove.isPending}
        />
      </ScrollView>
    </>
  );
}
