import { apiClient } from "@/services/api/apiClient";

export async function getPickupPoints(campaignId: string) {
  const response = await apiClient.get(
    `/campaigns/${campaignId}/pickup-points`,
  );
  return response.data;
}
