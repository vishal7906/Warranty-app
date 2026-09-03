import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { warrantyColor } from "@/components/warranty-badge";
import type { CategoryOption } from "@/constants/categories";
import { Spacing, type ThemeColors } from "@/constants/theme";
import { type ExpiringItem } from "@/features/purchases/expiring-mock";
import { describeRemaining, getWarrantyInfo } from "@/features/purchases/warranty";
import { useTheme } from "@/hooks/use-theme";
import { useCategoryOptions } from "@/store/categories";

const CARD_HEIGHT = 196;
const CARD_RADIUS = 24;
/** Gutter on both ends of the rail, so the first and last card line up with the header. */
const RAIL_INSET = Spacing.three;
const CARD_GAP = Spacing.two + 4;
/** How much of the neighbouring card stays visible past the gutter. */
const CARD_PEEK = 44;
/** How long each card rests before the rail slides to the next one. */
const AUTO_ADVANCE_MS = 3500;

/** Ink is fixed rather than themed: every card supplies its own vivid background. */
const INK = "#1C1C1E";

/** One vivid colour per card, cycled by position, like the reference design. */
const CARD_PALETTE = ["#FFC846", "#FF6B5E", "#7A73FF", "#2ECFBB", "#E070E8"];

/**
 * A snapping horizontal carousel of the soonest-expiring warranties. Rail
 * position lives in a shared value and every card reads it on the UI thread,
 * so sliding never triggers a React re-render.
 *
 * The rail renders the items twice and advances on a timer. Sliding off the
 * last item lands on its clone at the head of the second copy, which is then
 * swapped for the real first item without animation — so the wrap uses the
 * same forward slide as every other step, with nothing visible at the seam.
 */
export function ExpiringWarrantyCarousel({ items }: { items: ExpiringItem[] }) {
  const colors = useTheme();
  const categories = useCategoryOptions();
  const { width: screenWidth } = useWindowDimensions();

  const cardWidth = screenWidth - RAIL_INSET * 2 - CARD_PEEK;
  const itemWidth = cardWidth + CARD_GAP;
  const canLoop = items.length > 1;

  const railItems = useMemo(() => (canLoop ? [...items, ...items] : items), [items, canLoop]);

  /** Position of the rail, in cards. 1 means "card index 1 is snapped". */
  const position = useSharedValue(0);
  const dragStart = useSharedValue(0);
  /** 1 from the moment a swipe starts until its snap settles, so the timer yields. */
  const userHold = useSharedValue(0);

  const total = items.length;

  useEffect(() => {
    if (!canLoop) return;
    const timer = setInterval(() => {
      if (userHold.get() === 1) return;
      // Step onto the clone that sits past the end, then swap it for the real
      // card underneath once the slide lands — same animation every step.
      const target = Math.round(position.get()) + 1;
      position.set(
        withTiming(target, { duration: 450 }, (finished) => {
          if (finished && target >= total) position.set(target - total);
        })
      );
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [canLoop, total, position, userHold]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-12, 12])
        .onBegin(() => {
          userHold.set(1);
          dragStart.set(position.get());
        })
        .onUpdate((event) => {
          position.set(dragStart.get() - event.translationX / itemWidth);
        })
        .onEnd((event) => {
          // Carry a little of the fling into where it lands, then snap.
          const projected = position.get() - (event.velocityX / itemWidth) * 0.15;
          const target = Math.min(Math.max(Math.round(projected), 0), canLoop ? total : 0);
          position.set(
            withTiming(target, { duration: 300 }, (finished) => {
              if (finished && target >= total) position.set(target - total);
              userHold.set(0);
            })
          );
        }),
    [canLoop, total, itemWidth, position, dragStart, userHold]
  );

  const railStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -position.get() * itemWidth }],
  }));

  if (items.length === 0) return null;

  return (
    <View style={{ gap: Spacing.three }}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700", paddingHorizontal: Spacing.three }}>
        Expiring Soon <Text style={{ color: colors.neutral, fontWeight: "500" }}>({items.length})</Text>
      </Text>

      <GestureDetector gesture={pan}>
        <View style={{ height: CARD_HEIGHT }}>
          <Animated.View
            style={[{ flexDirection: "row", gap: CARD_GAP, paddingHorizontal: RAIL_INSET }, railStyle]}>
            {railItems.map((item, index) => (
              <CarouselCard
                key={`${item.id}-${index}`}
                item={item}
                index={index}
                paletteIndex={index % items.length}
                cardWidth={cardWidth}
                position={position}
                colors={colors}
                categories={categories}
              />
            ))}
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: Spacing.one + 2 }}>
        {items.map((item, index) => (
          <Dot key={item.id} index={index} count={items.length} position={position} color={colors.text} />
        ))}
      </View>
    </View>
  );
}

type CarouselCardProps = {
  item: ExpiringItem;
  /** Position on the rail, counting both copies, used for the scroll maths. */
  index: number;
  /** Position within the real list, so a card keeps its colour in both copies. */
  paletteIndex: number;
  cardWidth: number;
  position: SharedValue<number>;
  colors: ThemeColors;
  categories: CategoryOption[];
};

/** Shrinks and dims as it moves away from the snapped position. */
const CarouselCard = React.memo(function CarouselCard({
  item,
  index,
  paletteIndex,
  cardWidth,
  position,
  colors,
  categories,
}: CarouselCardProps) {
  const cardColor = CARD_PALETTE[paletteIndex % CARD_PALETTE.length];

  const animStyle = useAnimatedStyle(() => {
    const distance = Math.abs(position.get() - index);
    return {
      transform: [{ scale: interpolate(distance, [0, 1], [1, 0.95], Extrapolation.CLAMP) }],
      opacity: interpolate(distance, [0, 1], [1, 0.75], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View style={[{ width: cardWidth, height: CARD_HEIGHT }, animStyle]}>
      <View style={styles.cardClip}>
        <ExpiringCard item={item} cardColor={cardColor} colors={colors} categories={categories} />
      </View>
    </Animated.View>
  );
});

function Dot({
  index,
  count,
  position,
  color,
}: {
  index: number;
  count: number;
  position: SharedValue<number>;
  color: string;
}) {
  const animStyle = useAnimatedStyle(() => {
    // The rail holds two copies, so fold the position back onto the real list
    // and measure the shorter way round, keeping the wrap step continuous.
    const page = ((position.get() % count) + count) % count;
    const gap = Math.abs(page - index);
    const distance = Math.min(gap, count - gap);
    return {
      width: interpolate(distance, [0, 1], [18, 6], Extrapolation.CLAMP),
      opacity: interpolate(distance, [0, 1], [1, 0.25], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: color }, animStyle]} />;
}

function ExpiringCard({
  item,
  cardColor,
  colors,
  categories,
}: {
  item: ExpiringItem;
  cardColor: string;
  colors: ThemeColors;
  categories: CategoryOption[];
}) {
  const info = getWarrantyInfo(item);
  const statusColor = warrantyColor(info.status, colors);
  const emoji = categories.find((c) => c.label.toLowerCase() === item.category?.toLowerCase())?.emoji ?? "📦";

  return (
    <View style={{ flex: 1, backgroundColor: cardColor }}>
      <View style={styles.glow} />
      <Text style={styles.productEmoji}>{emoji}</Text>

      <View style={{ flex: 1, padding: Spacing.three, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two }}>
          <View style={styles.logoBadge}>
            <Text style={{ fontSize: 18 }}>{emoji}</Text>
          </View>
          <Text numberOfLines={1} style={styles.productName}>
            {item.product_name}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
          <Text style={styles.expiryText}>
            {item.warranty_end ? describeRemaining(info) : "No warranty recorded"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardClip: {
    flex: 1,
    borderRadius: CARD_RADIUS,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    right: -20,
    top: -30,
    width: CARD_HEIGHT * 0.72,
    height: CARD_HEIGHT * 0.72,
    borderRadius: CARD_HEIGHT * 0.36,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  productEmoji: {
    position: "absolute",
    right: -6,
    bottom: 18,
    fontSize: 104,
    transform: [{ rotate: "-10deg" }],
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  productName: {
    flex: 1,
    color: INK,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  expiryText: {
    color: INK,
    fontSize: 14,
    fontWeight: "700",
  },
});
