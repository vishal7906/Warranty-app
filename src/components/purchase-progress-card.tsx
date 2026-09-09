import { parseISO } from "date-fns";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useWarrantyColor } from "@/components/warranty-badge";
import { Radius, Spacing } from "@/constants/theme";
import { type ExpiringItem } from "@/features/purchases/expiring-mock";
import { formatDate } from "@/features/purchases/format";
import { describeRemaining, getWarrantyInfo, WARRANTY_STATUS_LABEL } from "@/features/purchases/warranty";
import { useTheme } from "@/hooks/use-theme";
import { useCategoryOptions } from "@/store/categories";

const CARD_RADIUS = 20;

/** A single purchase's warranty life, drawn as a shipment-tracker style progress line from purchase date to expiry. */
export function PurchaseProgressCard({ purchase, onDelete }: { purchase: ExpiringItem; onDelete?: (id: string) => void }) {
  const colors = useTheme();
  const categories = useCategoryOptions();
  const info = getWarrantyInfo(purchase);
  const color = useWarrantyColor(info.status);
  const emoji = categories.find((c) => c.label.toLowerCase() === purchase.category?.toLowerCase())?.emoji ?? "📦";

  const fraction = purchase.warranty_end
    ? clamp(
        (new Date().getTime() - parseISO(purchase.purchase_date).getTime()) /
          (parseISO(purchase.warranty_end).getTime() - parseISO(purchase.purchase_date).getTime()),
        0,
        1,
      )
    : 0;

  return (
    <Link href={{ pathname: "/purchase/[id]", params: { id: purchase.id } }} asChild>
      <Link.Trigger>
        {/* iOS's native Link Preview host (from `Link.Preview`/`Link.Menu` below) renders
            this Pressable specially and drops a backgroundColor set directly on it — but
            backgrounds on children nested inside it render fine, so the card chrome lives
            on the inner View below instead of on the Pressable itself. */}
        <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <View
            style={{
              // Echoes the page's own background — a light, recessed tint that reads
              // as part of the same family as the white `Card` panel around it, rather
              // than a harshly distinct gray box.
              backgroundColor: colors.background,
              borderRadius: CARD_RADIUS,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: colors.separator,
              padding: Spacing.three,
              gap: Spacing.three,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.backgroundElement,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 18 }}>{emoji}</Text>
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                  {purchase.product_name}
                </Text>
                {purchase.category ? <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{purchase.category}</Text> : null}
              </View>
              <View
                style={{
                  paddingHorizontal: Spacing.two + 2,
                  paddingVertical: Spacing.one,
                  borderRadius: Radius.pill,
                  backgroundColor: `${color}22`,
                }}
              >
                <Text style={{ color, fontSize: 12, fontWeight: "700" }}>{WARRANTY_STATUS_LABEL[info.status]}</Text>
              </View>
            </View>

            <View style={{ gap: Spacing.one + 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Purchased</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Warranty Ends</Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                <View style={{ flex: Math.max(fraction, 0.02), height: 2, backgroundColor: color }} />
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: colors.background,
                    borderWidth: 2,
                    borderColor: color,
                  }}
                />
                <View
                  style={{
                    flex: Math.max(1 - fraction, 0.02),
                    borderTopWidth: 2,
                    borderStyle: "dashed",
                    borderColor: colors.separator,
                  }}
                />
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: fraction >= 1 ? color : "transparent",
                    borderWidth: fraction >= 1 ? 0 : 2,
                    borderColor: colors.separator,
                  }}
                />
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{formatDate(purchase.purchase_date)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{formatDate(purchase.warranty_end)}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{describeRemaining(info)}</Text>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      {onDelete ? (
        <Link.Menu>
          <Link.MenuAction title="Delete" icon="trash" destructive onPress={() => onDelete(purchase.id)} />
        </Link.Menu>
      ) : null}
    </Link>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
