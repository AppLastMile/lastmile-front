import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  COLOMBIAN_CITIES,
  type ColombianCity,
} from '@/modules/missions/constants/colombianCities';
import { OrganizerBottomTabs } from '@/modules/organizer/components/OrganizerBottomTabs';
import { type EventSummary, getEvents } from '@/services/api/eventsService';
import {
  createPickupPoint,
  getPickupPoints,
  type PickupPoint,
} from '@/services/api/logisticsService';
import { getUsers, type UserSummary } from '@/services/api/usersService';

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

export function OrganizerLogisticsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [volunteers, setVolunteers] = useState<UserSummary[]>([]);

  const [isCreatePickupOpen, setIsCreatePickupOpen] = useState(false);
  const [pickupName, setPickupName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [selectedCity, setSelectedCity] = useState<ColombianCity | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState(false);
  const [pickupSubmitError, setPickupSubmitError] = useState<string | null>(null);
  const [isCreatingPickup, setIsCreatingPickup] = useState(false);

  const eventsById = useMemo(
    () => new Map(events.map((eventItem) => [eventItem.id, eventItem])),
    [events]
  );

  const canCreatePickup =
    pickupName.trim().length >= 3 &&
    pickupAddress.trim().length >= 5 &&
    Boolean(selectedCity) &&
    Boolean(selectedEventId) &&
    !isCreatingPickup;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [eventsResponse, pickupPointsResponse, usersResponse] = await Promise.all([
        getEvents(),
        getPickupPoints(),
        getUsers(),
      ]);

      setEvents(eventsResponse.data);
      setPickupPoints(pickupPointsResponse.data);
      setVolunteers(usersResponse.data.filter((user) => user.role === 'volunteer'));
      setSelectedEventId((current) => current ?? eventsResponse.data[0]?.id ?? null);
    } catch (error) {
      setLoadError(`No fue posible cargar logistica. ${getErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectCity = (city: ColombianCity) => {
    setSelectedCity(city);
    setIsCitySelectorOpen(false);
  };

  const handleCreatePickupPoint = async () => {
    if (!selectedCity || !selectedEventId) {
      return;
    }

    setIsCreatingPickup(true);
    setPickupSubmitError(null);

    try {
      const createdPickupPoint = await createPickupPoint({
        name: pickupName.trim(),
        address: pickupAddress.trim(),
        city: selectedCity.name,
        eventId: selectedEventId,
      });

      setPickupPoints((prev) => [createdPickupPoint, ...prev]);
      setPickupName('');
      setPickupAddress('');
      setSelectedCity(null);
      setIsCreatePickupOpen(false);
    } catch (error) {
      setPickupSubmitError(`No se pudo crear el punto. ${getErrorMessage(error)}`);
    } finally {
      setIsCreatingPickup(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-[#eef4ff]'>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Pressable
          className='rounded-xl bg-[#1f5fe0] px-4 py-3'
          onPress={() => setIsCreatePickupOpen((current) => !current)}
        >
          <Text className='text-center font-semibold text-white'>Nuevo punto de recogida</Text>
        </Pressable>

        {isLoading ? (
          <View className='mt-3 flex-row items-center'>
            <ActivityIndicator color='#1f5fe0' size='small' />
            <Text className='ml-2 text-sm text-[#50698e]'>Cargando puntos de recogida...</Text>
          </View>
        ) : null}

        {loadError ? (
          <Text className='mt-3 rounded-xl bg-[#ffecef] px-3 py-2 text-sm text-[#a0253c]'>
            {loadError}
          </Text>
        ) : null}

        <View className='mt-3'>
          <Pressable className='self-start rounded-xl border border-[#c9dbfb] px-4 py-2' onPress={loadData}>
            <Text className='font-semibold text-[#2d4f86]'>Recargar</Text>
          </Pressable>
        </View>

        {isCreatePickupOpen ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className='mt-4 rounded-2xl border border-[#dce8ff] bg-white p-4'
          >
            <Text className='text-base font-bold text-[#19335f]'>Crear punto de recogida</Text>

            <Text className='mt-3 text-sm font-semibold text-[#27436d]'>Nombre</Text>
            <TextInput
              className='mt-1 rounded-xl border border-[#d3e2fb] bg-[#f8fbff] px-4 py-3 text-[#18335f]'
              onChangeText={setPickupName}
              placeholder='Ej: Punto norte de donaciones'
              placeholderTextColor='#8ea6c8'
              value={pickupName}
            />

            <Text className='mt-3 text-sm font-semibold text-[#27436d]'>Direccion</Text>
            <TextInput
              className='mt-1 rounded-xl border border-[#d3e2fb] bg-[#f8fbff] px-4 py-3 text-[#18335f]'
              onChangeText={setPickupAddress}
              placeholder='Ej: Cra 15 # 102-30'
              placeholderTextColor='#8ea6c8'
              value={pickupAddress}
            />

            <Text className='mt-3 text-sm font-semibold text-[#27436d]'>Ciudad</Text>
            <Pressable
              className='mt-1 rounded-xl border border-[#d3e2fb] bg-[#f8fbff] px-4 py-3'
              onPress={() => setIsCitySelectorOpen((current) => !current)}
            >
              <Text className='text-[#18335f]'>
                {selectedCity ? selectedCity.name : 'Selecciona ciudad'}
              </Text>
            </Pressable>

            {isCitySelectorOpen ? (
              <ScrollView className='mt-2 max-h-40 rounded-xl border border-[#d6e4fb] bg-[#fafdff]'>
                {COLOMBIAN_CITIES.map((city) => (
                  <Pressable
                    className='border-b border-[#e8effd] px-4 py-3'
                    key={city.id}
                    onPress={() => handleSelectCity(city)}
                  >
                    <Text className='text-[#20375d]'>{city.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

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
                        {eventItem.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {pickupSubmitError ? (
              <Text className='mt-3 rounded-xl bg-[#ffecef] px-3 py-2 text-xs text-[#9f2238]'>
                {pickupSubmitError}
              </Text>
            ) : null}

            <View className='mt-4 flex-row items-center justify-between'>
              <Pressable
                className='rounded-xl border border-[#d3def3] px-4 py-3'
                onPress={() => setIsCreatePickupOpen(false)}
              >
                <Text className='font-semibold text-[#3a5176]'>Cancelar</Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-5 py-3 ${canCreatePickup ? 'bg-[#1f5fe0]' : 'bg-[#9db8e5]'}`}
                disabled={!canCreatePickup}
                onPress={handleCreatePickupPoint}
              >
                <Text className='font-semibold text-white'>
                  {isCreatingPickup ? 'Creando...' : 'Crear punto'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        ) : null}

        <View className='mt-4 rounded-2xl border border-[#dce8ff] bg-white p-4'>
          <Text className='text-base font-bold text-[#19335f]'>Puntos de recogida</Text>
          {pickupPoints.length === 0 ? (
            <Text className='mt-2 text-sm text-[#5d7498]'>Aun no hay puntos registrados.</Text>
          ) : (
            <View className='mt-3 gap-2'>
              {pickupPoints.map((pickupPoint) => {
                const event = eventsById.get(pickupPoint.eventId);

                return (
                  <View className='rounded-xl border border-[#e1ebff] bg-[#f8fbff] px-3 py-3' key={pickupPoint.id}>
                    <Text className='text-sm font-bold text-[#173761]'>{pickupPoint.name}</Text>
                    <Text className='mt-1 text-xs text-[#496385]'>
                      {pickupPoint.city} · {pickupPoint.address}
                    </Text>
                    <Text className='mt-1 text-xs text-[#496385]'>
                      Evento: {event ? event.name : `ID ${pickupPoint.eventId}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View className='mt-4 rounded-2xl border border-[#dce8ff] bg-white p-4'>
          <Text className='text-base font-bold text-[#19335f]'>Voluntarios disponibles</Text>

          {volunteers.length === 0 ? (
            <Text className='mt-2 text-sm text-[#5d7498]'>No hay voluntarios disponibles.</Text>
          ) : (
            <View className='mt-3 gap-2'>
              {volunteers.map((volunteer) => {
                const volunteerName = volunteer.fullName ?? volunteer.name ?? 'Sin nombre';

                return (
                  <View
                    className='rounded-xl border border-[#e1ebff] bg-[#f8fbff] px-3 py-3'
                    key={volunteer.id}
                  >
                    <Text className='text-sm font-bold text-[#173761]'>{volunteerName}</Text>
                    <Text className='mt-1 text-xs text-[#496385]'>{volunteer.email}</Text>
                    <Text className='mt-1 text-xs font-semibold text-[#2b5aa1]'>
                      ID voluntario: {volunteer.id}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>

      <OrganizerBottomTabs activeTab='logistica' />
    </SafeAreaView>
  );
}
