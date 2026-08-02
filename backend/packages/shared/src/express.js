const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const requestLogger = (logger) =>
  morgan('combined', {
    stream: {
      write: (message) => logger && logger.info(message.trim())
    }
  });

const createServiceApp = ({ serviceName, logger, enableJson = true }) => {
  const app = express();

  app.disable('x-powered-by');
  if (enableJson) {
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true }));
  }
  app.use(cors());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  if (logger) {
    app.use(requestLogger(logger));
  }

  registerHealthEndpoint(app, serviceName);

  return app;
};

const registerHealthEndpoint = (app, serviceName) => {
  app.get('/health', (req, res) => {
    res.json({
      service: serviceName,
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
};

module.exports = {
  createServiceApp,
  registerHealthEndpoint,
  requestLogger
};
