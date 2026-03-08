import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';
import { DonorBottomTabs } from '@/modules/donor/components/DonorBottomTabs';
import { type Campaign, getCampaigns } from '@/services/api/campaignsService';
import { type EventSummary, getEvents } from '@/services/api/eventsService';

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function getProgressValue(campaign: Campaign) {
  if (!campaign.goalMoney || campaign.goalMoney <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((campaign.collectedMoney / campaign.goalMoney) * 100));
}

export function DonorCampaignsScreen() {
  const { currentUser } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [campaignsResponse, eventsResponse] = await Promise.all([
        getCampaigns(),
        getEvents({ page: 1, limit: 100 }),
      ]);

      setCampaigns(campaignsResponse.data);
      setEvents(eventsResponse.data);
    } catch {
      setLoadError('No fue posible cargar campanas. Verifica el backend.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const eventsById = useMemo(
    () => new Map(events.map((eventItem) => [eventItem.id, eventItem])),
    [events]
  );

  return (
    <SafeAreaView className='flex-1 bg-[#eef4ff]'>
      <View className='flex-1 px-4 pt-6'>
        <Text className='text-2xl font-extrabold text-[#16325d]'>Campanas Activas</Text>
        <Text className='mt-1 text-sm text-[#4d648a]'>
          Campanas creadas por organizadores para apoyar las misiones.
        </Text>

        <View className='mt-3 flex-row items-center justify-between'>
          <Text className='text-sm font-semibold text-[#2a456e]'>Total: {campaigns.length}</Text>
          <Pressable
            className='rounded-xl bg-[#1f5fe0] px-4 py-2 active:opacity-90'
            onPress={loadData}
          >
            <Text className='font-semibold text-white'>Recargar</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View className='mt-6 items-center'>
            <ActivityIndicator color='#1f5fe0' size='small' />
          </View>
        ) : null}

        {loadError ? (
          <Text className='mt-4 rounded-xl bg-[#ffecef] px-3 py-2 text-sm text-[#9f2238]'>
            {loadError}
          </Text>
        ) : null}

        <ScrollView className='mt-4' contentContainerStyle={{ gap: 12, paddingBottom: 120 }}>
          {campaigns.map((campaignItem, index) => {
            const eventInfo = eventsById.get(campaignItem.eventId);
            const progress = getProgressValue(campaignItem);

            return (
              <Animated.View
                className='rounded-2xl border border-[#d8e6ff] bg-white p-4'
                entering={FadeInUp.delay(index * 45).duration(240)}
                key={campaignItem.id}
              >
                <View className='flex-row items-start justify-between'>
                  <View className='flex-1 pr-3'>
                    <Text className='text-base font-extrabold text-[#1b3259]'>{campaignItem.name}</Text>
                    <Text className='mt-1 text-xs text-[#5d7399]'>
                      {eventInfo
                        ? `Evento: ${eventInfo.name} (${eventInfo.city})`
                        : `Evento asociado: ID ${campaignItem.eventId}`}
                    </Text>
                  </View>

                  <View className='rounded-full bg-[#e9f1ff] px-3 py-1'>
                    <Text className='text-xs font-bold text-[#1f4fb6]'>{progress}%</Text>
                  </View>
                </View>

                <Text className='mt-3 text-sm text-[#4d648a]' numberOfLines={3}>
                  {campaignItem.description || 'Campana humanitaria en curso.'}
                </Text>

                <View className='mt-3 flex-row gap-2'>
                  <View className='flex-1 rounded-xl bg-[#edf3ff] p-3'>
                    <Text className='text-xs font-semibold text-[#4b648d]'>Recaudado</Text>
                    <Text className='mt-1 text-sm font-extrabold text-[#1f4fa7]'>
                      {formatMoney(campaignItem.collectedMoney)}
                    </Text>
                  </View>
                  <View className='flex-1 rounded-xl bg-[#ebfff1] p-3'>
                    <Text className='text-xs font-semibold text-[#4b648d]'>Meta</Text>
                    <Text className='mt-1 text-sm font-extrabold text-[#1b7b45]'>
                      {formatMoney(campaignItem.goalMoney)}
                    </Text>
                  </View>
                </View>

                <View className='mt-3 h-2 overflow-hidden rounded-full bg-[#e4ecfb]'>
                  <View
                    className='h-full rounded-full bg-[#1f5fe0]'
                    style={{ width: `${Math.max(6, progress)}%` }}
                  />
                </View>
              </Animated.View>
            );
          })}

          {!isLoading && !loadError && campaigns.length === 0 ? (
            <Text className='text-sm text-[#5d7498]'>Aun no hay campanas publicadas.</Text>
          ) : null}
        </ScrollView>
      </View>

      {currentUser?.role === 'donor' ? <DonorBottomTabs activeTab='campanas' /> : null}
    </SafeAreaView>
  );
}
