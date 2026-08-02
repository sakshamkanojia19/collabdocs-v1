const mongoose = require('mongoose');
const { config } = require('./config');

let connectionPromise = null;

const connectDatabase = async (logger) => {
  if (!connectionPromise) {
    mongoose.set('strictQuery', false);
    connectionPromise = mongoose
      .connect(config.mongoUri, {
        maxPoolSize: config.mongoMaxPoolSize,
        serverSelectionTimeoutMS: 10000
      })
      .then((connection) => {
        logger.info('MongoDB connected', {
          database: connection.connection.name
        });
        return connection;
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
};

const disconnectDatabase = async (logger) => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
  connectionPromise = null;
};

const databaseReadiness = () => ({
  ready: mongoose.connection.readyState === 1,
  state: mongoose.connection.readyState
});

module.exports = {
  connectDatabase,
  disconnectDatabase,
  databaseReadiness
};
