import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';
import { DonorBottomTabs } from '@/modules/donor/components/DonorBottomTabs';
import { type Campaign, getCampaigns } from '@/services/api/campaignsService';
import { createMoneyDonation } from '@/services/api/donationsService';
import { type EventSummary, getEvents } from '@/services/api/eventsService';
import { getUsers } from '@/services/api/usersService';

type ChatMessage = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

const DEFAULT_DONOR_ID = 1;

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Error desconocido.';
  }

  const rawMessage = error.message?.trim();
  if (!rawMessage) {
    return 'Error desconocido.';
  }

  try {
    const parsed = JSON.parse(rawMessage) as { message?: string | string[] };

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(' | ');
    }

    if (typeof parsed.message === 'string') {
      return parsed.message;
    }

    return rawMessage;
  } catch {
    return rawMessage;
  }
}

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
  const [moneyDraftByCampaign, setMoneyDraftByCampaign] = useState<Record<number, string>>({});
  const [donationFeedbackByCampaign, setDonationFeedbackByCampaign] = useState<Record<number, string>>({});
  const [isDonatingByCampaign, setIsDonatingByCampaign] = useState<Record<number, boolean>>({});
  const [donorId, setDonorId] = useState<number>(DEFAULT_DONOR_ID);

  const [chatCampaignId, setChatCampaignId] = useState<number | null>(null);
  const [chatDraft, setChatDraft] = useState('');
  const [chatByCampaign, setChatByCampaign] = useState<Record<number, ChatMessage[]>>({});

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

  useEffect(() => {
    let isMounted = true;

    async function resolveDonorId() {
      if (!currentUser || currentUser.role !== 'donor') {
        return;
      }

      try {
        const usersResponse = await getUsers(1, 100);

        if (!isMounted) {
          return;
        }

        const matchedByEmail = usersResponse.data.find(
          (userItem) => userItem.email.toLowerCase() === currentUser.email.toLowerCase()
        );

        if (matchedByEmail) {
          setDonorId(matchedByEmail.id);
          return;
        }

        const fallbackDonor = usersResponse.data.find((userItem) => userItem.role === 'donor');
        setDonorId(fallbackDonor?.id ?? DEFAULT_DONOR_ID);
      } catch {
        if (isMounted) {
          setDonorId(DEFAULT_DONOR_ID);
        }
      }
    }

    resolveDonorId();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const eventsById = useMemo(
    () => new Map(events.map((eventItem) => [eventItem.id, eventItem])),
    [events]
  );

  const chatCampaign = useMemo(
    () => campaigns.find((campaignItem) => campaignItem.id === chatCampaignId) ?? null,
    [campaigns, chatCampaignId]
  );

  const chatMessages = chatCampaignId ? chatByCampaign[chatCampaignId] ?? [] : [];

  const handleDonate = async (campaign: Campaign) => {
    const value = Number((moneyDraftByCampaign[campaign.id] ?? '').replace(/[^0-9]/g, ''));

    if (!value || value <= 0) {
      setDonationFeedbackByCampaign((prev) => ({
        ...prev,
        [campaign.id]: 'Ingresa un valor valido para donar.',
      }));
      return;
    }

    const currentProgress = getProgressValue(campaign);
    if (currentProgress >= 100) {
      setDonationFeedbackByCampaign((prev) => ({
        ...prev,
        [campaign.id]: 'Esta campana ya alcanzo su meta.',
      }));
      return;
    }

    setIsDonatingByCampaign((prev) => ({ ...prev, [campaign.id]: true }));

    try {
      await createMoneyDonation({
        campaignId: campaign.id,
        donorId,
        amount: value,
      });

      setCampaigns((prev) =>
        prev.map((campaignItem) =>
          campaignItem.id === campaign.id
            ? { ...campaignItem, collectedMoney: campaignItem.collectedMoney + value }
            : campaignItem
        )
      );

      setMoneyDraftByCampaign((prev) => ({ ...prev, [campaign.id]: '' }));
      setDonationFeedbackByCampaign((prev) => ({
        ...prev,
        [campaign.id]: 'Gracias por tu aporte.',
      }));
    } catch (error) {
      setDonationFeedbackByCampaign((prev) => ({
        ...prev,
        [campaign.id]: `No se pudo registrar la donacion. ${getErrorMessage(error)}`,
      }));
    } finally {
      setIsDonatingByCampaign((prev) => ({ ...prev, [campaign.id]: false }));
    }
  };

  const openChat = (campaignId: number) => {
    setChatCampaignId(campaignId);
    setChatDraft('');
  };

  const handleSendChat = () => {
    if (!chatCampaignId || chatDraft.trim().length < 1) {
      return;
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      author: currentUser?.label ?? 'Donante',
      message: chatDraft.trim(),
      createdAt: new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setChatByCampaign((prev) => ({
      ...prev,
      [chatCampaignId]: [...(prev[chatCampaignId] ?? []), newMessage],
    }));
    setChatDraft('');
  };

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

                  <View className='items-end gap-2'>
                    <View className='rounded-full bg-[#e9f1ff] px-3 py-1'>
                      <Text className='text-xs font-bold text-[#1f4fb6]'>{progress}%</Text>
                    </View>
                    <Pressable
                      className='h-9 w-9 items-center justify-center rounded-full bg-[#1f5fe0]'
                      onPress={() => openChat(campaignItem.id)}
                    >
                      <Text className='text-[10px] font-bold text-white'>Chat</Text>
                    </Pressable>
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

                {progress < 100 ? (
                  <View className='mt-3 flex-row items-center gap-2'>
                    <TextInput
                      className='flex-1 rounded-xl border border-[#d3e2fb] bg-[#f8fbff] px-3 py-2 text-[#18335f]'
                      keyboardType='number-pad'
                      onChangeText={(value) =>
                        setMoneyDraftByCampaign((prev) => ({ ...prev, [campaignItem.id]: value }))
                      }
                      placeholder='Monto COP'
                      placeholderTextColor='#8ea6c8'
                      value={moneyDraftByCampaign[campaignItem.id] ?? ''}
                    />
                    <Pressable className='rounded-xl bg-[#1f5fe0] px-3 py-2' onPress={() => handleDonate(campaignItem)}>
                      <Text className='text-xs font-bold text-white'>
                        {isDonatingByCampaign[campaignItem.id] ? 'Donando...' : 'Donar'}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text className='mt-3 text-xs font-semibold text-[#1b7b45]'>Campana completada.</Text>
                )}

                {donationFeedbackByCampaign[campaignItem.id] ? (
                  <Text className='mt-2 text-xs text-[#3a5176]'>
                    {donationFeedbackByCampaign[campaignItem.id]}
                  </Text>
                ) : null}
              </Animated.View>
            );
          })}

          {!isLoading && !loadError && campaigns.length === 0 ? (
            <Text className='text-sm text-[#5d7498]'>Aun no hay campanas publicadas.</Text>
          ) : null}
        </ScrollView>
      </View>

      <Modal animationType='slide' visible={Boolean(chatCampaignId)}>
        <SafeAreaView className='flex-1 bg-[#f4f8ff]'>
          <View className='flex-row items-center px-4 py-3'>
            <Pressable className='h-10 w-10 items-center justify-center rounded-full bg-white' onPress={() => setChatCampaignId(null)}>
              <Text className='text-base font-bold text-[#1f4fb6]'>X</Text>
            </Pressable>
            <Text className='ml-3 flex-1 text-base font-extrabold text-[#19335b]'>
              Chat {chatCampaign ? `- ${chatCampaign.name}` : ''}
            </Text>
          </View>

          <ScrollView className='flex-1 px-4' contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
            {chatMessages.length === 0 ? (
              <Text className='mt-3 text-sm text-[#5d7498]'>
                Aun no hay mensajes. Inicia la conversacion.
              </Text>
            ) : null}

            {chatMessages.map((message) => (
              <View className='rounded-xl bg-white px-3 py-2' key={message.id}>
                <Text className='text-xs font-semibold text-[#3b5783]'>
                  {message.author} - {message.createdAt}
                </Text>
                <Text className='mt-1 text-sm text-[#1f365d]'>{message.message}</Text>
              </View>
            ))}
          </ScrollView>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className='flex-row items-center gap-2 border-t border-[#dce6fb] bg-white px-4 py-3'>
              <TextInput
                className='flex-1 rounded-xl border border-[#d3e2fb] bg-[#f8fbff] px-3 py-2 text-[#18335f]'
                onChangeText={setChatDraft}
                placeholder='Escribe un mensaje...'
                placeholderTextColor='#8ea6c8'
                value={chatDraft}
              />
              <Pressable className='rounded-xl bg-[#1f5fe0] px-4 py-2' onPress={handleSendChat}>
                <Text className='font-semibold text-white'>Enviar</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {currentUser?.role === 'donor' ? <DonorBottomTabs activeTab='campanas' /> : null}
    </SafeAreaView>
  );
}
