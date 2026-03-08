import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, { Marker, UrlTile, type Region } from 'react-native-maps';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  COLOMBIAN_CITIES,
  type ColombianCity,
} from '@/modules/missions/constants/colombianCities';
import { OrganizerBottomTabs } from '@/modules/organizer/components/OrganizerBottomTabs';

const COLOMBIA_REGION: Region = {
  latitude: 4.5709,
  longitude: -74.2973,
  latitudeDelta: 13,
  longitudeDelta: 13,
};

const FORM_GAP_ABOVE_TABS = 2;
const ORGANIZER_TABS_HEIGHT = 72;
const FORM_MIN_HEIGHT = 380;
const FORM_VERTICAL_MARGIN = 110;

export function CreateMissionScreen() {
  const mapRef = useRef<MapView | null>(null);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabsBottomOffset = Math.max(insets.bottom - 6, 6);
  const maxFormHeight = Math.max(
    FORM_MIN_HEIGHT,
    windowHeight - (tabsBottomOffset + ORGANIZER_TABS_HEIGHT + FORM_GAP_ABOVE_TABS + FORM_VERTICAL_MARGIN)
  );
  const [isEventMenuOpen, setIsEventMenuOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [selectedCity, setSelectedCity] = useState<ColombianCity | null>(null);
  const [createdEventLabel, setCreatedEventLabel] = useState('');
  const [formContentHeight, setFormContentHeight] = useState(FORM_MIN_HEIGHT);

  const canCreateEvent = useMemo(
    () => eventName.trim().length > 2 && Boolean(selectedCity),
    [eventName, selectedCity]
  );

  const panelHeight = Math.min(Math.max(formContentHeight + 16, FORM_MIN_HEIGHT), maxFormHeight);
  const shouldEnableScroll = formContentHeight + 16 > maxFormHeight;

  const handleSelectCity = (city: ColombianCity) => {
    setSelectedCity(city);
    setIsCitySelectorOpen(false);
    mapRef.current?.animateToRegion(city.region, 700);
  };

  const handleCreateEvent = () => {
    if (!selectedCity) {
      return;
    }

    const label = `${eventName.trim()} - ${selectedCity.name}`;
    setCreatedEventLabel(label);
    setEventDescription('');
    setIsCreateEventOpen(false);
    setIsEventMenuOpen(false);
    mapRef.current?.animateToRegion(selectedCity.region, 700);
  };

  return (
    <SafeAreaView className='flex-1 bg-[#dce9f5]'>
      <MapView initialRegion={COLOMBIA_REGION} ref={mapRef} style={{ flex: 1 }}>
        <UrlTile
          maximumZ={19}
          urlTemplate='https://tile.openstreetmap.org/{z}/{x}/{y}.png'
          zIndex={-1}
        />
        {selectedCity ? (
          <Marker
            coordinate={{
              latitude: selectedCity.region.latitude,
              longitude: selectedCity.region.longitude,
            }}
            description={eventDescription.trim() || eventName.trim() || 'Evento pendiente'}
            title={selectedCity.name}
          />
        ) : null}
      </MapView>

      {createdEventLabel ? (
        <Animated.View
          className='absolute left-5 right-5 top-24 rounded-xl bg-[#183e80] px-4 py-3'
          entering={FadeInUp.duration(350)}
          layout={Layout.springify()}
        >
          <Text className='text-sm font-semibold text-white'>Evento creado: {createdEventLabel}</Text>
        </Animated.View>
      ) : null}

      <View
        className='absolute left-4 items-start'
        style={{ top: insets.top + 16, zIndex: 70, elevation: 70 }}
      >
        <Pressable
          className='h-16 w-16 items-center justify-center rounded-full bg-[#d63c4c]'
          onPress={() => setIsEventMenuOpen((current) => !current)}
        >
          <MaterialIcons color='#fff' name='warning' size={28} />
        </Pressable>

        {isEventMenuOpen ? (
          <Animated.View
            className='mt-3 w-64 rounded-2xl border border-[#d8e7ff] bg-white p-3'
            entering={FadeInDown.duration(260)}
            layout={Layout.springify()}
          >
            <Pressable
              className='flex-row items-center rounded-xl bg-[#f4f8ff] px-3 py-3'
              onPress={() => setIsCreateEventOpen((current) => !current)}
            >
              <MaterialIcons color='#2f68d8' name='warning-amber' size={20} />
              <Text className='ml-2 text-sm font-semibold text-[#1d3357]'>
                Crear Evento (Desastre)
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>

      {isCreateEventOpen ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className='absolute bottom-0 left-0 right-0'
          style={{
            bottom: tabsBottomOffset + ORGANIZER_TABS_HEIGHT + FORM_GAP_ABOVE_TABS,
            zIndex: 45,
            elevation: 45,
          }}
        >
          <Animated.View
            className='rounded-3xl border border-[#d5e3fb] bg-white px-5 pt-5'
            entering={FadeInUp.duration(300)}
            layout={Layout.springify()}
            style={{ height: panelHeight }}
          >
            <ScrollView
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps='handled'
              onContentSizeChange={(_, contentHeight) => {
                setFormContentHeight(contentHeight);
              }}
              scrollEnabled={shouldEnableScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text className='text-lg font-extrabold text-[#14243f]'>Crear Evento De Desastre Natural</Text>
              <Text className='mt-1 text-sm text-[#5f7396]'>
                Registra rapidamente el incidente y ubicalo en una ciudad de Colombia.
              </Text>

              <Text className='mt-4 mb-2 text-sm font-semibold text-[#233b61]'>Nombre Del Evento</Text>
              <TextInput
                className='rounded-xl border border-[#cfe0fb] bg-[#f8fbff] px-4 py-3 text-[#13274a]'
                onChangeText={setEventName}
                placeholder='Ej: Inundacion por lluvias intensas'
                placeholderTextColor='#8ba2c3'
                value={eventName}
              />

              <Text className='mt-4 mb-2 text-sm font-semibold text-[#233b61]'>Descripcion</Text>
              <TextInput
                className='rounded-xl border border-[#cfe0fb] bg-[#f8fbff] px-4 py-3 text-[#13274a]'
                multiline
                numberOfLines={4}
                onChangeText={setEventDescription}
                placeholder='Ej: Desbordamiento del rio por lluvias continuas en la zona norte.'
                placeholderTextColor='#8ba2c3'
                style={{ minHeight: 96, textAlignVertical: 'top' }}
                value={eventDescription}
              />

              <Text className='mt-4 mb-2 text-sm font-semibold text-[#233b61]'>Ciudad</Text>
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
                      onPress={() => handleSelectCity(city)}
                    >
                      <Text className='text-[#20375d]'>{city.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              <View className='mt-6 flex-row items-center justify-between'>
                <Pressable
                  className='rounded-xl border border-[#d3def3] px-4 py-3'
                  onPress={() => setIsCreateEventOpen(false)}
                >
                  <Text className='font-semibold text-[#3a5176]'>Cancelar</Text>
                </Pressable>
                <Pressable
                  className={`rounded-xl px-5 py-3 ${
                    canCreateEvent ? 'bg-[#1f5fe0]' : 'bg-[#9db8e5]'
                  }`}
                  disabled={!canCreateEvent}
                  onPress={handleCreateEvent}
                >
                  <Text className='font-semibold text-white'>Crear Evento</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      ) : null}

      <OrganizerBottomTabs activeTab='inicio' />
    </SafeAreaView>
  );
}