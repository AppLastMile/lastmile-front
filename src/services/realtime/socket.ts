import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io('http://192.168.1.6:3000/ws', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('🟢 Socket conectado:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Socket desconectado');
    });
  }

  return socket;
};