import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://192.168.1.7:3000/ws"; // 🔥 IMPORTANTE

export type TrackingData = {
  shipmentId: number;
  userId?: string;
  lat: number;
  lng: number;
};

export function useSocketTracking(
  shipmentId: number,
  callback: (data: TrackingData) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!shipmentId) return;

    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Conectado a /ws:", socket.id);

      // 🔥 SUSCRIBIRSE AL ROOM
      socket.emit("shipment.subscribe", {
        shipmentId,
      });
    });

    // 🔥 EVENTO REAL CORRECTO
    socket.on("shipment.location.changed", (data: any) => {
      console.log("📡 LOCATION CHANGED:", data);

      callbackRef.current({
        shipmentId: data.shipmentId,
        lat: data.lat,
        lng: data.lng,
      });
    });

    socket.onAny((event, data) => {
      console.log("📡 EVENTO GLOBAL:", event, data);
    });

    return () => {
      socket.disconnect();
    };
  }, [shipmentId]);
}
