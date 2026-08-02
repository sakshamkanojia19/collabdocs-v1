import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_APP_SOCKET_URL || 'http://localhost:3000';

let socket;

export const connectSocket = (token) => {
  if (!token) {
    console.warn('Cannot establish socket connection without token');
    return null;
  }

  if (!socket) {
    socket = io(URL, {
      autoConnect: false,
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.warn('Socket not connected. Call connectSocket first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected');
  }
};

