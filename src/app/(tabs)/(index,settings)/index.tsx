import { Link } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, RefreshControl, SectionList, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { PurchaseCard } from '@/components/purchase-row';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useDeletePurchase, usePurchases } from '@/features/purchases/queries';
import {
  WARRANTY_SECTION_ORDER,
  WARRANTY_STATUS_LABEL,
  getWarrantyInfo,
  type WarrantyStatus,
} from '@/features/purchases/warranty';
import { useWarrantyColor } from '@/components/warranty-badge';
import { useTheme } from '@/hooks/use-theme';
import type { PurchaseRow } from '@/lib/database.types';
import { usePurchaseFilter } from '@/store/purchase-filter';

type Section = { status: WarrantyStatus; title: string; data: PurchaseRow[] };

export default function WarrantiesScreen() {
  const colors = useTheme();
  const { data, isLoading, isRefetching, refetch, error } = usePurchases();
  const remove = useDeletePurchase();
  const query = usePurchaseFilter((state) => state.query);
  const setQuery = usePurchaseFilter((state) => state.setQuery);

  const sections = useMemo<Section[]>(() => {
    const purchases = data ?? [];
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? purchases.filter((purchase) =>
          [purchase.product_name, purchase.brand, purchase.seller, purchase.category]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(needle))
        )
      : purchases;

    return WARRANTY_SECTION_ORDER.map((status) => ({
      status,
      title: WARRANTY_STATUS_LABEL[status],
      data: matching.filter((purchase) => getWarrantyInfo(purchase).status === status),
    })).filter((section) => section.data.length > 0);
  }, [data, query]);

  function confirmDelete(id: string) {
    Alert.alert('Delete purchase?', 'This also removes its warranty tracking.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/new-purchase">
              <Text style={{ color: colors.tint, fontSize: 17, fontWeight: '600' }}>Add</Text>
            </Link>
          ),
          headerSearchBarOptions: {
            placeholder: 'Search purchases',
            onChangeText: (event) => setQuery(event.nativeEvent.text),
          },
        }}
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: Spacing.three,
          gap: Spacing.two,
          paddingBottom: Spacing.six,
          maxWidth: MaxContentWidth,
          width: '100%',
          alignSelf: 'center',
        }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        renderSectionHeader={({ section }) => <SectionHeader section={section as Section} />}
        renderItem={({ item }) => <PurchaseCard purchase={item} onDelete={confirmDelete} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: Spacing.six }} />
          ) : error ? (
            <EmptyState
              symbol="exclamationmark.triangle"
              title="Could not load purchases"
              message={error instanceof Error ? error.message : 'Pull down to try again.'}
            />
          ) : (
            <EmptyState
              symbol="shippingbox"
              title={query ? 'No matches' : 'No purchases yet'}
              message={
                query
                  ? 'Try a different product, brand, or seller.'
                  : 'Tap Add to record your first purchase and start tracking its warranty.'
              }
            />
          )
        }
      />
    </>
  );
}

function SectionHeader({ section }: { section: Section }) {
  const colors = useTheme();
  const color = useWarrantyColor(section.status);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingTop: Spacing.four,
        paddingBottom: Spacing.two,
        backgroundColor: colors.background,
      }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
        {section.title.toUpperCase()}
      </Text>
      <Text
        style={{
          color: colors.neutral,
          fontSize: 13,
          fontVariant: ['tabular-nums'],
        }}>
        {section.data.length}
      </Text>
    </View>
  );
}
