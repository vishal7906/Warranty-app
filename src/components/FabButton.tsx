import { BottomTabInset, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { router } from "expo-router";
import { Pressable } from "react-native";
import { PlusIcon } from "./plus-icon";

const FabButton = () => {
  const colors = useTheme();
  return (
    <Pressable
      onPress={() => router.push("/new-purchase")}
      accessibilityRole="button"
      accessibilityLabel="Add purchase"
      hitSlop={8}
      style={({ pressed }) => ({
        position: "absolute",
        right: Spacing.four,
        bottom: BottomTabInset,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.tint,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
      })}
    >
      <PlusIcon color="#FFFFFF" size={26} />
    </Pressable>
  );
};

export default FabButton;
