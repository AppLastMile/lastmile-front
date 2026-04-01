import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';
import { DonorBottomTabs } from '@/modules/donor/components/DonorBottomTabs';
import { OrganizerBottomTabs } from '@/modules/organizer/components/OrganizerBottomTabs';
import {
  type Auction,
  type AuctionBidMode,
  type AuctionStatus,
  createAuction,
  getAuctions,
} from '@/services/api/auctionsService';

const STATUS_LABEL: Record<AuctionStatus, string> = {
  created: 'CREADA',
  active: 'ACTIVA',
  closed: 'CERRADA',
  sold: 'VENDIDA',
  cancelled: 'CANCELADA',
};

const STATUS_BG: Record<AuctionStatus, string> = {
  created: '#dce8ff',
  active: '#d1fae5',
  closed: '#f3f4f6',
  sold: '#fff3cd',
  cancelled: '#fee2e2',
};

const STATUS_FG: Record<AuctionStatus, string> = {
  created: '#1e40af',
  active: '#065f46',
  closed: '#4b5563',
  sold: '#92400e',
  cancelled: '#991b1b',
};

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Error desconocido.';
  const rawMessage = error.message?.trim();
  if (!rawMessage) return 'Error desconocido.';
  try {
    const parsed = JSON.parse(rawMessage) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(' | ');
    if (typeof parsed.message === 'string') return parsed.message;
    return rawMessage;
  } catch {
    return rawMessage;
  }
}

function formatTimeRemaining(endAt: string | null): string {
  if (!endAt) return '–';
  const diff = new Date(endAt).getTime() - Date.now();
  if (diff <= 0) return 'Finalizada';
  const totalMins = Math.floor(diff / 60000);
  if (totalMins < 60) return `${totalMins} min`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs}h ${mins}m`;
}

function formatPrice(price: number | null, currency: string): string {
  if (price === null) return '–';
  return `${currency} ${price.toLocaleString('es-CO')}`;
}

export function AuctionsListScreen() {
  const router = useRouter();
  const { currentUser } = useAuthSession();
  const isOrganizer = currentUser?.role === 'organizer';
  const isDonor = currentUser?.role === 'donor';

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [productId, setProductId] = useState('');
  const [initialPrice, setInitialPrice] = useState('');
  const [currency, setCurrency] = useState<'COP' | 'USD'>('COP');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [campaignId, setCampaignId] = useState('');
  const [bidMode, setBidMode] = useState<AuctionBidMode>('free');
  const [bidIncrement, setBidIncrement] = useState('');

  const fetchAuctions = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await getAuctions();
      setAuctions(response.data);
    } catch (error) {
      setLoadError(`No se pudieron cargar las subastas. ${getErrorMessage(error)}`);
    }
  }, []);

  const initialLoad = useCallback(async () => {
    setIsLoading(true);
    await fetchAuctions();
    setIsLoading(false);
  }, [fetchAuctions]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAuctions();
    setIsRefreshing(false);
  }, [fetchAuctions]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  const handleOpenCreate = () => {
    setFormError(null);
    setProductId('');
    setInitialPrice('');
    setCurrency('COP');
    setDurationMinutes('60');
    setCampaignId('');
    setBidMode('free');
    setBidIncrement('');
    setIsCreateOpen(true);
  };

  const canSubmit =
    productId.trim().length > 0 &&
    initialPrice.trim().length > 0 &&
    durationMinutes.trim().length > 0 &&
    (bidMode === 'free' || bidIncrement.trim().length > 0) &&
    !isSubmitting;

  const handleSubmit = async () => {
    const parsedProductId = parseInt(productId, 10);
    const parsedInitialPrice = parseFloat(initialPrice);
    const parsedDuration = parseInt(durationMinutes, 10);
    const parsedCampaignId = campaignId.trim() ? parseInt(campaignId, 10) : undefined;

    if (isNaN(parsedProductId) || parsedProductId <= 0) {
      setFormError('El ID del producto debe ser un número válido mayor a 0.');
      return;
    }
    if (isNaN(parsedInitialPrice) || parsedInitialPrice <= 0) {
      setFormError('El precio inicial debe ser un número mayor a 0.');
      return;
    }
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      setFormError('La duración debe ser un número de minutos mayor a 0.');
      return;
    }

    let parsedBidIncrement: number | undefined;
    if (bidMode === 'fixed_increment') {
      parsedBidIncrement = parseFloat(bidIncrement);
      if (isNaN(parsedBidIncrement) || parsedBidIncrement <= 0) {
        setFormError('El incremento de puja debe ser un número mayor a 0.');
        return;
      }
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const created = await createAuction(
        {
          productId: parsedProductId,
          initialPrice: parsedInitialPrice,
          durationMinutes: parsedDuration,
          currency,
          campaignId: parsedCampaignId,
          bidMode,
          bidIncrement: parsedBidIncrement,
        },
        currentUser?.accessToken
      );

      setAuctions((prev) => [created, ...prev]);
      setIsCreateOpen(false);
    } catch (error) {
      setFormError(`No se pudo crear la subasta. ${getErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#f4f6fb' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1e73fa']}
            tintColor='#1e73fa'
          />
        }
      >
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                backgroundColor: '#dce8ff',
                borderRadius: 16,
                padding: 12,
                marginRight: 12,
              }}
            >
              <FontAwesome5 color='#1e73fa' name='gavel' size={22} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#111f3c' }}>Subastas</Text>
          </View>
          {isOrganizer ? (
            <Pressable
              onPress={handleOpenCreate}
              style={{
                backgroundColor: '#1e73fa',
                borderRadius: 16,
                width: 46,
                height: 46,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesome5 color='#fff' name='plus' size={18} />
            </Pressable>
          ) : null}
        </View>

        {/* ── Loading ── */}
        {isLoading ? (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}
          >
            <ActivityIndicator color='#1e73fa' size='small' />
            <Text style={{ marginLeft: 8, fontSize: 13, color: '#50698e' }}>
              Cargando subastas...
            </Text>
          </View>
        ) : null}

        {/* ── Error ── */}
        {loadError ? (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 12,
              backgroundColor: '#ffecef',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontSize: 13, color: '#a0253c' }}>{loadError}</Text>
          </View>
        ) : null}

        {/* ── Auction list ── */}
        {!isLoading ? (
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {auctions.length === 0 ? (
              <View
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 20,
                  padding: 28,
                  alignItems: 'center',
                  shadowColor: '#163457',
                  shadowOpacity: 0.07,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 10,
                  elevation: 3,
                }}
              >
                <FontAwesome5 color='#c5d3e8' name='gavel' size={40} />
                <Text
                  style={{ marginTop: 14, fontSize: 15, fontWeight: '700', color: '#5d7399' }}
                >
                  No hay subastas registradas.
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 13,
                    color: '#9db8d4',
                    textAlign: 'center',
                  }}
                >
                  {isOrganizer
                    ? 'Presiona "+" para crear la primera subasta.'
                    : 'Espera que el organizador registre una nueva campaña.'}
                </Text>
              </View>
            ) : (
              auctions.map((auction, index) => (
                <Animated.View
                  entering={FadeInUp.delay(index * 45).duration(240)}
                  key={auction.id}
                >
                  <Pressable
                    onPress={() =>
                      router.push(`/organizer/auctions/${auction.id}` as never)
                    }
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: 20,
                      padding: 18,
                      shadowColor: '#163457',
                      shadowOpacity: 0.07,
                      shadowOffset: { width: 0, height: 4 },
                      shadowRadius: 10,
                      elevation: 3,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 16,
                          fontWeight: '800',
                          color: '#111f3c',
                          flex: 1,
                          marginRight: 10,
                        }}
                      >
                        {auction.itemName}
                      </Text>
                      <View
                        style={{
                          backgroundColor: STATUS_BG[auction.status],
                          borderRadius: 999,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: STATUS_FG[auction.status],
                            letterSpacing: 0.5,
                          }}
                        >
                          {STATUS_LABEL[auction.status]}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={{
                        marginTop: 8,
                        fontSize: 18,
                        fontWeight: '900',
                        color: '#1e73fa',
                      }}
                    >
                      {formatPrice(
                        auction.currentPrice ?? auction.initialPrice,
                        auction.currency
                      )}
                    </Text>

                    <View style={{ marginTop: 8, flexDirection: 'row', gap: 16 }}>
                      {auction.endAt ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <FontAwesome5 color='#9ca3af' name='clock' size={11} />
                          <Text style={{ marginLeft: 4, fontSize: 12, color: '#6b7280' }}>
                            {formatTimeRemaining(auction.endAt)}
                          </Text>
                        </View>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <FontAwesome5 color='#9ca3af' name='tag' size={11} />
                        <Text style={{ marginLeft: 4, fontSize: 12, color: '#6b7280' }}>
                          #{auction.id}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* ── Create auction modal (organizer only) ── */}
      <Modal animationType='slide' transparent visible={isOrganizer && isCreateOpen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View
            style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#07163166' }}
          >
            <View
              style={{
                maxHeight: '88%',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                backgroundColor: '#fff',
                paddingHorizontal: 20,
                paddingTop: 20,
              }}
            >
              <ScrollView
                contentContainerStyle={{ paddingBottom: 28 }}
                keyboardShouldPersistTaps='handled'
                showsVerticalScrollIndicator={false}
              >
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#17315c' }}>
                  Crear subasta
                </Text>

                <Text
                  style={{
                    marginTop: 16,
                    marginBottom: 4,
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#27436d',
                  }}
                >
                  ID del producto *
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#d3e2fb',
                    borderRadius: 14,
                    backgroundColor: '#f8fbff',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: '#18335f',
                  }}
                  keyboardType='number-pad'
                  onChangeText={setProductId}
                  placeholder='Ej: 1'
                  placeholderTextColor='#8ea6c8'
                  value={productId}
                />

                <Text
                  style={{
                    marginTop: 12,
                    marginBottom: 4,
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#27436d',
                  }}
                >
                  Precio inicial *
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#d3e2fb',
                    borderRadius: 14,
                    backgroundColor: '#f8fbff',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: '#18335f',
                  }}
                  keyboardType='numeric'
                  onChangeText={setInitialPrice}
                  placeholder='Ej: 50000'
                  placeholderTextColor='#8ea6c8'
                  value={initialPrice}
                />

                <Text
                  style={{
                    marginTop: 12,
                    marginBottom: 8,
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#27436d',
                  }}
                >
                  Moneda
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(['COP', 'USD'] as const).map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setCurrency(c)}
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderRadius: 14,
                        paddingVertical: 12,
                        alignItems: 'center',
                        borderColor: currency === c ? '#1f5fe0' : '#d6e3fb',
                        backgroundColor: currency === c ? '#e8f0ff' : '#fff',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: currency === c ? '#1f4fb6' : '#4a6083',
                        }}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text
                  style={{
                    marginTop: 12,
                    marginBottom: 4,
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#27436d',
                  }}
                >
                  Duración (minutos) *
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#d3e2fb',
                    borderRadius: 14,
                    backgroundColor: '#f8fbff',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: '#18335f',
                  }}
                  keyboardType='number-pad'
                  onChangeText={setDurationMinutes}
                  placeholder='60'
                  placeholderTextColor='#8ea6c8'
                  value={durationMinutes}
                />

                <Text
                  style={{
                    marginTop: 12,
                    marginBottom: 4,
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#27436d',
                  }}
                >
                  ID de campana (opcional)
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#d3e2fb',
                    borderRadius: 14,
                    backgroundColor: '#f8fbff',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: '#18335f',
                  }}
                  keyboardType='number-pad'
                  onChangeText={setCampaignId}
                  placeholder='Ej: 3'
                  placeholderTextColor='#8ea6c8'
                  value={campaignId}
                />

                <Text
                  style={{
                    marginTop: 12,
                    marginBottom: 8,
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#27436d',
                  }}
                >
                  Modo de puja
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {([
                    { value: 'free' as AuctionBidMode, label: 'Puja libre' },
                    { value: 'fixed_increment' as AuctionBidMode, label: 'Incremento fijo' },
                  ]).map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setBidMode(option.value)}
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderRadius: 14,
                        paddingVertical: 12,
                        alignItems: 'center',
                        borderColor: bidMode === option.value ? '#1f5fe0' : '#d6e3fb',
                        backgroundColor: bidMode === option.value ? '#e8f0ff' : '#fff',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: bidMode === option.value ? '#1f4fb6' : '#4a6083',
                        }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {bidMode === 'fixed_increment' ? (
                  <>
                    <Text
                      style={{
                        marginTop: 12,
                        marginBottom: 4,
                        fontSize: 13,
                        fontWeight: '700',
                        color: '#27436d',
                      }}
                    >
                      Incremento por puja *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#d3e2fb',
                        borderRadius: 14,
                        backgroundColor: '#f8fbff',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        color: '#18335f',
                      }}
                      keyboardType='numeric'
                      onChangeText={setBidIncrement}
                      placeholder='Ej: 5000'
                      placeholderTextColor='#8ea6c8'
                      value={bidIncrement}
                    />
                  </>
                ) : null}

                {formError ? (
                  <Text
                    style={{
                      marginTop: 10,
                      backgroundColor: '#ffecef',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 13,
                      color: '#9f2238',
                    }}
                  >
                    {formError}
                  </Text>
                ) : null}

                <View
                  style={{
                    marginTop: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Pressable
                    onPress={() => setIsCreateOpen(false)}
                    style={{
                      borderWidth: 1,
                      borderColor: '#d3def3',
                      borderRadius: 14,
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                    }}
                  >
                    <Text style={{ fontWeight: '700', color: '#3a5176' }}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    disabled={!canSubmit}
                    onPress={handleSubmit}
                    style={{
                      borderRadius: 14,
                      paddingHorizontal: 22,
                      paddingVertical: 12,
                      backgroundColor: canSubmit ? '#1f5fe0' : '#9db8e5',
                    }}
                  >
                    <Text style={{ fontWeight: '700', color: '#fff' }}>
                      {isSubmitting ? 'Creando...' : 'Crear subasta'}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {isOrganizer ? <OrganizerBottomTabs activeTab='subastas' /> : null}
      {isDonor ? <DonorBottomTabs activeTab='subastas' /> : null}
    </SafeAreaView>
  );
}
