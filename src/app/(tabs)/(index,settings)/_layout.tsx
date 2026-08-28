import { Stack } from 'expo-router/stack';

import { useTheme } from '@/hooks/use-theme';

const TITLES: Record<string, string> = {
  index: 'Warranties',
  settings: 'Settings',
};

export default function SharedStackLayout({ segment }: { segment: string }) {
  const colors = useTheme();
  const screen = segment.match(/\((.*)\)/)?.[1] ?? 'index';

  // Large titles and a transparent header are iOS conventions. On Android the
  // transparent header would draw over the content, since the ScrollView's
  // `contentInsetAdjustmentBehavior` is iOS-only and cannot compensate.
  const platformHeader =
    process.env.EXPO_OS === 'ios'
      ? {
          headerTransparent: true,
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: 'transparent' },
          headerBlurEffect: 'none' as const,
        }
      : { headerStyle: { backgroundColor: colors.background } };

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        // Resolved from the theme rather than PlatformColor('label'), which is
        // an iOS-only semantic color and fails to resolve on Android.
        headerTitleStyle: { color: colors.text },
        headerBackButtonDisplayMode: 'minimal',
        ...platformHeader,
      }}>
      <Stack.Screen
        name={screen === 'settings' ? 'settings' : 'index'}
        options={{ title: TITLES[screen] }}
      />
      <Stack.Screen name="purchase/[id]" options={{ headerLargeTitle: false, title: '' }} />
    </Stack>
  );
}
