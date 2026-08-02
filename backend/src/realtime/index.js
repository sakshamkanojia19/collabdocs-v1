const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { config } = require('../platform/config');
const Document = require('../modules/documents/models/Document');
const { getDocumentRole } = require('../modules/documents/policy');
const { getAccountIdForUser } = require('../modules/accounts/service');
const ChatGroup = require('../modules/chat/models/ChatGroup');
const {
  setSocketServer,
  userRoomName,
  emitToUsers
} = require('../modules/chat/socketRegistry');
const {
  registerUserConnection,
  unregisterUserConnection,
  disconnectRedis
} = require('../modules/chat/services/redis');

const initializeRealtime = (server, logger) => {
  const io = new Server(server, {
    cors: {
      origin: config.frontendOrigins,
      credentials: true
    },
    maxHttpBufferSize: 2 * 1024 * 1024
  });

  setSocketServer(io);

  const documentPresence = new Map();

  const emitActiveUsers = (documentId) => {
    const documentUsers = documentPresence.get(documentId);
    const activeUsers = documentUsers
      ? Array.from(documentUsers.values()).map(({ socketIds, ...profile }) => profile)
      : [];
    io.to(`document:${documentId}`).emit('activeUsers', activeUsers);
  };

  const removeDocumentPresence = (socket, documentId) => {
    const documentUsers = documentPresence.get(documentId);
    const userPresence = documentUsers?.get(socket.data.user.id);

    if (userPresence) {
      userPresence.socketIds.delete(socket.id);
      if (userPresence.socketIds.size === 0) {
        documentUsers.delete(socket.data.user.id);
        io.to(`document:${documentId}`).emit('userLeft', {
          userId: socket.data.user.id
        });
      }
      if (documentUsers.size === 0) {
        documentPresence.delete(documentId);
      }
    }

    socket.leave(`document:${documentId}`);
    socket.data.documents.delete(documentId);
    emitActiveUsers(documentId);
  };

  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization || '';
      const token =
        socket.handshake.auth?.token ||
        (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const payload = jwt.verify(token, config.jwtAccessSecret);
      socket.data.user = {
        id: String(payload.sub),
        userId: String(payload.sub),
        name: payload.name,
        email: payload.email
      };
      socket.data.documents = new Map();
      socket.data.chatGroups = new Set();
      return next();
    } catch {
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    logger.info('Realtime client connected', {
      socketId: socket.id,
      userId: user.id
    });

    socket.join(userRoomName(user.id));
    registerUserConnection(user.id, socket.id).catch((error) => {
      logger.warn('Unable to register Redis presence; using local fallback', {
        userId: user.id,
        error: error.message
      });
    });

    socket.emit('chat:connected', {
      userId: user.id,
      socketId: socket.id
    });

    socket.on('joinDocument', async (payload) => {
      const documentId = typeof payload === 'string' ? payload : payload?.documentId;
      if (!documentId) {
        return;
      }

      try {
        const document = await Document.findById(documentId).select(
          'owner collaborators accountId visibility'
        );
        // Tenant-aware role: workspace-visible documents grant members of the
        // same account viewer access, mirroring the REST policy exactly.
        const accountId = document
          ? await getAccountIdForUser(user).catch(() => null)
          : null;
        const role = document ? getDocumentRole(document, user.id, accountId) : null;
        if (!role) {
          throw new Error('You do not have access to this document');
        }

        const roomName = `document:${documentId}`;
        socket.join(roomName);
        socket.data.documents.set(documentId, role);

        if (!documentPresence.has(documentId)) {
          documentPresence.set(documentId, new Map());
        }

        const documentUsers = documentPresence.get(documentId);
        const existingPresence = documentUsers.get(user.id);
        if (existingPresence) {
          existingPresence.socketIds.add(socket.id);
          existingPresence.role = role;
        } else {
          documentUsers.set(user.id, {
            userId: user.id,
            name: user.name,
            email: user.email,
            role,
            socketIds: new Set([socket.id])
          });
          io.to(roomName).emit('userJoined', {
            userId: user.id,
            name: user.name,
            email: user.email,
            role
          });
        }

        emitActiveUsers(documentId);
      } catch (error) {
        logger.warn('Document socket join rejected', {
          documentId,
          userId: user.id,
          error: error.message
        });
        socket.emit('collaboration:error', {
          documentId,
          message: error.message || 'Unable to join document'
        });
      }
    });

    socket.on('leaveDocument', (payload) => {
      const documentId = typeof payload === 'string' ? payload : payload?.documentId;
      if (documentId && socket.data.documents.has(documentId)) {
        removeDocumentPresence(socket, documentId);
      }
    });

    socket.on('documentChange', ({ documentId, html, source } = {}) => {
      if (!documentId || typeof html !== 'string') {
        return;
      }

      const role = socket.data.documents.get(documentId);
      if (!['owner', 'editor'].includes(role)) {
        socket.emit('collaboration:error', {
          documentId,
          message: 'You do not have permission to edit this document'
        });
        return;
      }

      socket.to(`document:${documentId}`).emit('documentChange', {
        documentId,
        html,
        source: source === 'user' ? 'remote' : source,
        userId: user.id
      });
    });

    socket.on('chat:join', async ({ groupId } = {}) => {
      if (!groupId) {
        return;
      }

      try {
        const group = await ChatGroup.findById(groupId);
        if (!group || !group.hasParticipant(user.id)) {
          throw new Error('Unable to join the requested chat group');
        }

        const roomName = `group:${groupId}`;
        socket.join(roomName);
        socket.data.chatGroups.add(String(groupId));

        // The joiner needs the existing roster; peers only need the delta.
        const roomSockets = await io.in(roomName).fetchSockets();
        const onlineUserIds = [
          ...new Set(
            roomSockets
              .map((peer) => peer.data?.user?.id)
              .filter((peerUserId) => Boolean(peerUserId) && peerUserId !== user.id)
          )
        ];

        socket.emit('chat:group:joined', {
          group: group.toSummary(user.id),
          onlineUserIds
        });
        socket.to(roomName).emit('chat:presence', {
          groupId,
          userId: user.id,
          name: user.name,
          status: 'online',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.warn('Chat socket join rejected', {
          groupId,
          userId: user.id,
          error: error.message
        });
        socket.emit('chat:error', {
          message: error.message || 'Unable to join chat group'
        });
      }
    });

    socket.on('chat:leave', ({ groupId } = {}) => {
      if (!groupId || !socket.data.chatGroups.has(String(groupId))) {
        return;
      }
      const roomName = `group:${groupId}`;
      socket.leave(roomName);
      socket.data.chatGroups.delete(String(groupId));
      socket.to(roomName).emit('chat:presence', {
        groupId,
        userId: user.id,
        name: user.name,
        status: 'offline',
        timestamp: new Date().toISOString()
      });
    });

    socket.on('chat:typing', ({ groupId, isTyping } = {}) => {
      if (!groupId || !socket.data.chatGroups.has(String(groupId))) {
        return;
      }
      socket.to(`group:${groupId}`).emit('chat:typing', {
        groupId,
        userId: user.id,
        name: user.name,
        isTyping: Boolean(isTyping),
        timestamp: new Date().toISOString()
      });
    });

    socket.on('chat:read', async ({ groupId } = {}) => {
      if (!groupId || !socket.data.chatGroups.has(String(groupId))) {
        return;
      }
      try {
        const group = await ChatGroup.findById(groupId);
        if (!group || !group.hasParticipant(user.id)) {
          return;
        }
        group.updateReadReceipt(user.id, new Date());
        await group.save();
        emitToUsers(
          group.participants.map((participant) => participant.userId),
          'chat:read:receipt',
          {
            groupId,
            userId: user.id,
            timestamp: new Date().toISOString()
          }
        );
      } catch (error) {
        logger.warn('Unable to persist chat read receipt', {
          groupId,
          userId: user.id,
          error: error.message
        });
      }
    });

    socket.on('disconnect', (reason) => {
      Array.from(socket.data.documents.keys()).forEach((documentId) => {
        removeDocumentPresence(socket, documentId);
      });

      unregisterUserConnection(user.id, socket.id).catch((error) => {
        logger.warn('Unable to remove Redis presence', {
          userId: user.id,
          error: error.message
        });
      });

      logger.info('Realtime client disconnected', {
        socketId: socket.id,
        userId: user.id,
        reason
      });
    });
  });

  const close = async () => {
    await disconnectRedis();
    await new Promise((resolve) => io.close(resolve));
  };

  return { io, close };
};

module.exports = { initializeRealtime };
