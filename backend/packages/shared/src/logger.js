const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Returns null when the directory cannot be created, which is the normal case
// in a container running as a non-root user. Callers then log to stdout only.
const ensureLogDir = () => {
  const dir = path.resolve(process.cwd(), 'logs');
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch {
    return null;
  }
};

const createLogger = (serviceName = 'service') => {
  const logDir = ensureLogDir();
  const isProduction = process.env.NODE_ENV === 'production';

  const baseFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] })
  );

  // Container platforms collect stdout, so the console transport is the only
  // sink that is readable once deployed.
  const transports = [
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      format: isProduction
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} [${serviceName}] ${level}: ${message}${metaString}`;
            })
          )
    })
  ];

  if (logDir) {
    transports.push(
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
