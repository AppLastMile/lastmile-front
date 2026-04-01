import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { AppScreen } from "@/components/ui/AppScreen";
import { useState } from "react";

import { updateShipmentStatus } from "@/services/api/logisticsService";

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const shipmentId = Number(id);

  const handleAccept = async () => {
    if (!shipmentId) return;

    try {
      setLoading(true);

      await updateShipmentStatus(shipmentId, "assigned");

      // 🔥 vuelve a missions ya con estado actualizado
      router.replace("/(tabs)/missions");
    } catch (e) {
      console.log("Error aceptando misión", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <View
        style={{
          flex: 1,
          padding: 16,
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Detalle de misión #{shipmentId}
        </Text>

        <Text
          style={{
            marginTop: 12,
            textAlign: "center",
            color: "gray",
          }}
        >
          Estás a punto de aceptar esta misión.
        </Text>

        {/* BOTÓN ACEPTAR */}
        <Pressable
          onPress={handleAccept}
          disabled={loading}
          style={{
            marginTop: 30,
            backgroundColor: loading ? "gray" : "#2563eb",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Aceptar misión
            </Text>
          )}
        </Pressable>

        {/* BOTÓN CANCELAR */}
        <Pressable
          onPress={() => router.back()}
          disabled={loading}
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#ccc",
          }}
        >
          <Text>Cancelar</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
