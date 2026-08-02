const http = require('http');
const { config } = require('./platform/config');
const { connectDatabase, disconnectDatabase } = require('./platform/database');
const { app, logger } = require('./app');
const { initializeRealtime } = require('./realtime');
const { disconnectKafka } = require('./modules/chat/services/kafka');

const server = http.createServer(app);
const realtime = initializeRealtime(server, logger);
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info('Graceful shutdown started', { signal });

  const forceTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out');
    process.exit(1);
  }, config.shutdownTimeoutMs);
  forceTimer.unref();

  try {
    await realtime.close();
    if (server.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await disconnectKafka(logger);
    await disconnectDatabase(logger);
    clearTimeout(forceTimer);
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    clearTimeout(forceTimer);
    logger.error('Graceful shutdown failed', { error });
    process.exit(1);
  }
};

const start = async () => {
  await connectDatabase(logger);
  server.listen(config.port, () => {
    logger.info(`CollabDocs backend listening on port ${config.port}`, {
      architecture: 'modular-monolith',
      environment: config.nodeEnv
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', { error });
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  shutdown('uncaughtException');
});

start().catch((error) => {
  logger.error('Backend startup failed', { error });
  process.exit(1);
});
