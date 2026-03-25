import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { io, type Socket } from 'socket.io-client';

import type { ShipmentLocationPoint } from '@/services/api/trackingApi';

type TrackingAuth = {
  token?: string;
  userId?: number;
  role?: string;
};

type PickupPoint = {
  id: string;
  campaignId: string;
  latitude: number;
  longitude: number;
  name: string;
  description?: string;
};

type PickupPointHandler = (point: PickupPoint) => void;

type TrackingConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

type TrackingStatusHandler = (status: TrackingConnectionStatus) => void;
type TrackingLocationHandler = (payload: ShipmentLocationPoint) => void;
type TrackingErrorHandler = (message: string) => void;

type TrackingHandlers = {
  onStatus?: TrackingStatusHandler;
  onLocation?: TrackingLocationHandler;
  onError?: TrackingErrorHandler;
  onPickupPointCreated?: PickupPointHandler;
};

type KnownEnvKey =
  | 'EXPO_PUBLIC_API_URL'
  | 'EXPO_PUBLIC_WS_URL'
  | 'EXPO_PUBLIC_WS_NAMESPACE'
  | 'EXPO_PUBLIC_WS_PATH';

const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';
const DEFAULT_WS_NAMESPACE = '/ws';
const DEFAULT_WS_PATH = '/socket.io';

const ENV: Record<KnownEnvKey, string | undefined> = {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WS_URL,
  EXPO_PUBLIC_WS_NAMESPACE: process.env.EXPO_PUBLIC_WS_NAMESPACE,
  EXPO_PUBLIC_WS_PATH: process.env.EXPO_PUBLIC_WS_PATH,
};

let socket: Socket | null = null;
let activeCampaignId: string | null = null;
let activeShipmentId: number | null = null;
let handlers: TrackingHandlers = {};


// ================= HELPERS =================

function getEnv(key: KnownEnvKey) {
  return ENV[key];
}

function getExpoHostIp() {
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ??
    (Constants as any)?.expoGoConfig?.debuggerHost;

  return hostUri ? hostUri.split(':')[0] : null;
}

function resolveWsBaseUrl() {
  const envUrl = getEnv('EXPO_PUBLIC_WS_URL');

  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      parsed.pathname = '';

      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1'
      ) {
        if (Platform.OS !== 'web') {
          parsed.hostname =
            getExpoHostIp() ??
            (Platform.OS === 'android' ? '10.0.2.2' : parsed.hostname);
        }
      }

      return parsed.toString().replace(/\/$/, '');
    } catch {
      return envUrl;
    }
  }

  return getEnv('EXPO_PUBLIC_API_URL') ?? DEFAULT_API_BASE_URL;
}

function resolveWsNamespace() {
  const ns = getEnv('EXPO_PUBLIC_WS_NAMESPACE');
  if (!ns) return DEFAULT_WS_NAMESPACE;
  return ns.startsWith('/') ? ns : `/${ns}`;
}

function resolveWsPath() {
  const p = getEnv('EXPO_PUBLIC_WS_PATH');
  if (!p) return DEFAULT_WS_PATH;
  return p.startsWith('/') ? p : `/${p}`;
}


// ================= CORE =================

function setStatus(status: TrackingConnectionStatus) {
  handlers.onStatus?.(status);
}

function subscribeShipmentIfNeeded() {
  if (socket?.connected && activeShipmentId) {
    socket.emit('shipment.subscribe', { shipmentId: activeShipmentId });
  }
}

function subscribeCampaignIfNeeded() {
  if (socket?.connected && activeCampaignId) {
    socket.emit('campaign.subscribe', { campaignId: activeCampaignId });
  }
}


// ================= PUBLIC =================

export function subscribeCampaign(campaignId: string) {
  activeCampaignId = campaignId;
  subscribeCampaignIfNeeded();
}

export function connectTrackingSocket(
  auth: TrackingAuth = {},
  nextHandlers: TrackingHandlers = {}
) {
  handlers = { ...handlers, ...nextHandlers };

  // 🔥 ya conectado
  if (socket?.connected) {
    return socket;
  }

  // 🔥 reconectar
  if (socket && !socket.connected) {
    socket.connect();
    return socket;
  }

  // 🔥 crear socket
  socket = io(`${resolveWsBaseUrl()}${resolveWsNamespace()}`, {
    path: resolveWsPath(),
    transports: ['websocket', 'polling'],
    auth,
    reconnection: true,
  });

  // ================= CONNECTION =================

  socket.on('connect', () => {
    setStatus('connected');

    subscribeShipmentIfNeeded();
    subscribeCampaignIfNeeded(); // 🔥 clave
  });

  socket.on('disconnect', () => {
    setStatus('disconnected');
  });

  socket.on('connect_error', () => {
    setStatus('error');
    handlers.onError?.('Error conectando WebSocket');
  });

  // ================= TRACKING =================

  socket.off('shipment.location.changed');
  socket.on('shipment.location.changed', (payload: ShipmentLocationPoint) => {
    handlers.onLocation?.(payload);
  });

  // ================= PICKUP POINTS =================

  socket.off('pickup_point.created'); // 🔥 evita duplicados

  socket.on('pickup_point.created', (payload: PickupPoint) => {
    if (!payload?.id) return;

    handlers.onPickupPointCreated?.(payload);
  });

  return socket;
}


// ================= HANDLERS =================

export function setTrackingSocketHandlers(nextHandlers: TrackingHandlers) {
  handlers = { ...handlers, ...nextHandlers };
}


// ================= CLEANUP =================

export function disconnectTrackingSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();

  socket = null;
  activeCampaignId = null;
  activeShipmentId = null;
  handlers = {};
}