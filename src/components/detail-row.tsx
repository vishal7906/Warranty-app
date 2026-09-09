import { Text, View } from "react-native";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: Spacing.three,
        paddingVertical: Spacing.two + 2,
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{label}</Text>
      <Text selectable style={{ color: colors.text, fontSize: 16, flexShrink: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  const colors = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.one,
        backgroundColor: colors.backgroundElement,
        borderRadius: 14,
        borderCurve: "continuous",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
      }}
    >
      {children}
    </View>
  );
}
