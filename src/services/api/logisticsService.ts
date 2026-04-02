import type { PaginatedResponse } from "@/types/pagination";

import { httpClient } from "./httpClient";

// =====================
// TYPES
// =====================

export type PickupPoint = {
  id: number;
  name: string;
  address: string;
  city: string;
  eventId: number;
  latitude?: number;
  longitude?: number;
};

export type CreatePickupPointPayload = {
  name: string;
  address: string;
  city: string;
  eventId: number;
};

export type ShipmentStatus =
  | "pending"
  | "assigned"
  | "in_transit"
  | "delivered";

export type Shipment = {
  id: number;
  campaignId?: number;
  pickupPointId?: number;
  eventId?: number;
  assignedVolunteerId?: number | null;
  status: ShipmentStatus;
  createdAt?: string;
};

// =====================
// PICKUP POINTS
// =====================

export async function getPickupPoints(page = 1, limit = 100) {
  return httpClient<PaginatedResponse<PickupPoint>>(
    `/logistics/pickup-points?page=${page}&limit=${limit}`,
  );
}

export async function createPickupPoint(payload: CreatePickupPointPayload) {
  return httpClient<PickupPoint>("/logistics/pickup-points", {
    method: "POST",
    body: payload,
  });
}

// =====================
// SHIPMENTS
// =====================

// 🔹 Obtener todos los shipments
export async function getShipments(page = 1, limit = 100) {
  return httpClient<PaginatedResponse<Shipment>>(
    `/logistics/shipments?page=${page}&limit=${limit}`,
  );
}

export async function getVolunteerShipments(
  volunteerId: number,
  page = 1,
  limit = 100,
) {
  return httpClient<PaginatedResponse<Shipment>>(
    `/logistics/shipments?assignedVolunteerId=${volunteerId}&page=${page}&limit=${limit}`,
  );
}

export async function assignShipmentVolunteer(
  shipmentId: number,
  volunteerId: number,
) {
  return httpClient<Shipment>(
    `/logistics/shipments/${shipmentId}/assign-volunteer`,
    {
      method: "PATCH",
      body: { volunteerId },
    },
  );
}

export async function updateShipmentStatus(
  shipmentId: number,
  status: ShipmentStatus,
) {
  return httpClient<Shipment>(`/logistics/shipments/${shipmentId}/status`, {
    method: "PATCH",
    body: { status },
  });
}
