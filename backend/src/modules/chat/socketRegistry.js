const userRoomName = (userId) => `user:${userId}`;

let ioInstance = null;

const setSocketServer = (io) => {
  ioInstance = io;
};

const getSocketServer = () => ioInstance;

const emitToUsers = (userIds, event, payload) => {
  if (!ioInstance || !Array.isArray(userIds) || userIds.length === 0) {
    return;
  }

  userIds.forEach((userId) => {
    ioInstance.to(userRoomName(userId)).emit(event, payload);
  });
};

module.exports = {
  setSocketServer,
  getSocketServer,
  emitToUsers,
  userRoomName
};
