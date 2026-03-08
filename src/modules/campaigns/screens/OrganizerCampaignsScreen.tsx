import { FontAwesome5 } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

import { OrganizerBottomTabs } from '@/modules/organizer/components/OrganizerBottomTabs';

type CampaignType = 'money' | 'physical_items' | 'mixed';
type ChatRole = 'organizer' | 'donor' | 'volunteer';

type EventOption = {
  id: string;
  name: string;
  city: string;
};

type ChatMessage = {
  id: string;
  author: ChatRole;
  message: string;
  createdAt: string;
};

type Campaign = {
  id: string;
  name: string;
  eventId: string;
  eventName: string;
  campaignType: CampaignType;
  collectedMoney: number;
  collectedItems: number;
  chat: ChatMessage[];
};

const EVENT_OPTIONS: EventOption[] = [
  { id: 'evt-1', name: 'Inundacion Rio Bogota', city: 'Bogota' },
  { id: 'evt-2', name: 'Deslizamiento Ladera Norte', city: 'Medellin' },
  { id: 'evt-3', name: 'Incendio Forestal Rural', city: 'Cali' },
  { id: 'evt-4', name: 'Vendaval Zona Costera', city: 'Barranquilla' },
];

const TYPE_LABELS: Record<CampaignType, string> = {
  money: 'Dinero',
  physical_items: 'Elementos Fisicos',
  mixed: 'Mixta',
};

const ROLE_LABELS: Record<ChatRole, string> = {
  organizer: 'Organizador',
  donor: 'Donador',
  volunteer: 'Voluntario',
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function OrganizerCampaignsScreen() {
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<CampaignType>('mixed');
  const [selectedEventId, setSelectedEventId] = useState(EVENT_OPTIONS[0].id);
  const [donationMoney, setDonationMoney] = useState('150000');
  const [donationItems, setDonationItems] = useState('8');
  const [chatRole, setChatRole] = useState<ChatRole>('organizer');
  const [chatInput, setChatInput] = useState('');
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const selectedEvent = useMemo(
    () => EVENT_OPTIONS.find((event) => event.id === selectedEventId) ?? EVENT_OPTIONS[0],
    [selectedEventId]
  );

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null,
    [activeCampaignId, campaigns]
  );

  const canCreateCampaign = campaignName.trim().length > 3;

  const totalMoney = useMemo(
    () => campaigns.reduce((acc, campaign) => acc + campaign.collectedMoney, 0),
    [campaigns]
  );

  const totalItems = useMemo(
    () => campaigns.reduce((acc, campaign) => acc + campaign.collectedItems, 0),
    [campaigns]
  );

  const handleCreateCampaign = () => {
    if (!canCreateCampaign) {
      return;
    }

    const newCampaign: Campaign = {
      id: `cmp-${Date.now()}`,
      name: campaignName.trim(),
      eventId: selectedEvent.id,
      eventName: `${selectedEvent.name} (${selectedEvent.city})`,
      campaignType,
      collectedMoney: 0,
      collectedItems: 0,
      chat: [
        {
          id: `msg-${Date.now()}`,
          author: 'organizer',
          message: 'Bienvenidos al chat general de la campana.',
          createdAt: new Date().toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ],
    };

    setCampaigns((prev) => [newCampaign, ...prev]);
    setActiveCampaignId(newCampaign.id);
    setCampaignName('');
  };

  const handleDonateMoney = () => {
    if (!activeCampaign) {
      return;
    }

    const value = Number(donationMoney.replace(/[^0-9]/g, ''));
    if (!value || value <= 0) {
      return;
    }

    setCampaigns((prev) =>
      prev.map((campaign) =>
        campaign.id === activeCampaign.id
          ? { ...campaign, collectedMoney: campaign.collectedMoney + value }
          : campaign
      )
    );
  };

  const handleDonateItems = () => {
    if (!activeCampaign) {
      return;
    }

    const value = Number(donationItems.replace(/[^0-9]/g, ''));
    if (!value || value <= 0) {
      return;
    }

    setCampaigns((prev) =>
      prev.map((campaign) =>
        campaign.id === activeCampaign.id
          ? { ...campaign, collectedItems: campaign.collectedItems + value }
          : campaign
      )
    );
  };

  const handleSendMessage = () => {
    if (!activeCampaign || chatInput.trim().length < 2) {
      return;
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      author: chatRole,
      message: chatInput.trim(),
      createdAt: new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setCampaigns((prev) =>
      prev.map((campaign) =>
        campaign.id === activeCampaign.id
          ? { ...campaign, chat: [...campaign.chat, newMessage] }
          : campaign
      )
    );

    setChatInput('');
  };

  return (
    <SafeAreaView className='flex-1 bg-[#eef4ff]'>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 140 }}>

      <View className='rounded-2xl border border-[#dce8ff] bg-white p-5'>
        <Text className='text-xl font-extrabold text-[#14243f]'>Modulo Campanas</Text>
        <Text className='mt-1 text-sm text-[#5d7498]'>
          Crea campanas, vincula eventos, registra donaciones y gestiona el chat general.
        </Text>

        <Text className='mt-4 mb-2 text-sm font-semibold text-[#233b61]'>Nombre Campana</Text>
        <TextInput
          className='rounded-xl border border-[#cfe0fb] bg-[#f8fbff] px-4 py-3 text-[#13274a]'
          placeholder='Ej: Ayuda inmediata barrio San Jorge'
          placeholderTextColor='#8ba2c3'
          value={campaignName}
          onChangeText={setCampaignName}
        />

        <Text className='mt-4 mb-2 text-sm font-semibold text-[#233b61]'>Evento Asociado</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className='flex-row gap-2'>
            {EVENT_OPTIONS.map((eventOption) => {
              const isSelected = eventOption.id === selectedEventId;
              return (
                <Pressable
                  key={eventOption.id}
                  className={`rounded-full border px-4 py-2 ${
                    isSelected
                      ? 'border-[#1f5fe0] bg-[#e8f0ff]'
                      : 'border-[#d6e3fb] bg-white'
                  }`}
                  onPress={() => setSelectedEventId(eventOption.id)}
                >
                  <Text
                    className={`font-semibold ${
                      isSelected ? 'text-[#1f4fb6]' : 'text-[#38547f]'
                    }`}
                  >
                    {eventOption.city}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <Text className='mt-2 text-sm text-[#5d7498]'>
          Seleccionado: {selectedEvent.name} ({selectedEvent.city})
        </Text>

        <Text className='mt-4 mb-2 text-sm font-semibold text-[#233b61]'>Tipo De Campana</Text>
        <View className='flex-row gap-2'>
          {(['money', 'physical_items', 'mixed'] as CampaignType[]).map((typeOption) => {
            const isSelected = typeOption === campaignType;
            return (
              <Pressable
                key={typeOption}
                className={`rounded-full border px-4 py-2 ${
                  isSelected ? 'border-[#2f68d8] bg-[#e9f1ff]' : 'border-[#d6e3fb] bg-white'
                }`}
                onPress={() => setCampaignType(typeOption)}
              >
                <Text
                  className={`font-semibold ${
                    isSelected ? 'text-[#214a94]' : 'text-[#4a6083]'
                  }`}
                >
                  {TYPE_LABELS[typeOption]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          className={`mt-5 rounded-xl px-4 py-3 ${
            canCreateCampaign ? 'bg-[#1f5fe0]' : 'bg-[#9eb8e8]'
          }`}
          disabled={!canCreateCampaign}
          onPress={handleCreateCampaign}
        >
          <Text className='text-center text-base font-semibold text-white'>Crear Campana</Text>
        </Pressable>
      </View>

      <View className='rounded-2xl border border-[#dce8ff] bg-white p-5'>
        <Text className='text-lg font-extrabold text-[#14243f]'>Recaudado Total</Text>
        <View className='mt-3 flex-row gap-3'>
          <View className='flex-1 rounded-xl bg-[#e9f2ff] p-4'>
            <Text className='text-xs font-semibold uppercase tracking-[1px] text-[#4f6487]'>
              Dinero
            </Text>
            <Text className='mt-2 text-lg font-extrabold text-[#163a75]'>
              {formatMoney(totalMoney)}
            </Text>
          </View>
          <View className='flex-1 rounded-xl bg-[#e9fff2] p-4'>
            <Text className='text-xs font-semibold uppercase tracking-[1px] text-[#4f6487]'>
              Elementos
            </Text>
            <Text className='mt-2 text-lg font-extrabold text-[#13613b]'>{totalItems}</Text>
          </View>
        </View>
      </View>

      <View className='rounded-2xl border border-[#dce8ff] bg-white p-5'>
        <Text className='text-lg font-extrabold text-[#14243f]'>Campanas Creadas</Text>
        {campaigns.length === 0 ? (
          <Text className='mt-2 text-sm text-[#6780a8]'>
            Aun no hay campanas. Crea la primera para activar el chat y recaudos.
          </Text>
        ) : (
          <View className='mt-3 gap-3'>
            {campaigns.map((campaign) => {
              const isActive = campaign.id === activeCampaignId;
              return (
                <Animated.View
                  className={`rounded-xl border p-4 ${
                    isActive
                      ? 'border-[#2d67d6] bg-[#edf3ff]'
                      : 'border-[#dbe7fb] bg-[#f9fbff]'
                  }`}
                  entering={FadeInUp.duration(260)}
                  key={campaign.id}
                  layout={Layout.springify()}
                >
                  <View className='flex-row items-start justify-between'>
                    <View className='flex-1 pr-3'>
                      <Text className='text-base font-bold text-[#1a3257]'>{campaign.name}</Text>
                      <Text className='mt-1 text-xs text-[#5e7394]'>{campaign.eventName}</Text>
                    </View>
                    <Pressable
                      className={`rounded-full px-3 py-1 ${
                        isActive ? 'bg-[#1f5fe0]' : 'bg-[#dde8fb]'
                      }`}
                      onPress={() => setActiveCampaignId(campaign.id)}
                    >
                      <Text className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-[#35517c]'}`}>
                        {isActive ? 'Activa' : 'Abrir'}
                      </Text>
                    </Pressable>
                  </View>

                  <View className='mt-3 flex-row gap-3'>
                    <Text className='text-sm font-semibold text-[#23406d]'>
                      {formatMoney(campaign.collectedMoney)}
                    </Text>
                    <Text className='text-sm font-semibold text-[#23406d]'>
                      {campaign.collectedItems} elementos
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}
      </View>

      {activeCampaign ? (
        <View className='rounded-2xl border border-[#dce8ff] bg-white p-5'>
          <Text className='text-lg font-extrabold text-[#14243f]'>
            Campana Activa: {activeCampaign.name}
          </Text>

          <Text className='mt-4 mb-2 text-sm font-semibold text-[#233b61]'>Registrar Donaciones</Text>
          <View className='flex-row items-center gap-2'>
            <TextInput
              className='flex-1 rounded-xl border border-[#cfe0fb] bg-[#f8fbff] px-4 py-3 text-[#13274a]'
              keyboardType='number-pad'
              onChangeText={setDonationMoney}
              placeholder='Dinero COP'
              placeholderTextColor='#8ba2c3'
              value={donationMoney}
            />
            <Pressable className='rounded-xl bg-[#1f5fe0] px-3 py-3' onPress={handleDonateMoney}>
              <FontAwesome5 color='#fff' name='hand-holding-usd' size={15} />
            </Pressable>
          </View>

          <View className='mt-2 flex-row items-center gap-2'>
            <TextInput
              className='flex-1 rounded-xl border border-[#cfe0fb] bg-[#f8fbff] px-4 py-3 text-[#13274a]'
              keyboardType='number-pad'
              onChangeText={setDonationItems}
              placeholder='Cantidad elementos fisicos'
              placeholderTextColor='#8ba2c3'
              value={donationItems}
            />
            <Pressable className='rounded-xl bg-[#2f9460] px-3 py-3' onPress={handleDonateItems}>
              <FontAwesome5 color='#fff' name='boxes' size={15} />
            </Pressable>
          </View>

          <Text className='mt-5 mb-2 text-sm font-semibold text-[#233b61]'>Chat General</Text>
          <ScrollView className='max-h-52 rounded-xl border border-[#dce7fb] bg-[#f9fbff] p-3'>
            {activeCampaign.chat.map((message) => (
              <View className='mb-2 rounded-xl bg-white px-3 py-2' key={message.id}>
                <Text className='text-xs font-semibold text-[#3e5b88]'>
                  {ROLE_LABELS[message.author]} - {message.createdAt}
                </Text>
                <Text className='mt-1 text-sm text-[#1e365b]'>{message.message}</Text>
              </View>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className='mt-3'>
            <View className='flex-row gap-2'>
              {(['organizer', 'donor', 'volunteer'] as ChatRole[]).map((roleOption) => {
                const isSelected = roleOption === chatRole;
                return (
                  <Pressable
                    className={`rounded-full border px-4 py-2 ${
                      isSelected ? 'border-[#2d67d6] bg-[#e8f0ff]' : 'border-[#d6e3fb] bg-white'
                    }`}
                    key={roleOption}
                    onPress={() => setChatRole(roleOption)}
                  >
                    <Text className={`font-semibold ${isSelected ? 'text-[#214a94]' : 'text-[#4a6083]'}`}>
                      {ROLE_LABELS[roleOption]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View className='mt-2 flex-row items-center gap-2'>
            <TextInput
              className='flex-1 rounded-xl border border-[#cfe0fb] bg-[#f8fbff] px-4 py-3 text-[#13274a]'
              onChangeText={setChatInput}
              placeholder='Escribe un mensaje para el chat general'
              placeholderTextColor='#8ba2c3'
              value={chatInput}
            />
            <Pressable className='rounded-xl bg-[#1f5fe0] px-4 py-3' onPress={handleSendMessage}>
              <FontAwesome5 color='#fff' name='paper-plane' size={14} />
            </Pressable>
          </View>
        </View>
      ) : null}
      </ScrollView>

      <OrganizerBottomTabs activeTab='campanas' />
    </SafeAreaView>
  );
}
