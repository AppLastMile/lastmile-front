import { FontAwesome5 } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  COLOMBIAN_CITIES,
  type ColombianCity,
} from '@/modules/missions/constants/colombianCities';
import { OrganizerBottomTabs } from '@/modules/organizer/components/OrganizerBottomTabs';
import { type EventSummary, getEvents } from '@/services/api/eventsService';
import {
  createPickupPoint,
  getPickupPoints,
  getShipments,
  type PickupPoint,
  type Shipment,
} from '@/services/api/logisticsService';
import { rememberPickupPoint, rememberPickupPoints } from '@/services/state/pickupPointsMemory';
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

function getShipmentStatusLabel(status: Shipment['status']) {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'assigned':
      return 'Asignado';
    case 'in_transit':
      return 'En tránsito';
    case 'delivered':
      return 'Entregado';
    default:
      return status;
  }
}

function getShipmentStatusColor(status: Shipment['status']) {
  switch (status) {
    case 'in_transit':
      return '#1e73fa';
    case 'pending':
      return '#f59e0b';
    case 'assigned':
      return '#16a34a';
    case 'delivered':
      return '#6b7280';
    default:
      return '#6b7280';
  }
}

function getEstimatedTime(id: number) {
  const h = 10 + (id % 8);
  const m = String((id * 13) % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function getSector(id: number) {
  const letter = String.fromCodePoint(65 + (id % 5));
  const num = (id % 9) + 1;
  return `Sector ${letter}-${num}`;
}

function PickupPointCard({ point, event, bgColor }: Readonly<{ point: PickupPoint; event: EventSummary | undefined; bgColor: string }>) {
  return (
    <View
      style={{
        width: 180,
        marginRight: 14,
        borderRadius: 20,
        backgroundColor: '#fff',
        overflow: 'hidden',
        shadowColor: '#163457',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
        elevation: 5,
      }}
    >
      <View style={{ height: 130, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome5 color='rgba(255,255,255,0.7)' name='warehouse' size={44} />
        <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#16a34a', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>ACTIVO</Text>
        </View>
      </View>
      <View style={{ padding: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#111f3c' }} numberOfLines={1}>{point.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
          <FontAwesome5 color='#9ca3af' name='map-marker-alt' size={11} />
          <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 5 }} numberOfLines={1}>{point.address}</Text>
        </View>
        {event ? (
          <Text style={{ fontSize: 11, color: '#1e73fa', marginTop: 4 }} numberOfLines={1}>{event.name}</Text>
        ) : null}
      </View>
    </View>
  );
}

function ShipmentRow({ shipment }: Readonly<{ shipment: Shipment }>) {
  const statusLabel = getShipmentStatusLabel(shipment.status);
  const statusColor = getShipmentStatusColor(shipment.status);
  const estimatedTime = getEstimatedTime(shipment.id);
  const sector = getSector(shipment.id);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#163457',
        shadowOpacity: 0.07,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <View style={{ backgroundColor: '#e8f3ff', borderRadius: 16, padding: 14 }}>
        <FontAwesome5 color='#1e73fa' name='box' size={20} />
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#111f3c' }}>
          #{`LM-${shipment.id.toString().padStart(4, '0')}`}
        </Text>
        <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>Entrega Estimada: {estimatedTime}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: statusColor }}>{statusLabel}</Text>
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{sector}</Text>
      </View>
    </View>
  );
}

function VolunteerCard({ volunteer }: Readonly<{ volunteer: UserSummary }>) {
  const volunteerName = volunteer.fullName ?? volunteer.name ?? 'Sin nombre';

  return (
    <View
      style={{
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        marginBottom: 14,
        shadowColor: '#163457',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      <View style={{ position: 'relative' }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#0d8383', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome5 color='#fff' name='user' size={26} />
        </View>
        <View style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' }} />
      </View>
      <Text style={{ marginTop: 10, fontSize: 15, fontWeight: '800', color: '#111f3c', textAlign: 'center' }} numberOfLines={1}>{volunteerName}</Text>
      <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, letterSpacing: 1 }}>VOLUNTARIO</Text>
      <Pressable style={{ marginTop: 12, backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9, width: '100%', alignItems: 'center' }}>
        <Text style={{ color: '#1e73fa', fontSize: 13, fontWeight: '700' }}>Asignar</Text>
      </Pressable>
    </View>
  );
}

export function OrganizerLogisticsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [volunteers, setVolunteers] = useState<UserSummary[]>([]);

  const [isCreatePickupOpen, setIsCreatePickupOpen] = useState(false);
  const [pickupName, setPickupName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [selectedCity, setSelectedCity] = useState<ColombianCity | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState(false);
  const [pickupSubmitError, setPickupSubmitError] = useState<string | null>(null);
  const [isCreatingPickup, setIsCreatingPickup] = useState(false);

    type CreatePickupFormProps = Readonly<{
      events: EventSummary[];
      selectedEventId: number | null;
      onSelectEvent: (id: number) => void;
      pickupName: string;
      onChangePickupName: (text: string) => void;
      pickupAddress: string;
      onChangePickupAddress: (text: string) => void;
      selectedCity: ColombianCity | null;
      isCitySelectorOpen: boolean;
      onToggleCitySelector: () => void;
      onSelectCity: (city: ColombianCity) => void;
      pickupSubmitError: string | null;
      isCreatingPickup: boolean;
      canCreatePickup: boolean;
      onCancel: () => void;
      onSubmit: () => void;
    }>;

    function CreatePickupForm({
      events, selectedEventId, onSelectEvent,
      pickupName, onChangePickupName,
      pickupAddress, onChangePickupAddress,
      selectedCity, isCitySelectorOpen, onToggleCitySelector, onSelectCity,
      pickupSubmitError, isCreatingPickup, canCreatePickup,
      onCancel, onSubmit,
    }: CreatePickupFormProps) {
      return (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#163457', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 4 }}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#19335f', marginBottom: 4 }}>Crear punto de recogida</Text>

          <Text style={{ marginTop: 12, marginBottom: 4, fontSize: 13, fontWeight: '700', color: '#27436d' }}>Nombre</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: '#d3e2fb', borderRadius: 14, backgroundColor: '#f8fbff', paddingHorizontal: 16, paddingVertical: 12, color: '#18335f' }}
            onChangeText={onChangePickupName}
            placeholder='Ej: Punto norte de donaciones'
            placeholderTextColor='#8ea6c8'
            value={pickupName}
          />

          <Text style={{ marginTop: 12, marginBottom: 4, fontSize: 13, fontWeight: '700', color: '#27436d' }}>Direccion</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: '#d3e2fb', borderRadius: 14, backgroundColor: '#f8fbff', paddingHorizontal: 16, paddingVertical: 12, color: '#18335f' }}
            onChangeText={onChangePickupAddress}
            placeholder='Ej: Cra 15 # 102-30'
            placeholderTextColor='#8ea6c8'
            value={pickupAddress}
          />

          <Text style={{ marginTop: 12, marginBottom: 4, fontSize: 13, fontWeight: '700', color: '#27436d' }}>Ciudad</Text>
          <Pressable
            style={{ borderWidth: 1, borderColor: '#d3e2fb', borderRadius: 14, backgroundColor: '#f8fbff', paddingHorizontal: 16, paddingVertical: 12 }}
            onPress={onToggleCitySelector}
          >
            <Text style={{ color: '#18335f' }}>{selectedCity ? selectedCity.name : 'Selecciona ciudad'}</Text>
          </Pressable>

          {isCitySelectorOpen ? (
            <ScrollView style={{ maxHeight: 160, marginTop: 8, borderWidth: 1, borderColor: '#d6e4fb', borderRadius: 14, backgroundColor: '#fafdff' }} nestedScrollEnabled>
              {COLOMBIAN_CITIES.map((city) => (
                <Pressable
                  style={{ borderBottomWidth: 1, borderBottomColor: '#e8effd', paddingHorizontal: 16, paddingVertical: 12 }}
                  key={city.id}
                  onPress={() => onSelectCity(city)}
                >
                  <Text style={{ color: '#20375d' }}>{city.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <Text style={{ marginTop: 12, marginBottom: 6, fontSize: 13, fontWeight: '700', color: '#27436d' }}>Evento asociado</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {events.map((eventItem) => {
                const isSelected = selectedEventId === eventItem.id;
                return (
                  <Pressable
                    style={{ borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, borderColor: isSelected ? '#1f5fe0' : '#d6e3fb', backgroundColor: isSelected ? '#e8f0ff' : '#fff' }}
                    key={eventItem.id}
                    onPress={() => onSelectEvent(eventItem.id)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#1f4fb6' : '#4a6083' }}>{eventItem.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {pickupSubmitError ? (
            <Text style={{ marginTop: 10, backgroundColor: '#ffecef', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#9f2238' }}>{pickupSubmitError}</Text>
          ) : null}

          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              style={{ borderWidth: 1, borderColor: '#d3def3', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 }}
              onPress={onCancel}
            >
              <Text style={{ fontWeight: '700', color: '#3a5176' }}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={{ borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12, backgroundColor: canCreatePickup ? '#1f5fe0' : '#9db8e5' }}
              disabled={!canCreatePickup}
              onPress={onSubmit}
            >
              <Text style={{ fontWeight: '700', color: '#fff' }}>{isCreatingPickup ? 'Creando...' : 'Crear punto'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      );
    }

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
      const [eventsResponse, pickupPointsResponse, usersResponse, shipmentsResponse] = await Promise.all([
        getEvents(),
        getPickupPoints(),
        getUsers(),
        getShipments(),
      ]);

      setEvents(eventsResponse.data);
      setPickupPoints(pickupPointsResponse.data);
      rememberPickupPoints(pickupPointsResponse.data);
      setShipments(shipmentsResponse.data);
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
      rememberPickupPoint(createdPickupPoint);
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

  const inTransitCount = shipments.filter((s) => s.status === 'in_transit').length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#f4f6fb' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#dce8ff', borderRadius: 16, padding: 12, marginRight: 12 }}>
              <FontAwesome5 color='#1e73fa' name='truck' size={22} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#111f3c' }}>Logística</Text>
          </View>
          <Pressable style={{ backgroundColor: '#ebebeb', borderRadius: 16, padding: 12 }}>
            <FontAwesome5 color='#555' name='bell' size={20} />
          </Pressable>
        </View>

        {/* ── Nuevo punto de recogida ── */}
        <Pressable
          onPress={() => setIsCreatePickupOpen((current) => !current)}
          style={{
            marginHorizontal: 20,
            marginBottom: 22,
            backgroundColor: '#1e73fa',
            borderRadius: 18,
            paddingVertical: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FontAwesome5 color='#fff' name='map-marker-alt' size={18} style={{ marginRight: 10 }} />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Nuevo punto de recogida</Text>
        </Pressable>

        {/* ── Create pickup form ── */}
        {isCreatePickupOpen ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#163457', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 4 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#19335f', marginBottom: 4 }}>Crear punto de recogida</Text>

            <Text style={{ marginTop: 12, marginBottom: 4, fontSize: 13, fontWeight: '700', color: '#27436d' }}>Nombre</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#d3e2fb', borderRadius: 14, backgroundColor: '#f8fbff', paddingHorizontal: 16, paddingVertical: 12, color: '#18335f' }}
              onChangeText={setPickupName}
              placeholder='Ej: Punto norte de donaciones'
              placeholderTextColor='#8ea6c8'
              value={pickupName}
            />

            <Text style={{ marginTop: 12, marginBottom: 4, fontSize: 13, fontWeight: '700', color: '#27436d' }}>Direccion</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#d3e2fb', borderRadius: 14, backgroundColor: '#f8fbff', paddingHorizontal: 16, paddingVertical: 12, color: '#18335f' }}
              onChangeText={setPickupAddress}
              placeholder='Ej: Cra 15 # 102-30'
              placeholderTextColor='#8ea6c8'
              value={pickupAddress}
            />

            <Text style={{ marginTop: 12, marginBottom: 4, fontSize: 13, fontWeight: '700', color: '#27436d' }}>Ciudad</Text>
            <Pressable
              style={{ borderWidth: 1, borderColor: '#d3e2fb', borderRadius: 14, backgroundColor: '#f8fbff', paddingHorizontal: 16, paddingVertical: 12 }}
              onPress={() => setIsCitySelectorOpen((current) => !current)}
            >
              <Text style={{ color: '#18335f' }}>{selectedCity ? selectedCity.name : 'Selecciona ciudad'}</Text>
            </Pressable>

            {isCitySelectorOpen ? (
              <ScrollView style={{ maxHeight: 160, marginTop: 8, borderWidth: 1, borderColor: '#d6e4fb', borderRadius: 14, backgroundColor: '#fafdff' }} nestedScrollEnabled>
                {COLOMBIAN_CITIES.map((city) => (
                  <Pressable
                    style={{ borderBottomWidth: 1, borderBottomColor: '#e8effd', paddingHorizontal: 16, paddingVertical: 12 }}
                    key={city.id}
                    onPress={() => handleSelectCity(city)}
                  >
                    <Text style={{ color: '#20375d' }}>{city.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <Text style={{ marginTop: 12, marginBottom: 6, fontSize: 13, fontWeight: '700', color: '#27436d' }}>Evento asociado</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {events.map((eventItem) => {
                  const isSelected = selectedEventId === eventItem.id;

                  return (
                    <Pressable
                      style={{ borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, borderColor: isSelected ? '#1f5fe0' : '#d6e3fb', backgroundColor: isSelected ? '#e8f0ff' : '#fff' }}
                      key={eventItem.id}
                      onPress={() => setSelectedEventId(eventItem.id)}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#1f4fb6' : '#4a6083' }}>{eventItem.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {pickupSubmitError ? (
              <Text style={{ marginTop: 10, backgroundColor: '#ffecef', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#9f2238' }}>{pickupSubmitError}</Text>
            ) : null}

            <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable
                style={{ borderWidth: 1, borderColor: '#d3def3', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 }}
                onPress={() => setIsCreatePickupOpen(false)}
              >
                <Text style={{ fontWeight: '700', color: '#3a5176' }}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={{ borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12, backgroundColor: canCreatePickup ? '#1f5fe0' : '#9db8e5' }}
                disabled={!canCreatePickup}
                onPress={handleCreatePickupPoint}
              >
                <Text style={{ fontWeight: '700', color: '#fff' }}>{isCreatingPickup ? 'Creando...' : 'Crear punto'}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        ) : null}


        {/* ── Loading / Error ── */}
        {isLoading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}>
            <ActivityIndicator color='#1e73fa' size='small' />
            <Text style={{ marginLeft: 8, fontSize: 13, color: '#50698e' }}>Cargando logistica...</Text>
          </View>
        ) : null}

        {loadError ? (
          <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: '#ffecef', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ fontSize: 13, color: '#a0253c' }}>{loadError}</Text>
          </View>
        ) : null}

        {/* ── Puntos de recogida ── */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#111f3c' }}>Puntos de recogida</Text>
            <Pressable onPress={loadData}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e73fa' }}>Ver todos</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {pickupPoints.length === 0 ? (
              <View style={{ justifyContent: 'center', paddingVertical: 20 }}>
                <Text style={{ fontSize: 14, color: '#9ca3af' }}>Sin puntos registrados</Text>
              </View>
            ) : (
              pickupPoints.map((point, idx) => {
                const event = eventsById.get(point.eventId);
                const bgColors = ['#b8d4e8', '#c5d8ee', '#a8c8e0', '#ccdff0', '#bbd0e8'];
                const bg = bgColors[idx % bgColors.length];
                return <PickupPointCard key={point.id} point={point} event={event} bgColor={bg} />;
              })
            )}
          </ScrollView>
        </View>

        {/* ── Envíos registrados ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#111f3c' }}>Envíos registrados</Text>
            {inTransitCount > 0 ? (
              <View style={{ backgroundColor: '#dce8ff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1e40af', letterSpacing: 0.5 }}>{inTransitCount} EN CAMINO</Text>
              </View>
            ) : null}
          </View>

          {shipments.length === 0 ? (
            <Text style={{ fontSize: 14, color: '#9ca3af' }}>No hay envios registrados.</Text>
          ) : (
            shipments.map((shipment) => <ShipmentRow key={shipment.id} shipment={shipment} />)
          )}
        </View>

        {/* ── Voluntarios disponibles ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#111f3c', marginBottom: 14 }}>Voluntarios disponibles</Text>

          {volunteers.length === 0 ? (
            <Text style={{ fontSize: 14, color: '#9ca3af' }}>No hay voluntarios disponibles.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {volunteers.map((volunteer) => <VolunteerCard key={volunteer.id} volunteer={volunteer} />)}
            </View>
          )}
        </View>

      </ScrollView>

      <OrganizerBottomTabs activeTab='logistica' />
    </SafeAreaView>
  );
}
