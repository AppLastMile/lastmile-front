import { Platform } from "react-native";

const API_BASE_URL = "http://192.168.1.7:3000";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  token?: string;
  body?: unknown;
};

export async function httpClient<T>(
  path: string,
  { method = "GET", token, body }: RequestOptions = {},
): Promise<T> {
  const requestUrl = `${API_BASE_URL}${path}`;

  // 🔥 DEBUG CLAVE
  console.log("🌐 Request:", method, requestUrl);

  try {
    const response = await fetch(requestUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // 🔥 DEBUG RESPONSE
    console.log("📡 Status:", response.status);

    if (!response.ok) {
      const message = await response.text();

      console.error("❌ API ERROR:", message);

      throw new Error(
        message || `HTTP ${response.status} -> ${requestUrl}`,
      );
    }

    return response.json() as Promise<T>;
  } catch (error: any) {
    console.error("❌ NETWORK ERROR FULL:", {
      message: error.message,
      url: requestUrl,
      platform: Platform.OS,
    });

    // 🔥 ERROR MÁS CLARO (IMPORTANTE)
    throw new Error(
      `No conecta con backend (${Platform.OS}) -> ${requestUrl}`,
    );
  }
}