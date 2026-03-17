import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL = 'http://localhost:3001';
const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;
const EXPO_PUBLIC_NETWORK_DEBUG = process.env.EXPO_PUBLIC_NETWORK_DEBUG;

let hasLoggedApiBaseUrl = false;

function isNetworkDebugEnabled() {
  if (!EXPO_PUBLIC_NETWORK_DEBUG) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(EXPO_PUBLIC_NETWORK_DEBUG.trim().toLowerCase());
}

function logNetworkDebug(message: string, payload?: unknown) {
  if (!isNetworkDebugEnabled()) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[network] ${message}`, payload ?? '');
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

function getBrowserHost() {
  const location = (globalThis as { location?: { hostname?: string } }).location;
  return location?.hostname ?? null;
}

function resolveApiBaseUrl() {
  const configuredUrl = EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;

  try {
    const parsed = new URL(configuredUrl);
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

    if (!isLocalhost) {
      return configuredUrl;
    }

    if (Platform.OS === 'web') {
      const browserHost = getBrowserHost();

      if (browserHost && browserHost !== 'localhost' && browserHost !== '127.0.0.1') {
        parsed.hostname = browserHost;
        return parsed.toString().replace(/\/$/, '');
      }
    }

    const expoHostIp = getExpoHostIp();

    if (expoHostIp) {
      parsed.hostname = expoHostIp;
      return parsed.toString().replace(/\/$/, '');
    }

    if (Platform.OS === 'android') {
      parsed.hostname = '10.0.2.2';
      return parsed.toString().replace(/\/$/, '');
    }

    return configuredUrl;
  } catch {
    return configuredUrl;
  }
}

const API_BASE_URL =
  resolveApiBaseUrl();

if (!hasLoggedApiBaseUrl) {
  hasLoggedApiBaseUrl = true;
  logNetworkDebug('api base url resolved', {
    platform: Platform.OS,
    configured: EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL,
    resolved: API_BASE_URL,
  });
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  token?: string;
  body?: unknown;
};

export async function httpClient<T>(
  path: string,
  { method = 'GET', token, body }: RequestOptions = {}
): Promise<T> {
  const requestUrl = `${API_BASE_URL}${path}`;
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error(`Network request failed (${Platform.OS}) -> ${requestUrl}`);
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Unexpected API error (${response.status}) -> ${requestUrl}`);
  }

  return response.json() as Promise<T>;
}