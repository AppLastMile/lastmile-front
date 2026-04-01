import { AppScreen } from "@/components/ui/AppScreen";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useRealtimeMissions } from "../hooks/useRealtimeMissions";

import {
  getVolunteerShipments,
  updateShipmentStatus,
  type Shipment,
  getPickupPoints,
  type PickupPoint,
} from "@/services/api/logisticsService";

export function MissionsScreen() {
  const router = useRouter();
  const volunteerId = 10;

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // =========================
  // 🔥 LOAD INICIAL
  // =========================
  const loadData = async () => {
    try {
      const [shipmentsRes, pointsRes] = await Promise.all([
        getVolunteerShipments(volunteerId),
        getPickupPoints(),
      ]);

      setShipments(shipmentsRes.data);
      setPickupPoints(pointsRes.data);
    } catch (e) {
      console.log("Error cargando data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // 🔥 REALTIME (CLAVE)
  // =========================
  useRealtimeMissions((updatedShipment) => {
    setShipments((prev) => {
      const exists = prev.find((s) => s.id === updatedShipment.id);

      // 🔥 si no existe, lo agregamos (nueva misión)
      if (!exists) {
        return [updatedShipment, ...prev];
      }

      // 🔥 si existe, lo actualizamos
      return prev.map((s) =>
        s.id === updatedShipment.id ? updatedShipment : s,
      );
    });
  });

  // =========================
  // HELPERS
  // =========================
  const getPointInfo = (id?: number) => {
    const point = pickupPoints.find((p) => p.id === id);
    if (!point) return "Punto desconocido";

    return `${point.name} · ${point.city}`;
  };

  const goToMap = (shipment: Shipment) => {
    router.push({
      pathname: "/map",
      params: {
        shipmentId: shipment.id.toString(),
        pickupPointId: shipment.pickupPointId?.toString(),
      },
    });
  };

  const goToDetail = (shipment: Shipment) => {
    router.push(`/missions/${shipment.id}`);
  };

  const deliverShipment = async (id: number) => {
    try {
      setUpdatingId(id);

      await updateShipmentStatus(id, "delivered");

      // 🔥 actualización optimista
      setShipments((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "delivered" } : s)),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // =========================
  // FILTROS
  // =========================
  const available = shipments.filter((s) => s.status === "pending");

  const active = shipments.filter(
    (s) => s.status === "assigned" || s.status === "in_transit",
  );

  const history = shipments.filter((s) => s.status === "delivered");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "assigned":
        return "#3b82f6";
      case "in_transit":
        return "#8b5cf6";
      case "delivered":
        return "#16a34a";
      default:
        return "#999";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "assigned":
        return "Asignado";
      case "in_transit":
        return "En camino";
      case "delivered":
        return "Entregado";
      default:
        return status;
    }
  };

  // =========================
  // CARD
  // =========================
  const renderCard = (shipment: Shipment) => {
    const isDelivered = shipment.status === "delivered";
    const isAssigned =
      shipment.status === "assigned" || shipment.status === "in_transit";
    const isPending = shipment.status === "pending";
    const isLoading = updatingId === shipment.id;

    return (
      <View
        key={shipment.id}
        className="bg-white p-4 rounded-2xl mb-3"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <Text className="font-bold text-lg">📦 Envío #{shipment.id}</Text>

        <Text className="text-gray-500 mt-1">
          📍 {getPointInfo(shipment.pickupPointId)}
        </Text>

        <Text
          className="mt-2 font-bold"
          style={{ color: getStatusColor(shipment.status) }}
        >
          Estado: {getStatusLabel(shipment.status)}
        </Text>

        <View className="mt-4 flex-row gap-2">
          {isPending && (
            <Pressable
              onPress={() => goToDetail(shipment)}
              className="flex-1 bg-[#2563eb] py-3 rounded-xl items-center"
            >
              <Text className="text-white font-semibold">Aceptar</Text>
            </Pressable>
          )}

          {isAssigned && !isDelivered && (
            <>
              <Pressable
                onPress={() => goToMap(shipment)}
                className="flex-1 bg-[#3b82f6] py-3 rounded-xl items-center"
              >
                <Text className="text-white font-semibold">Ver mapa</Text>
              </Pressable>

              <Pressable
                onPress={() => deliverShipment(shipment.id)}
                className="flex-1 bg-[#16a34a] py-3 rounded-xl items-center"
              >
                <Text className="text-white font-semibold">
                  {isLoading ? "..." : "Entregar"}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {isDelivered && (
          <Text className="mt-3 text-green-600 font-semibold">
            ✅ Entregado
          </Text>
        )}
      </View>
    );
  };

  // =========================
  // RENDER
  // =========================
  if (loading) {
    return (
      <AppScreen>
        <ActivityIndicator />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <FlatList
        data={[1]}
        renderItem={() => (
          <View style={{ padding: 16 }}>
            {available.length > 0 && (
              <>
                <Text className="text-xl font-bold mb-3 text-[#15325c]">
                  🟢 Disponibles
                </Text>
                {available.map(renderCard)}
              </>
            )}

            {active.length > 0 && (
              <>
                <Text className="text-xl font-bold mt-6 mb-3 text-[#15325c]">
                  🚚 Mis misiones
                </Text>
                {active.map(renderCard)}
              </>
            )}

            {history.length > 0 && (
              <>
                <Text className="text-xl font-bold mt-6 mb-3 text-[#15325c]">
                  📦 Historial
                </Text>
                {history.map(renderCard)}
              </>
            )}
          </View>
        )}
      />
    </AppScreen>
  );
}
