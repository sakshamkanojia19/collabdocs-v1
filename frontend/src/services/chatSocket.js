import { io } from 'socket.io-client';

const CHAT_SOCKET_URL = import.meta.env.VITE_APP_CHAT_SOCKET_URL || 'http://localhost:3000';

let chatSocket;

export const connectChatSocket = (token) => {
  if (!token) {
    console.warn('[chat] Cannot connect socket without token');
    return null;
  }

  if (!chatSocket) {
    chatSocket = io(CHAT_SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket']
    });

    chatSocket.on('connect', () => {
      console.info('[chat] socket connected', chatSocket.id);
    });

    chatSocket.on('disconnect', (reason) => {
      console.info('[chat] socket disconnected', reason);
    });

    chatSocket.on('connect_error', (error) => {
      console.error('[chat] socket connection error', error.message);
    });
  }

  chatSocket.auth = { token };
  if (!chatSocket.connected) {
    chatSocket.connect();
  }

  return chatSocket;
};

export const getChatSocket = () => {
  if (!chatSocket) {
    console.warn('[chat] socket not initialised');
  }
  return chatSocket;
};

export const disconnectChatSocket = () => {
  if (chatSocket) {
    chatSocket.disconnect();
    chatSocket = null;
    console.info('[chat] socket disconnected manually');
  }
};
