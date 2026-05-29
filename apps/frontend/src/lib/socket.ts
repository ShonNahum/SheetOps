import { io } from 'socket.io-client';

export const socket = io('/', {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});
