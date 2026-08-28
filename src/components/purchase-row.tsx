import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { WarrantyDot } from '@/components/warranty-badge';
import { Radius, Spacing } from '@/constants/theme';
import { formatMoney } from '@/features/purchases/format';
import { describeRemaining, getWarrantyInfo } from '@/features/purchases/warranty';
import { useTheme } from '@/hooks/use-theme';
import type { PurchaseRow } from '@/lib/database.types';

export function PurchaseCard({
  purchase,
  onDelete,
}: {
  purchase: PurchaseRow;
  onDelete?: (id: string) => void;
}) {
  const colors = useTheme();
  const info = getWarrantyInfo(purchase);

  return (
    <Link href={{ pathname: '/purchase/[id]', params: { id: purchase.id } }} asChild>
      <Link.Trigger>
        <Pressable
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.three,
            padding: Spacing.three,
            backgroundColor: colors.backgroundElement,
            borderRadius: Radius.card,
            borderCurve: 'continuous',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            opacity: pressed ? 0.7 : 1,
          })}>
          <WarrantyDot status={info.status} />
          <View style={{ flex: 1, gap: Spacing.half }}>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
              {purchase.product_name}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              {describeRemaining(info)}
            </Text>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              fontVariant: ['tabular-nums'],
            }}>
            {formatMoney(purchase.price, purchase.currency)}
          </Text>
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        <Link.MenuAction
          title="Delete"
          icon="trash"
          destructive
          onPress={() => onDelete?.(purchase.id)}
        />
      </Link.Menu>
    </Link>
  );
}
