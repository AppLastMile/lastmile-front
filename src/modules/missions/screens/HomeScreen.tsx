import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { type EventSummary, getEvents } from "@/services/api/eventsService";

import {
  getVolunteerShipments,
  type Shipment,
} from "@/services/api/logisticsService";

import { useRealtimeMissions } from "../hooks/useRealtimeMissions";
import { useNotifications } from "@/modules/notifications/hooks/useNotifications";
import { useAuthSession } from "@/modules/auth/context/AuthSessionContext";

export function HomeScreen() {
  const { currentUser } = useAuthSession();

  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const volunteerId = currentUser?.id || 10;

  // 🔔 NOTIFICACIONES
  useNotifications(currentUser?.id?.toString());

  // =========================
  // 🔥 LOAD INICIAL
  // =========================
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [eventsRes, shipmentsRes] = await Promise.all([
        getEvents({ page: 1, limit: 10 }),
        getVolunteerShipments(volunteerId),
      ]);

      setEvents(eventsRes.data);
      setShipments(shipmentsRes.data);
    } catch (e) {
      console.log(e);
      setError("Error conectando con backend");
    } finally {
      setIsLoading(false);
    }
  }, [volunteerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =========================
  // 🔥 REALTIME (CLAVE)
  // =========================
  useRealtimeMissions((updatedShipment) => {
    setShipments((prev) => {
      const exists = prev.find((s) => s.id === updatedShipment.id);

      if (!exists) return [updatedShipment, ...prev];

      return prev.map((s) =>
        s.id === updatedShipment.id ? updatedShipment : s,
      );
    });
  });

  // =========================
  // 📊 DERIVADOS
  // =========================
  const available = shipments.filter((s) => s.status === "pending");
  const active = shipments.filter(
    (s) => s.status === "assigned" || s.status === "in_transit",
  );

  // =========================
  // 🎨 RENDER
  // =========================
  return (
    <AppScreen>
      <View className="flex-1 gap-6">
        {/* HEADER */}
        <View>
          <Text className="text-3xl font-extrabold text-[#15325c]">
            👋 Inicio
          </Text>
          <Text className="mt-1 text-sm text-[#526887]">
            Panel en tiempo real
          </Text>
        </View>

        {/* BOTÓN REFRESH */}
        <Pressable
          className="self-start rounded-full bg-[#1f5fe0] px-5 py-2"
          onPress={loadData}
        >
          <Text className="text-white font-semibold">Actualizar</Text>
        </Pressable>

        {/* LOADING */}
        {isLoading && <ActivityIndicator />}

        {/* ERROR */}
        {error && <Text className="text-red-500">{error}</Text>}

        {!isLoading && !error && (
          <>
            {/* 🔥 MIS MISIONES */}
            <View>
              <Text className="text-xl font-bold text-[#15325c] mb-2">
                🚚 Mis misiones
              </Text>

              {active.length === 0 ? (
                <Text className="text-gray-500">
                  No tienes misiones activas
                </Text>
              ) : (
                active.map((s) => (
                  <View
                    key={s.id}
                    className="bg-white p-4 rounded-xl mb-2"
                  >
                    <Text>📦 Envío #{s.id}</Text>
                    <Text>Estado: {s.status}</Text>
                  </View>
                ))
              )}
            </View>

            {/* 🟢 DISPONIBLES */}
            <View>
              <Text className="text-xl font-bold text-[#15325c] mb-2">
                🟢 Disponibles
              </Text>

              {available.length === 0 ? (
                <Text className="text-gray-500">
                  No hay misiones disponibles
                </Text>
              ) : (
                available.slice(0, 3).map((s) => (
                  <View
                    key={s.id}
                    className="bg-white p-4 rounded-xl mb-2"
                  >
                    <Text>📦 Envío #{s.id}</Text>
                  </View>
                ))
              )}
            </View>

            {/* 🌍 EVENTOS */}
            <View>
              <Text className="text-xl font-bold text-[#15325c] mb-2">
                🌍 Eventos activos
              </Text>

              {events.map((event) => (
                <View
                  key={event.id}
                  className="bg-white p-4 rounded-xl mb-2"
                >
                  <Text className="font-bold">{event.name}</Text>
                  <Text>📍 {event.city}</Text>
                  <Text>🌪️ {event.disasterType}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </AppScreen>
  );
}