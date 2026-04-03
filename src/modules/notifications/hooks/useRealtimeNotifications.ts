import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  connectRealtime,
  joinRealtimeRoom,
  leaveRealtimeRoom,
  onRealtime,
} from '@/services/realtime/realtimeService';
import {
  addNotification as addNotificationToStore,
  clearToastMessage,
  clearUnreadNotifications,
  subscribeNotifications,
} from '@/modules/notifications/state/notificationsStore';
import { getEvents } from '@/services/api/eventsService';

type RealtimeNotificationPayload = {
  id?: number;
  notificationId?: number;
  userId?: number;
  message: string;
  auctionId: number | null;
  read?: boolean;
  createdAt?: string;
  notification?: RealtimeNotificationPayload;
  data?: RealtimeNotificationPayload;
};

type RealtimeChatMessagePayload = {
  id?: number;
  campaignId?: number;
  authorId?: number;
  authorName?: string;
  message?: string;
  createdAt?: string;
};

type RealtimeEventCreatedPayload = {
  id?: number;
  eventId?: number;
  name?: string;
  city?: string;
  createdAt?: string;
  data?: RealtimeEventCreatedPayload;
  event?: RealtimeEventCreatedPayload;
};

export type NotificationItem = {
  notificationId: number;
  userId: number;
  message: string;
  auctionId: number | null;
  createdAt: string;
};

type UseRealtimeNotificationsArgs = {
  userId?: number;
  role?: string;
  token?: string;
};

function normalizeNotification(payload: RealtimeNotificationPayload): NotificationItem {
  const fallbackId = Date.now();

  return {
    notificationId: Number(payload.notificationId ?? payload.id ?? fallbackId),
    userId: Number(payload.userId ?? 0),
    message: String(payload.message ?? ''),
    auctionId: payload.auctionId ?? null,
    createdAt: payload.createdAt ?? new Date().toISOString(),
  };
}

function unwrapNotificationPayload(payload: RealtimeNotificationPayload): RealtimeNotificationPayload {
  if (payload.notification) {
    return payload.notification;
  }

  if (payload.data) {
    return payload.data;
  }

  return payload;
}

function unwrapEventPayload(payload: RealtimeEventCreatedPayload): RealtimeEventCreatedPayload {
  if (payload.data) {
    return payload.data;
  }

  if (payload.event) {
    return payload.event;
  }

  return payload;
}

export function useRealtimeNotifications({ userId, role, token }: UseRealtimeNotificationsArgs) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const hasEventsSnapshotRef = useRef(false);
  const knownEventIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    return subscribeNotifications((nextSnapshot) => {
      setNotifications(nextSnapshot.notifications);
      setUnreadCount(nextSnapshot.unreadCount);
      setToastMessage(nextSnapshot.toastMessage);
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    clearUnreadNotifications();
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    // Reuse the singleton connection and ensure it exists before subscribing.
    connectRealtime({ userId, role, token });
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[notifications] suscripcion activa para currentUserId', userId);
    }

    const rooms = [
      `user:${userId}`,
      `user:${userId}:notifications`,
      `notifications:${userId}`,
    ];

    rooms.forEach((room) => joinRealtimeRoom(room));

    const offNotification = onRealtime<RealtimeNotificationPayload>('notification.new', (payload) => {
      if (!payload) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[notifications] notification.new sin payload');
        }
        return;
      }

      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[notifications] notification.new payload crudo', payload);
      }

      const normalizedPayload = unwrapNotificationPayload(payload);

      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[notifications] notification.new payload normalizado', normalizedPayload);
      }

      // If backend includes userId, enforce match. If not, accept and show it.
      if (normalizedPayload.userId !== undefined && Number(normalizedPayload.userId) !== userId) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[notifications] descartada por userId', {
            payloadUserId: normalizedPayload.userId,
            currentUserId: userId,
          });
        }
        return;
      }

      const nextNotification = normalizeNotification(normalizedPayload);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[notifications] aceptada y agregada', nextNotification);
      }
      addNotificationToStore(nextNotification);
    });

    const offChatMessageCreated = onRealtime<RealtimeChatMessagePayload>('chat.message.created', (payload) => {
      if (!payload?.message || !payload.campaignId) {
        return;
      }

      if (payload.authorId !== undefined && Number(payload.authorId) === userId) {
        return;
      }

      const chatNotification: NotificationItem = {
        notificationId: Number(payload.id ?? Date.now()),
        userId: Number(payload.authorId ?? 0),
        message: `Nuevo mensaje en campaña #${payload.campaignId}: ${payload.message}`,
        auctionId: null,
        createdAt: payload.createdAt ?? new Date().toISOString(),
      };

      addNotificationToStore(chatNotification);
    });

    const offEventCreated = onRealtime<RealtimeEventCreatedPayload>('event.created', (payload) => {
      if (role !== 'donor' || !payload) {
        return;
      }

      const eventPayload = unwrapEventPayload(payload);
      const eventId = Number(eventPayload.eventId ?? eventPayload.id ?? 0);
      const eventCity = eventPayload.city?.trim() || 'una nueva ciudad';
      const eventName = eventPayload.name?.trim();

      addNotificationToStore({
        notificationId: eventId > 0 ? 2_000_000 + eventId : Date.now(),
        userId,
        message: eventName
          ? `Se ha creado un nuevo evento en ${eventCity}: ${eventName}`
          : `Se ha creado un nuevo evento en ${eventCity}`,
        auctionId: null,
        createdAt: eventPayload.createdAt ?? new Date().toISOString(),
      });
    });

    const offEventNew = onRealtime<RealtimeEventCreatedPayload>('event.new', (payload) => {
      if (role !== 'donor' || !payload) {
        return;
      }

      const eventPayload = unwrapEventPayload(payload);
      const eventId = Number(eventPayload.eventId ?? eventPayload.id ?? 0);
      const eventCity = eventPayload.city?.trim() || 'una nueva ciudad';
      const eventName = eventPayload.name?.trim();

      addNotificationToStore({
        notificationId: eventId > 0 ? 2_000_000 + eventId : Date.now(),
        userId,
        message: eventName
          ? `Se ha creado un nuevo evento en ${eventCity}: ${eventName}`
          : `Se ha creado un nuevo evento en ${eventCity}`,
        auctionId: null,
        createdAt: eventPayload.createdAt ?? new Date().toISOString(),
      });
    });

    return () => {
      offNotification();
      offChatMessageCreated();
      offEventCreated();
      offEventNew();
      rooms.forEach((room) => leaveRealtimeRoom(room));
    };
  }, [role, token, userId]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = setTimeout(() => {
      clearToastMessage();
    }, 2600);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  useEffect(() => {
    if (!userId || role !== 'donor') {
      return;
    }

    let isMounted = true;

    const syncEvents = async (notifyChanges: boolean) => {
      try {
        const response = await getEvents({ page: 1, limit: 100 });
        const nextEvents = response.data;
        const nextEventIds = new Set(nextEvents.map((eventItem) => eventItem.id));

        if (!isMounted) {
          return;
        }

        if (!hasEventsSnapshotRef.current) {
          hasEventsSnapshotRef.current = true;
          knownEventIdsRef.current = nextEventIds;
          return;
        }

        if (notifyChanges) {
          nextEvents.forEach((eventItem) => {
            if (knownEventIdsRef.current.has(eventItem.id)) {
              return;
            }

            addNotificationToStore({
              notificationId: 2_000_000 + eventItem.id,
              userId,
              message: `Se ha creado un nuevo evento en ${eventItem.city}: ${eventItem.name}`,
              auctionId: null,
              createdAt: new Date().toISOString(),
            });
          });
        }

        knownEventIdsRef.current = nextEventIds;
      } catch {
        // Keep current snapshot when events cannot be fetched.
      }
    };

    void syncEvents(false);

    const pollingId = setInterval(() => {
      void syncEvents(true);
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollingId);
    };
  }, [role, userId]);

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ),
    [notifications]
  );

  return {
    notifications: sortedNotifications,
    unreadCount,
    toastMessage,
    markAllAsRead,
  };
}
