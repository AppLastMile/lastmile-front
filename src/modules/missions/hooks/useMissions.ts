import { useEffect, useState } from "react";
import { getEvents } from "@/services/api/eventsService";
import { findColombianCityByName } from "@/modules/missions/constants/colombianCities";

export interface Mission {
  id: string;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  status: "available" | "taken" | "delivered";
}

let missionsState: Mission[] = [];

export function useMissions() {
  const [missions, setMissions] = useState<Mission[]>(missionsState);
  const [loading, setLoading] = useState(false);

  // cargar desde backend
  const loadMissions = async () => {
    setLoading(true);

    try {
      const response = await getEvents({ page: 1, limit: 100 });

      missionsState = response.data.map((event: any) => {
        const city = findColombianCityByName(event.city);

        return {
          id: String(event.id),
          title: event.name,
          location: event.city,
          latitude: city?.region.latitude ?? 0,
          longitude: city?.region.longitude ?? 0,
          status: "available",
        };
      });

      setMissions([...missionsState]);
    } catch (e) {
      console.log("Error cargando missions", e);
    } finally {
      setLoading(false);
    }
  };

  // cargar una sola vez
  useEffect(() => {
    if (missionsState.length === 0) {
      loadMissions();
    }
  }, []);

  const updateMission = (id: string, status: Mission["status"]) => {
    missionsState = missionsState.map((m) =>
      m.id === id ? { ...m, status } : m,
    );

    setMissions([...missionsState]);
  };

  return {
    missions,
    loading,
    updateMission,
    reload: loadMissions,
  };
}
