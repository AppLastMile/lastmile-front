import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://192.168.1.7:3000";

export function useRealtimeMissions(onUpdate: (shipment: any) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 Missions socket conectado");
    });

    socket.on("shipment-updated", (data) => {
      console.log("📡 shipment actualizado:", data);

      onUpdate(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);
}
