import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.1.7:3000/ws';

export function useRealtimeMissions(
  shipmentId: number,
  onUpdate: (data: any) => void
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🟢 conectado realtime');

      // 🔥 SUSCRIPCIÓN A ROOM
      socket.emit('shipment.subscribe', {
        shipmentId,
      });
    });

    socket.on('shipment.status.changed', (data) => {
      console.log('📦 status update:', data);
      onUpdate(data);
    });

    socket.on('shipment.location.changed', (data) => {
      console.log('📍 location update:', data);
      onUpdate(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [shipmentId]);
}