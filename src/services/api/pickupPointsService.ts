import { httpClient } from "@/services/api/httpClient";

export async function getPickupPoints() {
  const res = await httpClient("/logistics/pickup-points");
  return res.data;
}