import * as Notifications from 'expo-notifications';
import { useEffect, useRef, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { deletePushToken, upsertPushToken } from '@/features/notifications/api';
import type { WarrantyPushData } from '@/features/notifications/background-task';
import { registerForPushNotificationsAsync } from '@/features/notifications/push';
import { isSupabaseConfigured } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';

/**
 * Registers this device's push token while signed in, and removes it on
 * sign-out so a shared device stops notifying the previous account. Also
 * presents a local notification for data-only pushes received in the
 * foreground (the background/killed case is handled by the background task).
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    if (!session) {
      const token = tokenRef.current;
      if (token) {
        tokenRef.current = null;
        void deletePushToken(token).catch(() => {});
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token || cancelled) return;
      tokenRef.current = token;
      await upsertPushToken(token, Platform.OS).catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Partial<WarrantyPushData> & { _local?: boolean };
      if (!data?.title || data._local) return;
      void Notifications.scheduleNotificationAsync({
        content: { title: data.title, body: data.body, data: { ...data, _local: true } },
        trigger: null,
      });
    });
    return () => subscription.remove();
  }, []);

  return <>{children}</>;
}
