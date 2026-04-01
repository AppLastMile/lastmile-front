import type { NotificationItem } from '@/modules/notifications/hooks/useRealtimeNotifications';

type NotificationsSnapshot = {
  notifications: NotificationItem[];
  unreadCount: number;
  toastMessage: string | null;
};

type Listener = (snapshot: NotificationsSnapshot) => void;

let notifications: NotificationItem[] = [];
let unreadCount = 0;
let toastMessage: string | null = null;
const listeners = new Set<Listener>();

function snapshot(): NotificationsSnapshot {
  return {
    notifications,
    unreadCount,
    toastMessage,
  };
}

function notifyAll() {
  const current = snapshot();
  listeners.forEach((listener) => listener(current));
}

export function subscribeNotifications(listener: Listener) {
  listeners.add(listener);
  listener(snapshot());

  return () => {
    listeners.delete(listener);
  };
}

export function addNotification(next: NotificationItem) {
  if (notifications.some((item) => item.notificationId === next.notificationId)) {
    return;
  }

  notifications = [next, ...notifications].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
  unreadCount += 1;
  toastMessage = next.message;
  notifyAll();
}

export function clearUnreadNotifications() {
  unreadCount = 0;
  notifyAll();
}

export function clearToastMessage() {
  toastMessage = null;
  notifyAll();
}
