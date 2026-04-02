import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://192.168.1.7:3000/ws";

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

    console.log("🔌 Conectando tracking socket...");

    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 Conectado a /ws:", socket.id);

      socket.emit("shipment.subscribe", {
        shipmentId,
      });
    });

    socket.on("connect_error", (err) => {
      console.log("❌ Socket error:", err.message);
    });

    socket.on("shipment.location.changed", (data: any) => {
      console.log("📍 LOCATION CHANGED:", data);

      if (!data?.shipmentId) return;

      callbackRef.current({
        shipmentId: data.shipmentId,
        userId: data.userId,
        lat: data.lat,
        lng: data.lng,
      });
    });

    socket.onAny((event, data) => {
      console.log("📡 EVENT:", event, data);
    });

    return () => {
      console.log("🔌 Cerrando socket tracking");
      socket.disconnect();
    };
  }, [shipmentId]);
}