import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
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
import 'leaflet/dist/leaflet.css';

import {
  COLOMBIAN_CITIES,
  type ColombianCity,
  findColombianCityByName,
} from '@/modules/missions/constants/colombianCities';
import { OrganizerBottomTabs } from '@/modules/organizer/components/OrganizerBottomTabs';
import { createEvent, type EventSummary, getEvents } from '@/services/api/eventsService';
import { getPickupPoints, type PickupPoint } from '@/services/api/logisticsService';
import { getRememberedPickupPoints, rememberPickupPoints } from '@/services/state/pickupPointsMemory';

const DEFAULT_CREATED_BY = 1;
const DEFAULT_DISASTER_TYPE = 'desastre_natural';
const COLOMBIA_CENTER: [number, number] = [4.5709, -74.2973];

export function CreateMissionScreen() {
  const [isEventMenuOpen, setIsEventMenuOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState(false);

  const [eventName, setEventName] = useState('');
  const [disasterType, setDisasterType] = useState(DEFAULT_DISASTER_TYPE);
  const [eventDescription, setEventDescription] = useState('');
  const [selectedCity, setSelectedCity] = useState<ColombianCity | null>(null);

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdEventLabel, setCreatedEventLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreateEvent = useMemo(
    () =>
      eventName.trim().length > 2 &&
      disasterType.trim().length > 2 &&
      Boolean(selectedCity) &&
      !isSubmitting,
    [disasterType, eventName, isSubmitting, selectedCity]
  );

  const mappedEvents = useMemo(
    () =>
      events
        .map((eventItem) => {
          const city = findColombianCityByName(eventItem.city);
          const fallbackCity = city ?? COLOMBIAN_CITIES[0];

          return { event: eventItem, city: fallbackCity };
        })
        .filter((eventItem): eventItem is { event: EventSummary; city: ColombianCity } => Boolean(eventItem)),
    [events]
  );

  const mappedPickupPoints = useMemo(
    () =>
      pickupPoints
        .map((pickupPoint) => {
          if (typeof pickupPoint.latitude === 'number' && typeof pickupPoint.longitude === 'number') {
            return {
              pickupPoint,
              latitude: pickupPoint.latitude,
              longitude: pickupPoint.longitude,
            };
          }

          const city = findColombianCityByName(pickupPoint.city);

          if (!city) {
            return null;
          }

          return {
            pickupPoint,
            latitude: city.region.latitude,
            longitude: city.region.longitude,
          };
        })
        .filter(
          (
            item
          ): item is {
            pickupPoint: PickupPoint;
            latitude: number;
            longitude: number;
          } => Boolean(item)
        ),
    [pickupPoints]
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (mappedEvents.length > 0) {
      return [mappedEvents[0].city.region.latitude, mappedEvents[0].city.region.longitude];
    }

    if (mappedPickupPoints.length > 0) {
      return [mappedPickupPoints[0].latitude, mappedPickupPoints[0].longitude];
    }

    return COLOMBIA_CENTER;
  }, [mappedEvents, mappedPickupPoints]);

  const loadData = useCallback(async () => {
    setIsLoadingEvents(true);
    setLoadError(null);

    const rememberedPickupPoints = getRememberedPickupPoints();

    const eventsPromise = getEvents({ page: 1, limit: 100 });
    const pickupPointsPromise = getPickupPoints().catch(async () => {
      return getPickupPoints(1, 100);
    });

    const [eventsResult, pickupPointsResult] = await Promise.allSettled([
      eventsPromise,
      pickupPointsPromise,
    ]);

    const failedSources: string[] = [];

    if (eventsResult.status === 'fulfilled') {
      setEvents(eventsResult.value.data);
    } else {
      setEvents([]);
      failedSources.push('eventos');
    }

    if (pickupPointsResult.status === 'fulfilled') {
      const mergedById = new Map<number, PickupPoint>();

      rememberedPickupPoints.forEach((item) => {
        mergedById.set(item.id, item);
      });

      pickupPointsResult.value.data.forEach((item) => {
        mergedById.set(item.id, item);
      });

      const mergedPickupPoints = Array.from(mergedById.values()).sort((a, b) => b.id - a.id);
      setPickupPoints(mergedPickupPoints);
      rememberPickupPoints(mergedPickupPoints);
    } else {
      setPickupPoints(rememberedPickupPoints);
      failedSources.push('puntos de recogida');
    }

    if (failedSources.length > 0) {
      setLoadError(`No fue posible cargar: ${failedSources.join(' | ')}.`);
    }

    setIsLoadingEvents(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleCreateEvent = async () => {
    if (!selectedCity) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const createdEvent = await createEvent({
        name: eventName.trim(),
        disasterType: disasterType.trim(),
        city: selectedCity.name,
        description: eventDescription.trim() || 'Evento registrado desde la vista web',
        date: new Date().toISOString(),
        createdBy: DEFAULT_CREATED_BY,
      });

      setEvents((prev) => [createdEvent, ...prev]);
      setCreatedEventLabel(`${createdEvent.name} - ${createdEvent.city}`);
      setEventName('');
      setDisasterType(DEFAULT_DISASTER_TYPE);
      setEventDescription('');
      setSelectedCity(null);
      setIsCreateEventOpen(false);
      setIsEventMenuOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo crear el evento.';
      setSubmitError(`No se pudo crear el evento. ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-[#dce9f5]'>
      <View className='px-4 pb-3 pt-3'>
        <Text className='text-2xl font-extrabold text-[#16325d]'>Gestion de eventos</Text>
        <Text className='mt-1 text-sm text-[#4d648a]'>
          Mapa OpenStreetMap para crear y monitorear eventos y puntos de recogida.
        </Text>

        <View className='mt-4 flex-row items-center gap-2'>
          <Pressable
            className='h-12 w-12 items-center justify-center rounded-full bg-[#d63c4c]'
            onPress={() => setIsEventMenuOpen((current) => !current)}
          >
            <MaterialIcons color='#fff' name='warning' size={22} />
          </Pressable>

          <Pressable className='rounded-xl bg-[#1f5fe0] px-4 py-2' onPress={loadData}>
            <Text className='font-semibold text-white'>Recargar inicio</Text>
          </Pressable>
        </View>

        {isEventMenuOpen ? (
          <View className='mt-3 rounded-2xl border border-[#d8e7ff] bg-white p-3'>
            <Pressable
              className='flex-row items-center rounded-xl bg-[#f4f8ff] px-3 py-3'
              onPress={() => setIsCreateEventOpen((current) => !current)}
            >
              <MaterialIcons color='#2f68d8' name='warning-amber' size={20} />
              <Text className='ml-2 text-sm font-semibold text-[#1d3357]'>Crear Evento (Desastre)</Text>
            </Pressable>
          </View>
        ) : null}

        {createdEventLabel ? (
          <View className='mt-3 rounded-xl bg-[#183e80] px-4 py-3'>
            <Text className='text-sm font-semibold text-white'>Evento creado: {createdEventLabel}</Text>
          </View>
        ) : null}

        {loadError ? (
          <View className='mt-3 rounded-xl bg-[#ffecef] px-3 py-2'>
            <Text className='text-xs text-[#9f2238]'>{loadError}</Text>
          </View>
        ) : null}
      </View>

      <View className='mx-4 flex-1 overflow-hidden rounded-2xl border border-[#d3e2ff] bg-white'>
        <MapContainer center={mapCenter} style={{ height: '100%', width: '100%' }} zoom={6}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />

          {mappedEvents.map(({ event, city }) => (
            <CircleMarker
              center={[city.region.latitude, city.region.longitude]}
              key={`event-${event.id}`}
              pathOptions={{ color: '#e03b3b', fillColor: '#ff6b6b', fillOpacity: 0.9 }}
              radius={9}
            >
              <Popup>
                <strong>{event.name}</strong>
                <br />
                {event.description || 'Sin descripcion'}
                <br />
                {event.city}
              </Popup>
            </CircleMarker>
          ))}

          {mappedPickupPoints.map(({ pickupPoint, latitude, longitude }) => (
            <CircleMarker
              center={[latitude, longitude]}
              key={`pickup-${pickupPoint.id}`}
              pathOptions={{ color: '#1f5fe0', fillColor: '#2a7fff', fillOpacity: 0.92 }}
              radius={8}
            >
              <Popup>
                <strong>Punto de recogida: {pickupPoint.name}</strong>
                <br />
                {pickupPoint.address}
                <br />
                {pickupPoint.city}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </View>

      {isCreateEventOpen ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className='px-4'>
          <View className='rounded-3xl border border-[#d5e3fb] bg-white px-5 py-5'>
            <Text className='text-lg font-extrabold text-[#14243f]'>Crear Evento De Desastre Natural</Text>

            <Text className='mb-2 mt-4 text-sm font-semibold text-[#233b61]'>Nombre Del Evento</Text>
            <TextInput
              className='rounded-xl border border-[#cfe0fb] bg-[#f8fbff] px-4 py-3 text-[#13274a]'
              onChangeText={setEventName}
              placeholder='Ej: Inundacion por lluvias intensas'
              placeholderTextColor='#8ba2c3'
              value={eventName}
            />

            <Text className='mb-2 mt-4 text-sm font-semibold text-[#233b61]'>Tipo De Desastre</Text>
            <TextInput
              className='rounded-xl border border-[#cfe0fb] bg-[#f8fbff] px-4 py-3 text-[#13274a]'
              onChangeText={setDisasterType}
              placeholder='Ej: inundacion'
              placeholderTextColor='#8ba2c3'
              value={disasterType}
            />

            <Text className='mb-2 mt-4 text-sm font-semibold text-[#233b61]'>Descripcion</Text>
            <TextInput
              className='rounded-xl border border-[#cfe0fb] bg-[#f8fbff] px-4 py-3 text-[#13274a]'
              multiline
              numberOfLines={4}
              onChangeText={setEventDescription}
              placeholder='Describe el evento'
              placeholderTextColor='#8ba2c3'
              style={{ minHeight: 96, textAlignVertical: 'top' }}
              value={eventDescription}
            />

            <Text className='mb-2 mt-4 text-sm font-semibold text-[#233b61]'>Ciudad</Text>
            <Pressable
              className='rounded-xl border border-[#cfe0fb] bg-[#f8fbff] px-4 py-3'
              onPress={() => setIsCitySelectorOpen((current) => !current)}
            >
              <Text className='text-[#1b3357]'>
                {selectedCity ? selectedCity.name : 'Selecciona una ciudad de Colombia'}
              </Text>
            </Pressable>

            {isCitySelectorOpen ? (
              <ScrollView className='mt-3 max-h-40 rounded-xl border border-[#d6e4fb] bg-[#fafdff]'>
                {COLOMBIAN_CITIES.map((city) => (
                  <Pressable
                    className='border-b border-[#e8effd] px-4 py-3'
                    key={city.id}
                    onPress={() => {
                      setSelectedCity(city);
                      setIsCitySelectorOpen(false);
                    }}
                  >
                    <Text className='text-[#20375d]'>{city.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {submitError ? <Text className='mt-3 text-sm text-[#c3324d]'>{submitError}</Text> : null}

            <View className='mt-6 flex-row items-center justify-between'>
              <Pressable className='rounded-xl border border-[#d3def3] px-4 py-3' onPress={() => setIsCreateEventOpen(false)}>
                <Text className='font-semibold text-[#3a5176]'>Cancelar</Text>
              </Pressable>
              <Pressable
                className={`rounded-xl px-5 py-3 ${canCreateEvent ? 'bg-[#1f5fe0]' : 'bg-[#9db8e5]'}`}
                disabled={!canCreateEvent}
                onPress={handleCreateEvent}
              >
                <Text className='font-semibold text-white'>{isSubmitting ? 'Creando...' : 'Crear Evento'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      <OrganizerBottomTabs activeTab='inicio' />
    </SafeAreaView>
  );
}
