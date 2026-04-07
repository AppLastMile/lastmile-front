import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, SafeAreaView, Text, View } from 'react-native';
import { CircleMarker, MapContainer, Popup, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import {
  findColombianCityByName,
  type ColombianCity,
} from '@/modules/missions/constants/colombianCities';
import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';
import { DonorBottomTabs, VOLUNTEER_WEB_PANEL_OFFSET } from '@/modules/donor/components/DonorBottomTabs';
import { type EventSummary, getEvents } from '@/services/api/eventsService';
import { getCampaigns, type Campaign } from '@/services/api/campaignsService';
import {
  connectTrackingSocket,
  setTrackingSocketHandlers,
  subscribeCampaignTracking,
  unsubscribeCampaignTracking,
} from '@/services/realtime/trackingSocket';

type EventWithCity = {
  event: EventSummary;
  city: ColombianCity;
};

const COLOMBIA_CENTER: [number, number] = [4.5709, -74.2973];

export function MapScreen() {
  const { currentUser } = useAuthSession();
  const isDonor = currentUser?.role === 'donor';
  const isVolunteer = currentUser?.role === 'volunteer';
  const isWeb = Platform.OS === 'web';
  const webPanelInset = isVolunteer && isWeb ? VOLUNTEER_WEB_PANEL_OFFSET : 0;
  const hasWelcomeBanner = isDonor || isVolunteer;
  const [showDonorWelcome, setShowDonorWelcome] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [volunteerPoints, setVolunteerPoints] = useState<Record<number, { lat: number; lng: number; shipmentId?: number; recordedAt?: string }>>({});
  const [mapInstance, setMapInstance] = useState<any>(null);
  const mapRef = useRef<any>(null);
  const myMarkerRef = useRef<any>(null);
  const myRingRef = useRef<any>(null);

  const mappedEvents = useMemo<EventWithCity[]>(
    () =>
      events
        .map((eventItem) => {
          const city = findColombianCityByName(eventItem.city);

          if (!city) {
            return null;
          }

          return { event: eventItem, city };
        })
        .filter((eventItem): eventItem is EventWithCity => eventItem !== null),
    [events]
  );

  const mapCenter = useMemo<[number, number]>(() => {
    if (myLocation) {
      return myLocation;
    }

    if (mappedEvents.length > 0) {
      return [
        mappedEvents[0].city.region.latitude,
        mappedEvents[0].city.region.longitude,
      ];
    }

    return COLOMBIA_CENTER;
  }, [mappedEvents, myLocation]);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getEvents({ page: 1, limit: 100 });
      setEvents(response.data);
    } catch {
      setError('No fue posible cargar eventos para el mapa web.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      const resp = await getCampaigns(1, 100);
      setCampaigns(resp.data);
      setSelectedCampaignId((current) => current ?? resp.data[0]?.id ?? null);
    } catch {
      // ignore
    }
  }, []);

  const refreshEventsSilently = useCallback(async () => {
    try {
      const response = await getEvents({ page: 1, limit: 100 });
      setEvents(response.data);
    } catch {
      // Keep previous markers when a background refresh fails.
    }
  }, []);

  useEffect(() => {
    loadEvents();
    void loadCampaigns();
  }, [loadEvents]);

  useEffect(() => {
    const refreshId = setInterval(() => {
      void refreshEventsSilently();
    }, 3000);

    return () => {
      clearInterval(refreshId);
    };
  }, [refreshEventsSilently]);

  useEffect(() => {
    if (!hasWelcomeBanner) {
      return;
    }

    setShowDonorWelcome(true);

    const timeoutId = setTimeout(() => {
      setShowDonorWelcome(false);
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasWelcomeBanner]);

  useEffect(() => {
    if (!navigator?.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setMyLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        // Keep map usable without location permission.
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Campaign tracking (organizer)
  useEffect(() => {
    if (!selectedCampaignId) return;

    const auth = { token: (currentUser as any)?.accessToken, userId: (currentUser as any)?.id, role: (currentUser as any)?.role };
    const socket = connectTrackingSocket(auth);

    setTrackingSocketHandlers({
      onVolunteerSnapshot: (points) => {
        const next: Record<number, { lat: number; lng: number; shipmentId?: number; recordedAt?: string }> = {};

        for (const p of points) {
          if ((p as any).volunteerId) {
            next[(p as any).volunteerId] = { lat: p.lat, lng: p.lng, shipmentId: p.shipmentId, recordedAt: p.recordedAt };
          }
        }

        setVolunteerPoints(next);
      },
      onVolunteerLocation: (p) => {
        if (!(p as any).volunteerId) return;
        setVolunteerPoints((prev) => ({ ...prev, [(p as any).volunteerId]: { lat: p.lat, lng: p.lng, shipmentId: p.shipmentId, recordedAt: p.recordedAt } }));
      },
    });

    subscribeCampaignTracking(selectedCampaignId);

    return () => {
      try {
        unsubscribeCampaignTracking(selectedCampaignId);
      } catch {
        // noop
      }
    };
  }, [selectedCampaignId]);

  const centerOnMyLocation = () => {
    if (!myLocation || !mapInstance) return;
    try {
      mapInstance.setView(myLocation, 14, { animate: true });
      // Ensure marker and ring render on top after pan
      setTimeout(() => {
        try {
          myMarkerRef.current?.openPopup?.();
          myMarkerRef.current?.bringToFront?.();
          myRingRef.current?.bringToFront?.();
        } catch {}
      }, 300);
    } catch {
      // noop
    }
  };

  const myLocationIcon = useMemo(() => {
    try {
      return L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:34px;height:34px;transform:translate(-50%,-50%);">
            <div style="width:34px;height:34px;border-radius:50%;background:rgba(31,95,224,0.12);border:2px solid rgba(31,95,224,0.18);"></div>
            <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;background:#1f5fe0;border-radius:50%;box-shadow:0 0 8px rgba(31,95,224,0.8);"></div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
    } catch {
      return undefined as any;
    }
  }, []);

  // Helper component to expose the Leaflet map instance via react-leaflet's `useMap`
  const MapSetter = ({ onMapReady }: { onMapReady: (m: any) => void }) => {
    const map = useMap();
    useEffect(() => {
      if (map) onMapReady(map);
    }, [map, onMapReady]);
    return null;
  };

  return (
    <SafeAreaView className='flex-1 bg-[#eaf2ff]'>
      <View className='flex-1' style={{ paddingLeft: webPanelInset }}>
      <View className='flex-1 overflow-hidden rounded-t-3xl border border-[#d3e2ff]'>
        <MapContainer center={mapCenter} style={{ height: '100%', width: '100%' }} zoom={6}>
          <MapSetter onMapReady={setMapInstance} />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />

          {mappedEvents.map(({ event, city }) => (
            <CircleMarker
              center={[city.region.latitude, city.region.longitude]}
              key={event.id}
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

          {myLocation ? (
            <>
              {/* Ring to highlight area around user's exact point */}
              <CircleMarker
                ref={myRingRef}
                center={myLocation}
                key='my-location-ring'
                pathOptions={{ color: '#1f5fe0', fillColor: 'rgba(31,95,224,0.12)', fillOpacity: 0.5, weight: 2 }}
                radius={22}
              />

              {/* Exact location marker on top */}
              <Marker ref={myMarkerRef} position={myLocation} key='my-location' icon={myLocationIcon} zIndexOffset={2000}>
                <Popup>Tu ubicación exacta</Popup>
              </Marker>
            </>
          ) : null}

          {/* Volunteer markers */}
          {Object.entries(volunteerPoints).map(([vid, p]) => (
            <CircleMarker key={`vol-${vid}`} center={[p.lat, p.lng]} pathOptions={{ color: '#16a34a', fillColor: '#16a34a' }} radius={7}>
              <Popup>Voluntario {vid}{p.shipmentId ? ` — Envío #${p.shipmentId}` : ''}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Controles flotantes removidos por diseño: selector de campañas y botón 'Mi ubicación' */}
        {/* Re-introducir botón 'Mi ubicación' para web (visible para todos los roles) */}
        <div style={{ position: 'absolute', right: 20, bottom: 20, zIndex: 900 }}>
          <button
            onClick={centerOnMyLocation}
            disabled={!myLocation || !mapInstance}
            aria-label='Mi ubicación'
            style={{
              background: '#1f5fe0',
              color: '#fff',
              padding: '10px 14px',
              borderRadius: 999,
              border: 'none',
              boxShadow: '0 6px 18px rgba(15,38,88,0.24)',
              cursor: myLocation && mapInstance ? 'pointer' : 'not-allowed',
            }}
          >
            Mi ubicación
          </button>
        </div>

        {hasWelcomeBanner && showDonorWelcome ? (
          <View className='absolute left-3 right-3 top-3 rounded-2xl border border-[#d0def8] bg-white px-4 py-3'>
            <View className='flex-row items-center'>
              <View className='h-8 w-8 items-center justify-center rounded-full bg-[#eaf1ff]'>
                <MaterialIcons color='#1f5fe0' name={isVolunteer ? 'group' : 'volunteer-activism'} size={18} />
              </View>
              <View className='ml-3 flex-1'>
                <Text className='text-sm font-bold text-[#16325d]'>
                  {isVolunteer ? 'Bienvenido Voluntario' : 'Bienvenido Donante'}
                </Text>
                <Text className='text-xs text-[#5b7190]'>
                  {isVolunteer
                    ? 'Consulta los eventos activos en tiempo real para ubicar donde puedes apoyar.'
                    : 'Apoya campanas activas desde el mapa y sigue tus aportes.'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <View className='absolute left-0 right-0 items-center' style={{ top: hasWelcomeBanner && showDonorWelcome ? 86 : 12 }}>
            <View className='rounded-full bg-white px-4 py-2'>
              <ActivityIndicator color='#1f5fe0' size='small' />
            </View>
          </View>
        ) : null}

        {error ? (
          <View className='absolute left-3 right-3 rounded-xl bg-[#ffecef] px-3 py-2' style={{ top: hasWelcomeBanner && showDonorWelcome ? 86 : 12 }}>
            <Text className='text-sm text-[#a1263d]'>{error}</Text>
          </View>
        ) : null}
      </View>
      </View>

      {isDonor ? <DonorBottomTabs activeTab='inicio' /> : null}
      {isVolunteer && isWeb ? <DonorBottomTabs activeTab='mapa' /> : null}
    </SafeAreaView>
  );
}
