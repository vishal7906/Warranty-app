import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

/**
 * All our pushes are FCM data-only (no title/body of their own) so the
 * platform never shows anything automatically. `title`/`body` are carried
 * inside `data` instead and presented as a local notification by this task
 * (background/killed) or the foreground listener in NotificationsProvider.
 */
export type WarrantyPushData = {
  type: 'warranty_expiring';
  purchaseId: string;
  productName: string;
  daysRemaining: number;
  title: string;
  body: string;
};

export const PUSH_BACKGROUND_TASK = 'warranty-push-background-task';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

TaskManager.defineTask(PUSH_BACKGROUND_TASK, async ({ data, error }) => {
  if (error) return;

  const dataString = (data as { data?: { dataString?: string } })?.data?.dataString;
  if (!dataString) return;

  let payload: WarrantyPushData;
  try {
    payload = JSON.parse(dataString);
  } catch {
    return;
  }
  if (!payload?.title) return;

  await Notifications.scheduleNotificationAsync({
    content: { title: payload.title, body: payload.body, data: payload },
    trigger: null,
  });
});

// Registered here (module scope, evaluated on app cold start) rather than in
// a component effect, since TaskManager requires background tasks to be
// defined before the app finishes loading. Unsupported platforms (e.g. web)
// reject; that's expected and safe to ignore.
Notifications.registerTaskAsync(PUSH_BACKGROUND_TASK).catch(() => {});
