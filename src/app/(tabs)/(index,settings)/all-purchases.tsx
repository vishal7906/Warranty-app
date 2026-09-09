import { useMemo } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, SectionList, Text, TextInput, View } from "react-native";

import { CategoryFilterRow } from "@/components/category-filter-row";
import { EmptyState } from "@/components/empty-state";
import { PurchaseCard } from "@/components/purchase-row";
import { useWarrantyColor } from "@/components/warranty-badge";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useDeletePurchase, usePurchases } from "@/features/purchases/queries";
import {
  WARRANTY_SECTION_ORDER,
  WARRANTY_STATUS_LABEL,
  getWarrantyInfo,
  type WarrantyStatus,
} from "@/features/purchases/warranty";
import { useTheme } from "@/hooks/use-theme";
import type { PurchaseRow } from "@/lib/database.types";
import { usePurchaseFilter } from "@/store/purchase-filter";

type Section = { status: WarrantyStatus; title: string; data: PurchaseRow[] };

const STATUS_FILTERS: { key: WarrantyStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "expiring", label: "Expiring" },
  { key: "upcoming", label: "Upcoming" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "none", label: "No warranty" },
];

export default function AllPurchasesScreen() {
  const colors = useTheme();
  const { data, isLoading, isRefetching, refetch, error } = usePurchases();
  const remove = useDeletePurchase();
  const query = usePurchaseFilter((state) => state.query);
  const status = usePurchaseFilter((state) => state.status);
  const category = usePurchaseFilter((state) => state.category);
  const setQuery = usePurchaseFilter((state) => state.setQuery);
  const setStatus = usePurchaseFilter((state) => state.setStatus);
  const setCategory = usePurchaseFilter((state) => state.setCategory);

  const sections = useMemo<Section[]>(() => {
    const purchases = data ?? [];
    const q = query.trim().toLowerCase();

    const matching = purchases.filter((purchase) => {
      if (category && (purchase.category ?? "").toLowerCase() !== category.toLowerCase()) return false;
      if (q && !purchase.product_name.toLowerCase().includes(q) && !(purchase.brand ?? "").toLowerCase().includes(q)) return false;
      if (status !== "all" && getWarrantyInfo(purchase).status !== status) return false;
      return true;
    });

    return WARRANTY_SECTION_ORDER.map((s) => ({
      status: s,
      title: WARRANTY_STATUS_LABEL[s],
      data: matching.filter((purchase) => getWarrantyInfo(purchase).status === s),
    })).filter((section) => section.data.length > 0);
  }, [data, category, query, status]);

  function confirmDelete(id: string) {
    Alert.alert("Delete purchase?", "This also removes its warranty tracking.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(id) },
    ]);
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: Spacing.three,
        gap: Spacing.two,
        paddingBottom: Spacing.six,
        maxWidth: MaxContentWidth,
        width: "100%",
        alignSelf: "center",
      }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      renderSectionHeader={({ section }) => <SectionHeader section={section as Section} />}
      renderItem={({ item }) => <PurchaseCard purchase={item} onDelete={confirmDelete} />}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
      ListHeaderComponent={
        <View style={{ gap: Spacing.three, paddingBottom: Spacing.two }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search purchases"
            placeholderTextColor={colors.textSecondary}
            style={{
              backgroundColor: colors.backgroundElement,
              borderRadius: Radius.control,
              paddingHorizontal: Spacing.three,
              paddingVertical: Spacing.two + 2,
              color: colors.text,
              fontSize: 15,
            }}
          />
          <CategoryFilterRow value={category} onChange={setCategory} />
          <StatusFilterRow value={status} onChange={setStatus} />
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator style={{ marginTop: Spacing.six }} />
        ) : error ? (
          <EmptyState
            symbol="exclamationmark.triangle"
            title="Could not load purchases"
            message={error instanceof Error ? error.message : "Pull down to try again."}
          />
        ) : (
          <EmptyState symbol="shippingbox" title="No matches" message="Try a different filter or search term." />
        )
      }
    />
  );
}

function SectionHeader({ section }: { section: Section }) {
  const colors = useTheme();
  const color = useWarrantyColor(section.status);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.two,
        paddingTop: Spacing.four,
        paddingBottom: Spacing.two,
        backgroundColor: colors.background,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: 0.5 }}>{section.title.toUpperCase()}</Text>
      <Text style={{ color: colors.neutral, fontSize: 13, fontVariant: ["tabular-nums"] }}>{section.data.length}</Text>
    </View>
  );
}

function StatusFilterRow({ value, onChange }: { value: WarrantyStatus | "all"; onChange: (status: WarrantyStatus | "all") => void }) {
  const colors = useTheme();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.two }}>
      {STATUS_FILTERS.map((option) => {
        const selected = value === option.key;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            onPress={() => onChange(option.key)}
            style={({ pressed }) => ({
              paddingHorizontal: Spacing.three,
              paddingVertical: Spacing.two,
              borderRadius: Radius.pill,
              borderCurve: "continuous",
              backgroundColor: selected ? colors.tint : colors.backgroundElement,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Text style={{ color: selected ? "#FFFFFF" : colors.text, fontSize: 14, fontWeight: "600" }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
