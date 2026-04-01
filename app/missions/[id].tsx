import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable } from "react-native";
import { AppScreen } from "@/components/ui/AppScreen";
import { useEffect, useState } from "react";

import { useMissionStatus } from "../../src/modules/missions/hooks/useMissionStatus";
import { getEvents, type EventSummary } from "@/services/api/eventsService";

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { updateMission, getStatus } = useMissionStatus();

  const [event, setEvent] = useState<EventSummary | null>(null);

  //  cargar el evento real
  useEffect(() => {
    async function load() {
      try {
        const response = await getEvents({ page: 1, limit: 100 });

        const found = response.data.find((e) => String(e.id) === String(id));

        if (found) {
          setEvent(found);
        }
      } catch (e) {
        console.log("Error cargando detalle", e);
      }
    }

    load();
  }, [id]);

  const handleAccept = () => {
    updateMission(String(id), "taken");
    router.back(); //  volver a missions o mapa
  };

  if (!event) {
    return (
      <AppScreen>
        <Text>Cargando...</Text>
      </AppScreen>
    );
  }

  const status = getStatus(String(event.id));

  return (
    <AppScreen>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold" }}>{event.name}</Text>

        <Text style={{ marginTop: 8, color: "gray" }}>📍 {event.city}</Text>

        <Text style={{ marginTop: 16 }}>{event.description}</Text>

        <Text
          style={{
            marginTop: 16,
            fontWeight: "600",
            color:
              status === "available"
                ? "green"
                : status === "taken"
                  ? "blue"
                  : "gray",
          }}
        >
          {status === "available"
            ? "Disponible"
            : status === "taken"
              ? "Aceptada"
              : "Entregada"}
        </Text>

        <Pressable
          onPress={handleAccept}
          disabled={status !== "available"}
          style={{
            marginTop: 30,
            backgroundColor: status === "available" ? "#2563eb" : "gray",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>
            {status === "available" ? "Aceptar misión" : "Ya aceptada"}
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
