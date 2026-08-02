const winston = require('winston');
const path = require('path');
const fs = require('fs');

const ensureLogDir = () => {
  const dir = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const createLogger = (serviceName = 'service') => {
  const logDir = ensureLogDir();

  const baseFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] })
  );

  const transports = [
    new winston.transports.File({
      filename: path.join(logDir, `${serviceName}.log`),
      level: 'info',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3
    }),
    new winston.transports.File({
      filename: path.join(logDir, `${serviceName}-error.log`),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3
    })
  ];

  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'debug',
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, ...meta }) => {
            const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${serviceName}] ${level}: ${message}${metaString}`;
          })
        )
      })
    );
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: serviceName },
    format: baseFormat,
    transports
  });
};

module.exports = { createLogger };
