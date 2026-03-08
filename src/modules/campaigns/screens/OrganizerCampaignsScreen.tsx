import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
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

import { OrganizerBottomTabs } from '@/modules/organizer/components/OrganizerBottomTabs';
import {
  type Campaign,
  createCampaign,
  getCampaigns,
} from '@/services/api/campaignsService';
import { type EventSummary, getEvents } from '@/services/api/eventsService';

type ChatMessage = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

const DEFAULT_CREATED_BY = 1;

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
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [goalMoney, setGoalMoney] = useState('0');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [moneyDraftByCampaign, setMoneyDraftByCampaign] = useState<Record<number, string>>({});
  const [itemsDraftByCampaign, setItemsDraftByCampaign] = useState<Record<number, string>>({});
  const [itemsCollectedByCampaign, setItemsCollectedByCampaign] = useState<Record<number, number>>({});

  const [chatCampaignId, setChatCampaignId] = useState<number | null>(null);
  const [chatDraft, setChatDraft] = useState('');
  const [chatByCampaign, setChatByCampaign] = useState<Record<number, ChatMessage[]>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [eventsResponse, campaignsResponse] = await Promise.all([getEvents(), getCampaigns()]);

        if (!isMounted) {
          return;
        }

        setEvents(eventsResponse.data);
        setCampaigns(campaignsResponse.data);
        setSelectedEventId(eventsResponse.data[0]?.id ?? null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError('No fue posible cargar eventos y campanas. Verifica el backend.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const eventsById = useMemo(
    () => new Map(events.map((eventItem) => [eventItem.id, eventItem])),
    [events]
  );

  const chatCampaign = useMemo(
    () => campaigns.find((campaignItem) => campaignItem.id === chatCampaignId) ?? null,
    [campaigns, chatCampaignId]
  );

  const chatMessages = chatCampaignId ? chatByCampaign[chatCampaignId] ?? [] : [];
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

  const handleAddMoney = (campaignId: number) => {
    const value = Number((moneyDraftByCampaign[campaignId] ?? '').replace(/[^0-9]/g, ''));
    if (!value || value <= 0) {
      return;
    }

    setCampaigns((prev) =>
      prev.map((campaignItem) =>
        campaignItem.id === campaignId
          ? { ...campaignItem, collectedMoney: campaignItem.collectedMoney + value }
          : campaignItem
      )
    );
    setMoneyDraftByCampaign((prev) => ({ ...prev, [campaignId]: '' }));
  };

  const handleAddItems = (campaignId: number) => {
    const value = Number((itemsDraftByCampaign[campaignId] ?? '').replace(/[^0-9]/g, ''));
    if (!value || value <= 0) {
      return;
    }

    setItemsCollectedByCampaign((prev) => ({
      ...prev,
      [campaignId]: (prev[campaignId] ?? 0) + value,
    }));
    setItemsDraftByCampaign((prev) => ({ ...prev, [campaignId]: '' }));
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
      author: 'Usuario',
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
            Crear campaña
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
            const itemsCollected = itemsCollectedByCampaign[campaignItem.id] ?? 0;

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
                    <Text className='text-xs font-semibold text-[#4b648d]'>Elementos</Text>
                    <Text className='mt-1 text-sm font-extrabold text-[#1b7b45]'>
                      {itemsCollected}
                    </Text>
                  </View>
                </View>

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
                    onPress={() => handleAddMoney(campaignItem.id)}
                  >
                    <Text className='text-xs font-bold text-white'>Agregar fondos</Text>
                  </Pressable>
                </View>

                <View className='mt-2 flex-row items-center gap-2'>
                  <TextInput
                    className='flex-1 rounded-xl border border-[#d3e2fb] bg-[#f8fbff] px-3 py-2 text-[#18335f]'
                    keyboardType='number-pad'
                    onChangeText={(value) =>
                      setItemsDraftByCampaign((prev) => ({ ...prev, [campaignItem.id]: value }))
                    }
                    placeholder='Cantidad de elementos'
                    placeholderTextColor='#8ea6c8'
                    value={itemsDraftByCampaign[campaignItem.id] ?? ''}
                  />
                  <Pressable
                    className='rounded-xl bg-[#1d8a51] px-3 py-2'
                    onPress={() => handleAddItems(campaignItem.id)}
                  >
                    <Text className='text-xs font-bold text-white'>Agregar items</Text>
                  </Pressable>
                </View>
              </Animated.View>
            );
          })}

          {!isLoading && campaigns.length === 0 ? (
            <Text className='text-sm text-[#5d7498]'>
              Aun no hay campanas creadas.
            </Text>
          ) : null}
        </ScrollView>
      </View>

      <Modal animationType='slide' transparent visible={isCreateOpen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className='flex-1'
        >
          <View className='flex-1 justify-end bg-[#07163166]'>
            <View className='max-h-[88%] rounded-t-3xl bg-white px-5 pt-5'>
              <ScrollView
                contentContainerStyle={{ paddingBottom: 28 }}
                keyboardShouldPersistTaps='handled'
                showsVerticalScrollIndicator={false}
              >
                <Text className='text-lg font-extrabold text-[#17315c]'>Crear campaña</Text>

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
                        className={`text-xs font-semibold ${isSelected ? 'text-[#1f4fb6]' : 'text-[#4a6083]'}`}
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
              <Pressable className='rounded-xl border border-[#d3def3] px-4 py-3' onPress={() => setIsCreateOpen(false)}>
                <Text className='font-semibold text-[#3a5176]'>Cancelar</Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-5 py-3 ${canCreate ? 'bg-[#1f5fe0]' : 'bg-[#9db8e5]'}`}
                disabled={!canCreate}
                onPress={handleSubmitCampaign}
              >
                <Text className='font-semibold text-white'>Guardar campaña</Text>
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
            <Pressable className='h-10 w-10 items-center justify-center rounded-full bg-white' onPress={() => setChatCampaignId(null)}>
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
