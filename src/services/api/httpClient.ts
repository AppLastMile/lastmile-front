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

  // 🔍 DEBUG (puedes quitarlo después)
  console.log("🌐 Request URL:", requestUrl);

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    console.error("❌ Network error:", error);
    throw new Error(`Network request failed (${Platform.OS}) -> ${requestUrl}`);
  }

  if (!response.ok) {
    const message = await response.text();
    console.error("❌ API error:", message);
    throw new Error(
      message || `Unexpected API error (${response.status}) -> ${requestUrl}`,
    );
  }

  return response.json() as Promise<T>;
}
