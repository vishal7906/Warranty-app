import { Alert, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card, DetailRow } from '@/components/detail-row';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { EXPIRING_SOON_DAYS, UPCOMING_DAYS } from '@/features/purchases/warranty';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

export default function SettingsScreen() {
  const colors = useTheme();
  const { session, signOut } = useAuth();

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your purchases stay safe in the cloud.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: Spacing.three,
        gap: Spacing.four,
        paddingBottom: Spacing.six,
        maxWidth: MaxContentWidth,
        width: '100%',
        alignSelf: 'center',
      }}>
      <View style={{ gap: Spacing.two }}>
        <SectionLabel>Account</SectionLabel>
        <Card>
          <DetailRow label="Email" value={session?.user.email ?? '—'} />
          <DetailRow
            label="Name"
            value={(session?.user.user_metadata?.name as string | undefined) ?? '—'}
          />
        </Card>
      </View>

      <View style={{ gap: Spacing.two }}>
        <SectionLabel>Warranty thresholds</SectionLabel>
        <Card>
          <DetailRow label="Expiring soon" value={`${EXPIRING_SOON_DAYS} days or less`} />
          <DetailRow label="Upcoming" value={`${UPCOMING_DAYS} days or less`} />
        </Card>
      </View>

      <Button title="Sign Out" variant="destructive" onPress={confirmSignOut} />
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  const colors = useTheme();
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
        paddingHorizontal: Spacing.one,
      }}>
      {children.toUpperCase()}
    </Text>
  );
}
