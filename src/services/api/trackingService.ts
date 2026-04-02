import { httpClient } from "./httpClient";

export async function sendLocation(
  shipmentId: number,
  lat: number,
  lng: number,
  userId: string,
) {
  return httpClient(`/logistics/shipments/${shipmentId}/location`, {
    method: "POST",
    body: {
      lat,
      lng,
      userId,
    },
  });
}
