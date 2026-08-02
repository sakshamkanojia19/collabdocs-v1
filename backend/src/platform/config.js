const path = require('path');
const dotenv = require('dotenv');

const backendRoot = path.resolve(__dirname, '../..');

// Existing process variables always win. Loading the local file first lets it
// override the generic .env file without overriding container/CI variables.
dotenv.config({ path: path.join(backendRoot, '.env.local') });
dotenv.config({ path: path.join(backendRoot, '.env') });

const requireValue = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtAccessSecret = requireValue('JWT_ACCESS_SECRET');

if (nodeEnv === 'production' && jwtAccessSecret.length < 32) {
  throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters in production');
}

const config = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parsePositiveInteger(process.env.PORT, 3000),
  frontendOrigins: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  mongoUri: requireValue('MONGO_URI'),
  mongoMaxPoolSize: parsePositiveInteger(process.env.MONGO_MAX_POOL_SIZE, 20),
  jwtAccessSecret,
  superAdminEmails: (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  openaiApiKey: process.env.OPENAI_API_KEY?.trim() || null,
  openaiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-5.6-terra',
  openaiEmbeddingModel:
    process.env.OPENAI_EMBEDDING_MODEL?.trim() || 'text-embedding-3-small',
  aiMaxDocumentChars: parsePositiveInteger(process.env.AI_MAX_DOCUMENT_CHARS, 500000),
  aiRequestsPerMinute: parsePositiveInteger(process.env.AI_REQUESTS_PER_MINUTE, 10),
  shutdownTimeoutMs: parsePositiveInteger(process.env.SHUTDOWN_TIMEOUT_MS, 10000)
});

module.exports = { config };
