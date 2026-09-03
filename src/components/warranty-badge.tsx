import { Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/constants/theme';
import { WARRANTY_STATUS_LABEL, type WarrantyStatus } from '@/features/purchases/warranty';
import { useTheme } from '@/hooks/use-theme';

/** Pure lookup, for call sites that already have `colors` and are mapping over a list. */
export function warrantyColor(status: WarrantyStatus, colors: ThemeColors): string {
  switch (status) {
    case 'expired':
      return colors.neutral;
    case 'expiring':
      return colors.danger;
    case 'upcoming':
      return colors.warning;
    case 'active':
      return colors.success;
    default:
      return colors.neutral;
  }
}

export function useWarrantyColor(status: WarrantyStatus): string {
  const colors = useTheme();
  return warrantyColor(status, colors);
}

export function WarrantyDot({ status }: { status: WarrantyStatus }) {
  const color = useWarrantyColor(status);
  return <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />;
}

export function WarrantyBadge({ status }: { status: WarrantyStatus }) {
  const color = useWarrantyColor(status);
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.two + 2,
        paddingVertical: Spacing.one + 1,
        borderRadius: Radius.pill,
        backgroundColor: `${color}22`,
      }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color, fontSize: 13, fontWeight: '600' }}>
        {WARRANTY_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}
