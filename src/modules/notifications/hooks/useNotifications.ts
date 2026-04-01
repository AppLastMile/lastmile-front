import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import Toast from "react-native-toast-message";

const SOCKET_URL = "http://192.168.1.7:3000";

export function useNotifications(userId?: string) {
  useEffect(() => {
    if (!userId) {
      console.log("❌ No hay userId para notificaciones");
      return;
    }

    console.log("🔔 Conectando socket de notificaciones...");

    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("✅ Socket NOTIFICATIONS conectado:", socket.id);
    });

    socket.on(`notification-${userId}`, (data) => {
      console.log("🔔 NOTIFICACIÓN RECIBIDA:", data);

      Toast.show({
        type: "success",
        text1: "Nueva notificación",
        text2: data.message || "Tienes una nueva alerta",
        position: "top",
        visibilityTime: 4000,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);
}
