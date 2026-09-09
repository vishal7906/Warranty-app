// Registers the background push-notification task; must be imported for its
// side effects before the app finishes loading, so this stays the first
// import in the app's earliest-evaluated module.
import "@/features/notifications/background-task";

import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { SetupRequired } from "@/components/setup-required";
import { isSupabaseConfigured } from "@/lib/env";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { NotificationsProvider } from "@/providers/notifications-provider";
import { QueryProvider } from "@/providers/query-provider";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <QueryProvider>
          <AuthProvider>
            <NotificationsProvider>
              <RootNavigator />
            </NotificationsProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (!isSupabaseConfigured) return <SetupRequired />;
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="receipt/[id]"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Receipt",
            sheetGrabberVisible: true,
          }}
        />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" options={{ headerShown: true, title: "Create Account" }} />
      </Stack.Protected>
    </Stack>
  );
}
