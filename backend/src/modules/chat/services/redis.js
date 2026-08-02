const Redis = require('ioredis');
let UpstashRedis;
try {
  // Optional dependency (used if UPSTASH_REDIS_REST_* are set)
  UpstashRedis = require('@upstash/redis').Redis;
} catch {}

let clientKind = 'none'; // 'ioredis' | 'upstash' | 'memory'
let redisClient;
let redisDisabled = false;
let redisWarningLogged = false;

const memoryStore = {
  sockets: new Map(),
  presence: new Map(),
  onlineUsers: new Set()
};

const isConnectionError = (err) =>
  err?.code === 'ECONNREFUSED' || err?.code === 'ECONNRESET' || err?.message?.includes('ECONNREFUSED');

const markRedisUnavailable = (err) => {
  if (!redisWarningLogged) {
    console.warn('[chat-service] Redis unavailable. Falling back to in-memory presence store. Error:', err?.message || err);
    redisWarningLogged = true;
  }
  redisDisabled = true;
  clientKind = 'memory';
  if (redisClient && redisClient.disconnect) {
    try { redisClient.disconnect(); } catch {}
  }
  redisClient = null;
};

const getRedis = () => {
  if (redisDisabled) return null;
  if (redisClient) return redisClient;

  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (restUrl && restToken && UpstashRedis) {
    redisClient = new UpstashRedis({ url: restUrl, token: restToken });
    clientKind = 'upstash';
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    // No config at all → use memory fallback
    clientKind = 'memory';
    return null;
  }

  redisClient = new Redis(redisUrl, { maxRetriesPerRequest: 2, lazyConnect: true, enableAutoPipelining: true });
  clientKind = 'ioredis';

  redisClient.on('error', (err) => {
    console.error('[chat-service] Redis error', err);
    if (isConnectionError(err)) markRedisUnavailable(err);
  });
  redisClient.on('connect', () => console.log('[chat-service] Redis connected'));
  return redisClient;
};

const presenceKey = (userId) => `chat:presence:${userId}`;
const socketsKey = (userId) => `chat:user:${userId}:sockets`;

// Memory helpers
const registerUserConnectionMemory = (userId, socketId) => {
  if (!memoryStore.sockets.has(userId)) memoryStore.sockets.set(userId, new Set());
  memoryStore.sockets.get(userId).add(socketId);
  memoryStore.onlineUsers.add(userId);
  memoryStore.presence.set(userId, new Date().toISOString());
};

const unregisterUserConnectionMemory = (userId, socketId) => {
  const sockets = memoryStore.sockets.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    memoryStore.sockets.delete(userId);
    memoryStore.onlineUsers.delete(userId);
  }
  memoryStore.presence.set(userId, new Date().toISOString());
};

// Adapter helpers for Upstash (REST) and ioredis
const sadd = async (key, member) => {
  const c = getRedis();
  if (!c) return registerUserConnectionMemory.__sadd_memory?.(key, member);
  if (clientKind === 'upstash') return c.sadd(key, member);
  return c.sadd(key, member);
};
const srem = async (key, member) => {
  const c = getRedis();
  if (!c) return unregisterUserConnectionMemory.__srem_memory?.(key, member);
  if (clientKind === 'upstash') return c.srem(key, member);
  return c.srem(key, member);
};
const scard = async (key) => {
  const c = getRedis();
  if (!c) return 0;
  if (clientKind === 'upstash') return c.scard(key);
  return c.scard(key);
};
const set = async (key, value) => {
  const c = getRedis();
  if (!c) return memoryStore.presence.set(key.replace('chat:presence:', ''), value);
  if (clientKind === 'upstash') return c.set(key, value);
  return c.set(key, value);
};
const get = async (key) => {
  const c = getRedis();
  if (!c) return memoryStore.presence.get(key.replace('chat:presence:', '')) || null;
  if (clientKind === 'upstash') return c.get(key);
  return c.get(key);
};

// Exposed functions used by sockets/registry
const registerUserConnection = async (userId, socketId) => {
  try {
    if (clientKind === 'memory' || !getRedis()) {
      registerUserConnectionMemory(userId, socketId);
      return;
    }
    await sadd(socketsKey(userId), socketId);
    await set(presenceKey(userId), new Date().toISOString());
    await sadd('chat:online-users', userId);
  } catch (err) {
    if (isConnectionError(err)) {
      markRedisUnavailable(err);
      registerUserConnectionMemory(userId, socketId);
      return;
    }
    throw err;
  }
};

const unregisterUserConnection = async (userId, socketId) => {
  try {
    if (clientKind === 'memory' || !getRedis()) {
      unregisterUserConnectionMemory(userId, socketId);
      return;
    }
    await srem(socketsKey(userId), socketId);
    const remaining = await scard(socketsKey(userId));
    if (remaining === 0) {
      await srem('chat:online-users', userId);
    }
    await set(presenceKey(userId), new Date().toISOString());
  } catch (err) {
    if (isConnectionError(err)) {
      markRedisUnavailable(err);
      unregisterUserConnectionMemory(userId, socketId);
      return;
    }
    throw err;
  }
};

const getUserLastSeen = async (userId) => {
  try {
    if (clientKind === 'memory' || !getRedis()) {
      return memoryStore.presence.get(userId) || null;
    }
    return await get(presenceKey(userId));
  } catch (err) {
    if (isConnectionError(err)) {
      markRedisUnavailable(err);
      return memoryStore.presence.get(userId) || null;
    }
    throw err;
  }
};

const disconnectRedis = async () => {
  if (clientKind === 'ioredis' && redisClient) {
    await redisClient.quit();
  }
  redisClient = null;
};

module.exports = {
  getRedis,
  registerUserConnection,
  unregisterUserConnection,
  getUserLastSeen,
  disconnectRedis
};
