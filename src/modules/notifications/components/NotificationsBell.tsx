import { FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { NotificationItem } from '@/modules/notifications/hooks/useRealtimeNotifications';

type NotificationsBellProps = Readonly<{
  notifications: NotificationItem[];
  unreadCount: number;
  toastMessage: string | null;
  onMarkAllAsRead: () => void;
}>;

export function NotificationsBell({
  notifications,
  unreadCount,
  toastMessage,
  onMarkAllAsRead,
}: NotificationsBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    onMarkAllAsRead();
  };

  return (
    <>
      <Pressable
        className='h-10 w-10 items-center justify-center rounded-full bg-white'
        onPress={handleOpen}
        style={{
          shadowColor: '#17345a',
          shadowOpacity: 0.14,
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <FontAwesome5 color='#1f5fe0' name='bell' size={16} />
        {unreadCount > 0 ? (
          <View className='absolute -right-1 -top-1 min-w-[18px] items-center rounded-full bg-[#cf3a4a] px-1'>
            <Text className='text-[10px] font-bold text-white'>{Math.min(unreadCount, 99)}</Text>
          </View>
        ) : null}
      </Pressable>

      {toastMessage ? (
        <View
          className='absolute right-0 top-12 flex-row items-center rounded-xl bg-[#17345a] px-3 py-2'
          pointerEvents='none'
          style={{
            shadowColor: '#0b1324',
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 10,
            maxWidth: 360,
            minWidth: 240,
            zIndex: 9999,
            elevation: 9999,
          }}
        >
          <FontAwesome5 color='#9dc2ff' name='bell' size={11} style={{ marginRight: 8 }} />
          <Text className='flex-1 text-xs font-medium text-white' numberOfLines={1}>
            {toastMessage}
          </Text>
        </View>
      ) : null}

      <Modal animationType='fade' transparent visible={isOpen}>
        <View className='flex-1 justify-start bg-[#07163155] pt-24'>
          <View className='mx-4 rounded-2xl bg-white p-4'>
            <View className='flex-row items-center justify-between'>
              <Text className='text-base font-extrabold text-[#17345a]'>Notificaciones</Text>
              <Pressable onPress={() => setIsOpen(false)}>
                <Text className='text-sm font-semibold text-[#1f5fe0]'>Cerrar</Text>
              </Pressable>
            </View>

            <ScrollView className='mt-3 max-h-72'>
              {notifications.length === 0 ? (
                <Text className='text-sm text-[#5c7297]'>Aun no hay notificaciones.</Text>
              ) : (
                notifications.map((notification) => (
                  <View
                    className='mb-2 rounded-xl border border-[#d8e6ff] bg-[#f8fbff] px-3 py-2'
                    key={notification.notificationId}
                  >
                    <Text className='text-sm font-semibold text-[#17345a]'>{notification.message}</Text>
                    <Text className='mt-1 text-xs text-[#5c7297]'>
                      {new Date(notification.createdAt).toLocaleString('es-CO')}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
