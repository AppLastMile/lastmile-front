import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';

function getExpoHostIp() {
  const hostUri =
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig?.hostUri ??
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(':')[0] ?? null;
}

function resolveApiBaseUrl() {
  const configuredUrl =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      ?.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;

  try {
    const parsed = new URL(configuredUrl);
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

    if (!isLocalhost) {
      return configuredUrl;
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Unexpected API error');
  }

  return response.json() as Promise<T>;
}