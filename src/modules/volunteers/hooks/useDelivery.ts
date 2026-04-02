import { useState } from "react";
import {
  getVolunteerShipments,
  updateShipmentStatus,
  Shipment,
} from "@/services/api/logisticsService";

export function useDelivery(volunteerId: number) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadShipments = async () => {
    try {
      setLoading(true);
      const res = await getVolunteerShipments(volunteerId);
      setShipments(res.data);
    } catch (error) {
      console.error("Error loading shipments:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsDelivered = async (shipmentId: number) => {
    try {
      await updateShipmentStatus(shipmentId, "delivered");

      // actualizar UI sin recargar
      setShipments((prev) =>
        prev.map((s) =>
          s.id === shipmentId ? { ...s, status: "delivered" } : s,
        ),
      );
    } catch (error) {
      console.error("Error updating shipment:", error);
    }
  };

  return {
    shipments,
    loading,
    loadShipments,
    markAsDelivered,
  };
}
