import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';
import {
  type Auction,
  type AuctionBid,
  type AuctionStatus,
  getAuction,
  getAuctionBids,
  placeBid,
  startAuction,
} from '@/services/api/auctionsService';
import {
  connectRealtime,
  joinRealtimeRoom,
  leaveRealtimeRoom,
  onRealtime,
} from '@/services/realtime/realtimeService';

type BidPlacedEvent = {
  bidId: number;
  auctionId: number;
  userId: number;
  amount: number;
  previousPrice: number;
};

type AuctionClosedEvent = {
  auctionId: number;
  winnerId: number | null;
  winningAmount: number;
  currency: string;
};

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

function formatPrice(price: number | null, currency: string): string {
  if (price === null) return '–';
  return `${currency} ${price.toLocaleString('es-CO')}`;
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}
    >
      <Text style={{ fontSize: 13, color: '#6b7280' }}>{label}</Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: highlight ? '800' : '600',
          color: highlight ? '#1e73fa' : '#111f3c',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useAuthSession();
  const auctionId = Number(id);

  const [auction, setAuction] = useState<Auction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [isBidsLoading, setIsBidsLoading] = useState(false);

  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [bidAmount, setBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);

  const loadAuction = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getAuction(auctionId);
      setAuction(data);
    } catch (error) {
      setLoadError(`No se pudo cargar la subasta. ${getErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [auctionId]);

  const loadBids = useCallback(async () => {
    setIsBidsLoading(true);
    try {
      const data = await getAuctionBids(auctionId);
      setBids(data);
    } catch {
      // silently keep previous bids
    } finally {
      setIsBidsLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    loadAuction();
  }, [loadAuction]);

  // Connect to socket and load bids when auction is active
  useEffect(() => {
    if (auction?.status !== 'active') return;

    loadBids();

    if (currentUser) {
      connectRealtime({ userId: currentUser.id, role: currentUser.role });
    }

    const room = `auction:${auctionId}:bids`;
    joinRealtimeRoom(room);

    const offBidPlaced = onRealtime<BidPlacedEvent>('auction.bid.placed', (event) => {
      if (event.auctionId !== auctionId) return;

      const newBid: AuctionBid = {
        id: event.bidId,
        auctionId: event.auctionId,
        userId: event.userId,
        amount: event.amount,
        createdAt: new Date().toISOString(),
      };

      setBids((prev) => [newBid, ...prev]);
      setAuction((prev) =>
        prev ? { ...prev, currentPrice: event.amount } : prev
      );
    });

    const offAuctionClosed = onRealtime<AuctionClosedEvent>('auction.closed', (event) => {
      if (event.auctionId !== auctionId) return;

      setAuction((prev) =>
        prev
          ? {
              ...prev,
              status: 'closed',
              winnerId: event.winnerId,
              currentPrice: event.winningAmount,
            }
          : prev
      );
    });

    return () => {
      offBidPlaced();
      offAuctionClosed();
      leaveRealtimeRoom(room);
    };
  }, [auction?.status, auctionId, currentUser, loadBids]);

  const handleStart = async () => {
    setIsStarting(true);
    setStartError(null);
    try {
      const updated = await startAuction(auctionId, currentUser?.accessToken);
      setAuction(updated);
    } catch (error) {
      setStartError(`No se pudo iniciar la subasta. ${getErrorMessage(error)}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handlePlaceBid = async () => {
    if (!currentUser || !auction) return;
    const amount = parseFloat(bidAmount);

    if (isNaN(amount) || amount <= 0) {
      setBidError('Ingresa un monto válido mayor a 0.');
      return;
    }
    const currentBestPrice = auction.currentPrice ?? auction.initialPrice;
    if (amount <= currentBestPrice) {
      setBidError(`La oferta debe superar ${formatPrice(currentBestPrice, auction.currency)}.`);
      return;
    }

    setIsBidding(true);
    setBidError(null);

    try {
      await placeBid(
        auctionId,
        { userId: currentUser.id, amount },
        currentUser.accessToken
      );
      setBidAmount('');
    } catch (error) {
      setBidError(`No se pudo registrar la oferta. ${getErrorMessage(error)}`);
    } finally {
      setIsBidding(false);
    }
  };

  const cardStyle = {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#163457' as const,
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#f4f6fb' }}>
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: '#ebebeb',
            borderRadius: 14,
            padding: 10,
            marginRight: 14,
          }}
        >
          <FontAwesome5 color='#111f3c' name='arrow-left' size={16} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#111f3c' }}>
          Detalle de subasta
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Loading ── */}
        {isLoading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <ActivityIndicator color='#1e73fa' size='small' />
            <Text style={{ marginLeft: 8, fontSize: 13, color: '#50698e' }}>
              Cargando subasta...
            </Text>
          </View>
        ) : null}

        {/* ── Load error ── */}
        {loadError ? (
          <View
            style={{
              backgroundColor: '#ffecef',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginTop: 8,
            }}
          >
            <Text style={{ fontSize: 13, color: '#a0253c' }}>{loadError}</Text>
          </View>
        ) : null}

        {!isLoading && auction ? (
          <>
            {/* ── Info card ── */}
            <View style={{ ...cardStyle, marginTop: 4 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 20,
                    fontWeight: '900',
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
                    paddingHorizontal: 12,
                    paddingVertical: 5,
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

              {auction.description ? (
                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
                  {auction.description}
                </Text>
              ) : null}

              <InfoRow
                highlight
                label='Precio actual'
                value={formatPrice(
                  auction.currentPrice ?? auction.initialPrice,
                  auction.currency
                )}
              />
              <InfoRow
                label='Precio inicial'
                value={formatPrice(auction.initialPrice, auction.currency)}
              />
              <InfoRow label='Moneda' value={auction.currency} />
              <InfoRow label='Duración' value={`${auction.durationMinutes} minutos`} />
              <InfoRow label='Vendedor' value={`#${auction.sellerId}`} />
              {auction.startedAt ? (
                <InfoRow
                  label='Iniciada'
                  value={new Date(auction.startedAt).toLocaleString('es-CO')}
                />
              ) : null}
              {auction.endAt ? (
                <InfoRow
                  label='Finaliza'
                  value={new Date(auction.endAt).toLocaleString('es-CO')}
                />
              ) : null}
            </View>

            {/* ── Start auction (CREATED) ── */}
            {auction.status === 'created' ? (
              <View style={{ marginTop: 16 }}>
                {startError ? (
                  <View
                    style={{
                      backgroundColor: '#ffecef',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: '#a0253c' }}>{startError}</Text>
                  </View>
                ) : null}
                <Pressable
                  disabled={isStarting}
                  onPress={handleStart}
                  style={{
                    backgroundColor: '#16a34a',
                    borderRadius: 18,
                    paddingVertical: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                  }}
                >
                  {isStarting ? (
                    <ActivityIndicator color='#fff' size='small' />
                  ) : (
                    <>
                      <FontAwesome5
                        color='#fff'
                        name='play'
                        size={16}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                        Iniciar subasta
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}

            {/* ── Active: place bid + live bids ── */}
            {auction.status === 'active' ? (
              <View style={{ marginTop: 16, gap: 14 }}>
                {/* Place bid */}
                <View style={cardStyle}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: '#111f3c',
                      marginBottom: 4,
                    }}
                  >
                    Realizar oferta
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                    La oferta debe superar{' '}
                    {formatPrice(
                      auction.currentPrice ?? auction.initialPrice,
                      auction.currency
                    )}
                    .
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
                      fontSize: 15,
                    }}
                    keyboardType='numeric'
                    onChangeText={setBidAmount}
                    placeholder='Monto de la oferta'
                    placeholderTextColor='#8ea6c8'
                    value={bidAmount}
                  />
                  {bidError ? (
                    <Text
                      style={{
                        marginTop: 8,
                        backgroundColor: '#ffecef',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 13,
                        color: '#9f2238',
                      }}
                    >
                      {bidError}
                    </Text>
                  ) : null}
                  <Pressable
                    disabled={isBidding || !bidAmount.trim()}
                    onPress={handlePlaceBid}
                    style={{
                      marginTop: 12,
                      backgroundColor:
                        isBidding || !bidAmount.trim() ? '#9db8e5' : '#1f5fe0',
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: 'center',
                    }}
                  >
                    {isBidding ? (
                      <ActivityIndicator color='#fff' size='small' />
                    ) : (
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
                        Ofertar
                      </Text>
                    )}
                  </Pressable>
                </View>

                {/* Live bids */}
                <View style={cardStyle}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#16a34a',
                        marginRight: 8,
                      }}
                    />
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#111f3c' }}>
                      Ofertas en tiempo real
                    </Text>
                  </View>
                  {isBidsLoading ? (
                    <ActivityIndicator color='#1e73fa' size='small' />
                  ) : bids.length === 0 ? (
                    <Text style={{ fontSize: 13, color: '#9ca3af' }}>
                      Aun no hay ofertas registradas.
                    </Text>
                  ) : (
                    bids.map((bid, index) => (
                      <View
                        key={bid.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 10,
                          borderBottomWidth: index < bids.length - 1 ? 1 : 0,
                          borderBottomColor: '#f3f4f6',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View
                            style={{
                              backgroundColor: '#e8f0ff',
                              borderRadius: 10,
                              padding: 8,
                              marginRight: 10,
                            }}
                          >
                            <FontAwesome5 color='#1e73fa' name='user' size={12} />
                          </View>
                          <Text style={{ fontSize: 13, color: '#374151' }}>
                            Usuario #{bid.userId}
                          </Text>
                        </View>
                        <Text
                          style={{ fontSize: 15, fontWeight: '800', color: '#1f5fe0' }}
                        >
                          {auction.currency} {bid.amount.toLocaleString('es-CO')}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            ) : null}

            {/* ── Closed / Sold: winner ── */}
            {auction.status === 'closed' || auction.status === 'sold' ? (
              <View style={{ ...cardStyle, marginTop: 16 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 14,
                  }}
                >
                  <FontAwesome5
                    color='#92400e'
                    name='trophy'
                    size={18}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#111f3c' }}>
                    Resultado final
                  </Text>
                </View>
                {auction.winnerId ? (
                  <InfoRow highlight label='Ganador' value={`Usuario #${auction.winnerId}`} />
                ) : (
                  <InfoRow label='Ganador' value='Sin ganador registrado' />
                )}
                <InfoRow
                  highlight
                  label='Precio final'
                  value={formatPrice(
                    auction.currentPrice ?? auction.initialPrice,
                    auction.currency
                  )}
                />
                {auction.soldAt ? (
                  <InfoRow
                    label='Vendida el'
                    value={new Date(auction.soldAt).toLocaleString('es-CO')}
                  />
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
