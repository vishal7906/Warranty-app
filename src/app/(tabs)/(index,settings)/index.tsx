import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Alert, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { ExpiringWarrantyCarousel } from "@/components/expiring-warranty-carousel";
import FabButton from "@/components/FabButton";
import { useWarrantyColor } from "@/components/warranty-badge";
import { Spacing } from "@/constants/theme";
import { useDeletePurchase, usePurchases } from "@/features/purchases/queries";
import { WARRANTY_SECTION_ORDER, WARRANTY_STATUS_LABEL, getWarrantyInfo, selectExpiringSoon, type WarrantyStatus } from "@/features/purchases/warranty";
import { useTheme } from "@/hooks/use-theme";
import type { PurchaseRow } from "@/lib/database.types";
import { useAuth } from "@/providers/auth-provider";
import { usePurchaseFilter } from "@/store/purchase-filter";

type Section = { status: WarrantyStatus; title: string; data: PurchaseRow[] };

export default function WarrantiesScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { data, isLoading, isRefetching, refetch, error } = usePurchases();
  const remove = useDeletePurchase();
  const category = usePurchaseFilter((state) => state.category);
  const setCategory = usePurchaseFilter((state) => state.setCategory);

  const firstName = (session?.user.user_metadata?.name as string | undefined)?.split(" ")[0] ?? session?.user.email?.split("@")[0] ?? "there";

  const expiringSoon = useMemo(() => selectExpiringSoon(data ?? []), [data]);

  const sections = useMemo<Section[]>(() => {
    const purchases = data ?? [];
    const matching = purchases.filter((purchase) => !category || (purchase.category ?? "").toLowerCase() === category.toLowerCase());

    return WARRANTY_SECTION_ORDER.map((status) => ({
      status,
      title: WARRANTY_STATUS_LABEL[status],
      data: matching.filter((purchase) => getWarrantyInfo(purchase).status === status),
    })).filter((section) => section.data.length > 0);
  }, [data, category]);

  function confirmDelete(id: string) {
    Alert.alert("Delete purchase?", "This also removes its warranty tracking.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(id) },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader name={firstName} onProfilePress={() => router.push("/settings")} />
      <ExpiringWarrantyCarousel items={expiringSoon} />
      {/* <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        style={{ backgroundColor: colors.background }}
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
        // ListHeaderComponent={<CategoryFilterRow value={category} onChange={setCategory} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: Spacing.six }} />
          ) : error ? (
            <EmptyState symbol="exclamationmark.triangle" title="Could not load purchases" message={error instanceof Error ? error.message : "Pull down to try again."} />
          ) : (
            <EmptyState symbol="shippingbox" title={category ? "No matches" : "No purchases yet"} message={category ? "Try a different category." : "Tap Add to record your first purchase and start tracking its warranty."} />
          )
        }
      /> */}
      <FabButton />
    </View>
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
      <Text
        style={{
          color: colors.neutral,
          fontSize: 13,
          fontVariant: ["tabular-nums"],
        }}
      >
        {section.data.length}
      </Text>
    </View>
  );
}
