import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { type EventSummary, getEvents } from "@/services/api/eventsService";

import { useNotifications } from "@/modules/notifications/hooks/useNotifications";
import { useAuthSession } from "@/modules/auth/context/AuthSessionContext";

export function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { currentUser } = useAuthSession();

  useNotifications(currentUser?.id?.toString());

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getEvents({ page: 1, limit: 10 });
      setEvents(response.data);
    } catch {
      setError(
        "No fue posible cargar eventos. Revisa la conexión con backend.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <AppScreen>
      <View className="flex-1 gap-6">
        {/* 🔵 HEADER */}
        <View>
          <Text className="text-3xl font-extrabold text-[#15325c]">
            👋 Inicio
          </Text>

          <Text className="mt-1 text-sm text-[#526887]">
            Eventos activos registrados en el sistema
          </Text>
        </View>

        {/* 🔄 BOTÓN ACTUALIZAR */}
        <Pressable
          className="self-start rounded-full bg-[#1f5fe0] px-5 py-2 active:opacity-90"
          onPress={loadEvents}
        >
          <Text className="font-semibold text-white">Actualizar</Text>
        </Pressable>

        {/* 🔄 LOADING */}
        {isLoading && (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator color="#1f5fe0" size="small" />
            <Text className="text-sm text-[#4d648a]">Cargando eventos...</Text>
          </View>
        )}

        {/* ❌ ERROR */}
        {error && (
          <Text className="rounded-xl bg-[#ffecef] px-3 py-3 text-sm text-[#a1263d]">
            {error}
          </Text>
        )}

        {/* 📦 LISTA DE EVENTOS */}
        {!isLoading && !error && (
          <View className="gap-3">
            {events.length === 0 ? (
              <View className="rounded-2xl bg-[#f4f7fb] p-4">
                <Text className="text-sm text-[#5b7190]">
                  Aún no hay eventos registrados.
                </Text>
              </View>
            ) : (
              events.map((eventItem) => (
                <View
                  key={eventItem.id}
                  className="rounded-2xl bg-white p-4 shadow-sm"
                  style={{
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  {/* Nombre */}
                  <Text className="text-lg font-bold text-[#173761]">
                    {eventItem.name}
                  </Text>

                  {/* Info */}
                  <Text className="mt-1 text-sm text-[#486387]">
                    📍 {eventItem.city}
                  </Text>

                  <Text className="mt-1 text-sm text-[#486387]">
                    🌪️ {eventItem.disasterType}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>
    </AppScreen>
  );
}
