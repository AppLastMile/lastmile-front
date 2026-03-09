import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { io, type Socket } from 'socket.io-client';

type RealtimeAuth = {
  token?: string;
  userId?: number;
  role?: string;
};

type RealtimeHandler<T = unknown> = (payload: T) => void;

let socket: Socket | null = null;

const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';

function getEnvValue(key: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[key];
}

function isTruthyEnv(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function getExpoHostIp() {
  const hostUri =
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig?.hostUri ??
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(':')[0] ?? null;
}

function getApiBaseUrl() {
  return getEnvValue('EXPO_PUBLIC_API_URL') ?? DEFAULT_API_BASE_URL;
}

function resolveWsBaseUrl() {
  const envWsUrl = getEnvValue('EXPO_PUBLIC_WS_URL');

  if (envWsUrl) {
    return envWsUrl;
  }

  const apiUrl = getApiBaseUrl();

  try {
    const parsed = new URL(apiUrl);
    parsed.pathname = '';

    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

    if (isLocalhost) {
      const expoHostIp = getExpoHostIp();

      if (expoHostIp) {
        parsed.hostname = expoHostIp;
      } else if (Platform.OS === 'android') {
        parsed.hostname = '10.0.2.2';
      }
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    return apiUrl;
  }
}

function resolveWsNamespace() {
  const configured = getEnvValue('EXPO_PUBLIC_WS_NAMESPACE')?.trim();

  if (!configured) {
    return '/ws';
  }

  if (!configured.startsWith('/')) {
    return `/${configured}`;
  }

  return configured;
}

function shouldAllowAnonymousWs() {
  return isTruthyEnv(getEnvValue('EXPO_PUBLIC_WS_ALLOW_ANONYMOUS'));
}

function isRealtimeDebugEnabled() {
  return isTruthyEnv(getEnvValue('EXPO_PUBLIC_WS_DEBUG'));
}

function logRealtimeDebug(message: string, payload?: unknown) {
  if (!isRealtimeDebugEnabled()) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[realtime] ${message}`, payload ?? '');
}

export function connectRealtime(auth: RealtimeAuth = {}) {
  if (socket?.connected) {
    return socket;
  }

  if (socket && !socket.connected) {
    socket.connect();
    return socket;
  }

  const anonymousMode = shouldAllowAnonymousWs();

  socket = io(`${resolveWsBaseUrl()}${resolveWsNamespace()}`, {
    autoConnect: true,
    transports: ['websocket'],
    auth: anonymousMode
      ? {}
      : {
          token: auth.token,
          userId: auth.userId,
          role: auth.role,
        },
  });

  socket.on('connect', () => {
    logRealtimeDebug('connected', { id: socket?.id, namespace: resolveWsNamespace() });
  });

  socket.on('connect_error', (error: unknown) => {
    logRealtimeDebug('connect_error', error);
  });

  socket.on('disconnect', (reason: unknown) => {
    logRealtimeDebug('disconnected', reason);
  });

  return socket;
}

export function disconnectRealtime() {
  if (!socket) {
    return;
  }

  socket.disconnect();
  socket = null;
}

export function isRealtimeConnected() {
  return Boolean(socket?.connected);
}

export function joinRealtimeRoom(room: string) {
  socket?.emit('system.join_room', { room });
  logRealtimeDebug('join room', room);
}

export function leaveRealtimeRoom(room: string) {
  socket?.emit('system.leave_room', { room });
  logRealtimeDebug('leave room', room);
}

export function emitRealtime<T>(event: string, payload: T) {
  socket?.emit(event, payload);
  logRealtimeDebug(`emit ${event}`, payload);
}

export function onRealtime<T = unknown>(event: string, handler: RealtimeHandler<T>) {
  const wrapped = (payload: T) => {
    logRealtimeDebug(`on ${event}`, payload);
    handler(payload);
  };

  socket?.on(event, wrapped as (...args: unknown[]) => void);

  return () => {
    socket?.off(event, wrapped as (...args: unknown[]) => void);
  };
}

export function emitChatSend(payload: { campaignId: number; message: string }) {
  emitRealtime('chat.send', payload);
}

export function onChatMessageCreated<T = unknown>(handler: RealtimeHandler<T>) {
  return onRealtime<T>('chat.message.created', handler);
}
