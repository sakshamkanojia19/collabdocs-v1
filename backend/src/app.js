const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const {
  createLogger,
  createNotFoundHandler,
  createErrorHandler
} = require('@collabdocs/shared');
const { config } = require('./platform/config');
const { databaseReadiness } = require('./platform/database');
const identityRoutes = require('./modules/identity/routes');
const documentRoutes = require('./modules/documents/routes');
const chatRoutes = require('./modules/chat/routes');
const aiRoutes = require('./modules/ai/routes');
const { accountRouter, adminRouter } = require('./modules/accounts/routes');
const { createStatusRouter } = require('./modules/status/createStatusRouter');

const logger = createLogger('collabdocs-backend');
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.set('logger', logger);

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.frontendOrigins.includes(origin)) {
        return callback(null, true);
      }
      const error = new Error('Origin is not allowed');
      error.status = 403;
      return callback(error);
    },
    credentials: true
  })
);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(
  morgan('combined', {
    stream: {
      write(message) {
        logger.info(message.trim());
      }
    }
  })
);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  const database = databaseReadiness();
  res.status(database.ready ? 200 : 503).json({
    status: database.ready ? 'ready' : 'not-ready'
  });
});

app.get('/api/v1/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/v1/auth', identityRoutes);
app.use('/api/v1/users', createStatusRouter('user-service'));
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/collaboration', createStatusRouter('collaboration-service'));
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/account', accountRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/search', createStatusRouter('search-service'));
app.use('/api/v1/worker', createStatusRouter('worker-service'));

app.use(createNotFoundHandler());
app.use(createErrorHandler(logger));

module.exports = { app, logger };
