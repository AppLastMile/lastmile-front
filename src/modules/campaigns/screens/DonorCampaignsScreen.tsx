import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';
import { CampaignChatModal } from '@/modules/campaigns/components/CampaignChatModal';
import { DonorBottomTabs } from '@/modules/donor/components/DonorBottomTabs';
import { NotificationsBell } from '@/modules/notifications/components/NotificationsBell';
import { useRealtimeNotifications } from '@/modules/notifications/hooks/useRealtimeNotifications';
import { type Auction, buyAuction, createCampaignAuction, getCampaignAuctions } from '@/services/api/auctionsService';
import { type Campaign, getCampaigns } from '@/services/api/campaignsService';
import {
  createItemDonation,
  createMoneyDonation,
  getItemDonations,
  type ItemDonationResponse,
} from '@/services/api/donationsService';
import { type EventSummary, getEvents } from '@/services/api/eventsService';
import {
  AuctionMap,
  AuctionRealtimeEvent,
  buildInventoryMap,
  ChatMessage,
  ChatMessageCreatedEvent,
  formatMoney,
  getErrorMessage,
  InventoryRealtimeEvent,
  normalizeCollection,
  PHYSICAL_DONATION_OPTIONS,
} from '@/modules/campaigns/utils/campaignsShared';

import {
  connectRealtime,
  emitChatSend,
  joinRealtimeRoom,
  leaveRealtimeRoom,
  onChatMessageCreated,
  onRealtime,
} from '@/services/realtime/realtimeService';
import { getUsers, type UserSummary } from '@/services/api/usersService';

const DEFAULT_DONOR_ID = 1;

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
  const [users, setUsers] = useState<UserSummary[]>([]);

  const [donorId, setDonorId] = useState<number>(DEFAULT_DONOR_ID);

  const [itemDonations, setItemDonations] = useState<ItemDonationResponse[]>([]);
  const [auctionsByCampaign, setAuctionsByCampaign] = useState<AuctionMap>({});

  const [moneyDraftByCampaign, setMoneyDraftByCampaign] = useState<Record<number, string>>({});
  const [donationFeedbackByCampaign, setDonationFeedbackByCampaign] = useState<Record<number, string>>({});
  const [isDonatingMoneyByCampaign, setIsDonatingMoneyByCampaign] = useState<Record<number, boolean>>({});

  const [selectedPhysicalItemByCampaign, setSelectedPhysicalItemByCampaign] = useState<Record<number, string>>({});
  const [physicalQuantityByCampaign, setPhysicalQuantityByCampaign] = useState<Record<number, string>>({});
  const [isPhysicalDropdownOpenByCampaign, setIsPhysicalDropdownOpenByCampaign] = useState<Record<number, boolean>>({});
  const [isDonatingItemsByCampaign, setIsDonatingItemsByCampaign] = useState<Record<number, boolean>>({});

  const [auctionItemDraftByCampaign, setAuctionItemDraftByCampaign] = useState<Record<number, string>>({});
  const [auctionDescriptionDraftByCampaign, setAuctionDescriptionDraftByCampaign] = useState<Record<number, string>>({});
  const [auctionPriceDraftByCampaign, setAuctionPriceDraftByCampaign] = useState<Record<number, string>>({});
  const [auctionFeedbackByCampaign, setAuctionFeedbackByCampaign] = useState<Record<number, string>>({});
  const [isCreatingAuctionByCampaign, setIsCreatingAuctionByCampaign] = useState<Record<number, boolean>>({});
  const [isBuyingAuctionById, setIsBuyingAuctionById] = useState<Record<number, boolean>>({});

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

    const [campaignsResult, eventsResult, usersResult, itemsResult] = await Promise.allSettled([
      getCampaigns(),
      getEvents({ page: 1, limit: 100 }),
      getUsers(1, 200),
      getItemDonations(1, 500),
    ]);

    const failedSources: string[] = [];

    if (campaignsResult.status === 'fulfilled') {
      setCampaigns(campaignsResult.value.data);
    } else {
      failedSources.push(`campanas (${getErrorMessage(campaignsResult.reason)})`);
      setCampaigns([]);
    }

    if (eventsResult.status === 'fulfilled') {
      setEvents(eventsResult.value.data);
    } else {
      failedSources.push(`eventos (${getErrorMessage(eventsResult.reason)})`);
      setEvents([]);
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
    if (currentUser?.role !== 'donor') {
      return;
    }

    const matchedByEmail = users.find(
      (userItem) => userItem.email.toLowerCase() === currentUser.email.toLowerCase()
    );

    if (matchedByEmail) {
      setDonorId(matchedByEmail.id);
      return;
    }

    const fallbackDonor = users.find((userItem) => userItem.role === 'donor');
    setDonorId(fallbackDonor?.id ?? DEFAULT_DONOR_ID);
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
  const { notifications, unreadCount, toastMessage, markAllAsRead } = useRealtimeNotifications({
    userId: currentUser?.id,
    role: currentUser?.role,
    token: currentUser?.accessToken,
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    connectRealtime({
      userId: donorId,
      role: currentUser.role,
      token: currentUser.accessToken,
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
  }, [campaigns, currentUser, donorId, refreshCampaignAuctions]);

  const handleDonateMoney = async (campaign: Campaign) => {
    const value = Number((moneyDraftByCampaign[campaign.id] ?? '').replaceAll(/\D/g, ''));

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

    setIsDonatingMoneyByCampaign((prev) => ({ ...prev, [campaign.id]: true }));

    try {
      await createMoneyDonation({ campaignId: campaign.id, donorId, amount: value });

      setCampaigns((prev) =>
        prev.map((campaignItem) =>
          campaignItem.id === campaign.id
            ? { ...campaignItem, collectedMoney: campaignItem.collectedMoney + value }
            : campaignItem
        )
      );

      setMoneyDraftByCampaign((prev) => ({ ...prev, [campaign.id]: '' }));
      setDonationFeedbackByCampaign((prev) => ({ ...prev, [campaign.id]: 'Gracias por tu aporte.' }));
    } catch (error) {
      setDonationFeedbackByCampaign((prev) => ({
        ...prev,
        [campaign.id]: `No se pudo registrar la donacion. ${getErrorMessage(error)}`,
      }));
    } finally {
      setIsDonatingMoneyByCampaign((prev) => ({ ...prev, [campaign.id]: false }));
    }
  };

  const handleDonatePhysicalItem = async (campaignId: number) => {
    const selectedItem = selectedPhysicalItemByCampaign[campaignId] ?? PHYSICAL_DONATION_OPTIONS[0].key;
    const quantity = Number((physicalQuantityByCampaign[campaignId] ?? '').replaceAll(/\D/g, ''));

    if (!quantity || quantity <= 0) {
      setDonationFeedbackByCampaign((prev) => ({
        ...prev,
        [campaignId]: 'Ingresa una cantidad valida de articulos.',
      }));
      return;
    }

    setIsDonatingItemsByCampaign((prev) => ({ ...prev, [campaignId]: true }));

    try {
      const createdDonation = await createItemDonation({
        campaignId,
        donorId,
        itemType: selectedItem,
        quantity,
      });

      setItemDonations((prev) => [...prev, createdDonation]);
      setPhysicalQuantityByCampaign((prev) => ({ ...prev, [campaignId]: '' }));
      setIsPhysicalDropdownOpenByCampaign((prev) => ({ ...prev, [campaignId]: false }));

      const selectedLabel =
        PHYSICAL_DONATION_OPTIONS.find((option) => option.key === selectedItem)?.label ?? selectedItem;

      setDonationFeedbackByCampaign((prev) => ({
        ...prev,
        [campaignId]: `Se registraron ${quantity} ${selectedLabel.toLowerCase()}.`,
      }));
    } catch (error) {
      setDonationFeedbackByCampaign((prev) => ({
        ...prev,
        [campaignId]: `No se pudo registrar la donacion fisica. ${getErrorMessage(error)}`,
      }));
    } finally {
      setIsDonatingItemsByCampaign((prev) => ({ ...prev, [campaignId]: false }));
    }
  };

  const handleCreateAuction = async (campaignId: number) => {
    const itemName = (auctionItemDraftByCampaign[campaignId] ?? '').trim();
    const description = (auctionDescriptionDraftByCampaign[campaignId] ?? '').trim();
    const price = Number((auctionPriceDraftByCampaign[campaignId] ?? '').replaceAll(/\D/g, ''));

    if (itemName.length < 2) {
      setAuctionFeedbackByCampaign((prev) => ({
        ...prev,
        [campaignId]: 'Define un articulo para subastar.',
      }));
      return;
    }

    if (!price || price <= 0) {
      setAuctionFeedbackByCampaign((prev) => ({
        ...prev,
        [campaignId]: 'Ingresa un valor valido para la subasta.',
      }));
      return;
    }

    setIsCreatingAuctionByCampaign((prev) => ({ ...prev, [campaignId]: true }));

    try {
      await createCampaignAuction(campaignId, {
        sellerId: donorId,
        itemName,
        description,
        price,
        currency: 'COP',
      });

      await refreshCampaignAuctions([campaignId]);
      setAuctionItemDraftByCampaign((prev) => ({ ...prev, [campaignId]: '' }));
      setAuctionDescriptionDraftByCampaign((prev) => ({ ...prev, [campaignId]: '' }));
      setAuctionPriceDraftByCampaign((prev) => ({ ...prev, [campaignId]: '' }));
      setAuctionFeedbackByCampaign((prev) => ({
        ...prev,
        [campaignId]: 'Subasta creada y visible para todos los usuarios.',
      }));
    } catch (error) {
      setAuctionFeedbackByCampaign((prev) => ({
        ...prev,
        [campaignId]: `No se pudo crear la subasta. ${getErrorMessage(error)}`,
      }));
    } finally {
      setIsCreatingAuctionByCampaign((prev) => ({ ...prev, [campaignId]: false }));
    }
  };

  const handleBuyAuction = async (campaignId: number, auctionId: number, auctionPrice: number) => {
    setIsBuyingAuctionById((prev) => ({ ...prev, [auctionId]: true }));

    try {
      await buyAuction(auctionId, {
        buyerId: donorId,
        idempotencyKey: `${auctionId}-${donorId}-${Date.now()}`,
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
        [campaignId]: 'Compra registrada correctamente.',
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
      author: currentUser?.email ?? 'Donante',
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
    <View className='flex-1 bg-[#eef4ff]'>
      <View className='flex-1 px-4 pt-14'>
        <Text className='text-2xl font-extrabold text-[#16325d]'>Campañas Activas</Text>
        <Text className='mt-1 text-sm text-[#4d648a]'>
          Campañas creadas por organizadores para apoyar las misiones.
        </Text>

        <View className='mt-3 flex-row items-center justify-between'>
          <Text className='text-sm font-semibold text-[#2a456e]'>Total: {campaigns.length}</Text>
          <View className='relative flex-row items-center gap-2'>
            <NotificationsBell
              notifications={notifications}
              onMarkAllAsRead={markAllAsRead}
              toastMessage={toastMessage}
              unreadCount={unreadCount}
            />
            <Pressable className='rounded-xl bg-[#1f5fe0] px-4 py-2 active:opacity-90' onPress={loadData}>
              <Text className='font-semibold text-white'>Recargar</Text>
            </Pressable>
          </View>
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
            const campaignAuctions = auctionsByCampaign[campaignItem.id] ?? [];
            const inventory = inventoryByCampaign[campaignItem.id] ?? {};
            const physicalInventorySummary = PHYSICAL_DONATION_OPTIONS.map((option) => ({
              label: option.label,
              quantity: inventory[option.key] ?? 0,
            })).filter((entry) => entry.quantity > 0);

            const selectedItem = selectedPhysicalItemByCampaign[campaignItem.id] ?? PHYSICAL_DONATION_OPTIONS[0].key;
            const selectedItemLabel =
              PHYSICAL_DONATION_OPTIONS.find((option) => option.key === selectedItem)?.label ?? selectedItem;
            const isDropdownOpen = isPhysicalDropdownOpenByCampaign[campaignItem.id] ?? false;

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
                  <View className='h-full rounded-full bg-[#1f5fe0]' style={{ width: `${Math.max(6, progress)}%` }} />
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
                    <Pressable
                      className='rounded-xl bg-[#1f5fe0] px-3 py-2'
                      onPress={() => handleDonateMoney(campaignItem)}
                    >
                      <Text className='text-xs font-bold text-white'>
                        {isDonatingMoneyByCampaign[campaignItem.id] ? 'Donando...' : 'Donar'}
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

                <View className='mt-3 rounded-xl bg-[#f6f9ff] p-3'>
                  <Text className='text-xs font-semibold text-[#27436d]'>Donar articulos fisicos</Text>

                  <Pressable
                    className='mt-2 rounded-xl border border-[#d3e2fb] bg-white px-3 py-2'
                    onPress={() =>
                      setIsPhysicalDropdownOpenByCampaign((prev) => ({
                        ...prev,
                        [campaignItem.id]: !isDropdownOpen,
                      }))
                    }
                  >
                    <Text className='text-[#1f365d]'>Articulo: {selectedItemLabel}</Text>
                  </Pressable>

                  {isDropdownOpen ? (
                    <View className='mt-2 overflow-hidden rounded-xl border border-[#d6e3fb] bg-white'>
                      {PHYSICAL_DONATION_OPTIONS.map((option) => (
                        <Pressable
                          className='border-b border-[#edf3ff] px-3 py-2'
                          key={option.key}
                          onPress={() => {
                            setSelectedPhysicalItemByCampaign((prev) => ({
                              ...prev,
                              [campaignItem.id]: option.key,
                            }));
                            setIsPhysicalDropdownOpenByCampaign((prev) => ({
                              ...prev,
                              [campaignItem.id]: false,
                            }));
                          }}
                        >
                          <Text className='text-[#1f365d]'>{option.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  <View className='mt-2 flex-row items-center gap-2'>
                    <TextInput
                      className='flex-1 rounded-xl border border-[#d3e2fb] bg-white px-3 py-2 text-[#18335f]'
                      keyboardType='number-pad'
                      onChangeText={(value) =>
                        setPhysicalQuantityByCampaign((prev) => ({ ...prev, [campaignItem.id]: value }))
                      }
                      placeholder='Cantidad'
                      placeholderTextColor='#8ea6c8'
                      value={physicalQuantityByCampaign[campaignItem.id] ?? ''}
                    />
                    <Pressable
                      className='rounded-xl bg-[#1d8a51] px-3 py-2'
                      onPress={() => handleDonatePhysicalItem(campaignItem.id)}
                    >
                      <Text className='text-xs font-bold text-white'>
                        {isDonatingItemsByCampaign[campaignItem.id] ? 'Donando...' : 'Donar articulo'}
                      </Text>
                    </Pressable>
                  </View>
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

                <View className='mt-3 rounded-xl bg-[#fff6e8] p-3'>
                  <Text className='text-xs font-semibold text-[#8a5d13]'>Crear subasta solidaria</Text>
                  <TextInput
                    className='mt-2 rounded-xl border border-[#f0d7b0] bg-white px-3 py-2 text-[#5f430f]'
                    onChangeText={(value) =>
                      setAuctionItemDraftByCampaign((prev) => ({ ...prev, [campaignItem.id]: value }))
                    }
                    placeholder='Articulo (ej. Nevera)'
                    placeholderTextColor='#b89054'
                    value={auctionItemDraftByCampaign[campaignItem.id] ?? ''}
                  />
                  <TextInput
                    className='mt-2 rounded-xl border border-[#f0d7b0] bg-white px-3 py-2 text-[#5f430f]'
                    onChangeText={(value) =>
                      setAuctionDescriptionDraftByCampaign((prev) => ({ ...prev, [campaignItem.id]: value }))
                    }
                    placeholder='Descripcion de la subasta'
                    placeholderTextColor='#b89054'
                    value={auctionDescriptionDraftByCampaign[campaignItem.id] ?? ''}
                  />
                  <View className='mt-2 flex-row items-center gap-2'>
                    <TextInput
                      className='flex-1 rounded-xl border border-[#f0d7b0] bg-white px-3 py-2 text-[#5f430f]'
                      keyboardType='number-pad'
                      onChangeText={(value) =>
                        setAuctionPriceDraftByCampaign((prev) => ({ ...prev, [campaignItem.id]: value }))
                      }
                      placeholder='Valor de compra (COP)'
                      placeholderTextColor='#b89054'
                      value={auctionPriceDraftByCampaign[campaignItem.id] ?? ''}
                    />
                    <Pressable
                      className='rounded-xl bg-[#d18b25] px-3 py-2'
                      onPress={() => handleCreateAuction(campaignItem.id)}
                    >
                      <Text className='text-xs font-bold text-white'>
                        {isCreatingAuctionByCampaign[campaignItem.id] ? 'Creando...' : 'Crear subasta'}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View className='mt-3 rounded-xl bg-[#fff9ef] p-3'>
                  <Text className='text-xs font-semibold text-[#8a5d13]'>Subastas activas</Text>
                  {campaignAuctions.length === 0 ? (
                    <Text className='mt-1 text-xs text-[#9f7a3e]'>Aun no hay subastas en esta campana.</Text>
                  ) : (
                    <View className='mt-2 gap-2'>
                      {campaignAuctions.map((auction) => {
                        const seller = auction.sellerId ? usersById.get(auction.sellerId) : null;
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
                              {formatMoney((auction.currentPrice ?? auction.initialPrice))}
                            </Text>

                            {auction.status === 'active' ? (
                              <Pressable
                                className='mt-2 self-start rounded-xl bg-[#d18b25] px-3 py-2'
                                onPress={() => handleBuyAuction(campaignItem.id, auction.id, (auction.currentPrice ?? auction.initialPrice))}
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

          {!isLoading && !loadError && campaigns.length === 0 ? (
            <Text className='text-sm text-[#5d7498]'>Aun no hay campañas publicadas.</Text>
          ) : null}
        </ScrollView>
      </View>

      <CampaignChatModal
        campaignName={chatCampaign?.name}
        draft={chatDraft}
        messages={chatMessages}
        onChangeDraft={setChatDraft}
        onClose={() => setChatCampaignId(null)}
        onSend={handleSendChat}
        visible={Boolean(chatCampaignId)}
      />

      {currentUser?.role === 'donor' ? <DonorBottomTabs activeTab='campanas' /> : null}
    </View>
  );
}
