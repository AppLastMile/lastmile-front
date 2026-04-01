import * as Location from "expo-location";
import { useEffect } from "react";
import { sendLocation } from "@/services/api/trackingService";

export function useTracking(shipmentId?: number) {
  useEffect(() => {
    console.log("🟢 MapScreen render");
    if (!shipmentId) return;

    let interval: NodeJS.Timeout;

    //const userId = 'volunteer-1';
    const userId = "volunteer-" + Math.floor(Math.random() * 3);

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("❌ Permiso de ubicación denegado");
        return;
      }

      interval = setInterval(async () => {
        try {
          const location = await Location.getCurrentPositionAsync({});

          const { latitude, longitude } = location.coords;

          console.log("📍 enviando ubicación:", {
            shipmentId,
            userId,
            latitude,
            longitude,
          });

          await sendLocation(shipmentId, latitude, longitude, userId);
        } catch (error) {
          console.log("❌ Error enviando ubicación", error);
        }
      }, 5000);
    };

    startTracking();

    return () => {
      if (interval) {
        clearInterval(interval);
        console.log("🛑 Tracking detenido");
      }
    };
  }, [shipmentId]);
}
