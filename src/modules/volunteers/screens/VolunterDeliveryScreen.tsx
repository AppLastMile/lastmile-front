import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";

import {
  getVolunteerShipments,
  updateShipmentStatus,
  Shipment,
} from "@/services/api/logisticsService";

export function VolunteerDeliveryScreen() {
  const volunteerId = 10;

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadShipments = async () => {
    try {
      setLoading(true);
      const res = await getVolunteerShipments(volunteerId);
      setShipments(res.data);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar las entregas");
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async (shipmentId: number) => {
    try {
      setUpdatingId(shipmentId);

      await updateShipmentStatus(shipmentId, "delivered");

      setShipments((prev) =>
        prev.map((s) =>
          s.id === shipmentId ? { ...s, status: "delivered" } : s,
        ),
      );

      Alert.alert("✅ Entrega registrada");
    } catch (error) {
      Alert.alert("Error", "No se pudo registrar la entrega");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#FFA500";
      case "assigned":
        return "#007AFF";
      case "in_transit":
        return "#8E44AD";
      case "delivered":
        return "#2ECC71";
      default:
        return "#999";
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;
  }

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#F5F6FA" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        🚚 Mis entregas
      </Text>

      <FlatList
        data={shipments}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No tienes entregas asignadas
          </Text>
        }
        renderItem={({ item }) => {
          const isDelivered = item.status === "delivered";
          const isLoading = updatingId === item.id;

          return (
            <View
              style={{
                backgroundColor: "#fff",
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 5,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                📦 Envío #{item.id}
              </Text>

              <Text style={{ marginTop: 4 }}>
                📍 Punto: {item.pickupPointId ?? "N/A"}
              </Text>

              <Text
                style={{
                  marginTop: 6,
                  fontWeight: "bold",
                  color: getStatusColor(item.status),
                }}
              >
                Estado: {item.status.toUpperCase()}
              </Text>

              {!isDelivered && (
                <TouchableOpacity
                  onPress={() => handleDeliver(item.id)}
                  disabled={isLoading}
                  style={{
                    marginTop: 12,
                    backgroundColor: "#007AFF",
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    {isLoading ? "Procesando..." : "Marcar como entregado"}
                  </Text>
                </TouchableOpacity>
              )}

              {isDelivered && (
                <Text
                  style={{
                    marginTop: 10,
                    color: "#2ECC71",
                    fontWeight: "bold",
                  }}
                >
                  ✅ Entregado
                </Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
