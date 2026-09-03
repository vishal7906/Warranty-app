import { Image } from "expo-image";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BellIcon } from "@/components/bell-icon";
import { ProfileIcon } from "@/components/profile-icon";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const appIcon = require("@/assets/images/icon.png");

export function AppHeader({ name, onBellPress, onProfilePress }: { name: string; onBellPress?: () => void; onProfilePress?: () => void }) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: Spacing.three,
          paddingVertical: Spacing.two,
          gap: Spacing.three,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two, flexShrink: 1 }}>
          <Image source={appIcon} style={{ width: 34, height: 34, borderRadius: 10 }} />
          <View style={{ flexShrink: 1 }} accessibilityRole="header">
            <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 16, fontWeight: "500" }} numberOfLines={1}>
              Hello,
            </Text>
            <Text style={{ color: colors.text, fontSize: 18, lineHeight: 22, fontWeight: "700" }} numberOfLines={1}>
              {name}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two }}>
          <HeaderIconButton onPress={onBellPress} accessibilityLabel="Notifications" backgroundColor={colors.backgroundElement}>
            <BellIcon color={colors.text} size={18} />
          </HeaderIconButton>
          <HeaderIconButton onPress={onProfilePress} accessibilityLabel="Profile" backgroundColor={colors.backgroundElement}>
            <ProfileIcon color={colors.text} size={18} />
          </HeaderIconButton>
        </View>
      </View>
    </View>
  );
}

/** A circular chip with a light background, used for the header's right-hand icon buttons. */
function HeaderIconButton({ onPress, accessibilityLabel, backgroundColor, children }: { onPress?: () => void; accessibilityLabel: string; backgroundColor: string; children: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}
