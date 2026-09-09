import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/detail-row";
import { EmptyState } from "@/components/empty-state";
import { ExpiringWarrantyCarousel } from "@/components/expiring-warranty-carousel";
import FabButton from "@/components/FabButton";
import { PurchaseProgressCard } from "@/components/purchase-progress-card";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useDeletePurchase, usePurchases } from "@/features/purchases/queries";
import { selectExpiringSoon } from "@/features/purchases/warranty";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/providers/auth-provider";

/** Cards shown inside the sliding rail before the rest spill into a plain list below it. */
const CAROUSEL_LIMIT = 4;

export default function WarrantiesScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { data, isLoading, isRefetching, refetch, error } = usePurchases();
  const remove = useDeletePurchase();

  const firstName = (session?.user.user_metadata?.name as string | undefined)?.split(" ")[0] ?? session?.user.email?.split("@")[0] ?? "there";

  const expiringSoon = useMemo(() => selectExpiringSoon(data ?? []), [data]);
  const carouselItems = useMemo(() => expiringSoon.slice(0, CAROUSEL_LIMIT), [expiringSoon]);
  // TEMPORARY: mirrors the carousel items until there's enough data for this
  // section to show purchases the carousel doesn't already cover.
  const progressCardItems = carouselItems;

  function confirmDelete(id: string) {
    Alert.alert("Delete purchase?", "This also removes its warranty tracking.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(id) },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader name={firstName} onProfilePress={() => router.push("/settings")} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />} contentContainerStyle={{ gap: Spacing.three, paddingBottom: Spacing.six }}>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: Spacing.six }} />
        ) : error ? (
          <EmptyState symbol="exclamationmark.triangle" title="Could not load purchases" message={error instanceof Error ? error.message : "Pull down to try again."} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState symbol="shippingbox" title="No purchases yet" message="Tap Add to record your first purchase and start tracking its warranty." />
        ) : (
          <>
            <ExpiringWarrantyCarousel items={carouselItems} totalCount={expiringSoon.length} />
            {progressCardItems.length > 0 ? (
              <View
                style={{
                  // paddingHorizontal: Spacing.three,
                  maxWidth: MaxContentWidth,
                  width: "100%",
                  alignSelf: "center",
                }}
              >
                <Card>
                  <View style={{ paddingVertical: Spacing.two, gap: Spacing.three }}>
                    <SectionTitleRow title="My Purchases" count={data?.length ?? 0} onViewAll={() => router.push("/all-purchases")} />
                    <View style={{ gap: Spacing.three }}>
                      {progressCardItems.map((purchase) => (
                        <PurchaseProgressCard key={purchase.id} purchase={purchase} onDelete={confirmDelete} />
                      ))}
                    </View>
                  </View>
                </Card>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <FabButton />
    </View>
  );
}

function SectionTitleRow({ title, count, onViewAll }: { title: string; count: number; onViewAll: () => void }) {
  const colors = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>
        {title} <Text style={{ color: colors.neutral, fontWeight: "500" }}>({count})</Text>
      </Text>
      <Pressable onPress={onViewAll} hitSlop={8} accessibilityRole="button" accessibilityLabel="View all purchases" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 2, opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ color: colors.tint, fontSize: 15, fontWeight: "600" }}>View all</Text>
        <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} tintColor={colors.tint} size={14} weight="semibold" />
      </Pressable>
    </View>
  );
}
