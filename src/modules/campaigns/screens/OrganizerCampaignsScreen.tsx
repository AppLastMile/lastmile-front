import { FontAwesome5 } from '@expo/vector-icons';
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
import { OrganizerBottomTabs } from '@/modules/organizer/components/OrganizerBottomTabs';
import { type Auction, buyAuction, getCampaignAuctions } from '@/services/api/auctionsService';
import { type Campaign, createCampaign, getCampaigns } from '@/services/api/campaignsService';
import { getItemDonations, type ItemDonationResponse } from '@/services/api/donationsService';
import { type EventSummary, getEvents } from '@/services/api/eventsService';
import {
  connectRealtime,
  emitChatSend,
  joinRealtimeRoom,
  leaveRealtimeRoom,
  onChatMessageCreated,
  onRealtime,
} from '@/services/realtime/realtimeService';
import { getUsers, type UserSummary } from '@/services/api/usersService';

type ChatMessage = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

type AuctionMap = Record<number, Auction[]>;
type ItemInventoryByCampaign = Record<number, Record<string, number>>;

type ChatMessageCreatedEvent = {
  id: number | string;
  campaignId: number;
  authorId?: number;
  authorName?: string;
  message: string;
  createdAt?: string;
};

type AuctionRealtimeEvent = {
  campaignId: number;
};

type InventoryRealtimeEvent = {
  campaignId: number;
};

const DEFAULT_CREATED_BY = 1;

const PHYSICAL_DONATION_OPTIONS = [
  { key: 'cama', label: 'Camas' },
  { key: 'colchon', label: 'Colchones' },
  { key: 'cobija', label: 'Cobijas' },
  { key: 'kit_higiene', label: 'Kits de higiene' },
  { key: 'alimento', label: 'Alimentos' },
] as const;

function normalizeCollection<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    Array.isArray((response as { data?: unknown }).data)
  ) {
    return (response as { data: T[] }).data;
  }

  return [];
}

function buildInventoryMap(itemDonations: ItemDonationResponse[]): ItemInventoryByCampaign {
  return itemDonations.reduce<ItemInventoryByCampaign>((acc, donation) => {
    const campaignBucket = acc[donation.campaignId] ?? {};
    const itemKey = donation.itemType;

    acc[donation.campaignId] = {
      ...campaignBucket,
      [itemKey]: (campaignBucket[itemKey] ?? 0) + donation.quantity,
    };

    return acc;
  }, {});
}

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

export function OrganizerCampaignsScreen() {
  const { currentUser } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [itemDonations, setItemDonations] = useState<ItemDonationResponse[]>([]);
  const [auctionsByCampaign, setAuctionsByCampaign] = useState<AuctionMap>({});

  const [organizerBuyerId, setOrganizerBuyerId] = useState<number>(DEFAULT_CREATED_BY);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [auctionFeedbackByCampaign, setAuctionFeedbackByCampaign] = useState<Record<number, string>>({});
  const [isBuyingAuctionById, setIsBuyingAuctionById] = useState<Record<number, boolean>>({});

  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [goalMoney, setGoalMoney] = useState('0');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [chatCampaignId, setChatCampaignId] = useState<number | null>(null);
  const [chatDraft, setChatDraft] = useState('');
  const [chatByCampaign, setChatByCampaign] = useState<Record<number, ChatMessage[]>>({});

  const refreshCampaignAuctions = useCallback(async (campaignIds: number[]) => {
    const entries = await Promise.all(
      campaignIds.map(async (campaignId) => {
        try {
          const response = await getCampaignAuctions(campaignId, 'all');
          return [campaignId, normalizeCollection<Auction>(response)] as const;
        } catch {
          return [campaignId, [] as Auction[]] as const;
        }
      })
    );

    const nextMap: AuctionMap = {};
    entries.forEach(([campaignId, auctions]) => {
      nextMap[campaignId] = auctions;
    });

    setAuctionsByCampaign(nextMap);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const [eventsResult, campaignsResult, usersResult, itemsResult] = await Promise.allSettled([
      getEvents(),
      getCampaigns(),
      getUsers(1, 200),
      getItemDonations(1, 500),
    ]);

    const failedSources: string[] = [];

    if (eventsResult.status === 'fulfilled') {
      setEvents(eventsResult.value.data);
      setSelectedEventId(eventsResult.value.data[0]?.id ?? null);
    } else {
      failedSources.push(`eventos (${getErrorMessage(eventsResult.reason)})`);
      setEvents([]);
      setSelectedEventId(null);
    }

    if (campaignsResult.status === 'fulfilled') {
      setCampaigns(campaignsResult.value.data);
    } else {
      failedSources.push(`campanas (${getErrorMessage(campaignsResult.reason)})`);
      setCampaigns([]);
    }

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value.data);
    } else {
      failedSources.push(`usuarios (${getErrorMessage(usersResult.reason)})`);
      setUsers([]);
    }

    if (itemsResult.status === 'fulfilled') {
      setItemDonations(normalizeCollection<ItemDonationResponse>(itemsResult.value));
    } else {
      failedSources.push(`inventario (${getErrorMessage(itemsResult.reason)})`);
      setItemDonations([]);
    }

    if (campaignsResult.status === 'fulfilled') {
      await refreshCampaignAuctions(campaignsResult.value.data.map((campaign) => campaign.id));
    } else {
      setAuctionsByCampaign({});
    }

    if (failedSources.length > 0) {
      setLoadError(`Fallo la carga de: ${failedSources.join(' | ')}`);
    }

    setIsLoading(false);
  }, [refreshCampaignAuctions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const matchedByEmail = users.find(
      (userItem) => userItem.email.toLowerCase() === currentUser.email.toLowerCase()
    );

    if (matchedByEmail) {
      setOrganizerBuyerId(matchedByEmail.id);
      return;
    }

    const fallbackOrganizer = users.find((userItem) => userItem.role === 'organizer');
    setOrganizerBuyerId(fallbackOrganizer?.id ?? DEFAULT_CREATED_BY);
  }, [currentUser, users]);

  const eventsById = useMemo(
    () => new Map(events.map((eventItem) => [eventItem.id, eventItem])),
    [events]
  );

  const usersById = useMemo(
    () => new Map(users.map((userItem) => [userItem.id, userItem])),
    [users]
  );

  const inventoryByCampaign = useMemo(() => buildInventoryMap(itemDonations), [itemDonations]);

  const chatCampaign = useMemo(
    () => campaigns.find((campaignItem) => campaignItem.id === chatCampaignId) ?? null,
    [campaigns, chatCampaignId]
  );

  const chatMessages = chatCampaignId ? chatByCampaign[chatCampaignId] ?? [] : [];

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    connectRealtime({
      userId: organizerBuyerId,
      role: currentUser.role,
    });

    const campaignIds = campaigns.map((campaign) => campaign.id);
    const rooms = campaignIds.flatMap((campaignId) => [
      `campaign:${campaignId}:chat`,
      `campaign:${campaignId}:auctions`,
      `campaign:${campaignId}:inventory`,
    ]);

    rooms.forEach((room) => joinRealtimeRoom(room));

    const offChatMessageCreated = onChatMessageCreated<ChatMessageCreatedEvent>((event) => {
      if (!event?.campaignId || !event.message) {
        return;
      }

      setChatByCampaign((prev) => {
        const bucket = prev[event.campaignId] ?? [];
        const nextId = String(event.id ?? `ws-${Date.now()}`);

        if (bucket.some((item) => item.id === nextId)) {
          return prev;
        }

        const normalizedIncomingMessage = event.message.trim().toLowerCase();
        const optimisticIndex = bucket.findIndex((item) => {
          const isOptimistic = String(item.id).startsWith('local-');
          if (!isOptimistic) {
            return false;
          }

          return item.message.trim().toLowerCase() === normalizedIncomingMessage;
        });

        if (optimisticIndex >= 0) {
          const nextBucket = [...bucket];
          nextBucket[optimisticIndex] = {
            id: nextId,
            author: event.authorName ?? `Usuario ${event.authorId ?? ''}`.trim(),
            message: event.message,
            createdAt: event.createdAt
              ? new Date(event.createdAt).toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : nextBucket[optimisticIndex].createdAt,
          };

          return {
            ...prev,
            [event.campaignId]: nextBucket,
          };
        }

        return {
          ...prev,
          [event.campaignId]: [
            ...bucket,
            {
              id: nextId,
              author: event.authorName ?? `Usuario ${event.authorId ?? ''}`.trim(),
              message: event.message,
              createdAt: event.createdAt
                ? new Date(event.createdAt).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : new Date().toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
            },
          ],
        };
      });
    });

    const handleAuctionRealtime = (event: AuctionRealtimeEvent) => {
      if (!event?.campaignId) {
        return;
      }

      refreshCampaignAuctions([event.campaignId]);
    };

    const offAuctionCreated = onRealtime<AuctionRealtimeEvent>('auction.created', handleAuctionRealtime);
    const offAuctionUpdated = onRealtime<AuctionRealtimeEvent>('auction.updated', handleAuctionRealtime);
    const offAuctionSold = onRealtime<AuctionRealtimeEvent>('auction.sold', handleAuctionRealtime);

    const offInventoryUpdated = onRealtime<InventoryRealtimeEvent>('campaign.inventory.updated', async (event) => {
      if (!event?.campaignId) {
        return;
      }

      try {
        const itemsResponse = await getItemDonations(1, 500);
        setItemDonations(normalizeCollection<ItemDonationResponse>(itemsResponse));
      } catch {
        // Keep last snapshot if refresh fails.
      }
    });

    return () => {
      offChatMessageCreated();
      offAuctionCreated();
      offAuctionUpdated();
      offAuctionSold();
      offInventoryUpdated();
      rooms.forEach((room) => leaveRealtimeRoom(room));
    };
  }, [campaigns, currentUser, organizerBuyerId, refreshCampaignAuctions]);

  const canCreate = campaignName.trim().length >= 3 && Boolean(selectedEventId) && !isSubmitting;

  const handleOpenCreate = () => {
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleSubmitCampaign = async () => {
    if (!selectedEventId) {
      setFormError('Debes tener al menos un evento creado para registrar una campana.');
      return;
    }

    if (campaignName.trim().length < 3) {
      setFormError('El nombre de la campana debe tener al menos 3 caracteres.');
      return;
    }

    const parsedGoalMoney = Number(goalMoney.replace(/[^0-9]/g, '')) || 0;
    const selectedEvent = eventsById.get(selectedEventId);

    setIsSubmitting(true);
    setFormError(null);

    try {
      const createdCampaign = await createCampaign({
        name: campaignName.trim(),
        description: campaignDescription.trim() || 'Campana humanitaria',
        campaignType: 'mixed',
        goalMoney: parsedGoalMoney,
        eventId: selectedEventId,
        createdBy: selectedEvent?.createdBy ?? DEFAULT_CREATED_BY,
      });

      setCampaigns((prev) => [createdCampaign, ...prev]);
      setCampaignName('');
      setCampaignDescription('');
      setGoalMoney('0');
      setIsCreateOpen(false);
    } catch (error) {
      setFormError(`No se pudo crear la campana. ${getErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyAuction = async (campaignId: number, auctionId: number, auctionPrice: number) => {
    setIsBuyingAuctionById((prev) => ({ ...prev, [auctionId]: true }));

    try {
      await buyAuction(auctionId, {
        buyerId: organizerBuyerId,
        idempotencyKey: `${auctionId}-${organizerBuyerId}-${Date.now()}`,
      });

      setCampaigns((prev) =>
        prev.map((campaignItem) =>
          campaignItem.id === campaignId
            ? { ...campaignItem, collectedMoney: campaignItem.collectedMoney + auctionPrice }
            : campaignItem
        )
      );

      await refreshCampaignAuctions([campaignId]);
      setAuctionFeedbackByCampaign((prev) => ({
        ...prev,
        [campaignId]: 'Compra de subasta registrada correctamente.',
      }));
    } catch (error) {
      setAuctionFeedbackByCampaign((prev) => ({
        ...prev,
        [campaignId]: `No se pudo completar la compra. ${getErrorMessage(error)}`,
      }));
    } finally {
      setIsBuyingAuctionById((prev) => ({ ...prev, [auctionId]: false }));
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

    const trimmedMessage = chatDraft.trim();

    const optimisticMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      author: currentUser?.email ?? 'Organizador',
      message: trimmedMessage,
      createdAt: new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setChatByCampaign((prev) => ({
      ...prev,
      [chatCampaignId]: [...(prev[chatCampaignId] ?? []), optimisticMessage],
    }));

    emitChatSend({
      campaignId: Number(chatCampaignId),
      message: trimmedMessage,
    });

    setChatDraft('');
  };

  return (
    <SafeAreaView className='flex-1 bg-[#eef4ff]'>
      <View className='flex-1 px-4 pt-6'>
        <Pressable
          className='rounded-2xl bg-[#1f5fe0] px-5 py-4 active:opacity-90'
          onPress={handleOpenCreate}
          style={{
            shadowColor: '#1f5fe0',
            shadowOpacity: 0.25,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 14,
            elevation: 6,
          }}
        >
          <Text className='text-center text-base font-extrabold tracking-[0.3px] text-white'>
            Crear campana
          </Text>
        </Pressable>

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

        {!isLoading && events.length === 0 ? (
          <Text className='mt-4 rounded-xl bg-[#fff6e8] px-3 py-2 text-sm text-[#8a5d13]'>
            No hay eventos creados. Debes crear un evento para poder registrar campanas.
          </Text>
        ) : null}

        <ScrollView className='mt-4' contentContainerStyle={{ gap: 12, paddingBottom: 120 }}>
          {campaigns.map((campaignItem, index) => {
            const eventInfo = eventsById.get(campaignItem.eventId);
            const progress =
              campaignItem.goalMoney > 0
                ? Math.min(100, Math.round((campaignItem.collectedMoney / campaignItem.goalMoney) * 100))
                : 0;

            const inventory = inventoryByCampaign[campaignItem.id] ?? {};
            const physicalInventorySummary = PHYSICAL_DONATION_OPTIONS.map((option) => ({
              label: option.label,
              quantity: inventory[option.key] ?? 0,
            })).filter((entry) => entry.quantity > 0);

            const campaignAuctions = auctionsByCampaign[campaignItem.id] ?? [];

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
                      Evento: {eventInfo ? `${eventInfo.name} (${eventInfo.city})` : `ID ${campaignItem.eventId}`}
                    </Text>
                  </View>

                  <Pressable
                    className='h-10 w-10 items-center justify-center rounded-full bg-[#1f5fe0]'
                    onPress={() => openChat(campaignItem.id)}
                  >
                    <Text className='text-[10px] font-bold text-white'>Chat</Text>
                  </Pressable>
                </View>

                <View className='mt-3 flex-row gap-2'>
                  <View className='flex-1 rounded-xl bg-[#edf3ff] p-3'>
                    <Text className='text-xs font-semibold text-[#4b648d]'>Fondos</Text>
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
                  <View className='h-full rounded-full bg-[#1f5fe0]' style={{ width: `${Math.max(6, progress)}%` }} />
                </View>

                <View className='mt-3 rounded-xl bg-[#edf3ff] p-3'>
                  <Text className='text-xs font-semibold text-[#27436d]'>Elementos donados</Text>
                  {physicalInventorySummary.length === 0 ? (
                    <Text className='mt-1 text-xs text-[#5d7399]'>Aun no hay elementos donados.</Text>
                  ) : (
                    <Text className='mt-1 text-xs text-[#1f365d]'>
                      {physicalInventorySummary.map((entry) => `${entry.label}: ${entry.quantity}`).join(' | ')}
                    </Text>
                  )}
                </View>

                <View className='mt-3 rounded-xl bg-[#fff9ef] p-3'>
                  <Text className='text-xs font-semibold text-[#8a5d13]'>Subastas de la campana</Text>
                  {campaignAuctions.length === 0 ? (
                    <Text className='mt-1 text-xs text-[#9f7a3e]'>Aun no hay subastas registradas.</Text>
                  ) : (
                    <View className='mt-2 gap-2'>
                      {campaignAuctions.map((auction) => {
                        const seller = usersById.get(auction.sellerId);
                        const buyer = auction.buyerId ? usersById.get(auction.buyerId) : null;

                        return (
                          <View className='rounded-xl border border-[#f0d7b0] bg-white px-3 py-3' key={auction.id}>
                            <Text className='text-sm font-bold text-[#6b4912]'>{auction.itemName}</Text>
                            <Text className='mt-1 text-xs text-[#8d6a34]'>
                              {auction.description || 'Sin descripcion'}
                            </Text>
                            <Text className='mt-1 text-xs text-[#8d6a34]'>
                              Publicado por: {seller?.name ?? seller?.fullName ?? `Usuario ${auction.sellerId}`}
                            </Text>
                            <Text className='mt-1 text-sm font-extrabold text-[#b56e11]'>
                              {formatMoney(auction.price)}
                            </Text>

                            {auction.status === 'active' ? (
                              <Pressable
                                className='mt-2 self-start rounded-xl bg-[#d18b25] px-3 py-2'
                                onPress={() => handleBuyAuction(campaignItem.id, auction.id, auction.price)}
                              >
                                <Text className='text-xs font-bold text-white'>
                                  {isBuyingAuctionById[auction.id] ? 'Comprando...' : 'Comprar'}
                                </Text>
                              </Pressable>
                            ) : (
                              <Text className='mt-2 text-xs font-semibold text-[#1b7b45]'>
                                Vendida a: {buyer?.name ?? buyer?.fullName ?? `Usuario ${auction.buyerId ?? '-'}`}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {auctionFeedbackByCampaign[campaignItem.id] ? (
                  <Text className='mt-2 text-xs text-[#8d6a34]'>
                    {auctionFeedbackByCampaign[campaignItem.id]}
                  </Text>
                ) : null}
              </Animated.View>
            );
          })}

          {!isLoading && campaigns.length === 0 ? (
            <Text className='text-sm text-[#5d7498]'>Aun no hay campanas creadas.</Text>
          ) : null}
        </ScrollView>
      </View>

      <Modal animationType='slide' transparent visible={isCreateOpen}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className='flex-1'>
          <View className='flex-1 justify-end bg-[#07163166]'>
            <View className='max-h-[88%] rounded-t-3xl bg-white px-5 pt-5'>
              <ScrollView
                contentContainerStyle={{ paddingBottom: 28 }}
                keyboardShouldPersistTaps='handled'
                showsVerticalScrollIndicator={false}
              >
                <Text className='text-lg font-extrabold text-[#17315c]'>Crear campana</Text>

                <Text className='mt-4 text-sm font-semibold text-[#27436d]'>Nombre</Text>
                <TextInput
                  className='mt-1 rounded-xl border border-[#d3e2fb] bg-[#f8fbff] px-4 py-3 text-[#18335f]'
                  onChangeText={setCampaignName}
                  placeholder='Ej: Kits de ayuda para inundaciones'
                  placeholderTextColor='#8ea6c8'
                  value={campaignName}
                />

                <Text className='mt-3 text-sm font-semibold text-[#27436d]'>Descripcion</Text>
                <TextInput
                  className='mt-1 rounded-xl border border-[#d3e2fb] bg-[#f8fbff] px-4 py-3 text-[#18335f]'
                  onChangeText={setCampaignDescription}
                  placeholder='Describe el objetivo de la campana'
                  placeholderTextColor='#8ea6c8'
                  value={campaignDescription}
                />

                <Text className='mt-3 text-sm font-semibold text-[#27436d]'>Meta de fondos (COP)</Text>
                <TextInput
                  className='mt-1 rounded-xl border border-[#d3e2fb] bg-[#f8fbff] px-4 py-3 text-[#18335f]'
                  keyboardType='number-pad'
                  onChangeText={setGoalMoney}
                  placeholder='0'
                  placeholderTextColor='#8ea6c8'
                  value={goalMoney}
                />

                <Text className='mt-3 text-sm font-semibold text-[#27436d]'>Evento asociado</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className='mt-2'>
                  <View className='flex-row gap-2'>
                    {events.map((eventItem) => {
                      const isSelected = selectedEventId === eventItem.id;

                      return (
                        <Pressable
                          className={`rounded-full border px-4 py-2 ${
                            isSelected ? 'border-[#1f5fe0] bg-[#e8f0ff]' : 'border-[#d6e3fb] bg-white'
                          }`}
                          key={eventItem.id}
                          onPress={() => setSelectedEventId(eventItem.id)}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              isSelected ? 'text-[#1f4fb6]' : 'text-[#4a6083]'
                            }`}
                          >
                            {eventItem.name} - {eventItem.city}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>

                {events.length === 0 ? (
                  <Text className='mt-3 rounded-xl bg-[#fff6e8] px-3 py-2 text-xs text-[#8a5d13]'>
                    No hay eventos creados. Sin evento no se puede crear la campana.
                  </Text>
                ) : null}

                {formError ? (
                  <Text className='mt-3 rounded-xl bg-[#ffecef] px-3 py-2 text-xs text-[#9f2238]'>
                    {formError}
                  </Text>
                ) : null}

                <View className='mt-5 flex-row items-center justify-between'>
                  <Pressable
                    className='rounded-xl border border-[#d3def3] px-4 py-3'
                    onPress={() => setIsCreateOpen(false)}
                  >
                    <Text className='font-semibold text-[#3a5176]'>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    className={`rounded-xl px-5 py-3 ${canCreate ? 'bg-[#1f5fe0]' : 'bg-[#9db8e5]'}`}
                    disabled={!canCreate}
                    onPress={handleSubmitCampaign}
                  >
                    <Text className='font-semibold text-white'>Guardar campana</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType='slide' visible={Boolean(chatCampaignId)}>
        <SafeAreaView className='flex-1 bg-[#f4f8ff]'>
          <View className='flex-row items-center px-4 py-3'>
            <Pressable
              className='h-10 w-10 items-center justify-center rounded-full bg-white'
              onPress={() => setChatCampaignId(null)}
            >
              <FontAwesome5 color='#1f4fb6' name='times' size={16} />
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
        </SafeAreaView>
      </Modal>

      <OrganizerBottomTabs activeTab='campanas' />
    </SafeAreaView>
  );
}
